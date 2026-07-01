"use client";

import { useEffect, useRef, useState } from "react";

type PlayState = "idle" | "playing" | "paused";

const Headphones = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
    <path d="M5 13a7 7 0 0 1 14 0" />
    <rect x="3" y="12.5" width="4" height="7.5" rx="2" fill="currentColor" stroke="none" />
    <rect x="17" y="12.5" width="4" height="7.5" rx="2" fill="currentColor" stroke="none" />
  </svg>
);
const Play = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);
const Stop = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <rect x="7" y="7" width="10" height="10" rx="2" />
  </svg>
);
const Eq = () => (
  <span className="flex h-[18px] items-end gap-[3px]" aria-hidden>
    {[0, 1, 2, 3].map((i) => (
      <span key={i} className="eq-bar w-[3px] rounded-full bg-current" style={{ animationDelay: `${i * 0.16}s` }} />
    ))}
  </span>
);

/**
 * 본문 듣기 — 시각이 불편한 이용자를 위한 접근성 기능.
 * 브라우저 내장 음성합성(SpeechSynthesis, 무료). 기기의 한국어 음성 중 자연스러운 것 우선.
 * 미지원 브라우저에서는 숨김.
 */
export function ListenButton({ text }: { text: string }) {
  const [state, setState] = useState<PlayState>("idle");
  const [supported, setSupported] = useState(true);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const load = () => {
      const kos = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ko"));
      voiceRef.current =
        kos.find((v) => /yuna|siri|google|neural|natural|enhanced|premium|자연/i.test(v.name)) || kos[0] || null;
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  function play() {
    const synth = window.speechSynthesis;
    if (state === "paused") {
      synth.resume();
      setState("playing");
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1.0;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    synth.speak(u);
    setState("playing");
  }
  function pause() {
    window.speechSynthesis.pause();
    setState("paused");
  }
  function stop() {
    window.speechSynthesis.cancel();
    setState("idle");
  }

  if (!supported) return null;
  const playing = state === "playing";

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={playing ? pause : play}
        aria-label={playing ? "본문 읽기 일시정지" : state === "paused" ? "본문 읽기 이어듣기" : "본문 읽어주기"}
        className="inline-flex items-center gap-2.5 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ink-700 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
      >
        {playing ? <Eq /> : state === "paused" ? <Play /> : <Headphones />}
        <span>{state === "idle" ? "본문 듣기" : playing ? "일시정지" : "이어듣기"}</span>
      </button>
      {state !== "idle" && (
        <button
          type="button"
          onClick={stop}
          aria-label="본문 읽기 정지"
          className="absolute left-full top-1/2 ml-2.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-400 dark:hover:text-white"
        >
          <Stop />
        </button>
      )}
    </div>
  );
}
