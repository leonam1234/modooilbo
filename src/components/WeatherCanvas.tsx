"use client";

import { useEffect, useRef } from "react";

type Kind = "rain" | "snow" | "fog";

/**
 * 비/눈/안개 — 캔버스 렌더(이미지·영상 없이 가볍게·저작권 0).
 * 비/눈: 깊이별 색·크기·속도로 입체감. 비는 우→좌.
 * 안개: 저해상도 버퍼에 그려 확대 → 또렷한 픽셀(모자이크) 회색 구름. 콘텐츠 뒤.
 * 라이트=쿨톤(흰 배경 가시성), 다크=흰+하늘. reduced-motion 미실행, 탭 숨김 시 정지.
 */
export function WeatherCanvas({ kind }: { kind: Kind }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const BLOCK = 14; // 안개 모자이크 블록 크기(px)
    const off = kind === "fog" ? document.createElement("canvas") : null;
    const offCtx = off ? off.getContext("2d") : null;

    let w = 0;
    let h = 0;
    let bw = 0;
    let bh = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (off && offCtx) {
        bw = Math.max(1, Math.ceil(w / BLOCK));
        bh = Math.max(1, Math.ceil(h / BLOCK));
        off.width = bw;
        off.height = bh;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const isDark = () => document.documentElement.classList.contains("dark");

    const colorFor = (dark: boolean, d: number) => {
      const far = dark ? [150, 192, 232] : [126, 146, 178];
      const near = dark ? [255, 255, 255] : [66, 88, 126];
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
      for (let i = 0; i < 26; i++) {
        blobs.push({
          x: rnd(0, w),
          y: rnd(0, h),
          r: rnd(0.05, 0.14) * Math.max(w, h),
          vx: rnd(-0.4, 0.4),
          vy: rnd(-0.1, 0.1),
          a: rnd(0.16, 0.34),
        });
      }
    }

    const slant = 1.7;
    let raf = 0;
    let running = true;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const dark = isDark();

      if (kind === "fog" && offCtx && off) {
        // 저해상도 버퍼에 그린 뒤 픽셀 확대 = 모자이크
        const fc = dark ? "184,189,200" : "118,121,130";
        offCtx.clearRect(0, 0, bw, bh);
        for (const b of blobs) {
          const g = offCtx.createRadialGradient(
            b.x / BLOCK,
            b.y / BLOCK,
            0,
            b.x / BLOCK,
            b.y / BLOCK,
            Math.max(1, b.r / BLOCK),
          );
          g.addColorStop(0, `rgba(${fc},${b.a})`);
          g.addColorStop(1, `rgba(${fc},0)`);
          offCtx.fillStyle = g;
          offCtx.fillRect(0, 0, bw, bh);
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < -b.r) b.x = w + b.r;
          if (b.x > w + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = h + b.r;
          if (b.y > h + b.r) b.y = -b.r;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, bw, bh, 0, 0, w, h);
      } else if (kind === "rain") {
        ctx.lineWidth = 1;
        for (const p of ps) {
          ctx.strokeStyle = `rgba(${colorFor(dark, p.d)},${p.a})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - slant * 3, p.y + p.s);
          ctx.stroke();
          p.y += p.v;
          p.x -= slant * 0.7;
          if (p.y > h) {
            p.y = -p.s;
            p.x = rnd(0, w);
          } else if (p.x < 0) {
            p.x = w;
          }
        }
      } else if (kind === "snow") {
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

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="wx-layer"
      style={kind === "fog" ? { imageRendering: "pixelated" } : undefined}
    />
  );
}
