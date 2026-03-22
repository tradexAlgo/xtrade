import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Transaction from '../models/Transaction.js'
import Trade from '../models/Trade.js'
import { sendTemplateEmail } from '../services/emailService.js'
import EmailSettings from '../models/EmailSettings.js'

const router = express.Router()

// GET /api/admin/dashboard-stats - Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Get user stats
    const totalUsers = await User.countDocuments()
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newThisWeek = await User.countDocuments({ createdAt: { $gte: oneWeekAgo } })
    const KYC = (await import('../models/KYC.js')).default
    const pendingKYC = await KYC.countDocuments({ status: 'pending' })
    
    // Get transaction stats (using correct capitalized enum values)
    // Include both Deposit and Admin_Fund_Add in total deposits
    const depositStats = await Transaction.aggregate([
      { $match: { type: { $in: ['Deposit', 'Admin_Fund_Add'] }, status: { $in: ['Approved', 'Completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const withdrawalStats = await Transaction.aggregate([
      { $match: { type: 'Withdrawal', status: { $in: ['Approved', 'Completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const pendingWithdrawals = await Transaction.countDocuments({ type: 'Withdrawal', status: 'Pending' })
    
    // Get active trades count
    const activeTrades = await Trade.countDocuments({ status: { $in: ['OPEN', 'PENDING'] } })
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        newThisWeek,
        pendingKYC,
        totalDeposits: depositStats[0]?.total || 0,
        totalWithdrawals: withdrawalStats[0]?.total || 0,
        pendingWithdrawals,
        activeTrades
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message })
  }
})

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json({
      success: true,
      message: 'Users fetched successfully',
      users,
      total: users.length
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message })
  }
})

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message })
  }
})

// PUT /api/admin/users/:id/password - Change user password
router.put('/users/:id/password', async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    user.password = password
    await user.save()
    
    res.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error updating password:', error)
    res.status(500).json({ success: false, message: 'Error updating password', error: error.message })
  }
})

// POST /api/admin/users/:id/deduct - Deduct funds from user wallet
router.post('/users/:id/deduct', async (req, res) => {
  try {
    const { amount, reason } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    // Use Wallet model (same as user wallet page)
    const Wallet = (await import('../models/Wallet.js')).default
    let wallet = await Wallet.findOne({ userId: req.params.id })
    if (!wallet) {
      return res.status(400).json({ success: false, message: 'User has no wallet' })
    }
    
    if ((wallet.balance || 0) < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' })
    }
    
    wallet.balance = (wallet.balance || 0) - parseFloat(amount)
    await wallet.save()
    
    console.log(`[Admin] Deducted $${amount} from user ${user.email} wallet. New balance: $${wallet.balance}`)
    
    res.json({ 
      success: true,
      message: 'Funds deducted successfully',
      newBalance: wallet.balance
    })
  } catch (error) {
    console.error('Error deducting funds:', error)
    res.status(500).json({ success: false, message: 'Error deducting funds', error: error.message })
  }
})

// POST /api/admin/users/:id/add-fund - Add funds to user wallet (Admin only)
router.post('/users/:id/add-fund', async (req, res) => {
  try {
    const { amount, reason, adminId } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    // Use Wallet model (same as user wallet page)
    const Wallet = (await import('../models/Wallet.js')).default
    const Transaction = (await import('../models/Transaction.js')).default
    let wallet = await Wallet.findOne({ userId: req.params.id })
    if (!wallet) {
      wallet = new Wallet({ userId: req.params.id, balance: 0 })
    }
    
    const previousBalance = wallet.balance || 0
    wallet.balance = previousBalance + parseFloat(amount)
    await wallet.save()
    
    // Create transaction record for admin fund addition to wallet
    await Transaction.create({
      userId: req.params.id,
      walletId: wallet._id,
      type: 'Admin_Fund_Add',
      amount: parseFloat(amount),
      paymentMethod: 'System',
      description: reason || 'Admin wallet fund addition',
      status: 'Completed',
      transactionRef: `ADMIN${Date.now()}`,
      processedBy: adminId || null,
      processedAt: new Date()
    })
    
    console.log(`[Admin] Added $${amount} to user ${user.email} wallet. Balance: $${previousBalance} -> $${wallet.balance}`)
    
    res.json({ 
      success: true,
      message: 'Funds added successfully',
      previousBalance,
      newBalance: wallet.balance,
      amountAdded: parseFloat(amount)
    })
  } catch (error) {
    console.error('Error adding funds:', error)
    res.status(500).json({ success: false, message: 'Error adding funds', error: error.message })
  }
})

