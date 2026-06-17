/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fffaf0",
          100: "#f8ecd9",
          200: "#ecd6ba",
          300: "#d7b68c"
        },
        bark: {
          50: "#fbf7f0",
          100: "#f1e6d8",
          200: "#dfc8ad",
          300: "#c79f77",
          400: "#aa7448",
          500: "#8d5934",
          600: "#724629",
          700: "#573621",
          800: "#3f291d",
          900: "#2b1e18"
        },
        moss: {
          100: "#e5ead8",
          500: "#6f7d49",
          700: "#46512f",
          800: "#323b23"
        },
        clay: {
          100: "#f3ded0",
          200: "#e7bda3",
          500: "#b46a42",
          700: "#7c3f28"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(63, 41, 29, 0.10)",
        retro: "0 18px 0 rgba(63, 41, 29, 0.06), 0 22px 50px rgba(63, 41, 29, 0.16)"
      },
      fontFamily: {
        sans: [
          "Trebuchet MS",
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
