import type { ReactNode } from "react";

export type ReceiptLine = { label: ReactNode; value?: ReactNode; tone?: "muted" | "accent" | "warn" };

const tones = { muted: "text-ink-3", accent: "text-accent font-medium", warn: "text-warn" } as const;

export function Receipt({ title, meta, lines, footer, className = "" }: { title: ReactNode; meta?: ReactNode; lines: ReceiptLine[]; footer?: ReactNode; className?: string }) {
  return (
    <div className={`receipt px-5 pt-5 pb-6 text-[13px] leading-relaxed ${className}`}>
      <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-rule pb-3">
        <p className="font-semibold uppercase tracking-wide">{title}</p>
        {meta ? <p className="text-ink-3">{meta}</p> : null}
      </div>
      <ol className="space-y-1.5 py-3">
        {lines.map((line, i) => (
          <li key={i} className="receipt-line flex justify-between gap-4" style={{ animationDelay: `${i * 70}ms` }}>
            <span className={line.tone ? tones[line.tone] : ""}>{line.label}</span>
            {line.value !== undefined ? <span className={`shrink-0 text-right ${line.tone ? tones[line.tone] : ""}`}>{line.value}</span> : null}
          </li>
        ))}
      </ol>
      {footer ? <div className="border-t border-dashed border-rule pt-3 text-ink-2">{footer}</div> : null}
    </div>
  );
}
