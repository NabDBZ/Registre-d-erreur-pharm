/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paper: the clean clinical worksurface (content area)
        canvas: '#f4f6f4',
        surface: '#ffffff',
        mist: '#eef1ef',
        fog: '#dde3df',
        ink: '#0d1a16',
        graphite: '#42544d',
        steel: '#66786f',
        silver: '#9caa9f',
        // Console: the dark control-panel chrome (sidebar / masthead)
        console: {
          DEFAULT: '#0b1613',
          raised: '#122019',
          line: '#1e2f27',
          text: '#d7e4dc',
          dim: '#7d9184'
        },
        // Brand: saturated pharmacy green, carried with real weight
        brand: {
          50: '#e7f7ee',
          100: '#c3ecd4',
          300: '#5ed693',
          400: '#22c26a',
          500: '#0f9d53',
          600: '#0b7d42',
          700: '#0a6236',
          900: '#062e1a'
        },
        // Hazard ladder: diamond severity system (A -> I)
        hazard: {
          a: '#0f9d53',
          b: '#4f9d2f',
          c: '#a8a415',
          d: '#d99a06',
          e1: '#e2790a',
          e2: '#e35f0e',
          f: '#dc3d1f',
          g: '#c0201f',
          h: '#8f0f1e',
          i: '#3b0a10'
        },
        signal: {
          amber: '#e2a611',
          red: '#dc2f2f'
        }
      },
      fontFamily: {
        sans: ['Segoe UI Variable', 'Segoe UI', 'ui-sans-serif', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        mono: ['Cascadia Mono', 'Cascadia Code', 'Consolas', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px -1px rgba(9,20,15,0.10), 0 3px 8px -3px rgba(9,20,15,0.10)',
        pop: '0 8px 24px -6px rgba(9,20,15,0.35), 0 2px 6px -2px rgba(9,20,15,0.20)',
        console: 'inset -1px 0 0 0 #1e2f27'
      },
      borderRadius: {
        xl2: '10px'
      },
      backgroundImage: {
        chart: 'linear-gradient(to right, rgba(13,26,22,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(13,26,22,0.05) 1px, transparent 1px)',
        hazardstripe: 'repeating-linear-gradient(135deg, var(--stripe-a, #0d1a16) 0px, var(--stripe-a, #0d1a16) 10px, var(--stripe-b, #e2a611) 10px, var(--stripe-b, #e2a611) 20px)'
      },
      backgroundSize: {
        chart: '22px 22px'
      }
    }
  },
  plugins: []
}
