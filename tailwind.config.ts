import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf3',
          100: '#d8f3e1',
          200: '#b3e6c7',
          300: '#80d2a5',
          400: '#4bb77f',
          500: '#279c63',
          600: '#197d4f',
          700: '#156441',
          800: '#135036',
          900: '#10422e',
        },
      },
    },
  },
  plugins: [],
}

export default config
