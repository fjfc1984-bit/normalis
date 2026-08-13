import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Paleta NormaLis — idéntica a normalis-styles.css
      colors: {
        primary: {
          50:  '#E0F2F1',  // --bg / --primary-light
          100: '#B2DFDB',  // --border
          200: '#80CBC4',  // --sidebar-text
          300: '#4DB6AC',
          400: '#26A69A',  // --sidebar-active
          500: '#009688',
          600: '#00796B',  // --primary
          700: '#00695C',  // --text-muted
          800: '#004D40',  // --primary-dark
          900: '#00251A',  // --sidebar-bg / --text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: '#B2DFDB',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)',
        md:   '0 4px 20px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)',
        lg:   '0 16px 48px rgba(0,0,0,.14), 0 6px 16px rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [],
};

export default config;
