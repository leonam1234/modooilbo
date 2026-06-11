import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 브랜드 액센트 — "시그널 레드"
        signal: {
          50: "#fff1f0",
          100: "#ffe0dd",
          200: "#ffc5c0",
          300: "#ff9d94",
          400: "#fb6759",
          500: "#ef3a2c",
          600: "#dc1f10", // primary
          700: "#b8160a",
          800: "#98170d",
          900: "#7e1912",
          950: "#450905",
        },
        // 잉크 — 본문/헤드라인 뉴트럴
        ink: {
          50: "#f6f7f8",
          100: "#eceef0",
          200: "#d5d9de",
          300: "#b0b8c1",
          400: "#84909d",
          500: "#657281",
          600: "#505b6a",
          700: "#424a56",
          800: "#3a404a",
          900: "#0f1419", // near-black headline
          950: "#080b0e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      maxWidth: {
        container: "1280px",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
