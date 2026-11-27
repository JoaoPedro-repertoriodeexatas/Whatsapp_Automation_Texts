/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Inter"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        legal: {
          light: '#0F2C59',
          dark: '#2E5EA8',
        },
        apple: {
          bg: '#FFFFFF',
          surface: '#F5F5F7',
          text: '#1D1D1F',
          secondary: '#6E6E73',
          bubbleIn: '#E9E9EB',
          darkBg: '#1C1C1E',
          darkSurface: '#2C2C2E',
          darkText: '#F5F5F7',
          darkSecondary: '#98989D',
          darkBubbleIn: '#3A3A3C',
          green: '#34C759',
          amber: '#FF9F0A',
        },
      },
      letterSpacing: {
        apple: '-0.02em',
      },
      boxShadow: {
        sheet: '0 24px 64px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'sheet-dark': '0 24px 64px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        segmented: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
