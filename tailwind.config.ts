import type { Config } from "tailwindcss";

/**
 * Ringo — Pure Monochrome Palette (v2, 2026-04-14)
 * No color. Every surface on the Obsidian → Bone axis.
 * Hierarchy comes from scale, weight, italics, and hairline borders — never hue.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canonical monochrome palette
        obsidian: "#0A0A0A", // base canvas
        coal:     "#141414", // elevated (cards, panels)
        graphite: "#1E1E1E", // floating (modals, dropdowns, toasts)
        smoke:    "#2E2E2E", // dividers, input borders
        ash:      "#6B6B6B", // muted labels, disabled
        stone:    "#9C9C9C", // secondary text
        chalk:    "#C8C8C8", // tertiary
        bone:     "#F3EEE3", // primary text, CTAs, logo (warm off-white)

        // Semantic aliases used by existing shell
        background: "#0A0A0A",
        foreground: "#F3EEE3",

        // Legacy ringo-* tokens, now re-pointed to the monochrome axis so
        // existing markup flips to the new brand with zero class changes.
        // Any remaining "ringo-teal" / "ringo-amber" reads as bone (primary),
        // borders are hairline smoke, cards are coal, muted is ash.
        ringo: {
          dark:          "#0A0A0A", // was warm cream → obsidian
          darker:        "#0A0A0A",
          card:          "#141414", // was white → coal
          border:        "#2E2E2E", // was warm beige → smoke
          teal:          "#F3EEE3", // was gold/teal accent → bone
          "teal-light":  "#C8C8C8", // accent-light → chalk
          amber:         "#F3EEE3", // was navy accent → bone
          purple:        "#9C9C9C", // → stone
          "purple-light":"#9C9C9C",
          muted:         "#6B6B6B", // → ash
          logo:          "#F3EEE3",
        },
      },
      fontFamily: {
        // Fraunces carries the brand — display, headlines, money moments.
        display: ['Fraunces', 'serif'],
        serif:   ['Fraunces', 'serif'],
        // Inter handles everything else — body, UI, dashboard, forms.
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Warm bone-tinted shadows (never pure black-on-black flatness).
        bone: "0 1px 2px rgba(0,0,0,0.6), 0 12px 48px rgba(243,238,227,0.04)",
        "bone-lg": "0 2px 4px rgba(0,0,0,0.7), 0 24px 80px rgba(243,238,227,0.06)",
      },
      letterSpacing: {
        tightest: "-0.035em",
        tighter2: "-0.025em",
        tighter3: "-0.02em",
        widelabel: "0.12em",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-bone": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.35" },
        },
      },
      animation: {
        "fade-in":    "fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in":   "slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-bone": "pulse-bone 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
