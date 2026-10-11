/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080808',
        graphite: '#111111',
        silver: '#a7a7a7',
        signal: '#e1212c',
      },
      fontFamily: {
        sans: ['Geist', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
