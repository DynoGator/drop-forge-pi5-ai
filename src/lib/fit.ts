import {
  QUANTS,
  estimateQuantOutput,
  gib,
  quantById,
  quantizableSource,
  sourceBpw,
  type QuantId,
} from "@/lib/quants";

/** Pi 5 and CM5 are the same SoC (BCM2712, Cortex-A76 ×4). RAM and the carrier differ. */
export const BOARDS = [
  { id: "pi5", label: "Pi 5", rams: [4, 8, 16] as const },
  { id: "cm5", label: "CM5", rams: [2, 4, 8, 16] as const },
] as const;

export const OS_LIST = [
  { id: "bookworm", label: "Bookworm", reserveGiB: 1.15, note: "Debian 12, full desktop" },
  { id: "trixie", label: "Trixie", reserveGiB: 1.25, note: "Debian 13, full desktop" },
] as const;

export const USES = [
  { id: "chat", label: "Chat", ctx: 4096, minTps: 12 },
  { id: "code", label: "Code", ctx: 8192, minTps: 8 },
  { id: "notes", label: "Notes", ctx: 16384, minTps: 6 },
  { id: "always", label: "Always-on", ctx: 2048, minTps: 25 },
] as const;

export const GUARDS = [
  { id: "uncensored", label: "Uncensored" },
  { id: "reduced", label: "Reduced" },
  { id: "any", label: "Any" },
] as const;

export type BoardId = (typeof BOARDS)[number]["id"];
export type OsId = (typeof OS_LIST)[number]["id"];
export type UseId = (typeof USES)[number]["id"];
export type GuardId = (typeof GUARDS)[number]["id"];
export type Verdict = "fits" | "tight" | "no";
export type GuardClass = "uncensored" | "reduced" | "standard";
export type RamGiB = 2 | 4 | 8 | 16;

const STRONG = /abliterat|uncensor|unfilter|de-?censor|heretic|no[-_ ]?guard|jailbreak/i;
const RELAXED = /dolphin|noromaid|openhermes|mythomax|wizardlm|nous-hermes|godzilla/i;

const ORDER: Record<UseId, QuantId[]> = {
  chat: ["Q5_K_M", "Q4_K_M", "Q8_0", "IQ3_XS", "IQ2_M"],
  code: ["Q5_K_M", "Q8_0", "Q4_K_M", "IQ3_XS", "IQ2_M"],
  notes: ["Q4_K_M", "Q5_K_M", "IQ3_XS", "IQ2_M", "Q8_0"],
  always: ["Q4_K_M", "IQ3_XS", "IQ2_M", "Q5_K_M", "Q8_0"],
};

const SCRATCH = 192 * 1024 * 1024;
const KERNEL = 192 * 1024 * 1024;

/** Pixel 9 Pro XL. Quantize is CPU. The NPU has no public GGUF kernel. */
export const PHONE = {
  name: "Pixel 9 Pro XL",
  soc: "Tensor G4",
  threads: 4,
  quantBytesPerSec: 2.2e9,
};

export type Assessment = {
  quant: string;
  ctx: number;
  modelBytes: number;
  kvBytes: number;
  totalBytes: number;
  usableBytes: number;
  verdict: Verdict;
  tps: number;
  speedOk: boolean;
  imatrix: boolean;
  note: string;
};

export function boardById(id: string) {
  return BOARDS.find((item) => item.id === id) ?? BOARDS[0];
}

export function osById(id: string) {
  return OS_LIST.find((item) => item.id === id) ?? OS_LIST[0];
}

export function useById(id: string) {
  return USES.find((item) => item.id === id) ?? USES[0];
}

export function coerceRam(board: string, ram: number): RamGiB {
  const allowed = boardById(board).rams;
  if ((allowed as readonly number[]).includes(ram)) return ram as RamGiB;
  return allowed.reduce((best, item) => (Math.abs(item - ram) < Math.abs(best - ram) ? item : best));
}

