/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderWidth: {
        '5': '5px',
      },
      borderRadius: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
} 