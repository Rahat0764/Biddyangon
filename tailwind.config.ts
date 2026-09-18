import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10172A',
        indigo: { DEFAULT: '#2B3A8F', dark: '#1F2C6E', tint: '#EAECF9' },
        brass: { DEFAULT: '#B8892B', light: '#E8C989', tint: '#FBF3E1' },
        paper: '#F5F6FA',
        line: '#E3E5EF',
        slate2: { DEFAULT: '#33395B', light: '#6B7292' },
        success: { DEFAULT: '#15803D', bg: '#E3F5E9' },
        danger: { DEFAULT: '#B91C1C', bg: '#FBE7E7' },
        warn: { DEFAULT: '#B45309', bg: '#FBF0DD' },
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        bn: ['var(--font-noto-bn)', 'serif'],
      },
      borderRadius: { DEFAULT: '10px', sm: '6px' },
    },
  },
  plugins: [],
};
export default config;
