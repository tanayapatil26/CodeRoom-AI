/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A2233',
        muted: '#5E6B80',
        mist: '#EEF1F5',
        line: '#D8DEE8',
        cobalt: { DEFAULT: '#2A55F5', soft: '#E4EAFF', dark: '#1D3FC4' },
        danger: '#C2362B',
      },
      fontFamily: {
        sans: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
