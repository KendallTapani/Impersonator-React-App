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
      animation: {
        ping: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        ping: {
          '0%': { transform: 'scale(1)', opacity: 0.75 },
          '75%, 100%': { transform: 'scale(2)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
} 