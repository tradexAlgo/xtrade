import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useInView, useScroll, useSpring } from 'framer-motion'
import { 
  Menu, X, Sun, Moon, Zap, Shield, Globe, BarChart3, Cpu, Lock,
  DollarSign, BarChart2, Gem, Bitcoin, Building2, ArrowRight,
  Monitor, Smartphone, Laptop, Check, Star, Crown, Sparkles,
  Calendar, LineChart, History, Bot, Server, Eye, CheckCircle,
  UserPlus, FileCheck, Wallet, Rocket, Target, Heart, Award,
  MessageCircle, Mail, HelpCircle, FileText, MapPin, Facebook,
  Twitter, Linkedin, Instagram, Phone, ChevronDown, Download
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import priceStreamService from '../services/priceStream'

// ============== SCROLL PROGRESS ==============
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-burgundy to-crimson origin-left z-[60]"
      style={{ scaleX }}
    />
  )
}

// ============== NAVBAR ==============
const navLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Markets', href: '#markets' },
  { name: 'Platforms', href: '#platforms' },
  { name: 'Accounts', href: '#accounts' },
  { name: 'Tools', href: '#tools' },
  { name: 'Company', href: '#company' },
  { name: 'Support', href: '#support' },
]

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isDarkMode, toggleDarkMode } = useTheme()
  const navigate = useNavigate()

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass-effect transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <motion.a
            href="#home"
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img 
              src={isDarkMode ? "/extrede-logo.png" : "/extrede-logo.png"} 
              alt="Extredes" 
              className="h-12 w-auto object-contain"
            />
          </motion.a>

          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link, index) => (
              <motion.a
                key={link.name}
                href={link.href}
                className="text-gray-700 dark:text-gray-300 hover:text-burgundy dark:hover:text-crimson-light font-medium transition-colors relative group text-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-burgundy to-crimson transition-all duration-300 group-hover:w-full" />
              </motion.a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <motion.button
              onClick={toggleDarkMode}
              className="relative w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {isDarkMode ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, scale: 0, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Sun className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, scale: 0, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: -90, scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Moon className="w-5 h-5 text-gray-700" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>


            <motion.button
              onClick={() => navigate('/user/login')}
              className="px-4 py-2 text-burgundy dark:text-crimson-light font-semibold hover:bg-burgundy/10 rounded-full transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Log In
            </motion.button>
            <motion.button
              onClick={() => navigate('/user/signup')}
              className="btn-primary text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Open Account
            </motion.button>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <motion.button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
              whileTap={{ scale: 0.9 }}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700" />}
            </motion.button>
            <motion.button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileTap={{ scale: 0.9 }}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass-effect border-t border-gray-200 dark:border-gray-700"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-gray-700 dark:text-gray-300 hover:text-burgundy font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <button onClick={() => navigate('/user/login')} className="w-full py-3 text-burgundy font-semibold border border-burgundy rounded-full">
                  Log In
                </button>
                <button onClick={() => navigate('/user/signup')} className="w-full btn-primary">
                  Open Account
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ============== HERO ==============
const tickerSymbols = [
  { symbol: 'EURUSD', display: 'EUR/USD' },
  { symbol: 'GBPUSD', display: 'GBP/USD' },
  { symbol: 'USDJPY', display: 'USD/JPY' },
  { symbol: 'AUDUSD', display: 'AUD/USD' },
  { symbol: 'XAUUSD', display: 'XAU/USD' },
  { symbol: 'BTCUSDT', display: 'BTC/USD' },
  { symbol: 'ETHUSDT', display: 'ETH/USD' },
]

function Hero() {
  const [livePrices, setLivePrices] = useState({})
  const [prevPrices, setPrevPrices] = useState({})

  useEffect(() => {
    const unsubscribe = priceStreamService.subscribe('hero-ticker', (prices) => {
      setPrevPrices(prev => ({ ...prev, ...livePrices }))
      setLivePrices(prices)
    })
    return () => unsubscribe()
  }, [])

  const formatPrice = (symbol, priceData) => {
    if (!priceData) return '---'
    const price = priceData.bid || priceData.price || 0
    if (price === 0) return '---'
    if (symbol.includes('JPY')) return price.toFixed(2)
    if (symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('ETH')) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return price.toFixed(4)
  }

  const getChange = (symbol) => {
    const current = livePrices[symbol]?.bid || livePrices[symbol]?.price || 0
    const prev = prevPrices[symbol]?.bid || prevPrices[symbol]?.price || current
    if (!prev || prev === 0) return { change: '0.00%', up: true }
    const changePercent = ((current - prev) / prev) * 100
    return {
      change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
      up: changePercent >= 0
    }
  }

  const trades = tickerSymbols.map(({ symbol, display }) => ({
    pair: display,
    price: formatPrice(symbol, livePrices[symbol]),
    ...getChange(symbol)
  }))

  const allTrades = [...trades, ...trades]

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" poster="/extredelogowhite.png">
          <source src="/diosvideo5.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(108,14,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(108,14,42,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-gradient-to-t from-black/60 to-transparent pt-20 pb-6">
          <div className="relative overflow-hidden">
            <div className="flex gap-4 animate-scroll-left">
              {allTrades.map((trade, index) => (
                <div key={index} className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 min-w-max">
                  <span className="font-semibold text-white text-sm">{trade.pair}</span>
                  <span className="text-white/90 text-sm font-mono">{trade.price}</span>
                  <span className={`text-xs font-medium ${trade.up ? 'text-green-400' : 'text-red-400'}`}>{trade.change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
      `}</style>
    </section>
  )
}

// ============== FEATURES ==============
const features = [
  { icon: Cpu, title: 'Institutional-grade liquidity', description: 'Access deep liquidity pools for seamless trade execution.' },
  { icon: BarChart3, title: 'Real-time pricing', description: 'Get accurate, up-to-the-second market data.' },
  { icon: Zap, title: 'No dealing desk execution', description: 'Direct market access with transparent pricing.' },
  { icon: Globe, title: 'Multi-asset trading', description: 'Trade forex, indices, commodities, crypto, and shares.' },
]

function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div ref={ref} initial={{ opacity: 0, x: -50 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8 }}>
            <span className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4">Why Choose Extredes</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              A Platform Built for <span className="gradient-text block">Modern Traders</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Extredes combines advanced technology, deep liquidity, and professional tools.
            </p>
            <div className="grid grid-cols-3 gap-6">
              {[{ value: '0.0s', label: 'Execution' }, { value: '500+', label: 'Instruments' }, { value: '99.9%', label: 'Uptime' }].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + index * 0.1 }}
                whileHover={{ y: -10 }}
                className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700"
              >
                <motion.div className="w-14 h-14 rounded-xl bg-gradient-to-br from-burgundy to-crimson flex items-center justify-center mb-4" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                  <feature.icon className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============== MARKETS ==============
const markets = [
  { icon: DollarSign, title: 'Forex', description: 'Major, minor & exotic pairs', pairs: '80+ Pairs' },
  { icon: BarChart2, title: 'Indices', description: 'Trade global stock indices', pairs: '15+ Indices' },
  { icon: Gem, title: 'Commodities', description: 'Gold, silver, oil & more', pairs: '20+ Assets' },
  { icon: Bitcoin, title: 'Crypto', description: 'Digital asset CFDs', pairs: '50+ Cryptos' },
  { icon: Building2, title: 'Shares', description: 'Top global companies', pairs: '300+ Stocks' },
]

function Markets() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="markets" className="py-24 relative overflow-hidden dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4">Markets</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Trade Multiple Markets <span className="gradient-text block">in One Place</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {markets.map((market, index) => (
            <motion.div
              key={market.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700"
            >
              <motion.div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-burgundy to-crimson flex items-center justify-center mb-6" whileHover={{ rotate: 360 }}>
                <market.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{market.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{market.description}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {market.pairs}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== PLATFORMS ==============
const platforms = [
  { icon: Monitor, title: 'Web Trader', description: 'No download required', features: ['One-click trading', 'Advanced indicators', 'Multi-chart layout'] },
  { icon: Smartphone, title: 'Mobile App', description: 'Trade on the go', features: ['Push notifications', 'Biometric login', 'Quick deposits'] },
  { icon: Laptop, title: 'Desktop Terminal', description: 'Advanced trading', features: ['Algorithmic trading', 'Custom scripts', 'Depth of market'] },
]

function Platforms() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="platforms" className="py-24 relative overflow-hidden bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4">Platforms</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Powerful Platforms. <span className="gradient-text block">Seamless Experience.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.15 }}
              whileHover={{ y: -8 }}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700"
            >
              <motion.div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-burgundy to-crimson flex items-center justify-center mb-6" whileHover={{ scale: 1.1 }}>
                <platform.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{platform.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{platform.description}</p>
              <ul className="space-y-3">
                {platform.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-5 h-5 bg-gradient-to-br from-burgundy to-crimson rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== ACCOUNTS ==============
const accounts = [
  { icon: Star, name: 'Standard', price: '0', features: ['$0 min. deposit', 'Competitive spreads', 'No commission'], popular: false },
  { icon: Zap, name: 'ECN & Raw', price: '200', features: ['$200 min. deposit', 'Raw spreads from 0.0', 'Low commission'], popular: true },
  { icon: Crown, name: 'Pro', price: '500', features: ['$500 min. deposit', 'Tight spreads', 'Priority execution'], popular: false },
  { icon: Sparkles, name: 'VIP', price: '10K', features: ['$10,000 min. deposit', 'Institutional pricing', 'Dedicated manager'], popular: false },
]

function Accounts() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="accounts" className="py-24 relative overflow-hidden dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4">Account Types</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Accounts Designed for <span className="gradient-text block">Every Trader</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {accounts.map((account, index) => (
            <motion.div
              key={account.name}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.15 }}
              whileHover={{ y: -10 }}
              className={`relative rounded-2xl p-8 ${account.popular ? 'bg-gradient-to-br from-burgundy to-crimson text-black shadow-2xl scale-105' : 'bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700'}`}
            >
              {account.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-burgundy px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg">
                  <Zap className="w-4 h-4" /> Most Popular
                </div>
              )}
              <motion.div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${account.popular ? 'bg-white/20' : 'bg-gradient-to-br from-burgundy to-crimson'}`} whileHover={{ rotate: 360 }}>
                <account.icon className="w-7 h-7 text-white" />
              </motion.div>
              <h3 className={`text-2xl font-bold mb-2 ${account.popular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{account.name}</h3>
              <div className="mb-6">
                <span className={`text-4xl font-bold ${account.popular ? 'text-white' : 'gradient-text'}`}>${account.price}</span>
                <span className={account.popular ? 'text-white/80' : 'text-gray-500'}> min.</span>
              </div>
              <ul className="space-y-3 mb-8">
                {account.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${account.popular ? 'bg-white/20' : 'bg-red-100 dark:bg-burgundy/20'}`}>
                      <Check className={`w-3 h-3 ${account.popular ? 'text-white' : 'text-burgundy'}`} />
                    </div>
                    <span className={account.popular ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}>{feature}</span>
                  </li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.05 }} className={`w-full py-3 rounded-full font-semibold ${account.popular ? 'bg-white text-burgundy' : 'bg-gradient-to-r from-burgundy to-crimson text-black'}`}>
                Open Account
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== TOOLS ==============
const tools = [
  { icon: BarChart3, title: 'Advanced Charting', description: '50+ technical indicators and drawing tools.' },
  { icon: Calendar, title: 'Economic Calendar', description: 'Real-time economic data and events.' },
  { icon: LineChart, title: 'Market Analysis', description: 'Daily insights from expert traders.' },
  { icon: Shield, title: 'Risk Management', description: 'Stop-loss, take-profit, and margin alerts.' },
  { icon: History, title: 'Trade History', description: 'Detailed analytics and reporting.' },
  { icon: Bot, title: 'Automated Trading', description: 'Build and deploy trading algorithms.' },
]

function Tools() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="tools" className="py-24 relative overflow-hidden bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4">Tools & Features</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Everything You Need to <span className="gradient-text block">Trade Smarter</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700"
            >
              <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burgundy to-crimson flex items-center justify-center mb-4" whileHover={{ scale: 1.1 }}>
                <tool.icon className="w-6 h-6 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tool.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{tool.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== SECURITY ==============
const trustPoints = [
  { icon: Lock, text: 'Secure payment gateways' },
  { icon: Shield, text: 'Encrypted data protection' },
  { icon: Server, text: 'Compliance-ready infrastructure' },
  { icon: Eye, text: '24/7 system monitoring' },
]

function Security() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-burgundy-dark to-gray-900">
        <motion.div className="absolute top-1/4 left-1/4 w-96 h-96 bg-burgundy/30 rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 15, repeat: Infinity }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div ref={ref} initial={{ opacity: 0, x: -50 }} animate={isInView ? { opacity: 1, x: 0 } : {}}>
            <span className="inline-block px-4 py-2 bg-white/10 text-white rounded-full text-sm font-semibold mb-4">Security & Trust</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Security You Can <span className="block text-crimson-light">Rely On</span>
            </h2>
            <p className="text-lg text-white/80 mb-8">Your funds and data are protected with industry-leading security protocols.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {trustPoints.map((point, index) => (
                <motion.div key={index} className="flex items-center gap-3" whileHover={{ x: 5 }}>
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <point.icon className="w-5 h-5 text-crimson-light" />
                  </div>
                  <span className="text-white/90 font-medium">{point.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={isInView ? { opacity: 1, x: 0 } : {}} className="relative flex items-center justify-center">
            <motion.div className="absolute w-64 h-64 border-2 border-white/10 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
            <motion.div className="absolute w-80 h-80 border-2 border-white/5 rounded-full" animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
            <motion.div className="relative w-40 h-40 bg-gradient-to-br from-burgundy to-crimson rounded-3xl flex items-center justify-center shadow-2xl" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}>
              <Shield className="w-20 h-20 text-white" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============== GET STARTED ==============
const steps = [
  { icon: UserPlus, number: '01', title: 'Register your account', description: 'Sign up in minutes' },
  { icon: FileCheck, number: '02', title: 'Verify your identity', description: 'Quick KYC verification' },
  { icon: Wallet, number: '03', title: 'Deposit funds', description: 'Multiple payment methods' },
  { icon: Rocket, number: '04', title: 'Start trading', description: 'Access global markets' },
]

function GetStarted() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4">Get Started</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Start Trading in <span className="gradient-text block">Minutes</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div key={step.number} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 + index * 0.15 }} className="relative">
              <motion.div whileHover={{ y: -10 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 h-full">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-burgundy to-crimson rounded-full flex items-center justify-center text-black font-bold text-sm">{step.number}</div>
                <motion.div className="w-14 h-14 rounded-xl bg-gradient-to-br from-burgundy/10 to-crimson/10 flex items-center justify-center mb-4 mt-2" whileHover={{ scale: 1.1 }}>
                  <step.icon className="w-7 h-7 text-burgundy dark:text-crimson-light" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{step.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center">
          <motion.button className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4" whileHover={{ scale: 1.05 }}>
            Open Account Now <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

// ============== COMPANY ==============
const values = [
  { icon: Target, title: 'Innovation', description: 'Cutting-edge technology' },
  { icon: Eye, title: 'Transparency', description: 'Clear pricing' },
  { icon: Heart, title: 'Integrity', description: 'Ethical practices' },
  { icon: Award, title: 'Excellence', description: 'Highest standards' },
]

const stats = [
  { value: '50K+', label: 'Active Traders' },
  { value: '150+', label: 'Countries' },
  { value: '10+', label: 'Years Experience' },
  { value: '24/7', label: 'Support' },
]

function Company() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="company" className="py-24 relative overflow-hidden dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div ref={ref} initial={{ opacity: 0, x: -50 }} animate={isInView ? { opacity: 1, x: 0 } : {}}>
            <span className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4">About Extredes</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Next-Generation <span className="gradient-text block">Trading Platform</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Extredes is a next-generation trading platform focused on providing traders with cutting-edge technology.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {values.map((value, index) => (
                <motion.div key={value.title} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5 + index * 0.1 }} whileHover={{ scale: 1.05 }} className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <div className="w-10 h-10 bg-gradient-to-br from-burgundy to-crimson rounded-lg flex items-center justify-center">
                    <value.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{value.title}</h4>
                    <p className="text-xs text-gray-500">{value.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={isInView ? { opacity: 1, x: 0 } : {}} className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.5 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.4 + index * 0.1 }} whileHover={{ scale: 1.1 }} className="text-center p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-gray-700 dark:to-gray-750 rounded-2xl">
                    <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============== SUPPORT ==============
const supportOptions = [
  { icon: MessageCircle, title: 'Live Chat', description: 'Instant support', action: 'Start Chat' },
  { icon: Mail, title: 'Email Support', description: 'Response within 24 hours', action: 'Send Email' },
  { icon: HelpCircle, title: 'Help Center', description: 'Browse knowledge base', action: 'Visit Center' },
  { icon: FileText, title: 'FAQs', description: 'Find quick answers', action: 'View FAQs' },
]

function Support() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="support" className="py-24 relative overflow-hidden bg-gradient-to-br from-gray-900 via-burgundy-dark to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-white/10 text-white rounded-full text-sm font-semibold mb-4">Support</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Need Help? We're Here <span className="block text-crimson-light">24/7</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {supportOptions.map((option, index) => (
            <motion.div
              key={option.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 cursor-pointer"
            >
              <motion.div className="w-14 h-14 rounded-xl bg-gradient-to-br from-burgundy to-crimson flex items-center justify-center mb-4" whileHover={{ scale: 1.1 }}>
                <option.icon className="w-7 h-7 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">{option.title}</h3>
              <p className="text-white/70 text-sm mb-4">{option.description}</p>
              <div className="flex items-center gap-2 text-crimson-light font-semibold text-sm">
                {option.action} <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== FOOTER ==============
const footerLinks = {
  company: { title: 'Company', links: ['About Us', 'Careers', 'Legal Documents', 'Privacy Policy'] },
  trading: { title: 'Trading', links: ['Markets', 'Platforms', 'Accounts', 'Fees'] },
  resources: { title: 'Resources', links: ['Blog', 'Tutorials', 'Glossary', 'Economic Calendar'] },
}

const socialLinks = [
  { icon: Facebook, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Linkedin, href: '#' },
  { icon: Instagram, href: '#' },
]

function Footer() {
  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="py-16 grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <motion.a href="#home" className="flex items-center mb-6" whileHover={{ scale: 1.05 }}>
              <img src="/extrede-logo.png" alt="Extredes" className="h-12 w-auto object-contain" />
            </motion.a>
            <p className="text-gray-400 mb-6 max-w-sm">
              Empowering traders worldwide with cutting-edge technology, transparent pricing, and reliable execution.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <motion.a key={index} href={social.href} className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-burgundy transition-colors" whileHover={{ scale: 1.1, y: -2 }}>
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="font-semibold text-lg mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 group">
                      {link}
                      <ArrowRight className="w-3 h-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">© 2026 Extredes. All Rights Reserved.</p>
            <p className="text-gray-500 text-xs text-center md:text-right max-w-md">
              Trading leveraged products involves risk and may not be suitable for all investors.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ============== MAIN LANDING PAGE ==============
export default function LandingPage() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  return (
    <div className="relative overflow-x-hidden bg-white dark:bg-gray-950 transition-colors duration-500">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Markets />
        <Platforms />
        <Accounts />
        <Tools />
        <Security />
        <GetStarted />
        <Company />
        <Support />
      </main>
      <Footer />
      
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-burgundy/5 dark:bg-burgundy/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-crimson/5 dark:bg-crimson/10 rounded-full blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  )
}
