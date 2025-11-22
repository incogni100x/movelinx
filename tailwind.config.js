/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./about.html",
    "./services.html",
    "./contact.html",
    "./team.html",
    "./track-shipment.html",
    "./privacy-policy.html",
    "./terms-of-service.html",
    "./cookie-policy.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0a2463",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#c26943",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#c26943",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        darkblue: {
          DEFAULT: "#0a1e4d",
        },
      },
      fontFamily: {
        sans: ['Archivo', 'sans-serif'],
      }
    }
  },
  plugins: [],
}

