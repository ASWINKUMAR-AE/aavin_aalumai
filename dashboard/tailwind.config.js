/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0A73C0",
          navy: "#054C97",
          green: "#7CB340",
          light: "#EBF5FB",
          surface: "#F8FAFC",
        },
      },
    },
  },
  plugins: [],
}

