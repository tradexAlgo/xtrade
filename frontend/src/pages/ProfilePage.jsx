import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  User,
  Wallet,
  FileText,
  Users,
  Copy,
  UserCircle,
  HelpCircle,
  Edit2,
  Camera,
  Upload,
  Sun,
  Moon,
  ArrowLeft,
  Home,
  Lock,
  Eye,
  EyeOff,
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Save, 
  X, 
  Building2, 
  Smartphone, 
  CreditCard, 
  Trophy,
  LogOut,
  CheckCircle, 
  Clock, 
  XCircle, 
  FileCheck
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // Change Email State
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false)
  const [changeEmailForm, setChangeEmailForm] = useState({
    newEmail: '',
    password: ''
  })
  const [changeEmailLoading, setChangeEmailLoading] = useState(false)
  const [changeEmailError, setChangeEmailError] = useState('')
  const [changeEmailSuccess, setChangeEmailSuccess] = useState('')
  
  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(storedUser.twoFactorEnabled || false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [twoFAStep, setTwoFAStep] = useState('setup') // 'setup', 'verify', 'disable'
  const [twoFASecret, setTwoFASecret] = useState('')
  const [twoFAOtpUrl, setTwoFAOtpUrl] = useState('')
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFAPassword, setTwoFAPassword] = useState('')
  const [twoFALoading, setTwoFALoading] = useState(false)
  const [twoFAError, setTwoFAError] = useState('')
  const [twoFASuccess, setTwoFASuccess] = useState('')
  
  // KYC State
  const [kycStatus, setKycStatus] = useState(null)
  const [kycLoading, setKycLoading] = useState(false)
  const [showKycForm, setShowKycForm] = useState(false)
  const [kycForm, setKycForm] = useState({
    documentType: 'aadhaar',
    documentNumber: '',
    frontImage: '',
    backImage: '',
    selfieImage: ''
  })

  // Bank Account State
  const [userBankAccounts, setUserBankAccounts] = useState([])
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankFormType, setBankFormType] = useState('Bank Transfer')
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    upiId: ''
  })
  const [bankLoading, setBankLoading] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchChallengeStatus()
    fetchKycStatus()
    fetchUserBankAccounts()
  }, [])

  // Fetch user's bank accounts
  const fetchUserBankAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks/${storedUser._id}`)
      const data = await res.json()
      setUserBankAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
    }
  }

  // Submit bank account for approval
  const handleBankSubmit = async () => {
    if (bankFormType === 'Bank Transfer') {
      if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName || !bankForm.ifscCode) {
        alert('Please fill all required bank details')
        return
      }
    } else {
      if (!bankForm.upiId) {
        alert('Please enter UPI ID')
        return
      }
    }

    setBankLoading(true)
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          type: bankFormType,
          ...bankForm
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Bank account submitted for approval!')
        setShowBankForm(false)
        setBankForm({
          bankName: '',
          accountNumber: '',
          accountHolderName: '',
          ifscCode: '',
          branchName: '',
          upiId: ''
        })
        fetchUserBankAccounts()
      } else {
        alert(data.message || 'Failed to submit bank account')
      }
    } catch (error) {
      console.error('Error submitting bank account:', error)
      alert('Failed to submit bank account')
    }
    setBankLoading(false)
  }

  // Delete bank account
  const handleDeleteBankAccount = async (id) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchUserBankAccounts()
      }
    } catch (error) {
      console.error('Error deleting bank account:', error)
    }
  }
  
  // Fetch KYC status
  const fetchKycStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/kyc/status/${storedUser._id}`)
      const data = await res.json()
      if (data.success && data.hasKYC) {
        setKycStatus(data.kyc)
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error)
    }
  }
  
  // Handle file to base64 conversion
  const handleFileChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setKycForm(prev => ({ ...prev, [field]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Handle Change Email
  const handleChangeEmail = async () => {
    if (!changeEmailForm.newEmail || !changeEmailForm.password) {
      setChangeEmailError('Please fill all fields')
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(changeEmailForm.newEmail)) {
      setChangeEmailError('Please enter a valid email address')
      return
    }
    
    setChangeEmailLoading(true)
    setChangeEmailError('')
    setChangeEmailSuccess('')
    
    try {
      const res = await fetch(`${API_URL}/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          newEmail: changeEmailForm.newEmail,
          password: changeEmailForm.password
        })
      })
      const data = await res.json()
      if (data.success) {
        setChangeEmailSuccess('Email changed successfully!')
        // Update local storage
        const updatedUser = { ...storedUser, email: changeEmailForm.newEmail }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setProfile(prev => ({ ...prev, email: changeEmailForm.newEmail }))
        setTimeout(() => {
          setShowChangeEmailModal(false)
          setChangeEmailForm({ newEmail: '', password: '' })
          setChangeEmailSuccess('')
        }, 2000)
      } else {
        setChangeEmailError(data.message || 'Failed to change email')
      }
    } catch (error) {
      console.error('Error changing email:', error)
      setChangeEmailError('Failed to change email. Please try again.')
    }
    setChangeEmailLoading(false)
  }

  // 2FA Setup
  const handle2FASetup = async () => {
    setTwoFALoading(true)
    setTwoFAError('')
    try {
      const res = await fetch(`${API_URL}/auth/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: storedUser._id })
      })
      const data = await res.json()
      if (data.success) {
        setTwoFASecret(data.secret)
        setTwoFAOtpUrl(data.otpauthUrl)
        setTwoFAStep('verify')
      } else {
        setTwoFAError(data.message || 'Failed to setup 2FA')
      }
    } catch (error) {
      setTwoFAError('Failed to setup 2FA. Please try again.')
    }
    setTwoFALoading(false)
  }

  // 2FA Verify
  const handle2FAVerify = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      setTwoFAError('Please enter a valid 6-digit code')
      return
    }
    setTwoFALoading(true)
    setTwoFAError('')
    try {
      const res = await fetch(`${API_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: storedUser._id, code: twoFACode })
      })
      const data = await res.json()
      if (data.success) {
        setTwoFASuccess('Two-factor authentication enabled successfully!')
        setTwoFactorEnabled(true)
        const updatedUser = { ...storedUser, twoFactorEnabled: true }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setTimeout(() => {
          setShow2FAModal(false)
          setTwoFACode('')
          setTwoFASuccess('')
          setTwoFAStep('setup')
        }, 2000)
      } else {
        setTwoFAError(data.message || 'Invalid verification code')
      }
    } catch (error) {
      setTwoFAError('Failed to verify code. Please try again.')
    }
    setTwoFALoading(false)
  }

  // 2FA Disable
  const handle2FADisable = async () => {
    if (!twoFAPassword) {
      setTwoFAError('Please enter your password')
      return
    }
    setTwoFALoading(true)
    setTwoFAError('')
    try {
      const res = await fetch(`${API_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: storedUser._id, password: twoFAPassword })
      })
      const data = await res.json()
      if (data.success) {
        setTwoFASuccess('Two-factor authentication disabled successfully!')
        setTwoFactorEnabled(false)
        const updatedUser = { ...storedUser, twoFactorEnabled: false }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setTimeout(() => {
          setShow2FAModal(false)
          setTwoFAPassword('')
          setTwoFASuccess('')
          setTwoFAStep('setup')
        }, 2000)
      } else {
        setTwoFAError(data.message || 'Failed to disable 2FA')
      }
    } catch (error) {
      setTwoFAError('Failed to disable 2FA. Please try again.')
    }
    setTwoFALoading(false)
  }

  // Submit KYC
  const handleKycSubmit = async () => {
    if (!kycForm.documentNumber || !kycForm.frontImage) {
      alert('Please fill document number and upload front image')
      return
    }
    
    setKycLoading(true)
    try {
      const res = await fetch(`${API_URL}/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          ...kycForm
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('KYC submitted successfully! Please wait for approval.')
        setShowKycForm(false)
        fetchKycStatus()
      } else {
        alert(data.message || 'Failed to submit KYC')
      }
    } catch (error) {
      console.error('Error submitting KYC:', error)
      alert('Failed to submit KYC')
    }
    setKycLoading(false)
  }

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) {
        setChallengeModeEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Error fetching challenge status:', error)
    }
  }
  
  const [profile, setProfile] = useState({
    firstName: storedUser.firstName || '',
    lastName: storedUser.lastName || '',
    email: storedUser.email || '',
    phone: storedUser.phone || '',
    address: storedUser.address || '',
    city: storedUser.city || '',
    country: storedUser.country || '',
    dateOfBirth: storedUser.dateOfBirth || '',
    bankDetails: storedUser.bankDetails || {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      branchName: ''
    },
    upiId: storedUser.upiId || ''
  })

  // Profile image state
  const [profileImage, setProfileImage] = useState(storedUser.profileImage || null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Fetch fresh user data on mount to get latest profile image
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        console.log('Fetched user data:', data)
        if (data.user) {
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(data.user))
          // Update profile image state
          if (data.user.profileImage) {
            console.log('Setting profile image:', data.user.profileImage)
            const fullUrl = data.user.profileImage.startsWith('http') 
              ? data.user.profileImage 
              : `${API_URL.replace('/api', '')}${data.user.profileImage}`
            console.log('Full profile image URL:', fullUrl)
            setProfileImage(data.user.profileImage)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
    fetchUserData()
  }, [])

  // Handle profile image upload
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('userId', storedUser._id)
      formData.append('profileImage', file)

      const res = await fetch(`${API_URL}/upload/profile-image`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (data.success || data.profileImage) {
        const imageUrl = data.profileImage
        setProfileImage(imageUrl)
        // Update localStorage
        const updatedUser = { ...storedUser, profileImage: imageUrl }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        alert('Profile image updated successfully!')
      } else {
        alert(data.message || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload profile image')
    }
    setUploadingImage(false)
  }

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Account', icon: User, path: '/account' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Orders', icon: FileText, path: '/orders' },
    { name: 'IB', icon: Users, path: '/ib' },
    { name: 'Copytrade', icon: Copy, path: '/copytrade' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
    { name: 'Support', icon: HelpCircle, path: '/support' },
    { name: 'Instructions', icon: FileText, path: '/instructions' },
  ]

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          ...profile
        })
      })
      const data = await res.json()
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        setEditing(false)
        alert('Profile updated successfully!')
      } else {
        alert(data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
    setLoading(false)
  }

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill all password fields')
      return
    }
    
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          currentPassword,
          newPassword
        })
      })
      const data = await res.json()
      
      if (data.success) {
        alert('Password changed successfully!')
        setShowPasswordModal(false)
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setShowPasswords({
          current: false,
          new: false,
          confirm: false
        })
      } else {
        alert(data.message || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Failed to change password')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-4 ${isDarkMode ? 'bg-dark-800 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <button onClick={() => navigate('/mobile')} className={`p-2 -ml-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
          <h1 className={`font-semibold text-lg flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile</h1>
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => navigate('/mobile')} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <Home size={20} className="text-gray-400" />
          </button>
        </header>
      )}

      {/* Sidebar - Hidden on Mobile */}
      {!isMobile && (
        <aside 
          className={`${sidebarExpanded ? 'w-48' : 'w-16'} ${isDarkMode ? 'bg-dark-900 border-gray-800' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="p-4 flex items-center justify-center">
            <img src={isDarkMode ? "/extrede-logo.png" : "/extrede-logo.png"} alt="Extrede" className="h-8 w-auto object-contain" />
          </div>
          <nav className="flex-1 px-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  item.name === 'Profile' ? 'bg-accent-green text-black' : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarExpanded && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>
          <div className={`p-2 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button onClick={toggleDarkMode} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {sidebarExpanded && <span className="text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <LogOut size={18} />
              {sidebarExpanded && <span className="text-sm">Log Out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-14' : ''}`}>
        {!isMobile && (
          <header className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Profile</h1>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </header>
        )}

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`${isMobile ? '' : 'max-w-3xl'}`}>
            {/* Profile Header */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border mb-4`}>
              <div className={`flex ${isMobile ? 'flex-col' : ''} items-center gap-4`}>
                <div className="relative">
                  {profileImage ? (
                    <img 
                      src={`${profileImage.startsWith('http') ? profileImage : `${API_URL.replace('/api', '')}${profileImage}`}?t=${Date.now()}`}
                      alt="Profile"
                      className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full object-cover border-2 border-accent-green bg-gray-700`}
                      onError={(e) => {
                        console.error('Image failed to load:', e.target.src)
                        setProfileImage(null)
                      }}
                      onLoad={() => console.log('Image loaded successfully')}
                    />
                  ) : (
                    <div className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} bg-accent-green/20 rounded-full flex items-center justify-center`}>
                      <span className={`text-accent-green font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                        {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <label className={`absolute bottom-0 right-0 w-6 h-6 bg-accent-green rounded-full flex items-center justify-center cursor-pointer ${uploadingImage ? 'opacity-50' : 'hover:bg-accent-green/80'}`}>
                    {uploadingImage ? (
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={12} className="text-black" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className={isMobile ? 'text-center' : ''}>
                  <h2 className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.firstName} {profile.lastName}</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{profile.email}</p>
                  <div className={`flex ${isMobile ? 'justify-center flex-wrap' : ''} items-center gap-2 mt-2`}>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      kycStatus?.status === 'approved' 
                        ? 'bg-green-500/20 text-green-500' 
                        : kycStatus?.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : kycStatus?.status === 'rejected'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-gray-500/20 text-gray-500'
                    }`}>
                      {kycStatus?.status === 'approved' ? 'Verified' 
                        : kycStatus?.status === 'pending' ? 'Under Review'
                        : kycStatus?.status === 'rejected' ? 'Rejected'
                        : 'Not Submitted'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500">
                      Since {storedUser.createdAt ? new Date(storedUser.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border`}>
              <h3 className={`font-semibold ${isMobile ? 'mb-4 text-sm' : 'mb-6'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Personal Information</h3>
              
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                <div>
                  <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.firstName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.lastName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Mail size={14} /> Email
                  </label>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.email}</p>
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Phone size={14} /> Phone
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.phone || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar size={14} /> Date of Birth
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.dateOfBirth || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                    <MapPin size={14} /> Country
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.country}
                      onChange={(e) => setProfile({...profile, country: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.country || '-'}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                    <MapPin size={14} /> Address
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.address || '-'}</p>
                  )}
                </div>
              </div>
            </div>



            {/* KYC Verification Section */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <FileCheck size={18} /> KYC Verification
              </h3>
              
              {/* KYC Status Display */}
              {kycStatus ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    kycStatus.status === 'approved' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : kycStatus.status === 'pending'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {kycStatus.status === 'approved' && <CheckCircle size={24} className="text-green-500" />}
                      {kycStatus.status === 'pending' && <Clock size={24} className="text-yellow-500" />}
                      {kycStatus.status === 'rejected' && <XCircle size={24} className="text-red-500" />}
                      <div>
                        <p className={`font-medium ${
                          kycStatus.status === 'approved' ? 'text-green-500' 
                            : kycStatus.status === 'pending' ? 'text-yellow-500' 
                            : 'text-red-500'
                        }`}>
                          {kycStatus.status === 'approved' && 'KYC Verified'}
                          {kycStatus.status === 'pending' && 'KYC Under Review'}
                          {kycStatus.status === 'rejected' && 'KYC Rejected'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Document: {kycStatus.documentType?.replace('_', ' ').toUpperCase()}
                        </p>
                        {kycStatus.status === 'rejected' && kycStatus.rejectionReason && (
                          <p className="text-red-400 text-sm mt-1">Reason: {kycStatus.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {kycStatus.status === 'rejected' && (
                    <button
                      onClick={() => {
                        setKycForm({ documentType: 'aadhaar', documentNumber: '', frontImage: '', backImage: '', selfieImage: '' })
                        setShowKycForm(true)
                      }}
                      className="w-full py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90"
                    >
                      Resubmit KYC
                    </button>
                  )}
                </div>
              ) : showKycForm ? (
                <div className="space-y-4">
                  {/* Document Type */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Document Type</label>
                    <select
                      value={kycForm.documentType}
                      onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    >
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="pan_card">PAN Card</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                      <option value="voter_id">Voter ID</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  
                  {/* Document Number */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Document Number</label>
                    <input
                      type="text"
                      value={kycForm.documentNumber}
                      onChange={(e) => setKycForm({ ...kycForm, documentNumber: e.target.value })}
                      placeholder="Enter document number"
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  
                  {/* Front Image Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Front Side of Document *</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.frontImage ? (
                        <div className="relative">
                          <img src={kycForm.frontImage} alt="Front" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, frontImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload front side</p>
                          <p className="text-gray-500 text-xs">Max 5MB, JPG/PNG</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'frontImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Back Image Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Back Side of Document (Optional)</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.backImage ? (
                        <div className="relative">
                          <img src={kycForm.backImage} alt="Back" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, backImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload back side</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'backImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Selfie Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Selfie with Document (Optional)</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.selfieImage ? (
                        <div className="relative">
                          <img src={kycForm.selfieImage} alt="Selfie" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, selfieImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Camera size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload selfie</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'selfieImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowKycForm(false)}
                      className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleKycSubmit}
                      disabled={kycLoading}
                      className="flex-1 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90 disabled:opacity-50"
                    >
                      {kycLoading ? 'Submitting...' : 'Submit KYC'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileCheck size={32} className="text-yellow-500" />
                  </div>
                  <p className="text-white font-medium mb-2">KYC Not Submitted</p>
                  <p className="text-gray-400 text-sm mb-4">Complete your KYC verification to unlock all features</p>
                  <button
                    onClick={() => setShowKycForm(true)}
                    className="px-6 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90"
                  >
                    Start KYC Verification
                  </button>
                </div>
              )}
            </div>

            {/* Security Section */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Shield size={18} /> Security
              </h3>
              <div className="space-y-4">
                <div className={`flex items-center justify-between py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div>
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Password</p>
                    <p className="text-gray-500 text-sm">Last changed: Never</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <Lock size={16} />
                    Change
                  </button>
                </div>
                <div className={`flex items-center justify-between py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div>
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Two-Factor Authentication</p>
                    <p className="text-gray-500 text-sm">{twoFactorEnabled ? 'Enabled - Your account is protected' : 'Add an extra layer of security'}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setTwoFAStep(twoFactorEnabled ? 'disable' : 'setup')
                      setTwoFAError('')
                      setTwoFASuccess('')
                      setShow2FAModal(true)
                      if (!twoFactorEnabled) {
                        handle2FASetup()
                      }
                    }}
                    className={`text-sm hover:underline ${twoFactorEnabled ? 'text-red-500' : 'text-accent-green'}`}
                  >
                    {twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-dark-800 rounded-xl w-full max-w-md border border-gray-700">
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-white font-semibold">Change Password</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-4 pr-12 py-3 text-white placeholder-gray-500"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-4 pr-12 py-3 text-white placeholder-gray-500"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-4 pr-12 py-3 text-white placeholder-gray-500"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowPasswordModal(false)}
                        className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePasswordChange}
                        disabled={loading}
                        className="flex-1 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90 disabled:opacity-50"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2FA Modal */}
            {show2FAModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShow2FAModal(false)}>
                <div className={`w-full max-w-md rounded-2xl p-6 ${isDarkMode ? 'bg-dark-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {twoFAStep === 'disable' ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
                    </h3>
                    <button onClick={() => setShow2FAModal(false)} className="text-gray-500 hover:text-gray-400">
                      <X size={20} />
                    </button>
                  </div>

                  {twoFAError && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {twoFAError}
                    </div>
                  )}

                  {twoFASuccess && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                      {twoFASuccess}
                    </div>
                  )}

                  {twoFAStep === 'setup' && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-gray-400 mt-4">Setting up 2FA...</p>
                    </div>
                  )}

                  {twoFAStep === 'verify' && (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-dark-700' : 'bg-gray-100'}`}>
                        <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        <div className="flex justify-center my-4">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFAOtpUrl)}`}
                            alt="2FA QR Code"
                            className="w-48 h-48 rounded-lg"
                          />
                        </div>
                        <p className={`text-xs text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Or enter this code manually: <span className="font-mono text-accent-green">{twoFASecret}</span>
                        </p>
                      </div>

                      <div>
                        <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          2. Enter the 6-digit code from your app
                        </label>
                        <input
                          type="text"
                          value={twoFACode}
                          onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className={`w-full rounded-lg px-4 py-3 border text-center text-2xl tracking-widest font-mono ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          placeholder="000000"
                          maxLength={6}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setShow2FAModal(false)
                            setTwoFACode('')
                            setTwoFAStep('setup')
                          }}
                          className={`flex-1 py-3 rounded-lg ${isDarkMode ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handle2FAVerify}
                          disabled={twoFALoading || twoFACode.length !== 6}
                          className="flex-1 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90 disabled:opacity-50"
                        >
                          {twoFALoading ? 'Verifying...' : 'Enable 2FA'}
                        </button>
                      </div>
                    </div>
                  )}

                  {twoFAStep === 'disable' && (
                    <div className="space-y-4">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Enter your password to disable two-factor authentication. This will make your account less secure.
                      </p>

                      <div>
                        <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Password</label>
                        <input
                          type="password"
                          value={twoFAPassword}
                          onChange={(e) => setTwoFAPassword(e.target.value)}
                          className={`w-full rounded-lg px-4 py-3 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          placeholder="Enter your password"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setShow2FAModal(false)
                            setTwoFAPassword('')
                          }}
                          className={`flex-1 py-3 rounded-lg ${isDarkMode ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handle2FADisable}
                          disabled={twoFALoading || !twoFAPassword}
                          className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                          {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Change Email Modal */}
            {showChangeEmailModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowChangeEmailModal(false)}>
                <div className={`w-full max-w-md rounded-2xl p-6 ${isDarkMode ? 'bg-dark-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Change Email</h3>
                    <button onClick={() => setShowChangeEmailModal(false)} className="text-gray-500 hover:text-gray-400">
                      <X size={20} />
                    </button>
                  </div>

                  {changeEmailError && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {changeEmailError}
                    </div>
                  )}

                  {changeEmailSuccess && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                      {changeEmailSuccess}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current Email</label>
                      <p className={`px-4 py-3 rounded-lg ${isDarkMode ? 'bg-dark-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                        {profile.email}
                      </p>
                    </div>

                    <div>
                      <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>New Email</label>
                      <input
                        type="email"
                        value={changeEmailForm.newEmail}
                        onChange={(e) => setChangeEmailForm({...changeEmailForm, newEmail: e.target.value})}
                        className={`w-full rounded-lg px-4 py-3 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        placeholder="Enter new email address"
                      />
                    </div>

                    <div>
                      <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Password (for verification)</label>
                      <input
                        type="password"
                        value={changeEmailForm.password}
                        onChange={(e) => setChangeEmailForm({...changeEmailForm, password: e.target.value})}
                        className={`w-full rounded-lg px-4 py-3 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        placeholder="Enter your password"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowChangeEmailModal(false)
                          setChangeEmailForm({ newEmail: '', password: '' })
                          setChangeEmailError('')
                        }}
                        className={`flex-1 py-3 rounded-lg ${isDarkMode ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleChangeEmail}
                        disabled={changeEmailLoading}
                        className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {changeEmailLoading ? 'Changing...' : 'Change Email'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfilePage
