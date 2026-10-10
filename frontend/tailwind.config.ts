import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#f9f9f7',
        surface: '#fcfcfb',
        ink: '#0b0b0b',
        ink2: '#52514e',
        muted: {
          DEFAULT: '#6b6a63',
          foreground: '#6b6a63',
        },
        line: '#e1e0d9',
        axis: '#c3c2b7',
        good: '#0ca30c',
        goodText: '#006300',
        bad: '#d03b3b',
        brand: {
          DEFAULT: '#2a78d6',
          600: '#256abf',
          700: '#1c5cab',
          50: '#eef5fd',
        },
        border: {
          DEFAULT: '#e1e0d9',
        },
        input: {
          DEFAULT: '#e1e0d9',
        },
        ring: {
          DEFAULT: '#2a78d6',
        },
        background: {
          DEFAULT: '#f9f9f7',
        },
        foreground: {
          DEFAULT: '#0b0b0b',
        },
        primary: {
          DEFAULT: '#2a78d6',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f1f0ea',
          foreground: '#0b0b0b',
        },
        destructive: {
          DEFAULT: '#d03b3b',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#f1f0ea',
          foreground: '#0b0b0b',
        },
        popover: {
          DEFAULT: '#fcfcfb',
          foreground: '#0b0b0b',
        },
        card: {
          DEFAULT: '#fcfcfb',
          foreground: '#0b0b0b',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"PingFang SC"', '"Segoe UI"', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
