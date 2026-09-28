import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        panel: "var(--panel)",
        border: "var(--border)",
        primary: {
          DEFAULT: "var(--text-primary)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          gold: "var(--accent-gold)",
        },
        success: {
          DEFAULT: "var(--success)",
          light: "var(--success-light)",
          dark: "var(--success-dark)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          light: "var(--warning-light)",
          dark: "var(--warning-dark)",
        },
        error: {
          DEFAULT: "var(--error)",
          light: "var(--error-light)",
          dark: "var(--error-dark)",
        },
        info: {
          DEFAULT: "var(--info)",
          light: "var(--info-light)",
          dark: "var(--info-dark)",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-urbanist)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        urbanist: ['var(--font-urbanist)', 'sans-serif'],
      },
      zIndex: {
        sticky: '1000',
        dropdown: '1100',
        modal: '1200',
        popover: '1300',
        tooltip: '1400',
      },
    },
  },
  plugins: [],
};

export default config;
