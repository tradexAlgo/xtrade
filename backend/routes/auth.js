import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Admin from '../models/Admin.js'
import OTP from '../models/OTP.js'
import EmailSettings from '../models/EmailSettings.js'
import { sendTemplateEmail, generateOTP, isOTPEnabled, getOTPExpiry } from '../services/emailService.js'

const router = express.Router()

// Generate JWT token with issued at timestamp
const generateToken = (userId) => {
  return jwt.sign({ id: userId, iat: Math.floor(Date.now() / 1000) }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// POST /api/auth/send-otp - Send OTP for email verification
router.post('/send-otp', async (req, res) => {
  try {
    const { email, firstName } = req.body

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' })
    }

    // Check if OTP verification is enabled
    const otpEnabled = await isOTPEnabled()
    if (!otpEnabled) {
      return res.json({ success: true, otpRequired: false, message: 'OTP verification is disabled' })
    }

    // Generate OTP
    const otp = generateOTP()
    const expiryMinutes = await getOTPExpiry()
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email })

    // Save new OTP
    await OTP.create({
      email,
      otp,
      purpose: 'signup',
      expiresAt
    })

    // Get platform name from settings
    const settings = await EmailSettings.findOne()
    const platformName = settings?.fromName || 'Trading Platform'
    const supportEmail = settings?.fromEmail || 'support@example.com'

    // Send OTP email
    const logoUrl = process.env.LOGO_URL || 'https://extrede.com/extrede-logo.png'
    const emailResult = await sendTemplateEmail('email_verification', email, {
      otp,
      firstName: firstName || 'User',
      email,
      expiryMinutes: expiryMinutes.toString(),
      platformName,
      supportEmail,
      year: new Date().getFullYear().toString(),
      logoUrl
    })

    if (emailResult.success) {
      res.json({ success: true, otpRequired: true, message: 'OTP sent to your email' })
    } else {
      // If email fails but OTP is required, still allow signup (fallback)
      console.error('Failed to send OTP email:', emailResult.message)
      res.json({ success: true, otpRequired: false, message: 'Email service unavailable, proceeding without OTP' })
    }
  } catch (error) {
    console.error('Send OTP error:', error)
    res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message })
  }
})

// POST /api/auth/verify-otp - Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' })
    }

    const otpRecord = await OTP.findOne({ email, otp, purpose: 'signup' })
    
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' })
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return res.status(400).json({ success: false, message: 'OTP has expired' })
    }

    // Mark as verified
    otpRecord.verified = true
    await otpRecord.save()

    res.json({ success: true, message: 'OTP verified successfully' })
  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message })
  }
})

