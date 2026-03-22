import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { UserPlus, FileCheck, Wallet, Rocket, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Register your account',
    description: 'Sign up in minutes with our simple registration process',
  },
  {
    icon: FileCheck,
    number: '02',
    title: 'Verify your identity',
    description: 'Quick and secure KYC verification for your safety',
  },
  {
    icon: Wallet,
    number: '03',
    title: 'Deposit funds',
    description: 'Multiple payment methods with instant processing',
  },
  {
    icon: Rocket,
    number: '04',
    title: 'Start trading instantly',
    description: 'Access global markets and begin your trading journey',
  },
]

export default function GetStarted() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const navigate = useNavigate()

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-gray-900 dark:to-gray-950 transition-colors duration-500">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 right-1/4 w-96 h-96 bg-burgundy/5 dark:bg-burgundy/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
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
            Get Started
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white"
          >
            Start Trading in
            <span className="gradient-text block">Minutes</span>
          </motion.h2>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.15, duration: 0.6 }}
              className="relative"
            >
              <motion.div
                whileHover={{ y: -10 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 h-full"
              >
                {/* Number Badge */}
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-burgundy to-crimson rounded-full flex items-center justify-center text-black font-bold text-sm">
                  {step.number}
                </div>

                {/* Icon with animation */}
                <motion.div
                  className="w-14 h-14 rounded-xl bg-gradient-to-br from-burgundy/10 to-crimson/10 dark:from-burgundy/20 dark:to-crimson/20 flex items-center justify-center mb-4 mt-2"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                >
                  <step.icon className="w-7 h-7 text-burgundy dark:text-crimson-light" />
                </motion.div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {step.description}
                </p>
              </motion.div>

              {/* Connector Line (hidden on mobile and last item) */}
              {index < steps.length - 1 && (
                <motion.div
                  className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-burgundy to-crimson"
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: 1 } : {}}
                  transition={{ delay: 0.5 + index * 0.2, duration: 0.5 }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <motion.button
            onClick={() => navigate('/user/signup')}
            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Open Account Now
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
