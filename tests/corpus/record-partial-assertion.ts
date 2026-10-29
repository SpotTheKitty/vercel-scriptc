// A partial `as` assertion keeps the literal's own layout and answers the
// asserted type through a record view: fields the literal never wrote are
// absent, and reflection sees exactly what Node sees.
interface TruncationResult { content: string; truncated: boolean; truncatedBy: "lines" | "bytes" | null; totalLines: number; firstLineExceedsLimit: boolean }
class Panel {
  private truncation?: TruncationResult;
  setComplete(truncation?: TruncationResult): void { this.truncation = truncation; }
  summary(): string { return `${this.truncation?.truncated ?? false}`; }
  dump(): string { return JSON.stringify(this.truncation ?? null); }
  keys(): string { return this.truncation ? Object.keys(this.truncation).join(",") : "-"; }
  hasContent(): boolean { return this.truncation !== undefined && "content" in this.truncation; }
}
function render(truncated: boolean, output: string): string {
  const a = new Panel();
  a.setComplete(truncated ? ({ truncated: true } as TruncationResult) : undefined);
  const b = new Panel();
  b.setComplete(truncated ? ({ truncated: true, content: output } as TruncationResult) : undefined);
  return [a.summary(), a.dump(), a.keys(), a.hasContent(), b.summary(), b.dump(), b.keys(), b.hasContent()].join(" ");
}
console.log(render(true, "out"));
console.log(render(false, "out"));
const full: TruncationResult = { content: "c", truncated: false, truncatedBy: null, totalLines: 3, firstLineExceedsLimit: false };
const p = new Panel(); p.setComplete(full);
console.log(p.summary(), p.dump(), p.keys(), p.hasContent(), full.totalLines + 1);
export {};
