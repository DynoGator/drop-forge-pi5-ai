import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  brass: "bg-brass text-ink border border-brass",
  ghost: "bg-surface text-fg border border-line",
  quiet: "bg-transparent text-muted border border-transparent",
  warn: "bg-transparent text-warn border border-warn",
} as const;

export function Button({
  variant = "brass",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 min-h-11 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    />
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 min-h-11 text-base text-fg placeholder:text-muted";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Banner({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warn";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm text-fg ${tone === "warn" ? "border-warn" : "border-line"}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  bad,
}: {
  label: string;
  value: string;
  sub?: string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-mono text-lg tabular-nums ${bad ? "text-warn" : "text-fg"}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Terminal({ lines }: { lines: string[] }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-5 text-fg">
      {lines.length ? lines.join("\n") : " "}
    </pre>
  );
}