// POST /api/admin/trading-account/:id/add-fund - Add funds to trading account (Admin only)
router.post('/trading-account/:id/add-fund', async (req, res) => {
  try {
    const { amount, reason, adminId } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const Transaction = (await import('../models/Transaction.js')).default
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ success: false, message: 'Trading account not found' })
    }
    
    const previousBalance = account.balance || 0
    account.balance = previousBalance + parseFloat(amount)
    await account.save()
    
    // Create transaction record for admin fund addition
    await Transaction.create({
      userId: account.userId,
      type: 'Admin_Fund_Add',
      amount: parseFloat(amount),
      paymentMethod: 'System',
      tradingAccountId: account._id,
      tradingAccountName: account.accountId,
      description: reason || 'Admin fund addition',
      status: 'Completed',
      transactionRef: `ADMIN${Date.now()}`,
      processedBy: adminId || null,
      processedAt: new Date()
    })
    
    res.json({ 
      success: true,
      message: 'Funds added to trading account successfully',
      previousBalance,
      newBalance: account.balance
    })
  } catch (error) {
    console.error('Error adding funds to trading account:', error)
    res.status(500).json({ success: false, message: 'Error adding funds', error: error.message })
  }
})

// POST /api/admin/trading-account/:id/deduct - Deduct funds from trading account (Admin only)
router.post('/trading-account/:id/deduct', async (req, res) => {
  try {
    const { amount, reason } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ success: false, message: 'Trading account not found' })
    }
    
    if ((account.balance || 0) < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance in trading account' })
    }
    
    account.balance = (account.balance || 0) - parseFloat(amount)
    await account.save()
    
    res.json({ 
      success: true,
      message: 'Funds deducted from trading account successfully',
      newBalance: account.balance
    })
  } catch (error) {
    console.error('Error deducting funds from trading account:', error)
    res.status(500).json({ success: false, message: 'Error deducting funds', error: error.message })
  }
})

// PUT /api/admin/users/:id/block - Block/Unblock user
router.put('/users/:id/block', async (req, res) => {
  try {
    const { blocked, reason } = req.body
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    user.isBlocked = blocked
    user.blockReason = blocked ? (reason || 'Blocked by admin') : ''
    await user.save()
    
    res.json({ 
      success: true,
      message: blocked ? 'User blocked successfully' : 'User unblocked successfully',
      isBlocked: user.isBlocked
    })
  } catch (error) {
    console.error('Error updating user block status:', error)
    res.status(500).json({ success: false, message: 'Error updating user status', error: error.message })
  }
})

// PUT /api/admin/users/:id/profile - Update user profile
router.put('/users/:id/profile', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth, country, address, adminId } = req.body

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Check if email is being changed and if it's already in use
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await User.findOne({ email: email.toLowerCase() })
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(400).json({ success: false, message: 'Email already in use by another account' })
      }
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName
    if (lastName !== undefined) user.lastName = lastName
    if (email !== undefined) user.email = email.toLowerCase()
    if (phone !== undefined) user.phone = phone
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth
    if (country !== undefined) user.country = country
    if (address !== undefined) user.address = address

    await user.save()

    console.log(`Admin ${adminId} updated profile for user ${user._id}`)

    res.json({ success: true, message: 'Profile updated successfully', user })
  } catch (error) {
    console.error('Error updating user profile:', error)
    res.status(500).json({ success: false, message: 'Error updating profile', error: error.message })
  }
})

