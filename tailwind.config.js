/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fffdf8",
          100: "#faf6ef",
          200: "#f1e5d5",
          300: "#e6d7c3"
        },
        bark: {
          50: "#f7f1e8",
          100: "#eadbc9",
          200: "#d8bea1",
          300: "#c89d72",
          400: "#a97845",
          500: "#8d5e34",
          600: "#6b4423",
          700: "#51331f",
          800: "#3a2415",
          900: "#24160e"
        },
        moss: {
          100: "#e7eddf",
          500: "#6f8a5c",
          700: "#4f6f45",
          800: "#354a30"
        },
        clay: {
          100: "#f4e2d1",
          200: "#e9c29b",
          500: "#c88a45",
          700: "#8d5830"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(58, 36, 21, 0.10)",
        retro: "0 18px 0 rgba(107, 68, 35, 0.07), 0 28px 70px rgba(58, 36, 21, 0.18)",
        glow: "0 24px 70px rgba(200, 138, 69, 0.18)"
      },
      fontFamily: {
        sans: [
          "Avenir Next",
          "Geist",
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    },
  },
  plugins: [],
};
