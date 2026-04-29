/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // MIA Holding Base
        "mia-black":   "#0A0A0A",
        "mia-cream":   "#F5F3EE",
        "mia-card":    "#1A1A1A",
        "mia-surface": "#2A2A2A",
        "mia-border":  "#333333",
        // MIA Institutional
        "mia-blue":    "#5C8BC4",
        "mia-teal":    "#3ABFAA",
        "mia-deep":    "#2D4A6E",
        // Moneyflow Brand
        "mf-coral":    "#F04E37",
        "mf-orange":   "#FF8C42",
        // Financial semantics
        "gain":        "#22C55E",
        "loss":        "#EF4444",
        "neutral":     "#A1A1AA",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body:    ["var(--font-body)",    "sans-serif"],
        roboto:  ["var(--font-roboto)",  "sans-serif"],
      },
      backgroundImage: {
        "gradient-mf":  "linear-gradient(135deg, #F04E37, #FF8C42)",
        "gradient-mia": "linear-gradient(135deg, #5C8BC4, #3ABFAA)",
        "gradient-dark": "linear-gradient(180deg, #0A0A0A 0%, #111111 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(240,78,55,0.3)" },
          "50%":       { boxShadow: "0 0 40px rgba(240,78,55,0.6)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