// PUT /api/admin/users/:id/ban - Ban/Unban user
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { banned, reason } = req.body
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    user.isBanned = banned
    user.banReason = banned ? (reason || 'Banned by admin') : ''
    if (banned) {
      user.isBlocked = true
    }
    await user.save()

    // Send email notification
    try {
      if (user.email) {
        const settings = await EmailSettings.findOne()
        const templateSlug = banned ? 'account_banned' : 'account_unbanned'
        await sendTemplateEmail(templateSlug, user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          email: user.email,
          reason: reason || 'Policy violation',
          date: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Extrede',
          loginUrl: settings?.loginUrl || 'https://Extrede.com/login',
          supportEmail: settings?.supportEmail || 'support@Extrede.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending ban/unban email:', emailError)
    }
    
    res.json({ 
      success: true,
      message: banned ? 'User banned successfully' : 'User unbanned successfully',
      isBanned: user.isBanned
    })
  } catch (error) {
    console.error('Error updating user ban status:', error)
    res.status(500).json({ success: false, message: 'Error updating user status', error: error.message })
  }
})

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message })
  }
})

// ==================== CREDIT/BONUS SYSTEM ====================

// POST /api/admin/trading-account/:id/add-credit - Add credit/bonus to trading account
router.post('/trading-account/:id/add-credit', async (req, res) => {
  try {
    const { amount, reason, adminId } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ success: false, message: 'Trading account not found' })
    }
    
    const previousCredit = account.credit || 0
    account.credit = previousCredit + parseFloat(amount)
    await account.save()
    
    // Log the credit addition (optional - don't fail if logging fails)
    if (adminId) {
      try {
        const AdminLog = (await import('../models/AdminLog.js')).default
        await AdminLog.create({
          adminId,
          action: 'ADD_CREDIT',
          targetType: 'TRADING_ACCOUNT',
          targetId: account._id,
          previousValue: { credit: previousCredit },
          newValue: { credit: account.credit },
          reason: reason || 'Credit/Bonus added'
        })
      } catch (logError) {
        console.error('Error logging credit addition:', logError)
      }
    }
    
    res.json({ 
      success: true,
      message: 'Credit added successfully',
      previousCredit,
      newCredit: account.credit,
      balance: account.balance
    })
  } catch (error) {
    console.error('Error adding credit:', error)
    res.status(500).json({ success: false, message: 'Error adding credit', error: error.message })
  }
})

// POST /api/admin/trading-account/:id/remove-credit - Remove credit from trading account
router.post('/trading-account/:id/remove-credit', async (req, res) => {
  try {
    const { amount, reason, adminId } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }
    
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ message: 'Trading account not found' })
    }
    
    const previousCredit = account.credit || 0
    if (amount > previousCredit) {
      return res.status(400).json({ message: 'Cannot remove more credit than available' })
    }
    
    account.credit = previousCredit - parseFloat(amount)
    await account.save()
    
    // Log the credit removal (optional)
    if (adminId) {
      try {
        const AdminLog = (await import('../models/AdminLog.js')).default
        await AdminLog.create({
          adminId,
          action: 'REMOVE_CREDIT',
          targetType: 'TRADING_ACCOUNT',
          targetId: account._id,
          previousValue: { credit: previousCredit },
          newValue: { credit: account.credit },
          reason: reason || 'Credit removed'
        })
      } catch (logError) {
        console.error('Error logging credit removal:', logError)
      }
    }
    
    res.json({ 
      message: 'Credit removed successfully',
      previousCredit,
      newCredit: account.credit
    })
  } catch (error) {
    console.error('Error removing credit:', error)
    res.status(500).json({ message: 'Error removing credit', error: error.message })
  }
})

