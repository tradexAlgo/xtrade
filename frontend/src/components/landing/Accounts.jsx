import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Star, Zap, Crown, Check, ArrowRight } from 'lucide-react'

const accounts = [
  {
    icon: Star,
    name: 'Starter Account',
    description: 'Perfect for beginners entering forex markets',
    price: '0',
    features: [
      'Low minimum deposit',
      'Standard spreads',
      'Basic tools',
      'Email support',
      'Web platform access',
    ],
    popular: false,
  },
  {
    icon: Zap,
    name: 'Pro Account',
    description: 'For experienced traders seeking precision',
    price: '500',
    features: [
      'Tight spreads',
      'Faster execution',
      'Advanced analytics',
      'Priority support',
      'All platforms',
      'API access',
    ],
    popular: true,
  },
  {
    icon: Crown,
    name: 'VIP Account',
    description: 'For professionals and high-volume traders',
    price: '10K',
    features: [
      'Institutional pricing',
      'Dedicated manager',
      'Priority support',
      'Custom solutions',
      'Exclusive events',
      'Personal analyst',
    ],
    popular: false,
  },
]

export default function Accounts() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="accounts" className="py-24 relative overflow-hidden dark:bg-gray-950 transition-colors duration-500">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-burgundy/5 dark:bg-burgundy/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-crimson/5 dark:bg-crimson/10 rounded-full blur-3xl"
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4"
          >
            Account Types
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white"
          >
            Accounts Designed for
            <span className="gradient-text block">Every Trader</span>
          </motion.h2>
        </motion.div>

        {/* Account Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {accounts.map((account, index) => (
            <motion.div
              key={account.name}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.15, duration: 0.6 }}
              whileHover={{ y: -10 }}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                account.popular
                  ? 'bg-gradient-to-br from-burgundy to-crimson text-black shadow-2xl scale-105'
                  : 'bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700'
              }`}
            >
              {/* Popular Badge */}
              {account.popular && (
                <motion.div
                  className="absolute -top-4 left-1/2 -translate-x-1/2"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="bg-white text-burgundy px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </div>
                </motion.div>
              )}

              {/* Icon with animation */}
              <motion.div
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                  account.popular ? 'bg-white/20' : 'bg-gradient-to-br from-burgundy to-crimson'
                }`}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <account.icon className="w-7 h-7 text-white" />
              </motion.div>

              {/* Content */}
              <h3 className={`text-2xl font-bold mb-2 ${account.popular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {account.name}
              </h3>
              <p className={`text-sm mb-4 ${account.popular ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {account.description}
              </p>

              {/* Price */}
              <div className="mb-6">
                <span className={`text-4xl font-bold ${account.popular ? 'text-white' : 'gradient-text'}`}>
                  ${account.price}
                </span>
                <span className={account.popular ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}> min. deposit</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {account.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      account.popular ? 'bg-white/20' : 'bg-red-100 dark:bg-burgundy/20'
                    }`}>
                      <Check className={`w-3 h-3 ${account.popular ? 'text-white' : 'text-burgundy dark:text-crimson-light'}`} />
                    </div>
                    <span className={account.popular ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-full py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  account.popular
                    ? 'bg-white text-burgundy hover:bg-gray-100'
                    : 'bg-gradient-to-r from-burgundy to-crimson text-black hover:from-[#4a0a1d] hover:to-[#a31428]'
                }`}
              >
                Open Account
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Compare Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <motion.button
            className="inline-flex items-center gap-2 text-burgundy dark:text-crimson-light font-semibold hover:underline"
            whileHover={{ x: 5 }}
          >
            Compare All Accounts
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
