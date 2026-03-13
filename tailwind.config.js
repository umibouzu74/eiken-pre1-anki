/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        en: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      colors: {
        accent: '#c0392b',
        accent2: '#2980b9',
        success: '#27ae60',
        warning: '#e67e22',
      },
    },
  },
  plugins: [],
}
