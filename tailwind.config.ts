import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'nav': {
          'bg-main': '#1a1a1d',
          'bg-panel': '#2c2c34',
          'text-main': '#e1e1e1',
          'text-muted': '#8a8d93',
          'border': '#444',
          'blue': '#4a90e2',
          'amber': '#e89f3c',
          'red': '#e74c3c',
          'green': '#2ecc71',
          'purple': '#6a44c1',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      backdropBlur: {
        xs: '5px',
      },
    },
  },
  plugins: [],
}

export default config