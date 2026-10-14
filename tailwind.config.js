/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50:  '#e6f4fb',
          100: '#b3ddf4',
          200: '#80c6ed',
          300: '#4daee6',
          400: '#2a9bdc',
          500: '#158ed4',
          600: '#1279b5',
          700: '#0e6496',
          800: '#0b4f77',
          900: '#073a58',
          950: '#041e2c',
        },
      },
    },
  },
  plugins: [],
};
