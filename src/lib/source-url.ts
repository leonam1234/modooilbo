/** Remove prose punctuation, preserving balanced parentheses that belong to a URL. */
export function cleanSourceUrl(input: string): string {
  let value = input;
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  while (value) {
    const stripped = value.replace(/["'.,]+$/, "");
    if (stripped !== value) { value = stripped; continue; }
    const close = value.at(-1)!;
    const open = pairs[close];
    if (!open) break;
    const count = (char: string) => [...value].filter(c => c === char).length;
    if (count(close) <= count(open)) break;
    value = value.slice(0, -1);
  }
  return value;
}
