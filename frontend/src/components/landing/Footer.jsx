import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, ArrowRight } from 'lucide-react'

const footerLinks = {
  company: {
    title: 'Company',
    links: ['About Us', 'Careers', 'Legal Documents', 'Privacy Policy', 'Terms & Conditions'],
  },
  trading: {
    title: 'Trading',
    links: ['Markets', 'Platforms', 'Accounts', 'Fees', 'Trading Conditions'],
  },
  resources: {
    title: 'Resources',
    links: ['Blog', 'Tutorials', 'Glossary', 'Economic Calendar'],
  },
  contact: {
    title: 'Contact',
    items: [
      { icon: Mail, text: 'support@extredes.com' },
      { icon: Phone, text: '+1 (555) 123-4567' },
      { icon: MapPin, text: '123 Trading Street, Financial District' },
    ],
  },
}

const socialLinks = [
  { icon: Facebook, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Linkedin, href: '#' },
  { icon: Instagram, href: '#' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-burgundy/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-crimson/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Footer Content */}
        <div className="py-16 grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.a
              href="#home"
              className="flex items-center mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <img 
                src="/Dioslogo.png" 
                alt="Extredes" 
                className="w-[120px] h-[120px] object-contain"
              />
            </motion.a>

            <p className="text-gray-400 mb-6 max-w-sm">
              Empowering traders worldwide with cutting-edge technology, transparent pricing, and reliable execution.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-burgundy transition-colors"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([key, section], sectionIndex) => (
            <div key={key}>
              <h4 className="font-semibold text-lg mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links ? (
                  section.links.map((link, linkIndex) => (
                    <motion.li
                      key={linkIndex}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: linkIndex * 0.05 }}
                    >
                      <a
                        href="#"
                        className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                      >
                        {link}
                        <ArrowRight className="w-3 h-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      </a>
                    </motion.li>
                  ))
                ) : (
                  section.items.map((item, itemIndex) => (
                    <motion.li
                      key={itemIndex}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: itemIndex * 0.05 }}
                      className="flex items-start gap-3 text-gray-400"
                    >
                      <item.icon className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
                      <span>{item.text}</span>
                    </motion.li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © 2026 Extredes. All Rights Reserved.
            </p>
            <p className="text-gray-500 text-xs text-center md:text-right max-w-md">
              Trading leveraged products involves risk and may not be suitable for all investors. Please ensure you understand the risks involved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
