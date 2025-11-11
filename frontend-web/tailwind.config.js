import scrollbarHide from 'tailwind-scrollbar-hide';
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00A9FF",
          dark: "#006DFF",
        },
        "surface-dark": "#071A36",
        "surface-darker": "#05132A",
      },
      fontFamily: {
        display: ["Poppins", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        "3xl": "2.5rem",
      },
      boxShadow: {
        hero: "0 60px 120px rgba(3, 10, 23, 0.75)",
        card: "0 32px 62px rgba(3, 10, 23, 0.6)",
      },
    },
  },
  plugins: [scrollbarHide],
};

