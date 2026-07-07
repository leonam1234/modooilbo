/**
 * 금칙어(욕설·혐오) 필터 — 댓글 본문과 닉네임(가입·변경) 공용.
 * 정규화: 소문자화 + 공백·구두점·숫자 제거 → "씨1발", "f u c k" 류 우회 차단.
 * 목록은 명백한 욕설·혐오 표현만 유지(과차단 방지). 추가는 이 파일에서만.
 */
const BANNED = [
  // 한국어
  "씨발", "시발", "씨빨", "씨팔", "시팔", "병신", "븅신", "개새끼", "개새키", "개색기",
  "지랄", "좆", "존나", "썅", "니미", "느금", "미친놈", "미친년", "창녀", "걸레같",
  "한남충", "김치녀", "틀딱", "급식충", "맘충", "짱깨", "쪽바리",
  // 영어 (숫자 우회는 정규화가 흡수: sh1t→shit, b1tch→bitch)
  "fuck", "fck", "fuk", "shit", "bitch", "asshole", "bastard", "cunt",
  "whore", "slut", "nigger", "nigga", "motherfucker", "retard", "dumbass",
];

// 자모 표기 욕설(초성체) — 완성형과 별도 목록. 일반 단어 오탐 없는 명시 표기만.
const BANNED_JAMO = ["ㅅㅂ", "ㅆㅂ", "ㅄ", "ㅂㅅ", "ㅈㄹ", "ㄲㅈ", "ㅗㅗ", "ㅆ발", "ㅅ발"];

export function hasBanned(s: string): boolean {
  const norm = s.toLowerCase().replace(/[\s.,\-_*+~!@#$%^&()[\]{}|\\/:;'"<>?0-9]/g, "");
  const squeezed = norm.replace(/(.)\1+/g, "$1"); // "씨이이발" 문자 반복 우회 축약
  return (
    BANNED.some((w) => norm.includes(w) || squeezed.includes(w)) ||
    BANNED_JAMO.some((w) => norm.includes(w))
  );
}
