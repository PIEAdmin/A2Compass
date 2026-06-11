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
          DEFAULT: '#2E7D32',
          light: '#FFF8E7',
        },
        scholar: {
          DEFAULT: '#1A237E',
          light: '#F3E5F5',
        },
        collegium: {
          DEFAULT: '#0D47A1',
          light: '#F5F5F5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Nunito', 'Fredoka One', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
