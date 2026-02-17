import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hedera: {
          purple: '#8259EF',
          green: '#00E89D',
          dark: '#0B0E11',
          card: '#141922',
          border: '#1E2533',
        },
      },
    },
  },
  plugins: [],
}
export default config
