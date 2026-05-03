export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ['"Playfair Display"', "Georgia", "serif"],
      },
      colors: {
        calm: { 50: "#f8fbff", 100: "#ebf6ff", 200: "#d7ecff", 500: "#6ca8ff" },
        navy: {
          950: "#05070a",
          900: "#0a0c14",
          850: "#0b0f19",
          800: "#111118",
        },
        wellness: {
          cream: "#F9F7F2",
          paper: "#F7F5EE",
          sage: "#5E7D5E",
          sageMuted: "#84A17D",
          coral: "#E9B39B",
          coralDeep: "#EBB9A4",
          teal: "#00A884",
        },
      },
      boxShadow: {
        glow: "0 0 32px -8px rgba(37, 99, 235, 0.45)",
        "glow-violet": "0 0 40px -10px rgba(139, 92, 246, 0.35)",
        "glow-teal": "0 0 28px -8px rgba(45, 212, 191, 0.3)",
      },
    },
  },
  plugins: [],
};
