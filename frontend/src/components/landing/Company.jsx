import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Target, Eye, Heart, Award, Users, Globe } from 'lucide-react'

const values = [
  { icon: Target, title: 'Innovation', description: 'Cutting-edge technology for modern trading' },
  { icon: Eye, title: 'Transparency', description: 'Clear pricing and honest communication' },
  { icon: Heart, title: 'Integrity', description: 'Ethical practices in everything we do' },
  { icon: Award, title: 'Excellence', description: 'Committed to the highest standards' },
]

const stats = [
  { value: '50K+', label: 'Active Traders' },
  { value: '150+', label: 'Countries Served' },
  { value: '10+', label: 'Years Experience' },
  { value: '24/7', label: 'Support Available' },
]

export default function Company() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="company" className="py-24 relative overflow-hidden dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-2 bg-burgundy/10 text-burgundy dark:text-crimson-light rounded-full text-sm font-semibold mb-4"
            >
              About Extredes
            </motion.span>
            
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white"
            >
              Next-Generation
              <span className="gradient-text block">Trading Platform</span>
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed"
            >
              Extredes is a next-generation trading platform focused on providing traders with cutting-edge technology, transparent pricing, and reliable execution. Our mission is to empower traders worldwide with tools that simplify trading and maximize potential.
            </motion.p>

            {/* Values Grid */}
            <div className="grid grid-cols-2 gap-4">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-transparent dark:border-gray-700"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-burgundy to-crimson rounded-lg flex items-center justify-center flex-shrink-0">
                    <value.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{value.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{value.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Content - Stats */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            {/* Animated background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-burgundy/5 to-crimson/5 dark:from-burgundy/10 dark:to-crimson/10 rounded-3xl"
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />

            <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.4 + index * 0.1, type: "spring" }}
                    whileHover={{ scale: 1.1 }}
                    className="text-center p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-gray-700 dark:to-gray-750 rounded-2xl"
                  >
                    <motion.div
                      className="text-3xl md:text-4xl font-bold gradient-text mb-2"
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.5,
                      }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Decorative elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-burgundy to-crimson rounded-2xl opacity-20"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-crimson to-burgundy rounded-full opacity-20"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
