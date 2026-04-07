import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F1A',
        surface: '#151A2E',
        surfaceHover: '#1F2943',
        primary: '#8B5CF6',
        primaryHover: '#7C3AED',
        textMain: '#F8FAFC',
        textMuted: '#94A3B8',
        danger: '#EF4444',
        success: '#10B981',
      }
    },
  },
  plugins: [],
} satisfies Config;
