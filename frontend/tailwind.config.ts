import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff5f0',
          100: '#ffe8dc',
          200: '#ffc9af',
          300: '#ffa882',
          400: '#ff8554',
          500: '#ff6b35',
          600: '#e8531d',
          700: '#c24014',
          800: '#9c3212',
          900: '#7a2811',
        },
        peach: {
          50: '#fff8f5',
          100: '#ffeee5',
          200: '#ffd5c2',
          300: '#ffba9f',
          400: '#ff9a7a',
          500: '#ff7f5c',
          DEFAULT: '#ff7f5c',
        },
        enterprise: {
          bg: '#fafafa',
          sidebar: '#1a1a2e',
          card: '#ffffff',
          border: '#e8e8e8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
