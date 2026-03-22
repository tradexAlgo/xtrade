import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Lock, Server, Eye, CheckCircle } from 'lucide-react'

const trustPoints = [
  { icon: Lock, text: 'Secure payment gateways' },
  { icon: Shield, text: 'Encrypted data protection' },
  { icon: Server, text: 'Compliance-ready infrastructure' },
  { icon: Eye, text: '24/7 system monitoring' },
]

export default function Security() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-burgundy-dark to-gray-900">
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-burgundy/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-crimson/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
              className="inline-block px-4 py-2 bg-white/10 text-white rounded-full text-sm font-semibold mb-4"
            >
              Security & Trust
            </motion.span>
            
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold mb-6 text-white"
            >
              Security You Can
              <span className="block text-crimson-light">Rely On</span>
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
              className="text-lg text-white/80 mb-8 leading-relaxed"
            >
              Your funds and data are protected with industry-leading security protocols. Extredes uses encrypted transactions, segregated accounts, and advanced monitoring systems to ensure complete protection at every step.
            </motion.p>

            {/* Trust Points */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="grid sm:grid-cols-2 gap-4"
            >
              {trustPoints.map((point, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: 5 }}
                >
                  <motion.div
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center"
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(212, 26, 51, 0.3)' }}
                  >
                    <point.icon className="w-5 h-5 text-crimson-light" />
                  </motion.div>
                  <span className="text-white/90 font-medium">{point.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Animated Shield */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex items-center justify-center"
          >
            {/* Animated rings */}
            <motion.div
              className="absolute w-64 h-64 border-2 border-white/10 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute w-80 h-80 border-2 border-white/5 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute w-96 h-96 border-2 border-white/5 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />

            {/* Central Shield Icon */}
            <motion.div
              className="relative w-40 h-40 bg-gradient-to-br from-burgundy to-crimson rounded-3xl flex items-center justify-center shadow-2xl"
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 0 0 0 rgba(212, 26, 51, 0.4)',
                  '0 0 0 20px rgba(212, 26, 51, 0)',
                  '0 0 0 0 rgba(212, 26, 51, 0.4)',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Shield className="w-20 h-20 text-white" />
            </motion.div>

            {/* Floating checkmarks */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  top: `${20 + i * 15}%`,
                  left: i % 2 === 0 ? '10%' : '80%',
                }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              >
                <CheckCircle className="w-6 h-6 text-green-400" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
