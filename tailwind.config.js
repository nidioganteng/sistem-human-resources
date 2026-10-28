/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'Arial', 'Helvetica', 'sans-serif'],
        heading: ['"Inter Variable"', 'Inter', 'Arial', 'Helvetica', 'sans-serif'],
      },
      colors: {
        canvas: 'rgb(var(--surface) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        caption: 'rgb(var(--caption) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        field: 'rgb(var(--field) / <alpha-value>)',
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#818cf8',
          500: '#64748b',
          600: '#1c69d4',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04)',
        modal: '0 20px 40px rgb(15 23 42 / 0.18)',
      },
    },
  },
  plugins: [],
};
