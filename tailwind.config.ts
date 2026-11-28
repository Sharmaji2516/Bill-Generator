import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
        ct: {
          page: '#F5F8FC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          nav: '#EAF3FF',
          navActive: '#D6E8FF',
          primary: '#3B82F6',
          tealSoft: '#CCFBF1',
          tealAccent: '#0F9D92',
          footer: '#F1F6FC',
          text: '#334155',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-jakarta)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        subtle: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        card: '0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        elevated: '0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;

