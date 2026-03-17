/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // A² Compass brand colors
        compass: {
          navy: '#1B2A4A',
          blue: '#2563EB',
          sky: '#38BDF8',
          gold: '#F59E0B',
          green: '#10B981',
          coral: '#F87171',
        },
        // Tier colors
        explorer: {
          DEFAULT: '#10B981', // Green - Explorers' Camp (Grades 1-6)
          light: '#D1FAE5',
        },
        scholar: {
          DEFAULT: '#2563EB', // Blue - Scholars' Guild (Grades 7-9)
          light: '#DBEAFE',
        },
        collegium: {
          DEFAULT: '#7C3AED', // Purple - The Collegium (Grades 10-12)
          light: '#EDE9FE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
