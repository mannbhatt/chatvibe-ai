/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5D5FEF',
          light: '#EAE4FE',
          dark: '#5348E5'
        },
        roast: {
          DEFAULT: '#FF4B72',
          light: '#FFF0F3',
          dark: '#F43F67'
        },
        meme: {
          DEFAULT: '#F97316',
          light: '#FFF4D6',
          dark: '#EA580C'
        },
        vibe: {
          DEFAULT: '#2563EB',
          light: '#DCEBFF',
          dark: '#1D4ED8'
        },
        detective: {
          DEFAULT: '#8B5CF6',
          light: '#DDD1FF',
          dark: '#7C3AED'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F9FA',
          background: '#FCFBFF'
        },
        neo: {
          bg: '#cff5e1', // Mint Green
          yellow: '#FFD23F',
          purple: '#8A2BE2',
          green: '#00C49A',
          orange: '#EE4266',
          blue: '#3b82f6',
          pink: '#f472b6',
        }
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'brutal-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}