// GET /api/admin/trading-account/:id/summary - Get account summary with equity calculation
router.get('/trading-account/:id/summary', async (req, res) => {
  try {
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const Trade = (await import('../models/Trade.js')).default
    
    const account = await TradingAccount.findById(req.params.id).populate('userId', 'firstName lastName email')
    if (!account) {
      return res.status(404).json({ message: 'Trading account not found' })
    }
    
    // Get open trades for margin calculation
    const openTrades = await Trade.find({ tradingAccountId: account._id, status: 'OPEN' })
    
    const usedMargin = openTrades.reduce((sum, t) => sum + (t.marginUsed || 0), 0)
    const floatingPnl = openTrades.reduce((sum, t) => sum + (t.floatingPnl || 0), 0)
    
    // Equity = Balance + Credit + Floating PnL
    const equity = account.balance + (account.credit || 0) + floatingPnl
    // Free Margin = Balance - Used Margin (not equity based)
    const freeMargin = account.balance - usedMargin
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0
    
    res.json({
      account: {
        _id: account._id,
        accountId: account.accountId,
        userId: account.userId,
        balance: account.balance,
        credit: account.credit || 0,
        equity,
        usedMargin,
        freeMargin,
        marginLevel: marginLevel.toFixed(2),
        floatingPnl,
        leverage: account.leverage,
        status: account.status,
        openTradesCount: openTrades.length
      }
    })
  } catch (error) {
    console.error('Error fetching account summary:', error)
    res.status(500).json({ message: 'Error fetching account summary', error: error.message })
  }
})

// POST /api/admin/login-as-user/:userId - Generate token to login as user
router.post('/login-as-user/:userId', async (req, res) => {
  try {
    const { adminId } = req.body
    
    const user = await User.findById(req.params.userId).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // Log the admin login as user action (optional)
    if (adminId) {
      try {
        const AdminLog = (await import('../models/AdminLog.js')).default
        await AdminLog.create({
          adminId,
          action: 'LOGIN_AS_USER',
          targetType: 'USER',
          targetId: user._id,
          reason: `Admin logged in as user: ${user.email}`
        })
      } catch (logError) {
        console.error('Error logging login as user:', logError)
      }
    }
    
    // Generate a simple token (in production, use JWT)
    const jwt = (await import('jsonwebtoken')).default
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdminSession: true },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '2h' }
    )
    
    res.json({
      message: 'Login as user successful',
      token,
      user
    })
  } catch (error) {
    console.error('Error logging in as user:', error)
    res.status(500).json({ message: 'Error logging in as user', error: error.message })
  }
})

// ==================== ARCHIVE/RESTORE TRADING ACCOUNTS ====================

// POST /api/admin/trading-account/:id/archive - Archive a trading account
router.post('/trading-account/:id/archive', async (req, res) => {
  try {
    const { adminId } = req.body
    
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ success: false, message: 'Trading account not found' })
    }
    
    if (account.status === 'Archived') {
      return res.status(400).json({ success: false, message: 'Account is already archived' })
    }
    
    const previousStatus = account.status
    account.status = 'Archived'
    await account.save()
    
    // Log the archive action
    if (adminId) {
      try {
        const AdminLog = (await import('../models/AdminLog.js')).default
        await AdminLog.create({
          adminId,
          action: 'ARCHIVE_ACCOUNT',
          targetType: 'TRADING_ACCOUNT',
          targetId: account._id,
          previousValue: { status: previousStatus },
          newValue: { status: 'Archived' },
          reason: 'Trading account archived by admin'
        })
      } catch (logError) {
        console.error('Error logging archive action:', logError)
      }
    }
    
    res.json({ 
      success: true,
      message: 'Account archived successfully',
      account: {
        _id: account._id,
        accountId: account.accountId,
        status: account.status
      }
    })
  } catch (error) {
    console.error('Error archiving account:', error)
    res.status(500).json({ success: false, message: 'Error archiving account', error: error.message })
  }
})

