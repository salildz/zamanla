/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      colors: {
        // Warm sand / paper neutrals
        sand: {
          50: '#FCF9F3',
          100: '#F4EEE3',
          200: '#ECE3D4',
          300: '#DED2BD',
          400: '#C3B49A',
          500: '#9E8E73',
          600: '#7A6E57',
          700: '#5C5246',
          800: '#3A342B',
          900: '#2B2620',
        },
        // Deep forest green — primary action / brand
        forest: {
          50: '#EEF3F0',
          100: '#D6E2DA',
          200: '#ADC5B7',
          300: '#82A593',
          400: '#5A8470',
          500: '#3E6453',
          600: '#2F5043',
          700: '#264035',
          800: '#1E3229',
          900: '#16241E',
        },
        // Amber / harvest — availability & density (heatmap)
        amber: {
          50: '#FBF3E2',
          100: '#F5E3BC',
          200: '#EBCB85',
          300: '#DEAF50',
          400: '#CF9530',
          500: '#B97D1C',
          600: '#9A6614',
          700: '#7C5210',
          800: '#5E3D0C',
          900: '#422B08',
        },
        // Honey — warnings
        honey: {
          50: '#FAF3E4',
          100: '#F3E4C4',
          500: '#9A6614',
          600: '#7C5210',
          700: '#5E3D0C',
        },
        // Brick — danger
        brick: {
          50: '#F7ECEA',
          100: '#EED4D0',
          500: '#A8443A',
          600: '#9A3A31',
          700: '#7E2E27',
        },
        // Brand alias — mapped to forest
        brand: {
          50: '#EEF3F0',
          100: '#D6E2DA',
          200: '#ADC5B7',
          300: '#82A593',
          400: '#5A8470',
          500: '#3E6453',
          600: '#2F5043',
          700: '#264035',
          800: '#1E3229',
          900: '#16241E',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
