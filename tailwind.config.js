/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#141218',
          dim: '#141218',
          bright: '#3b383e',
          'container-lowest': '#0f0d13',
          'container-low': '#1d1b20',
          container: '#211f26',
          'container-high': '#2b2930',
          'container-highest': '#36343a',
        },
        primary: {
          DEFAULT: '#cfbcff',
          dim: 'rgba(207,188,255,0.15)',
          border: 'rgba(207,188,255,0.25)',
        },
        tertiary: {
          DEFAULT: '#e7c365',
          dim: 'rgba(231,195,101,0.15)',
          border: 'rgba(231,195,101,0.25)',
        },
        lime: {
          DEFAULT: '#CCFF00',
          dim: 'rgba(204,255,0,0.10)',
          border: 'rgba(204,255,0,0.40)',
        },
        cyan: {
          DEFAULT: '#00F2FF',
          dim: 'rgba(0,242,255,0.10)',
          border: 'rgba(0,242,255,0.30)',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.05)',
        },
        outline: {
          DEFAULT: '#938f99',
          variant: '#49454f',
        },
      },
      fontFamily: {
        almarai: ['Almarai_400Regular'],
        'almarai-bold': ['Almarai_700Bold'],
        'almarai-extrabold': ['Almarai_800ExtraBold'],
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