// POST /api/admin/trading-account/:id/restore - Restore an archived trading account
router.post('/trading-account/:id/restore', async (req, res) => {
  try {
    const { adminId } = req.body
    
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ success: false, message: 'Trading account not found' })
    }
    
    if (account.status !== 'Archived') {
      return res.status(400).json({ success: false, message: 'Account is not archived' })
    }
    
    account.status = 'Active'
    await account.save()
    
    // Log the restore action
    if (adminId) {
      try {
        const AdminLog = (await import('../models/AdminLog.js')).default
        await AdminLog.create({
          adminId,
          action: 'RESTORE_ACCOUNT',
          targetType: 'TRADING_ACCOUNT',
          targetId: account._id,
          previousValue: { status: 'Archived' },
          newValue: { status: 'Active' },
          reason: 'Trading account restored by admin'
        })
      } catch (logError) {
        console.error('Error logging restore action:', logError)
      }
    }
    
    res.json({ 
      success: true,
      message: 'Account restored successfully',
      account: {
        _id: account._id,
        accountId: account.accountId,
        status: account.status
      }
    })
  } catch (error) {
    console.error('Error restoring account:', error)
    res.status(500).json({ success: false, message: 'Error restoring account', error: error.message })
  }
})

// DELETE /api/admin/trading-account/:id/delete - Permanently delete a trading account
router.delete('/trading-account/:id/delete', async (req, res) => {
  try {
    const { adminId } = req.body
    
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    const Trade = (await import('../models/Trade.js')).default
    
    const account = await TradingAccount.findById(req.params.id)
    if (!account) {
      return res.status(404).json({ success: false, message: 'Trading account not found' })
    }
    
    // Check if account has open trades
    const openTrades = await Trade.countDocuments({ tradingAccountId: account._id, status: 'OPEN' })
    if (openTrades > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete account with open trades. Close all trades first.' })
    }
    
    // Log the delete action before deleting
    if (adminId) {
      try {
        const AdminLog = (await import('../models/AdminLog.js')).default
        await AdminLog.create({
          adminId,
          action: 'DELETE_ACCOUNT',
          targetType: 'TRADING_ACCOUNT',
          targetId: account._id,
          previousValue: { 
            accountId: account.accountId,
            balance: account.balance,
            status: account.status 
          },
          newValue: { deleted: true },
          reason: 'Trading account permanently deleted by admin'
        })
      } catch (logError) {
        console.error('Error logging delete action:', logError)
      }
    }
    
    // Delete all trades associated with this account
    await Trade.deleteMany({ tradingAccountId: account._id })
    
    // Delete the trading account
    await TradingAccount.findByIdAndDelete(req.params.id)
    
    res.json({ 
      success: true,
      message: 'Account deleted permanently'
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    res.status(500).json({ success: false, message: 'Error deleting account', error: error.message })
  }
})

// GET /api/admin/archived-trading-accounts - Get all archived trading accounts
router.get('/archived-trading-accounts', async (req, res) => {
  try {
    const TradingAccount = (await import('../models/TradingAccount.js')).default
    
    const archivedAccounts = await TradingAccount.find({ status: 'Archived' })
      .populate('userId', 'firstName lastName email')
      .populate('accountTypeId', 'name minDeposit')
      .sort({ updatedAt: -1 })
    
    res.json({
      success: true,
      accounts: archivedAccounts,
      total: archivedAccounts.length
    })
  } catch (error) {
    console.error('Error fetching archived accounts:', error)
    res.status(500).json({ success: false, message: 'Error fetching archived accounts', error: error.message })
  }
})

// ==================== PASSWORD RESET REQUESTS ====================

// GET /api/admin/password-reset-requests - Get all password reset requests
router.get('/password-reset-requests', async (req, res) => {
  try {
    const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default
    const { status } = req.query
    
    const filter = status ? { status } : {}
    const requests = await PasswordResetRequest.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
    
    // Get stats
    const pendingCount = await PasswordResetRequest.countDocuments({ status: 'Pending' })
    const completedCount = await PasswordResetRequest.countDocuments({ status: 'Completed' })
    const rejectedCount = await PasswordResetRequest.countDocuments({ status: 'Rejected' })
    
    res.json({ 
      success: true, 
      requests,
      stats: { pending: pendingCount, completed: completedCount, rejected: rejectedCount }
    })
  } catch (error) {
    console.error('Error fetching password reset requests:', error)
    res.status(500).json({ success: false, message: 'Error fetching requests', error: error.message })
  }
})

// PUT /api/admin/password-reset-requests/:id/process - Process password reset request
router.put('/password-reset-requests/:id/process', async (req, res) => {
  try {
    const { action, newPassword, adminRemarks } = req.body
    const PasswordResetRequest = (await import('../models/PasswordResetRequest.js')).default
    
    const request = await PasswordResetRequest.findById(req.params.id).populate('userId')
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' })
    }
    
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' })
    }
    
    if (action === 'approve') {
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
      }
      
      // Update user password
      const user = await User.findById(request.userId._id)
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' })
      }
      
      // Update email if requested
      if (request.newEmail) {
        user.email = request.newEmail
      }
      
      user.password = newPassword
      await user.save()
      
      request.status = 'Completed'
      request.processedAt = new Date()
      request.adminRemarks = adminRemarks || 'Password reset and sent to user email'
      await request.save()
      
      console.log(`[Password Reset] Completed for user: ${user.email}`)
      
      res.json({ 
        success: true, 
        message: `Password reset for ${user.email}. New password: ${newPassword}`,
        email: request.newEmail || request.email
      })
    } else if (action === 'reject') {
      request.status = 'Rejected'
      request.processedAt = new Date()
      request.adminRemarks = adminRemarks || 'Request rejected'
      await request.save()
      
      res.json({ success: true, message: 'Request rejected' })
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' })
    }
  } catch (error) {
    console.error('Error processing password reset:', error)
    res.status(500).json({ success: false, message: 'Error processing request', error: error.message })
  }
})

