import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { login } from '../api/auth'

const Login = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  
  // Detect mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await login(formData)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      // Redirect to mobile view on mobile devices
      if (isMobile) {
        navigate('/mobile')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-burgundy/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-crimson/20 via-burgundy/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-burgundy/10 rounded-full blur-3xl" />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-800 shadow-2xl shadow-burgundy/10">
        {/* Close button */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/extrede-logo.png"
            alt="Extrede Logo"
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-full p-1 w-fit mb-8">
          <Link
            to="/user/signup"
            className="px-6 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Sign up
          </Link>
          <button
            onClick={() => setActiveTab('signin')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'signin' ? 'bg-gradient-to-r from-burgundy to-crimson text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign in
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-white mb-6">Welcome back</h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-burgundy/50 transition-colors"
            />
          </div>

          {/* Password field */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-11 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-burgundy/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="text-right">
            <Link to="/user/forgot-password" className="text-sm text-crimson-light hover:text-white transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-burgundy to-crimson text-black font-medium py-3 rounded-full hover:from-burgundy-dark hover:to-crimson-dark transition-all mt-2 disabled:opacity-50 shadow-lg shadow-burgundy/25"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/user/signup" className="text-crimson-light hover:text-white transition-colors">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