// GET /api/auth/otp-settings - Check if OTP is enabled
router.get('/otp-settings', async (req, res) => {
  try {
    const otpEnabled = await isOTPEnabled()
    res.json({ success: true, otpEnabled })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { firstName, email, phone, countryCode, password, adminSlug, referralCode, otpVerified } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' })
    }

    // Check if OTP verification is required
    const otpEnabled = await isOTPEnabled()
    if (otpEnabled) {
      // Verify OTP was completed
      const otpRecord = await OTP.findOne({ email, purpose: 'signup', verified: true })
      if (!otpRecord && !otpVerified) {
        return res.status(400).json({ message: 'Email verification required. Please verify your email first.' })
      }
      // Clean up OTP record
      if (otpRecord) {
        await OTP.deleteOne({ _id: otpRecord._id })
      }
    }

    // Find admin by slug if provided
    let assignedAdmin = null
    let adminUrlSlug = null
    if (adminSlug) {
      const admin = await Admin.findOne({ urlSlug: adminSlug.toLowerCase(), status: 'ACTIVE' })
      if (admin) {
        assignedAdmin = admin._id
        adminUrlSlug = admin.urlSlug
      }
    }

    // Handle referral code - find the referring IB
    let parentIBId = null
    let referredBy = null
    if (referralCode) {
      const referringIB = await User.findOne({ 
        referralCode: referralCode, 
        isIB: true, 
        ibStatus: 'ACTIVE' 
      })
      if (referringIB) {
        parentIBId = referringIB._id
        referredBy = referralCode
        console.log(`[Signup] User ${email} referred by IB ${referringIB.firstName} (${referralCode})`)
      }
    }

    // Create new user
    const user = await User.create({
      firstName,
      email,
      phone,
      countryCode,
      password,
      assignedAdmin,
      adminUrlSlug,
      parentIBId,
      referredBy,
      emailVerified: otpEnabled ? true : false
    })

    // Update admin stats if assigned
    if (assignedAdmin) {
      await Admin.findByIdAndUpdate(assignedAdmin, { $inc: { 'stats.totalUsers': 1 } })
    }

    // Send welcome email (get platform name from settings)
    const emailSettings = await EmailSettings.findOne()
    sendTemplateEmail('welcome', email, {
      firstName: user.firstName,
      email: user.email,
      platformName: emailSettings?.fromName || 'Trading Platform',
      loginUrl: 'http://localhost:5173/login',
      supportEmail: emailSettings?.fromEmail || 'support@example.com',
      year: new Date().getFullYear().toString()
    })

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: user._id,
        id: user._id,
        firstName: user.firstName,
        email: user.email,
        phone: user.phone,
        assignedAdmin,
        adminUrlSlug
      },
      token
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ message: 'Error creating user', error: error.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({ 
        message: 'Your account has been permanently banned. Please contact support.',
        reason: user.banReason || 'Account banned'
      })
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: 'Your account has been temporarily blocked. Please contact support.',
        reason: user.blockReason || 'Account blocked'
      })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Capture IP address
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress ||
                     req.ip ||
                     '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'Unknown'
    
    console.log(`[Login] User ${user.email} logged in from IP: ${clientIP}`)
    
    // Update user's last login IP and add to login history
    user.lastLoginIP = clientIP
    user.lastLoginAt = new Date()
    
    // Add to login history (keep last 10 entries)
    if (!user.loginHistory) user.loginHistory = []
    user.loginHistory.unshift({
      ip: clientIP,
      timestamp: new Date(),
      userAgent: userAgent
    })
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(0, 10)
    }
    
    try {
      await user.save({ validateBeforeSave: false })
      console.log(`[Login] IP saved successfully for ${user.email}`)
    } catch (saveErr) {
      console.error(`[Login] Error saving IP:`, saveErr.message)
    }

    // Generate token
    const token = generateToken(user._id)

    res.json({
      message: 'Login successful',
      user: {
        _id: user._id,
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        assignedAdmin: user.assignedAdmin,
        adminUrlSlug: user.adminUrlSlug,
        kycApproved: user.kycApproved,
        createdAt: user.createdAt
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Error logging in', error: error.message })
  }
})

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user is banned - force logout
    if (user.isBanned) {
      return res.status(403).json({ 
        message: 'Your account has been permanently banned.',
        forceLogout: true,
        reason: user.banReason || 'Account banned'
      })
    }

    // Check if user is blocked - force logout
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: 'Your account has been temporarily blocked.',
        forceLogout: true,
        reason: user.blockReason || 'Account blocked'
      })
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const tokenIssuedAt = decoded.iat * 1000 // Convert to milliseconds
      const passwordChangedAt = new Date(user.passwordChangedAt).getTime()
      if (passwordChangedAt > tokenIssuedAt) {
        return res.status(403).json({ 
          message: 'Your password was changed. Please login again.',
          forceLogout: true
        })
      }
    }

    res.json({ user })
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' })
  }
})

// PUT /api/auth/update-profile - Update user profile
router.put('/update-profile', async (req, res) => {
  try {
    const { userId, firstName, lastName, phone, address, city, country, dateOfBirth, bankDetails, upiId } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Update basic profile fields
    if (firstName) user.firstName = firstName
    if (lastName !== undefined) user.lastName = lastName
    if (phone !== undefined) user.phone = phone
    if (address !== undefined) user.address = address
    if (city !== undefined) user.city = city
    if (country !== undefined) user.country = country
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth

    // Update bank details
    if (bankDetails) {
      user.bankDetails = {
        bankName: bankDetails.bankName || '',
        accountNumber: bankDetails.accountNumber || '',
        accountHolderName: bankDetails.accountHolderName || '',
        ifscCode: bankDetails.ifscCode || '',
        branchName: bankDetails.branchName || ''
      }
    }

    // Update UPI
    if (upiId !== undefined) user.upiId = upiId

    await user.save()

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        bankDetails: user.bankDetails,
        upiId: user.upiId,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Error updating profile', error: error.message })
  }
})

// GET /api/auth/user/:userId - Get user by ID (for admin)
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message })
  }
})