// POST /api/admin/user/:id/wallet-bonus - Add/Deduct bonus from user's wallet (non-withdrawable)
router.post('/user/:id/wallet-bonus', async (req, res) => {
  try {
    const { amount, action, reason, adminId } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    if (!['add', 'deduct'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Use "add" or "deduct"' })
    }
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    // Get or create wallet for user
    const Wallet = (await import('../models/Wallet.js')).default
    let wallet = await Wallet.findOne({ userId: user._id })
    if (!wallet) {
      wallet = await Wallet.create({ userId: user._id, balance: 0, bonusBalance: 0 })
    }
    
    const previousBonus = wallet.bonusBalance || 0
    
    if (action === 'add') {
      wallet.bonusBalance = previousBonus + parseFloat(amount)
    } else {
      if (amount > previousBonus) {
        return res.status(400).json({ success: false, message: 'Cannot deduct more than available bonus balance' })
      }
      wallet.bonusBalance = previousBonus - parseFloat(amount)
    }
    
    await wallet.save()
    
    // Create transaction record
    await Transaction.create({
      userId: user._id,
      walletId: wallet._id,
      type: action === 'add' ? 'Bonus' : 'Bonus_Deduction',
      amount: parseFloat(amount),
      paymentMethod: 'System',
      status: 'Completed',
      transactionRef: `BONUS${Date.now()}`,
      notes: reason || `Admin ${action === 'add' ? 'added' : 'deducted'} bonus (non-withdrawable)`
    })
    
    // Log the action
    if (adminId) {
      try {
        const AdminLog = (await import('../models/AdminLog.js')).default
        await AdminLog.create({
          adminId,
          action: action === 'add' ? 'ADD_WALLET_BONUS' : 'DEDUCT_WALLET_BONUS',
          targetType: 'USER',
          targetId: user._id,
          previousValue: { bonusBalance: previousBonus },
          newValue: { bonusBalance: wallet.bonusBalance },
          reason: reason || `Wallet bonus ${action}`
        })
      } catch (logError) {
        console.error('Error logging wallet bonus:', logError)
      }
    }
    
    res.json({ 
      success: true,
      message: `Wallet bonus ${action === 'add' ? 'added' : 'deducted'} successfully (non-withdrawable)`,
      previousBonus,
      newBonus: wallet.bonusBalance,
      totalWallet: wallet.balance + wallet.bonusBalance
    })
  } catch (error) {
    console.error('Error processing wallet bonus:', error)
    res.status(500).json({ success: false, message: 'Error processing wallet bonus', error: error.message })
  }
})

// GET /api/admin/logs - Get admin action logs with optional filtering
router.get('/logs', async (req, res) => {
  try {
    const { actions, limit = 50 } = req.query
    const AdminLog = (await import('../models/AdminLog.js')).default
    
    let query = {}
    if (actions) {
      const actionList = actions.split(',')
      query.action = { $in: actionList }
    }
    
    const logs = await AdminLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('adminId', 'firstName lastName email')
    
    res.json({ success: true, logs })
  } catch (error) {
    console.error('Error fetching admin logs:', error)
    res.status(500).json({ success: false, message: 'Error fetching logs', error: error.message })
  }
})

// GET /api/admin/pending-actions - Get all pending actions for admin dashboard
router.get('/pending-actions', async (req, res) => {
  try {
    // Import models dynamically to avoid circular dependencies
    const KYC = (await import('../models/KYC.js')).default
    const Wallet = (await import('../models/Wallet.js')).default
    const IBWallet = (await import('../models/IBWallet.js')).default
    const MasterTrader = (await import('../models/MasterTrader.js')).default
    const ChallengeAccount = (await import('../models/ChallengeAccount.js')).default

    // Pending KYC verifications
    const pendingKYC = await KYC.find({ status: 'PENDING' })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50)

    // Pending Withdrawals
    const pendingWithdrawals = await Transaction.find({ type: 'Withdrawal', status: 'Pending' })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50)

    // Pending Deposits
    const pendingDeposits = await Transaction.find({ type: 'Deposit', status: 'Pending' })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50)

    // Pending IB Withdrawals
    const pendingIBWithdrawals = await IBWallet.find({ 
      'transactions.status': 'PENDING',
      'transactions.type': 'WITHDRAWAL'
    })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50)

    // Pending Master Trader Applications
    const pendingMasterTraders = await MasterTrader.find({ status: 'PENDING' })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50)

    // Pending Challenge Accounts (awaiting review)
    const pendingChallenges = await ChallengeAccount.find({ status: 'PENDING_REVIEW' })
      .populate('userId', 'firstName lastName email')
      .populate('challengeId', 'name')
      .sort({ createdAt: -1 })
      .limit(50)

    // Summary counts
    const summary = {
      kyc: pendingKYC.length,
      withdrawals: pendingWithdrawals.length,
      deposits: pendingDeposits.length,
      ibWithdrawals: pendingIBWithdrawals.length,
      masterTraders: pendingMasterTraders.length,
      challenges: pendingChallenges.length,
      total: pendingKYC.length + pendingWithdrawals.length + pendingDeposits.length + 
             pendingIBWithdrawals.length + pendingMasterTraders.length + pendingChallenges.length
    }

    res.json({
      success: true,
      summary,
      pendingActions: {
        kyc: pendingKYC.map(k => ({
          _id: k._id,
          type: 'KYC',
          user: k.userId,
          documentType: k.documentType,
          createdAt: k.createdAt
        })),
        withdrawals: pendingWithdrawals.map(w => ({
          _id: w._id,
          type: 'Withdrawal',
          user: w.userId,
          amount: w.amount,
          method: w.paymentMethod,
          createdAt: w.createdAt
        })),
        deposits: pendingDeposits.map(d => ({
          _id: d._id,
          type: 'Deposit',
          user: d.userId,
          amount: d.amount,
          method: d.paymentMethod,
          createdAt: d.createdAt
        })),
        ibWithdrawals: pendingIBWithdrawals.map(i => ({
          _id: i._id,
          type: 'IB Withdrawal',
          user: i.userId,
          createdAt: i.updatedAt
        })),
        masterTraders: pendingMasterTraders.map(m => ({
          _id: m._id,
          type: 'Master Trader',
          user: m.userId,
          displayName: m.displayName,
          createdAt: m.createdAt
        })),
        challenges: pendingChallenges.map(c => ({
          _id: c._id,
          type: 'Challenge',
          user: c.userId,
          challengeName: c.challengeId?.name,
          createdAt: c.createdAt
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching pending actions:', error)
    res.status(500).json({ success: false, message: 'Error fetching pending actions', error: error.message })
  }
})

export default router
