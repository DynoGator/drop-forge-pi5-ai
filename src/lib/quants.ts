export const QUANTS = [
  {
    id: "Q4_K_M",
    bpw: 4.85,
    blurb: "Default for a Pi 5. K-quant, the size/quality knee.",
    imatrix: false,
  },
  {
    id: "Q5_K_M",
    bpw: 5.69,
    blurb: "Cleaner than Q4. A 7B still fits an 8 GB Pi at 4k context if nothing else is running.",
    imatrix: false,
  },
  {
    id: "Q8_0",
    bpw: 8.5,
    blurb: "Near F16. Heavy. 8B-class wants a 16 GB Pi.",
    imatrix: false,
  },
  {
    id: "IQ3_XS",
    bpw: 3.3,
    blurb: "3-bit importance quant. Without an imatrix the quality falls off a cliff.",
    imatrix: true,
  },
  {
    id: "IQ2_M",
    bpw: 2.7,
    blurb: "Aggressive. Use only when Q4 will not fit. Imatrix strongly preferred.",
    imatrix: true,
  },
] as const;

export type QuantId = (typeof QUANTS)[number]["id"];

export const PIXEL_TOTAL_BYTES = 16 * 1024 ** 3;
export const PIXEL_FREE_DEFAULT_GIB = 12;

const OVERHEAD_CAP = 48 * 1024 * 1024;

const EXTRA_BPW: Record<string, number> = {
  Q6_K: 6.56,
  Q5_K_S: 5.54,
  Q5_0: 5.5,
  Q4_K_S: 4.58,
  Q4_0: 4.5,
  Q3_K_L: 4.27,
  Q3_K_M: 3.91,
  Q3_K_S: 3.5,
  Q2_K: 3.35,
  IQ2_XXS: 2.06,
  IQ2_XS: 2.31,
  IQ4_XS: 4.25,
};

const DETECT_ORDER = [
  "IQ3_XS",
  "IQ2_XXS",
  "IQ2_XS",
  "IQ2_M",
  "IQ4_XS",
  "Q8_0",
  "Q6_K",
  "Q5_K_M",
  "Q5_K_S",
  "Q5_0",
  "Q4_K_M",
  "Q4_K_S",
  "Q4_0",
  "Q3_K_L",
  "Q3_K_M",
  "Q3_K_S",
  "Q2_K",
  "BF16",
  "FP16",
  "F16",
  "F32",
];

export function detectQuant(filename: string): string | null {
  const base = filename.split("/").pop() ?? filename;
  const u = base.toUpperCase();
  for (const q of DETECT_ORDER) {
    const token = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/_/g, "[_\\-]?");
    if (new RegExp(`(?:^|[^A-Z0-9])${token}(?:[^A-Z0-9]|$)`).test(u)) {
      return q === "FP16" ? "F16" : q;
    }
  }
  return null;
}

export function quantById(id: string) {
  return QUANTS.find((q) => q.id === id) ?? null;
}

export function sourceBpw(kind: "gguf" | "safetensors", quant: string | null): number | null {
  if (kind === "safetensors") return 16;
  if (!quant || quant === "F16" || quant === "BF16") return 16;
  if (quant === "F32") return 32;
  return quantById(quant)?.bpw ?? EXTRA_BPW[quant] ?? null;
}

export function quantizableSource(detected: string | null): boolean {
  return detected === null || detected === "F16" || detected === "BF16" || detected === "F32";
}

export function estimateQuantOutput(inputBytes: number, srcBpw: number, dstBpw: number): number {
  const overhead = Math.min(OVERHEAD_CAP, Math.max(8 * 1024 * 1024, inputBytes * 0.04));
  const weights = Math.max(inputBytes - overhead, inputBytes * 0.8);
  return Math.round(weights * (dstBpw / srcBpw) + overhead);
}

/** Peak RSS llama-quantize tends to touch on a phone: the source file plus scratch. */
export function quantizePeakRam(inputBytes: number, outputBytes: number): number {
  return Math.round(inputBytes * 1.05 + outputBytes * 0.15 + 640 * 1024 * 1024);
}

export function inferParams(bytes: number, bpw: number): number {
  const overhead = Math.min(OVERHEAD_CAP, bytes * 0.04);
  return Math.max(0, ((bytes - overhead) * 8) / bpw);
}

/** llama-server RSS: weights + KV cache + a fixed scratch pad. */
export function inferenceRam(modelBytes: number, params: number | null, ctx: number): number {
  const p = params && params > 0 ? params : inferParams(modelBytes, 4.85);
  const kv = ctx * 140_000 * (p / 7e9);
  return Math.round(modelBytes * 1.1 + kv + 256 * 1024 * 1024);
}

export function gib(n: number): number {
  return n * 1024 ** 3;
}
