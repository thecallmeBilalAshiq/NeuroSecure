/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,html}", "./*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F8FAFC",
        border: "#E2E8F0",
        primary: {
          DEFAULT: "#6366F1",
          dark: "#4F46E5",
          light: "#EEF2FF"
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        text: {
          primary: "#0F172A",
          secondary: "#64748B",
          muted: "#94A3B8"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif"
        ]
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
        input: "10px"
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05)",
        "card-lg": "0 4px 12px rgba(0,0,0,0.08)",
        primary: "0 8px 20px rgba(99,102,241,0.25)"
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};
