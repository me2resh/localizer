/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          950: '#07070a',
          900: '#0c0c0f',
          850: '#111114',
          800: '#161619',
          750: '#1b1b1f',
          700: '#222226',
          600: '#2e2e34',
          500: '#3e3e46',
          400: '#5c5c68',
          300: '#8a8a96',
          200: '#b4b4be',
          100: '#dddde3',
          50: '#ede9e3',
        },
        ember: {
          DEFAULT: '#e87042',
          light: '#f08858',
          dark: '#c85a30',
          900: '#3d1d10',
          800: '#6b2f16',
          glow: 'rgba(232, 112, 66, 0.12)',
        },
        steel: {
          DEFAULT: '#5b8def',
          light: '#7ba4f5',
          dark: '#4070d0',
        },
        jade: {
          DEFAULT: '#4ade80',
          dark: '#22c55e',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'recording-pulse': 'recordPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        recordPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '50%': { boxShadow: '0 0 0 16px rgba(239, 68, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
};
