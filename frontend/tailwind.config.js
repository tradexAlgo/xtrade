/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: '#FCE205',
          dark: '#F0B90B',
          light: '#FDE047',
        },
        crimson: {
          DEFAULT: '#F0B90B',
          dark: '#EAB308',
          light: '#FEF08A',
        },
        dark: {
          900: 'var(--theme-bgPrimary, #0a0a0a)',
          800: 'var(--theme-bgSecondary, #111111)',
          700: 'var(--theme-bgCard, #1a1a1a)',
          600: 'var(--theme-bgHover, #222222)',
          500: '#2a2a2a',
        },
        accent: {
          green: 'var(--theme-primary, #D4A84B)',
          gold: 'var(--theme-primary, #D4A84B)',
          orange: 'var(--theme-accent, #C49A3D)',
        },
        theme: {
          primary: 'var(--theme-primary, #3B82F6)',
          secondary: 'var(--theme-secondary, #10B981)',
          accent: 'var(--theme-accent, #F59E0B)',
          success: 'var(--theme-success, #10B981)',
          error: 'var(--theme-error, #EF4444)',
          warning: 'var(--theme-warning, #F59E0B)',
          buy: 'var(--theme-buyColor, #3B82F6)',
          sell: 'var(--theme-sellColor, #EF4444)',
          profit: 'var(--theme-profitColor, #10B981)',
          loss: 'var(--theme-lossColor, #EF4444)',
        },
        burgundy: {
          DEFAULT: '#FCE205',
          light: '#FDE047',
          dark: '#F0B90B',
        },
        crimson: {
          DEFAULT: '#F0B90B',
          light: '#FEF08A',
          dark: '#EAB308',
        },
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'rotate-slow': 'rotate-slow 20s linear infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'rotate-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
