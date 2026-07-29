/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        "on-primary": "#ffffff",
        "primary-container": "#131b2e",
        "on-primary-container": "#7c839b",
        "primary-fixed": "#dae2fd",
        "primary-fixed-dim": "#bec6e0",
        "on-primary-fixed": "#131b2e",
        "on-primary-fixed-variant": "#3f465c",
        secondary: "#0058be",
        "on-secondary": "#ffffff",
        "secondary-container": "#2170e4",
        "on-secondary-container": "#fefcff",
        "secondary-fixed": "#d8e2ff",
        "secondary-fixed-dim": "#adc6ff",
        "on-secondary-fixed": "#001a42",
        "on-secondary-fixed-variant": "#004395",
        tertiary: "#000000",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#0b1c30",
        "on-tertiary-container": "#75859d",
        "tertiary-fixed": "#d3e4fe",
        "tertiary-fixed-dim": "#b7c8e1",
        "on-tertiary-fixed": "#0b1c30",
        "on-tertiary-fixed-variant": "#38485d",
        background: "#f7f9fb",
        "on-background": "#191c1e",
        surface: "#f7f9fb",
        "on-surface": "#191c1e",
        "surface-variant": "#e0e3e5",
        "on-surface-variant": "#45464d",
        "surface-bright": "#f7f9fb",
        "surface-dim": "#d8dadc",
        "surface-container": "#eceef0",
        "surface-container-low": "#f2f4f6",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
        "surface-container-lowest": "#ffffff",
        "surface-tint": "#565e74",
        outline: "#76777d",
        "outline-variant": "#c6c6cd",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",
        "inverse-primary": "#bec6e0",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      // Exact spacing tokens from stitch tailwind.config
      spacing: {
        base: "0.25rem",    // 4px
        xs: "0.5rem",       // 8px
        sm: "1rem",         // 16px
        md: "1.5rem",       // 24px
        gutter: "1.5rem",   // 24px
        lg: "2.5rem",       // 40px
        xl: "4rem",         // 64px
      },
      // Font-family tokens from stitch design
      fontFamily: {
        "headline-lg": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "label-sm":    ["Inter", "sans-serif"],
        "body-md":     ["Inter", "sans-serif"],
        "label-md":    ["Inter", "sans-serif"],
        "body-lg":     ["Inter", "sans-serif"],
      },
      // Font-size tokens from stitch design (with lineHeight, letterSpacing, fontWeight)
      fontSize: {
        "headline-lg": ["30px", { lineHeight: "38px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-sm":    ["12px", { lineHeight: "16px", letterSpacing: "0.05em",  fontWeight: "600" }],
        "body-md":     ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md":    ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "body-lg":     ["16px", { lineHeight: "24px", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
}