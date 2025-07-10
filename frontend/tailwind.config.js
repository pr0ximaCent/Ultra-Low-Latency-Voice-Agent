/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          accent: '#F59E0B',
        },
        animation: {
          'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'bounce-slow': 'bounce 1s infinite',
        },
      },
    },
    plugins: [],
  };