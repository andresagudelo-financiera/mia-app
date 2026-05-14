/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // MIA semantic tokens — backed by CSS variables for light/dark mode.
        'mia-black': 'rgb(var(--color-mia-black) / <alpha-value>)',
        'mia-cream': 'rgb(var(--color-mia-cream) / <alpha-value>)',
        'mia-card': 'rgb(var(--color-mia-card) / <alpha-value>)',
        'mia-surface': 'rgb(var(--color-mia-surface) / <alpha-value>)',
        'mia-border': 'rgb(var(--color-mia-border) / <alpha-value>)',
        'mia-blue': 'rgb(var(--color-mia-blue) / <alpha-value>)',
        'mia-teal': 'rgb(var(--color-mia-teal) / <alpha-value>)',
        'mia-deep': 'rgb(var(--color-mia-deep) / <alpha-value>)',
        'mf-coral': 'rgb(var(--color-mf-coral) / <alpha-value>)',
        'mf-orange': 'rgb(var(--color-mf-orange) / <alpha-value>)',
        gain: 'rgb(var(--color-gain) / <alpha-value>)',
        loss: 'rgb(var(--color-loss) / <alpha-value>)',
        neutral: 'rgb(var(--color-neutral) / <alpha-value>)',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        roboto: ['var(--font-roboto)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-mf': 'linear-gradient(135deg, rgb(var(--color-mf-coral)), rgb(var(--color-mf-orange)))',
        'gradient-mia': 'linear-gradient(135deg, rgb(var(--color-mia-blue)), rgb(var(--color-mia-teal)))',
        'gradient-dark': 'linear-gradient(180deg, rgb(var(--color-mia-black)) 0%, rgb(var(--color-mia-card)) 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgb(var(--color-mf-coral) / 0.3)' },
          '50%': { boxShadow: '0 0 40px rgb(var(--color-mf-coral) / 0.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
