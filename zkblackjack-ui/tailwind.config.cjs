/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme")

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        sm: "640px",
        // => @media (min-width: 640px) { ... }

        md: "768px",
        // => @media (min-width: 768px) { ... }

        lg: "1024px",
        // => @media (min-width: 1024px) { ... }

        xl: "1280px",
        // => @media (min-width: 1280px) { ... }

        "2xl": "1536px",
        // => @media (min-width: 1536px) { ... }
      },
      fontFamily: {
        // sans: [your_main_font],
        poppins: ["Poppins", ...defaultTheme.fontFamily.sans],
        lobster: ["Lobster", ...defaultTheme.fontFamily.sans],
        pacifico: ["Pacifico", ...defaultTheme.fontFamily.sans],
        press: ['"Press Start 2P"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