// POST /api/auth/forgot-password - Send OTP for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' })
    }

    // Check if SMTP is enabled
    const emailSettings = await EmailSettings.findOne()
    const smtpEnabled = emailSettings?.smtpEnabled || false

    if (smtpEnabled) {
      // Send OTP for password reset
      const otp = generateOTP()
      const expiryMinutes = getOTPExpiry()

      // Save OTP
      const otpRecord = await OTP.create({
        email,
        otp,
        purpose: 'password_reset',
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000)
      })
      console.log('OTP saved:', { email, otp, purpose: 'password_reset', expiresAt: otpRecord.expiresAt })

      // Send email with OTP
      try {
        await sendTemplateEmail('password_reset', email, {
          firstName: user.firstName || user.email.split('@')[0],
          email: user.email,
          otp,
          expiryMinutes,
          platformName: 'Extrede',
          supportEmail: emailSettings?.fromEmail || 'support@Extrede.com',
          year: new Date().getFullYear().toString()
        })

        res.json({ 
          success: true, 
          message: 'Password reset OTP sent to your email',
          requiresOTP: true
        })
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
        // Fallback to admin request if email fails
        smtpEnabled = false
      }
    }

    if (!smtpEnabled) {
      // Create password reset request for admin
      const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default
      
      // Check if there's already a pending request
      const existingRequest = await PasswordResetRequest.findOne({ 
        userId: user._id, 
        status: 'Pending' 
      })
      
      if (existingRequest) {
        return res.status(400).json({ 
          success: false, 
          message: 'You already have a pending password reset request. Please wait for admin to process it.' 
        })
      }

      // Create new request
      await PasswordResetRequest.create({
        userId: user._id,
        email: user.email,
        status: 'Pending'
      })

      console.log(`[Password Reset Request] User: ${user.email}`)

      res.json({ 
        success: true, 
        message: 'Password reset request submitted. Admin will send a new password to your email.',
        requiresOTP: false
      })
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ success: false, message: 'Error submitting request', error: error.message })
  }
})

// POST /api/auth/verify-reset-otp - Verify OTP and allow password reset
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' })
    }

    // Find valid OTP
    console.log('Looking for OTP:', { email, otp, purpose: 'password_reset' })
    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: 'password_reset',
      expiresAt: { $gt: new Date() }
    })

    console.log('Found OTP record:', otpRecord)

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
    }

    // Find user and update password
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    user.password = newPassword
    user.passwordChangedAt = new Date()
    await user.save()

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id })

    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now login with your new password.' 
    })
  } catch (error) {
    console.error('Verify reset OTP error:', error)
    res.status(500).json({ success: false, message: 'Error resetting password', error: error.message })
  }
})

// POST /api/auth/change-email - Change email from profile
router.post('/change-email', async (req, res) => {
  try {
    const { userId, newEmail, password } = req.body

    if (!userId || !newEmail || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Verify password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' })
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() })
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ success: false, message: 'Email already in use by another account' })
    }

    // Update email
    const oldEmail = user.email
    user.email = newEmail.toLowerCase()
    await user.save()

    console.log(`User ${userId} changed email from ${oldEmail} to ${newEmail}`)

    res.json({ 
      success: true, 
      message: 'Email changed successfully',
      email: user.email
    })
  } catch (error) {
    console.error('Change email error:', error)
    res.status(500).json({ success: false, message: 'Error changing email', error: error.message })
  }
})

// POST /api/auth/2fa/setup - Generate 2FA secret and QR code
router.post('/2fa/setup', async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Generate a random secret (base32 encoded)
    const generateSecret = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
      let secret = ''
      for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return secret
    }

    const secret = generateSecret()
    
    // Create otpauth URL for QR code
    const otpauthUrl = `otpauth://totp/Extrede:${user.email}?secret=${secret}&issuer=Extrede&algorithm=SHA1&digits=6&period=30`

    // Save secret temporarily (will be confirmed when user verifies)
    user.twoFactorSecret = secret
    await user.save()

    res.json({
      success: true,
      secret,
      otpauthUrl,
      message: 'Scan the QR code with your authenticator app'
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    res.status(500).json({ success: false, message: 'Error setting up 2FA', error: error.message })
  }
})

