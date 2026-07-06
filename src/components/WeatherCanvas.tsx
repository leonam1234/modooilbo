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

    let w = 0;
    let h = 0;
    let bw = 0;
    let bh = 0;
    // 루프가 멈춘 상태(reduced-motion, 라이트모드 별)에서 한 프레임만 재도색 — draw 정의 후 할당
    let drawOnce: () => void = () => {};
    let onResized: () => void = () => {};
    const resize = () => {
      // innerWidth는 환경에 따라 레이아웃 뷰포트보다 커질 수 있어(가로 79px 밀림 사고)
      // 표시 크기는 CSS(fixed inset:0 + 100%)에 맡기고, 좌표계만 실측 크기로 맞춘다.
      w = document.documentElement.clientWidth;
      h = document.documentElement.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (off && offCtx) {
        bw = Math.max(1, Math.ceil(w / BLOCK));
        bh = Math.max(1, Math.ceil(h / BLOCK));
        off.width = bw;
        off.height = bh;
      }
      onResized(); // 별 재배치 등 — 파티클 선언 뒤에 할당됨(초기 호출 시엔 no-op)
      drawOnce();
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
      // 초안(v1) 파라미터 그대로 — 대표님 픽(2026-07-04)
      for (let i = 0; i < 150; i++) {
        const d = Math.random();
        streaks.push({ x: rnd(0, w), y: rnd(0, h), d, s: 7 + 16 * d, v: 5 + 8 * d, a: 0.1 + 0.16 * d });
      }
    }

    // ── 비: 유리면 물방울(맺힘→유지→마름 수명 관리) ─────────
    // 누적 버퍼 + 미세 페이드 방식은 8비트 알파 반올림에 걸려 옅은 방울이 영영 안 사라짐(2026-07-04 버그).
    // → 방울마다 수명을 두고 매 프레임 스프라이트로 다시 그린다.
    // ⚠️ '흘러내리는 방울(runner)'과 물길 궤적은 금지 — 어떤 파라미터로도 지렁이로 보여 세 차례 반려됨.
    const makeDropSprite = (dark: boolean) => {
      const tone = dark ? "205,222,248" : "88,108,138";
      const c = document.createElement("canvas");
      c.width = c.height = 40; // 블러 번짐 여백(+8)
      const g = c.getContext("2d")!;
      const r = 14;
      g.filter = "blur(2px)"; // 유리 맺힘 소프트 블러(2.0pt) — 스프라이트에 한 번만 구워 런타임 비용 0
      const grad = g.createRadialGradient(20 - r * 0.35, 20 - r * 0.4, r * 0.1, 20, 20, r);
      grad.addColorStop(0, "rgba(255,255,255,0.85)"); // 하이라이트
      grad.addColorStop(0.55, `rgba(${tone},0.5)`);
      grad.addColorStop(1, `rgba(${tone},1)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(20, 20, r, 0, Math.PI * 2);
      g.fill();
      return c;
    };
    let dropSprite: HTMLCanvasElement | null = null;
    let dropSpriteDark = false;
    interface Drop {
      x: number; y: number; s: number; a: number; t: number; life: number;
    }
    const drops: Drop[] = [];
    const resetDrop = (d: Drop, randomPhase: boolean) => {
      d.x = rnd(0, w);
      d.y = rnd(0, h);
      d.s = rnd(0.09, 0.3); // 스프라이트 32px 기준 지름 약 3~10px
      d.a = rnd(0.14, 0.3);
      d.life = rnd(420, 1080); // 7~18초
      d.t = randomPhase ? rnd(0, d.life) : 0;
    };
    if (kind === "rain") {
      dropSprite = makeDropSprite(isDark());
      dropSpriteDark = isDark();
      for (let i = 0; i < 220; i++) {
        const d = { x: 0, y: 0, s: 0, a: 0, t: 0, life: 1 };
        resetDrop(d, true);
        drops.push(d);
      }
    }

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
      // 리사이즈 시 별 재배치(고정 좌표라 새 영역이 비는 문제)
      onResized = () => {
        for (const st of stars) {
          st.x = rnd(0, w);
          st.y = rnd(0, h);
        }
      };
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
      } else if (kind === "rain" && dropSprite) {
        // 1) 원경 빗줄기 (초안 그대로)
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

        // 2) 유리 물방울 — 수명 봉투(맺힘 12% → 유지 → 마름 30%)로 확실히 사라졌다 다른 곳에 맺힘
        if (dropSpriteDark !== dark) {
          dropSprite = makeDropSprite(dark);
          dropSpriteDark = dark;
        }
        for (const d of drops) {
          d.t += 1;
          if (d.t >= d.life) resetDrop(d, false);
          const p = d.t / d.life;
          const env = p < 0.12 ? p / 0.12 : p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1;
          if (env <= 0.01) continue;
          const size = 40 * d.s; // 스프라이트 40px(블러 여백 포함) 기준 — 원 크기는 기존과 동일
          ctx.globalAlpha = d.a * env * 0.7; // 물방울만 투명도 30% 감소(오너 지정) — 빗줄기는 그대로
          ctx.drawImage(dropSprite, d.x - size / 2, d.y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      } else if (kind === "star") {
        // 다크 모드에서만 은은하게. 라이트면 루프 자체를 세워 유휴 rAF 낭비 제거(옵저버가 재가동).
        if (!dark) {
          running = false;
          return;
        }
        {
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

    drawOnce = () => {
      const was = running;
      running = false; // draw 말미의 rAF 예약을 막고 1프레임만
      draw();
      running = was;
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      running = false;
      draw();
    } else {
      raf = requestAnimationFrame(draw);
    }

    // 테마 전환 감시 — 정지 프레임 재도색(reduced-motion) + 별 루프 재가동(라이트→다크)
    const mo = new MutationObserver(() => {
      if (kind === "star" && isDark() && !running && !reduce && !document.hidden) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!running) {
        drawOnce();
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce && !(kind === "star" && !isDark())) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      mo.disconnect();
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