/** RAM left after the full desktop and a small kernel/firmware reserve. */
export function usableBytes(ramGiB: number, os: string): number {
  const reserve = osById(os).reserveGiB * 1024 ** 3 + KERNEL;
  return Math.max(256 * 1024 * 1024, gib(ramGiB) - reserve);
}

export function classifyGuard(text: string): GuardClass {
  if (STRONG.test(text)) return "uncensored";
  if (RELAXED.test(text)) return "reduced";
  return "standard";
}

export function guardPasses(filter: string, kind: GuardClass): boolean {
  if (filter === "any") return true;
  if (filter === "uncensored") return kind === "uncensored";
  return kind === "uncensored" || kind === "reduced";
}

export function guardQueries(q: string, filter: string): string[] {
  const base = q.trim();
  if (filter === "any") return [base];
  if (filter === "uncensored") {
    return base ? [`${base} abliterated`, `${base} uncensored`, `${base} heretic`] : ["abliterated", "uncensored", "heretic"];
  }
  return base ? [base, `${base} abliterated`, `${base} dolphin`] : ["abliterated", "dolphin", "uncensored"];
}

function kvBytes(params: number, ctx: number) {
  const p = params > 0 ? params : 1e9;
  return ctx * 140_000 * (p / 7e9);
}

/** Generation speed on a Pi 5 or CM5, 4 threads, memory-bound. Same CPU, so same curve. */
export function piTokensPerSec(modelBytes: number, kv: number): number {
  const gb = modelBytes / 1024 ** 3;
  if (gb <= 0.05) return 0;
  let speed = 26 / gb;
  if (kv > modelBytes) speed *= 0.75;
  return Math.max(1.5, Math.min(90, speed));
}

export function quantizeSeconds(inputBytes: number, outputBytes: number) {
  return Math.max(8, Math.round((inputBytes + outputBytes) / PHONE.quantBytesPerSec));
}

function verdictOf(total: number, usable: number): Verdict {
  if (total < usable * 0.72) return "fits";
  if (total < usable * 0.92) return "tight";
  return "no";
}

function modelBytesFor(input: {
  params: number | null;
  bytes: number | null;
  kind: "gguf" | "safetensors";
  detected: string | null;
  quant: QuantId;
}): { bytes: number; params: number } | null {
  const dst = quantById(input.quant);
  if (!dst) return null;
  const keep = input.kind !== "gguf" || !quantizableSource(input.detected);
  if (keep) {
    if (!input.bytes) return null;
    const bpw = sourceBpw(input.kind, input.detected) ?? dst.bpw;
    const params = input.params && input.params > 0 ? input.params : ((input.bytes * 8) / bpw);
    return { bytes: input.bytes, params };
  }
  const src = sourceBpw(input.kind, input.detected);
  if (input.bytes && src) {
    const bytes = estimateQuantOutput(input.bytes, src, dst.bpw);
    const params = input.params && input.params > 0 ? input.params : (input.bytes * 8) / src;
    return { bytes, params };
  }
  if (input.params && input.params > 0) {
    return { bytes: Math.round((input.params * dst.bpw) / 8 + 12 * 1024 * 1024), params: input.params };
  }
  return null;
}

