/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Papier: the clean clinical worksurface (content area)
        papier: '#f5f7f6',
        surface: '#ffffff',
        ligne: {
          DEFAULT: '#dce3e1',
          forte: '#c3cdca'
        },
        ardoise: {
          900: '#16232a',
          700: '#3c4c50',
          500: '#66787a',
          300: '#9baaaa'
        },
        // Encre: the dark control-panel chrome (sidebar / masthead) and heading ink
        encre: {
          DEFAULT: '#12262b',
          600: '#234750',
          700: '#1b383f'
        },
        // Sarcelle: the operational brand accent — buttons, links, focus, active nav
        sarcelle: {
          100: '#e3f2ef',
          DEFAULT: '#0e7c74',
          600: '#0a6259'
        },
        // Argile: one ponctual warm accent — never for state/severity
        argile: {
          100: '#f4e6de',
          DEFAULT: '#b5613f'
        },
        // Gravité NCC MERP: the 10-step semantic severity ramp (A -> I) — never reused as a generic accent
        gravite: {
          a: '#2f8f6b',
          b: '#4c9a55',
          c: '#8b9b2e',
          d: '#c79a1e',
          e1: '#d98420',
          e2: '#d9691e',
          f: '#cc4a1e',
          g: '#b93424',
          h: '#8e1f24',
          i: '#5c1420'
        },
        // Generic (non-severity) status accents — distinct hues from the gravité ramp
        ambre: {
          100: '#f5e9d3',
          DEFAULT: '#c2871e'
        },
        alerte: {
          100: '#f8e3e3',
          DEFAULT: '#b23b3b'
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Consolas', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,38,43,0.06), 0 1px 1px rgba(18,38,43,0.04)',
        pop: '0 4px 14px rgba(18,38,43,0.10), 0 1px 3px rgba(18,38,43,0.08)',
        modal: '0 14px 34px rgba(18,38,43,0.16), 0 3px 8px rgba(18,38,43,0.10)'
      },
      borderRadius: {
        xl2: '10px'
      },
      backgroundImage: {
        chart: 'linear-gradient(to right, rgba(18,38,43,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(18,38,43,0.05) 1px, transparent 1px)'
      },
      backgroundSize: {
        chart: '22px 22px'
      }
    }
  },
  plugins: []
}
