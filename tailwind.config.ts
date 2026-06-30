import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 브랜드 액센트 — NYT식 무채색(잉크). 정치적 중립을 위해 레드/블루 등 진영색 배제.
        // 기존 signal-* 사용처를 그대로 두고 팔레트만 흑백으로 재정의한다.
        signal: {
          50: "#f6f6f7",
          100: "#ececee",
          200: "#d9d9dd",
          300: "#bcbcc2",
          400: "#9a9aa1",
          500: "#7c7c83",
          600: "#6b6b73", // primary — 라이트/다크 양쪽에서 읽히는 중간 그레이
          700: "#5a5a61",
          800: "#48484e",
          900: "#36363b",
          950: "#222226",
        },
        // 속보 전용 레드(딥 마룬) — 정당색(밝은 #E61E2B) 아님. "속보" 긴급 라벨에만 사용.
        breaking: "#700000",
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
        // 켄번스 슬로 줌: 1.0 → 1.1 → 1.0 왕복 전체가 10초
        kenburns: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
        // 사이드 썸네일 세로 팬: 스케일 1.2 고정, 위(상)→아래 5초 / 아래→위 5초
        "pan-y": {
          "0%, 100%": { transform: "translateY(7%) scale(1.2)" }, // 상단 프레이밍
          "50%": { transform: "translateY(-7%) scale(1.2)" }, // 하단 프레이밍
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        // 1.0→1.1→1.0 한 사이클 = 10초
        kenburns: "kenburns 10s ease-in-out infinite",
        // 상→하 5초, 하→상 5초 (총 10초)
        "pan-y": "pan-y 10s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
