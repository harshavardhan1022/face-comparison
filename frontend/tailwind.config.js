/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          dark: '#0c0714',
          burgundy: '#2d0a1e',
          purple: '#4c1d95',
          magenta: '#d946ef',
          pink: '#ec4899',
          cyan: '#06b6d4',
          lavender: '#e9d5ff',
          neonCyan: '#22d3ee',
        },
      },
      backgroundImage: {
        'login-gradient': 'radial-gradient(ellipse at top left, #2d0a1e 0%, #150928 45%, #080612 85%, #05162a 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'glass-card': 'linear-gradient(180deg, rgba(35, 21, 56, 0.65) 0%, rgba(19, 11, 33, 0.75) 100%)',
        'btn-gradient': 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
        'btn-glow': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-glow': '0 0 35px -5px rgba(168, 85, 247, 0.25)',
        'btn-glow': '0 10px 25px -5px rgba(147, 51, 234, 0.5), 0 0 15px rgba(99, 102, 241, 0.4)',
        'beam-glow': '0 0 40px 10px rgba(34, 211, 238, 0.6), 0 0 80px 20px rgba(168, 85, 247, 0.4)',
      },
      animation: {
        'beam-pulse': 'beamPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'equalizer': 'equalizerWave 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        beamPulse: {
          '0%, 100%': { transform: 'scaleX(0.92) scaleY(0.9)', opacity: '0.85' },
          '50%': { transform: 'scaleX(1.05) scaleY(1.15)', opacity: '1' },
        },
        equalizerWave: {
          '0%': { height: '24px' },
          '100%': { height: '84px' },
        },
      },
    },
  },
  plugins: [],
};

