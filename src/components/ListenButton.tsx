"use client";

import { useEffect, useRef, useState } from "react";

type PlayState = "idle" | "playing" | "paused";

/**
 * 본문 듣기 — 시각이 불편한 이용자를 위한 접근성 기능.
 * 브라우저 내장 음성합성(SpeechSynthesis, 무료). 기기에 있는 한국어 음성 중
 * 가장 자연스러운 것을 우선 선택. 미지원 브라우저에서는 버튼을 숨긴다.
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
    <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 py-1 pl-3 pr-1.5 text-sm text-ink-600 dark:border-ink-700 dark:text-ink-300">
      <button
        type="button"
        onClick={playing ? pause : play}
        aria-label={playing ? "본문 읽기 일시정지" : state === "paused" ? "본문 읽기 이어듣기" : "본문 읽어주기"}
        className="inline-flex items-center gap-1.5 font-medium hover:text-ink-900 dark:hover:text-white"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <rect x="7" y="6" width="3.5" height="12" rx="1" />
            <rect x="13.5" y="6" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path d="M8 5.5v13l11-6.5-11-6.5Z" strokeLinejoin="round" />
          </svg>
        )}
        <span>{state === "idle" ? "본문 듣기" : playing ? "일시정지" : "이어듣기"}</span>
      </button>
      {state !== "idle" && (
        <button
          type="button"
          onClick={stop}
          aria-label="본문 읽기 정지"
          className="ml-0.5 rounded-full p-1 text-ink-400 hover:text-ink-800 dark:hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <rect x="7" y="7" width="10" height="10" rx="1.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