export function assessChoice(input: {
  params: number | null;
  bytes: number | null;
  kind: "gguf" | "safetensors";
  detected: string | null;
  quant: QuantId | "keep";
  ramGiB: number;
  os: string;
  use: string;
  ctx?: number;
}): Assessment | null {
  const usable = usableBytes(input.ramGiB, input.os);
  const use = useById(input.use);
  const ctx = input.ctx ?? use.ctx;
  const keep = input.kind !== "gguf" || !quantizableSource(input.detected);
  const quant = keep ? "keep" : input.quant === "keep" ? "Q4_K_M" : input.quant;
  const sized =
    quant === "keep"
      ? null
      : modelBytesFor({ ...input, quant });
  let modelBytes = 0;
  let params = input.params ?? 0;
  if (keep) {
    if (!input.bytes) return null;
    modelBytes = input.bytes;
    const bpw = sourceBpw(input.kind, input.detected) ?? 4.85;
    params = params > 0 ? params : (input.bytes * 8) / bpw;
  } else if (sized) {
    modelBytes = sized.bytes;
    params = sized.params;
  } else {
    return null;
  }
  const kv = kvBytes(params, ctx);
  const total = Math.round(modelBytes * 1.08 + kv + SCRATCH);
  const verdict = verdictOf(total, usable);
  const tps = piTokensPerSec(modelBytes, kv);
  const speedOk = tps >= use.minTps;
  const spec = quant === "keep" ? null : quantById(quant);
  let note = "";
  if (input.kind === "safetensors") note = "Safetensors have to become GGUF before the Pi can serve them.";
  else if (verdict === "no") note = "Over the RAM left after the desktop.";
  else if (!speedOk) note = `Fits, but ~${Math.round(tps)} t/s is slow for ${use.label.toLowerCase()}.`;
  else if (verdict === "tight") note = "Fits, with little left for a browser tab.";
  else note = "Comfortable next to the desktop.";
  if (spec?.imatrix) note = `${note} Bring an imatrix or this quant looks worse.`;
  return {
    quant: keep ? input.detected ?? "keep" : quant,
    ctx,
    modelBytes,
    kvBytes: kv,
    totalBytes: total,
    usableBytes: usable,
    verdict,
    tps,
    speedOk,
    imatrix: Boolean(spec?.imatrix),
    note,
  };
}

export function recommend(input: {
  params: number | null;
  bytes: number | null;
  kind: "gguf" | "safetensors";
  detected: string | null;
  ramGiB: number;
  os: string;
  use: string;
}): Assessment | null {
  const keep = input.kind !== "gguf" || !quantizableSource(input.detected);
  if (keep) return assessChoice({ ...input, quant: "keep" });
  const use = useById(input.use);
  let slow: Assessment | null = null;
  let worst: Assessment | null = null;
  for (const quant of ORDER[use.id]) {
    const contexts = use.id === "notes" ? [use.ctx, 8192, 4096, 2048] : [use.ctx];
    for (const ctx of contexts) {
      if (ctx > use.ctx) continue;
      const hit = assessChoice({ ...input, quant, ctx });
      if (!hit) continue;
      if (ctx < use.ctx && hit.verdict !== "no") {
        hit.note = `Context cut to ${ctx} so it fits. ${hit.note}`;
      }
      worst = worst ?? hit;
      if (hit.verdict === "no") continue;
      if (use.id === "always" && !hit.speedOk) {
        slow = slow ?? hit;
        continue;
      }
      return hit;
    }
  }
  return slow ?? worst;
}

const PARAM_STEPS = [0.3e9, 0.5e9, 0.8e9, 1e9, 1.5e9, 3e9, 4e9, 7e9, 8e9, 12e9, 14e9, 22e9, 32e9];

/** Largest parameter count that still fits this rig at the smallest quant we ship. */
export function maxParams(ramGiB: number, os: string, use: string): number {
  let best = PARAM_STEPS[0];
  for (const params of PARAM_STEPS) {
    const hit = assessChoice({
      params,
      bytes: null,
      kind: "gguf",
      detected: "F16",
      quant: "IQ2_M",
      ramGiB,
      os,
      use,
    });
    if (hit && hit.verdict !== "no") best = params;
  }
  return best;
}

export function hfParamCap(params: number): string {
  if (params >= 1e9) {
    const rounded = Math.ceil((params / 1e9) * 10) / 10;
    return `min:0,max:${rounded}B`;
  }
  const millions = Math.max(50, Math.ceil(params / 1e6 / 50) * 50);
  return `min:0,max:${millions}M`;
}

export function formatTps(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `~${Math.round(n)} t/s`;
}

export const QUANT_IDS = QUANTS.map((item) => item.id);
