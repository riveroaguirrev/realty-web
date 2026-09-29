/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: { 50: '#f0f5ec', 100: '#e3ecda', 200: '#cadaba', 300: '#a4bc91', 400: '#7f9e68', 500: '#60824d', 600: '#365d46', 700: '#294c3e', 800: '#234134', 900: '#1b352a' },
        gray: { 50: '#f7f8f5', 100: '#eff2ea', 200: '#e0e6da', 300: '#cdd6c5', 400: '#a2ae98', 500: '#7d8b74', 600: '#62725a', 700: '#495d44', 800: '#334a35', 900: '#243c2e' },
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        secondary: {
          50: '#faf5ff',
          500: '#a855f7',
          600: '#9333ea',
        },
      },
      spacing: {
        128: '32rem',
      },
    },
  },
  plugins: [],
}
