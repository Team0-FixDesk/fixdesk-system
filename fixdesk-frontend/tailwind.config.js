/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'Noto Sans Thai', 'Sarabun', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      inter: ['Inter', 'Noto Sans Thai', 'sans-serif'],
      sarabun: ['Sarabun', 'Noto Sans Thai', 'sans-serif'],
    },
    extend: {
      colors: {
        primary: {
          light: '#4db5ff',
          DEFAULT: '#1E48D1',
          dark: '#0d2a7a',
        },
      },
    },
  },
  plugins: [
    require('flowbite/plugin')
  ],
}
