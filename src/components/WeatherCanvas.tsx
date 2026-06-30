"use client";

import { useEffect, useRef } from "react";

/**
 * 비/눈 — 캔버스로 실제 떨어지는 입자 렌더(이미지·영상 없이 가볍게·저작권 0).
 * 무채색(라이트=잉크, 다크=화이트), 옅은 투명도로 "튀지 않게".
 * prefers-reduced-motion에서는 애니메이션 미실행(빈 화면), 탭 숨김 시 일시정지.
 */
export function WeatherCanvas({ kind }: { kind: "rain" | "snow" }) {
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

    interface P {
      x: number;
      y: number;
      v: number; // 낙하 속도
      s: number; // 크기/길이
      a: number; // 투명도
      ph: number; // 눈 흔들림 위상
      dr: number; // 눈 좌우 폭
    }
    const N = kind === "rain" ? 140 : 90;
    const ps: P[] = [];
    for (let i = 0; i < N; i++) {
      ps.push(
        kind === "rain"
          ? { x: rnd(0, w), y: rnd(0, h), v: rnd(7, 12), s: rnd(10, 18), a: rnd(0.05, 0.16), ph: 0, dr: 0 }
          : { x: rnd(0, w), y: rnd(0, h), v: rnd(0.5, 1.5), s: rnd(1, 2.4), a: rnd(0.18, 0.5), ph: rnd(0, 6.28), dr: rnd(0.3, 1) },
      );
    }

    const slant = 1.4; // 비 사선 기울기
    let raf = 0;
    let running = true;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const base = isDark() ? "255,255,255" : "26,26,30";
      if (kind === "rain") {
        ctx.lineWidth = 1;
        for (const p of ps) {
          ctx.strokeStyle = `rgba(${base},${p.a})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + slant * 3, p.y + p.s);
          ctx.stroke();
          p.y += p.v;
          p.x += slant * 0.6;
          if (p.y > h) {
            p.y = -p.s;
            p.x = rnd(0, w);
          } else if (p.x > w) {
            p.x = 0;
          }
        }
      } else {
        for (const p of ps) {
          ctx.fillStyle = `rgba(${base},${p.a})`;
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
    if (!reduce) raf = requestAnimationFrame(draw);

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
