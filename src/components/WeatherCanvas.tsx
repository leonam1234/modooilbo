"use client";

import { useEffect, useRef } from "react";

type Kind = "rain" | "snow" | "fog";

/**
 * 비/눈/안개 — 캔버스 렌더(이미지·영상 없이 가볍게·저작권 0).
 * 깊이(depth)에 따라 색·크기·속도·투명도가 달라져 입체감.
 * 라이트=쿨 블루-그레이(흰 배경에서 보이게), 다크=흰+하늘톤.
 * 비는 우→좌로 흩날림. prefers-reduced-motion 미실행, 탭 숨김 시 정지.
 */
export function WeatherCanvas({ kind }: { kind: Kind }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const isDark = () => document.documentElement.classList.contains("dark");

    // 깊이 d(0=먼·푸른·옅음, 1=가까운·밝은·진함) → 색 보간
    // 라이트는 흰색을 안 씀(흰 배경에 안 보임) → 쿨 블루-그레이 범위.
    const colorFor = (dark: boolean, d: number) => {
      const far = dark ? [150, 192, 232] : [126, 146, 178]; // 푸른톤(먼)
      const near = dark ? [255, 255, 255] : [66, 88, 126]; // 밝은톤(가까운). 라이트는 진한 쿨블루
      const r = Math.round(far[0] + (near[0] - far[0]) * d);
      const g = Math.round(far[1] + (near[1] - far[1]) * d);
      const b = Math.round(far[2] + (near[2] - far[2]) * d);
      return `${r},${g},${b}`;
    };

    interface P {
      x: number;
      y: number;
      d: number;
      s: number;
      v: number;
      a: number;
      ph: number;
      dr: number;
    }
    const ps: P[] = [];
    if (kind === "rain" || kind === "snow") {
      const N = kind === "rain" ? 150 : 110;
      for (let i = 0; i < N; i++) {
        const d = Math.random();
        ps.push(
          kind === "rain"
            ? { x: rnd(0, w), y: rnd(0, h), d, s: 7 + 16 * d, v: 5 + 8 * d, a: 0.1 + 0.16 * d, ph: 0, dr: 0 }
            : { x: rnd(0, w), y: rnd(0, h), d, s: 0.9 + 2.8 * d, v: 0.4 + 1.5 * d, a: 0.24 + 0.42 * d, ph: rnd(0, 6.28), dr: rnd(0.3, 1.1) },
        );
      }
    }

    // 안개: 큰 소프트 블롭이 천천히 드리프트 (또렷하게)
    interface Blob {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
    }
    const blobs: Blob[] = [];
    if (kind === "fog") {
      for (let i = 0; i < 6; i++) {
        blobs.push({
          x: rnd(0, w),
          y: rnd(0, h),
          r: rnd(0.36, 0.64) * Math.max(w, h),
          vx: rnd(-0.16, 0.16),
          vy: rnd(-0.05, 0.05),
          a: rnd(0.1, 0.18),
        });
      }
    }

    const slant = 1.7; // 우→좌 기울기
    let raf = 0;
    let running = true;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const dark = isDark();

      if (kind === "fog") {
        const fc = dark ? "206,221,243" : "118,136,168"; // 쿨 그레이-블루
        for (const b of blobs) {
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, `rgba(${fc},${b.a})`);
          g.addColorStop(1, `rgba(${fc},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -b.r) b.x = w + b.r;
          if (b.x > w + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = h + b.r;
          if (b.y > h + b.r) b.y = -b.r;
        }
      } else if (kind === "rain") {
        ctx.lineWidth = 1;
        for (const p of ps) {
          ctx.strokeStyle = `rgba(${colorFor(dark, p.d)},${p.a})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - slant * 3, p.y + p.s); // 아래-왼쪽으로
          ctx.stroke();
          p.y += p.v;
          p.x -= slant * 0.7; // 왼쪽으로 흩날림
          if (p.y > h) {
            p.y = -p.s;
            p.x = rnd(0, w);
          } else if (p.x < 0) {
            p.x = w;
          }
        }
      } else {
        for (const p of ps) {
          ctx.fillStyle = `rgba(${colorFor(dark, p.d)},${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.v;
          p.ph += 0.02;
          p.x += Math.sin(p.ph) * p.dr;
          if (p.y > h + 4) {
            p.y = -4;
            p.x = rnd(0, w);
          }
        }
      }
      if (running) raf = requestAnimationFrame(draw);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      running = false;
      draw();
    } else {
      raf = requestAnimationFrame(draw);
    }

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [kind]);

  return <canvas ref={ref} aria-hidden className="wx-layer" />;
}
