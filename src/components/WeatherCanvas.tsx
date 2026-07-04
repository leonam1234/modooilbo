"use client";

import { useEffect, useRef } from "react";

type Kind = "rain" | "snow" | "fog" | "star";

/**
 * 비/눈/안개 — 캔버스 렌더(이미지·영상 없이 가볍게·저작권 0).
 * 비: "창문 유리" 연출 — 유리에 맺힌 미세 물방울 + 간헐적으로 큰 방울이 궤적을 남기며 흘러내림
 *     (레퍼런스: 대표님 수급 푸티지의 window-rain 룩을 프로시저럴로 재현) + 원경 빗줄기.
 * 눈: 보케(심도) 스프라이트 3단 — 가까울수록 크고 흐리게, 멀수록 작고 또렷하게.
 * 안개: 저해상도 버퍼 모자이크(기존 유지).
 * 라이트=쿨톤, 다크=흰+하늘. reduced-motion 정지, 탭 숨김 시 정지.
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
    // 비: 유리면(물방울·궤적 누적) 지속 버퍼
    const glass = kind === "rain" ? document.createElement("canvas") : null;
    const glassCtx = glass ? glass.getContext("2d") : null;

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
      if (glass && glassCtx) {
        glass.width = Math.floor(w * dpr);
        glass.height = Math.floor(h * dpr);
        glassCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    // ── 비: 원경 빗줄기(가벼운 배경 깊이감) ─────────────────
    interface Streak {
      x: number; y: number; d: number; s: number; v: number; a: number;
    }
    const streaks: Streak[] = [];
    if (kind === "rain") {
      for (let i = 0; i < 90; i++) {
        const d = Math.random();
        streaks.push({ x: rnd(0, w), y: rnd(0, h), d, s: 7 + 14 * d, v: 5 + 7 * d, a: 0.08 + 0.12 * d });
      }
    }

    // ── 비: 유리면 물방울 ───────────────────────────────
    const dropTone = () => (isDark() ? "205,222,248" : "88,108,138");
    const drawDroplet = (g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) => {
      const tone = dropTone();
      const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${a * 0.85})`); // 하이라이트
      grad.addColorStop(0.55, `rgba(${tone},${a * 0.5})`);
      grad.addColorStop(1, `rgba(${tone},${a})`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    };
    if (kind === "rain" && glassCtx) {
      for (let i = 0; i < 240; i++) drawDroplet(glassCtx, rnd(0, w), rnd(0, h), rnd(0.5, 1.8), rnd(0.1, 0.26));
    }
    interface Runner {
      x: number; y: number; r: number; v: number; ph: number; alive: boolean; wait: number;
    }
    const runners: Runner[] = Array.from({ length: 5 }, () => ({
      x: 0, y: 0, r: 0, v: 0, ph: 0, alive: false, wait: Math.floor(rnd(30, 500)),
    }));

    // ── 눈: 보케 스프라이트 3단(사전 렌더 — shadowBlur 없이 저비용) ──
    const makeBokeh = (size: number, soft: number, tone: string, core: number) => {
      const c = document.createElement("canvas");
      c.width = c.height = size * 2;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(size, size, 0, size, size, size);
      grad.addColorStop(0, `rgba(${tone},${core})`);
      grad.addColorStop(soft, `rgba(${tone},${core * 0.75})`);
      grad.addColorStop(1, `rgba(${tone},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, size * 2, size * 2);
      return c;
    };
    let bokeh: HTMLCanvasElement[] = [];
    let bokehDark = false;
    const buildBokeh = () => {
      const dark = isDark();
      const tone = dark ? "235,243,255" : "168,182,204";
      bokeh = [
        makeBokeh(3, 0.85, tone, dark ? 0.9 : 0.8), // 원경: 작고 또렷
        makeBokeh(8, 0.55, tone, dark ? 0.55 : 0.5), // 중경
        makeBokeh(18, 0.3, tone, dark ? 0.3 : 0.26), // 근경: 크고 흐림(보케)
      ];
      bokehDark = dark;
    };
    interface Flake {
      x: number; y: number; layer: number; v: number; ph: number; dr: number; scale: number;
    }
    const flakes: Flake[] = [];
    if (kind === "snow") {
      buildBokeh();
      for (let i = 0; i < 100; i++) {
        const layer = i < 45 ? 0 : i < 80 ? 1 : 2; // 원경 다수, 근경 소수
        flakes.push({
          x: rnd(0, w), y: rnd(0, h), layer,
          v: [0.35, 0.8, 1.5][layer] * rnd(0.7, 1.3),
          ph: rnd(0, 6.28), dr: [0.25, 0.6, 1.1][layer],
          scale: rnd(0.7, 1.25),
        });
      }
    }

    // ── 별(다크 전용) — 은은한 반짝임. 라이트 모드에선 그리지 않음 ──
    interface Star {
      x: number; y: number; r: number; ph: number; tw: number; big: boolean;
    }
    const stars: Star[] = [];
    let starGlow: HTMLCanvasElement | null = null;
    if (kind === "star") {
      for (let i = 0; i < 110; i++) {
        const big = i < 14; // 소수만 글로우 큰 별
        stars.push({
          x: rnd(0, w), y: rnd(0, h), r: big ? rnd(1.1, 1.9) : rnd(0.4, 1.0),
          ph: rnd(0, 6.28), tw: rnd(0.004, 0.014), big,
        });
      }
      starGlow = makeBokeh(10, 0.25, "215,228,255", 0.5);
    }

    // ── 안개(기존 유지) ─────────────────────────────────
    interface Blob {
      x: number; y: number; r: number; vx: number; vy: number; a: number;
    }
    const blobs: Blob[] = [];
    if (kind === "fog") {
      for (let i = 0; i < 26; i++) {
        blobs.push({
          x: rnd(0, w), y: rnd(0, h), r: rnd(0.05, 0.14) * Math.max(w, h),
          vx: rnd(-0.4, 0.4), vy: rnd(-0.1, 0.1), a: rnd(0.16, 0.34),
        });
      }
    }

    const slant = 1.7;
    let raf = 0;
    let running = true;
    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      const dark = isDark();

      if (kind === "fog" && offCtx && off) {
        const fc = dark ? "184,189,200" : "118,121,130";
        offCtx.clearRect(0, 0, bw, bh);
        for (const b of blobs) {
          const g = offCtx.createRadialGradient(
            b.x / BLOCK, b.y / BLOCK, 0,
            b.x / BLOCK, b.y / BLOCK, Math.max(1, b.r / BLOCK),
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
      } else if (kind === "rain" && glassCtx && glass) {
        // 1) 원경 빗줄기
        ctx.lineWidth = 1;
        for (const p of streaks) {
          ctx.strokeStyle = `rgba(${colorFor(dark, p.d)},${p.a})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - slant * 3, p.y + p.s);
          ctx.stroke();
          p.y += p.v;
          p.x -= slant * 0.7;
          if (p.y > h) { p.y = -p.s; p.x = rnd(0, w); }
          else if (p.x < 0) p.x = w;
        }

        // 2) 유리면 — 페이드(궤적이 수 초 내 마름 — 길게 남으면 지렁이로 보임)
        glassCtx.globalCompositeOperation = "destination-out";
        glassCtx.fillStyle = "rgba(0,0,0,0.028)";
        glassCtx.fillRect(0, 0, w, h);
        glassCtx.globalCompositeOperation = "source-over";

        // 3) 새 미세 방울 보충(마르는 만큼)
        if (frame % 3 === 0) drawDroplet(glassCtx, rnd(0, w), rnd(0, h), rnd(0.5, 1.8), rnd(0.12, 0.26));

        // 4) 흘러내리는 큰 방울
        const tone = dropTone();
        for (const r of runners) {
          if (!r.alive) {
            if (--r.wait <= 0) {
              r.alive = true;
              r.x = rnd(w * 0.03, w * 0.97);
              r.y = rnd(-20, h * 0.3);
              r.r = rnd(1.6, 2.8);
              r.v = rnd(1.8, 2.8); // 빠르게 미끄러져야 '줄기'로 읽힘(느리면 지렁이)
              r.ph = rnd(0, 6.28);
            }
            continue;
          }
          const prevX = r.x;
          const prevY = r.y;
          r.v = Math.min(r.v + 0.07, 5.5 + r.r * 0.6);
          r.y += r.v;
          r.ph += 0.09;
          r.x += Math.sin(r.ph) * 0.16; // 미세 워블만 — 크면 궤적이 지렁이가 됨
          // 젖은 궤적 — 가늘고 옅은 물길만(페이드로 수 초 내 마름)
          glassCtx.strokeStyle = `rgba(${tone},0.038)`;
          glassCtx.lineWidth = Math.max(0.7, r.r * 0.3);
          glassCtx.lineCap = "round";
          glassCtx.beginPath();
          glassCtx.moveTo(prevX, prevY);
          glassCtx.lineTo(r.x, r.y);
          glassCtx.stroke();
          if (frame % 14 === 0) drawDroplet(glassCtx, prevX + rnd(-1, 1), prevY, rnd(0.4, 0.8), 0.14);
          drawDroplet(glassCtx, r.x, r.y, r.r, 0.28);
          if (r.y > h + 6) {
            r.alive = false;
            r.wait = Math.floor(rnd(240, 900));
          }
        }
        ctx.drawImage(glass, 0, 0, glass.width, glass.height, 0, 0, w, h);
      } else if (kind === "star") {
        // 다크 모드에서만 은은하게 — 라이트에선 아무것도 그리지 않음(토글 시 자연 등장/소멸)
        if (dark) {
          for (const st of stars) {
            st.ph += st.tw;
            const a = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(st.ph)); // 0.22~0.42 트윙클
            if (st.big && starGlow) {
              const s = starGlow.width * (st.r * 1.6);
              ctx.globalAlpha = a * 0.65;
              ctx.drawImage(starGlow, st.x - s / 2, st.y - s / 2, s, s);
              ctx.globalAlpha = 1;
            }
            ctx.fillStyle = `rgba(226,236,255,${a})`;
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (kind === "snow") {
        if (bokehDark !== dark) buildBokeh(); // 테마 전환 시 스프라이트 재생성
        for (const f of flakes) {
          const sp = bokeh[f.layer];
          const s = sp.width * f.scale;
          ctx.drawImage(sp, f.x - s / 2, f.y - s / 2, s, s);
          f.y += f.v;
          f.ph += 0.015 + f.layer * 0.006;
          f.x += Math.sin(f.ph) * f.dr;
          if (f.y > h + s) { f.y = -s; f.x = rnd(0, w); }
          if (f.x < -s) f.x = w + s;
          if (f.x > w + s) f.x = -s;
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