// POST /api/auth/2fa/verify - Verify 2FA code and enable
router.post('/2fa/verify', async (req, res) => {
  try {
    const { userId, code } = req.body

    if (!userId || !code) {
      return res.status(400).json({ success: false, message: 'User ID and code are required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'Please setup 2FA first' })
    }

    // Verify TOTP code
    const verifyTOTP = (secret, token) => {
      const timeStep = 30
      const digits = 6
      const time = Math.floor(Date.now() / 1000 / timeStep)
      
      // Check current and adjacent time windows
      for (let i = -1; i <= 1; i++) {
        const expectedToken = generateTOTP(secret, time + i, digits)
        if (expectedToken === token) {
          return true
        }
      }
      return false
    }

    const generateTOTP = (secret, time, digits) => {
      // Simple TOTP implementation
      const crypto = require('crypto')
      
      // Decode base32 secret
      const base32Decode = (str) => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let bits = ''
        for (let i = 0; i < str.length; i++) {
          const val = alphabet.indexOf(str.charAt(i).toUpperCase())
          if (val === -1) continue
          bits += val.toString(2).padStart(5, '0')
        }
        const bytes = []
        for (let i = 0; i + 8 <= bits.length; i += 8) {
          bytes.push(parseInt(bits.substr(i, 8), 2))
        }
        return Buffer.from(bytes)
      }

      const key = base32Decode(secret)
      const timeBuffer = Buffer.alloc(8)
      timeBuffer.writeBigInt64BE(BigInt(time))
      
      const hmac = crypto.createHmac('sha1', key)
      hmac.update(timeBuffer)
      const hash = hmac.digest()
      
      const offset = hash[hash.length - 1] & 0xf
      const binary = ((hash[offset] & 0x7f) << 24) |
                     ((hash[offset + 1] & 0xff) << 16) |
                     ((hash[offset + 2] & 0xff) << 8) |
                     (hash[offset + 3] & 0xff)
      
      const otp = binary % Math.pow(10, digits)
      return otp.toString().padStart(digits, '0')
    }

    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' })
    }

    // Enable 2FA
    user.twoFactorEnabled = true
    await user.save()

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    })
  } catch (error) {
    console.error('2FA verify error:', error)
    res.status(500).json({ success: false, message: 'Error verifying 2FA', error: error.message })
  }
})

// POST /api/auth/2fa/disable - Disable 2FA
router.post('/2fa/disable', async (req, res) => {
  try {
    const { userId, password } = req.body

    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'User ID and password are required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Verify password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' })
    }

    // Disable 2FA
    user.twoFactorEnabled = false
    user.twoFactorSecret = null
    await user.save()

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    res.status(500).json({ success: false, message: 'Error disabling 2FA', error: error.message })
  }
})

// POST /api/auth/2fa/validate - Validate 2FA code during login
router.post('/2fa/validate', async (req, res) => {
  try {
    const { userId, code } = req.body

    if (!userId || !code) {
      return res.status(400).json({ success: false, message: 'User ID and code are required' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA is not enabled for this account' })
    }

    // Verify TOTP code (same logic as verify endpoint)
    const crypto = require('crypto')
    
    const base32Decode = (str) => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
      let bits = ''
      for (let i = 0; i < str.length; i++) {
        const val = alphabet.indexOf(str.charAt(i).toUpperCase())
        if (val === -1) continue
        bits += val.toString(2).padStart(5, '0')
      }
      const bytes = []
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2))
      }
      return Buffer.from(bytes)
    }

    const generateTOTP = (secret, time, digits) => {
      const key = base32Decode(secret)
      const timeBuffer = Buffer.alloc(8)
      timeBuffer.writeBigInt64BE(BigInt(time))
      
      const hmac = crypto.createHmac('sha1', key)
      hmac.update(timeBuffer)
      const hash = hmac.digest()
      
      const offset = hash[hash.length - 1] & 0xf
      const binary = ((hash[offset] & 0x7f) << 24) |
                     ((hash[offset + 1] & 0xff) << 16) |
                     ((hash[offset + 2] & 0xff) << 8) |
                     (hash[offset + 3] & 0xff)
      
      const otp = binary % Math.pow(10, digits)
      return otp.toString().padStart(digits, '0')
    }

    const timeStep = 30
    const time = Math.floor(Date.now() / 1000 / timeStep)
    let valid = false
    
    for (let i = -1; i <= 1; i++) {
      if (generateTOTP(user.twoFactorSecret, time + i, 6) === code) {
        valid = true
        break
      }
    }

    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' })
    }

    res.json({
      success: true,
      message: '2FA code verified successfully'
    })
  } catch (error) {
    console.error('2FA validate error:', error)
    res.status(500).json({ success: false, message: 'Error validating 2FA', error: error.message })
  }
})

// POST /api/auth/change-password - Change password from profile
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' })
    }

    // Update password
    user.password = newPassword
    user.passwordChangedAt = new Date()
    await user.save()

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ success: false, message: 'Error changing password', error: error.message })
  }
})

export default router
