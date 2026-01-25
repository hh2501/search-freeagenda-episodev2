import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Material Design 3 カラーパレット
        'freeagenda': {
          'dark': '#304d5f',    // Primary (ダークブルー)
          'light': '#b6e2e3',   // Secondary (ライトブルー)
        },
        // Material Design 3 Surface Colors
        'surface': {
          'dim': '#f6f6f6',      // Surface Dim
          'bright': '#ffffff',   // Surface Bright
          'container': '#fafafa', // Surface Container
          'container-high': '#f0f0f0', // Surface Container High
          'container-highest': '#e8e8e8', // Surface Container Highest
        },
        // Material Design 3 State Colors
        'state': {
          'hover': 'rgba(48, 77, 95, 0.08)', // Hover state
          'pressed': 'rgba(48, 77, 95, 0.12)', // Pressed state
          'focus': 'rgba(48, 77, 95, 0.12)', // Focus state
        },
      },
      // Material Design 3 Elevation (Shadow)
      boxShadow: {
        'md-elevation-0': 'none',
        'md-elevation-1': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'md-elevation-2': '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'md-elevation-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
        'md-elevation-4': '0px 2px 3px 0px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
        'md-elevation-5': '0px 4px 4px 0px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
      },
      // Material Design 3 Typography Scale
      fontSize: {
        'display-large': ['3.5625rem', { lineHeight: '4rem', letterSpacing: '-0.015625rem' }],
        'display-medium': ['2.8125rem', { lineHeight: '3.25rem', letterSpacing: '0' }],
        'display-small': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '0' }],
        'headline-large': ['2rem', { lineHeight: '2.5rem', letterSpacing: '0' }],
        'headline-medium': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '0' }],
        'headline-small': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0' }],
        'title-large': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '0' }],
        'title-medium': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.009375rem', fontWeight: '500' }],
        'title-small': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.00625rem', fontWeight: '500' }],
        'label-large': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.00625rem', fontWeight: '500' }],
        'label-medium': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.03125rem', fontWeight: '500' }],
        'label-small': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.03125rem', fontWeight: '500' }],
        'body-large': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.03125rem' }],
        'body-medium': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.015625rem' }],
        'body-small': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025rem' }],
      },
      // Material Design 3 Border Radius
      borderRadius: {
        'md-xs': '0.25rem',   // 4px
        'md-sm': '0.5rem',    // 8px
        'md-md': '0.75rem',   // 12px
        'md-lg': '1rem',      // 16px
        'md-xl': '1.75rem',   // 28px
        'md-full': '9999px',  // Full
      },
    },
  },
  plugins: [],
};
export default config;
