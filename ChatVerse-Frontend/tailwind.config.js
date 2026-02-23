/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          teal: "#075E54",
          "light-teal": "#128C7E",
          green: "#25D366",
          "light-green": "#DCF8C6",
          "dark-bg": "#111b21",
          "dark-sidebar": "#202c33",
          "dark-header": "#202c33",
          "dark-message": "#005c4b",
          "dark-received": "#202c33",
          "emerald": "#00a884"
        }
      }
    },
  },
  plugins: [],
  darkMode: "class",
};
