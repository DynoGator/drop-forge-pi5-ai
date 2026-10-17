import { existsSync, readFileSync } from "node:fs";
import { LLAMA_ASSET, LLAMA_URL, textEntries, type KitSpec } from "@/lib/deploy";
import { buildTar } from "@/lib/tar";
import type { QuantId } from "@/lib/quants";

const LOCAL = `/tmp/${LLAMA_ASSET}`;
let memory: Uint8Array | null = null;

async function ubuntuArm64(): Promise<Uint8Array> {
  if (memory) return memory;
  if (existsSync(LOCAL)) {
    const disk = new Uint8Array(readFileSync(LOCAL));
    if (disk.length > 1_000_000) {
      memory = disk;
      return disk;
    }
  }
  const res = await fetch(LLAMA_URL, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`llama.cpp release returned ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 1_000_000) throw new Error("llama.cpp download looks truncated");
  memory = buf;
  return buf;
}

const QUANTS = new Set(["Q4_K_M", "Q5_K_M", "Q8_0", "IQ3_XS", "IQ2_M", "keep"]);

export function parseKit(input: unknown): KitSpec {
  if (!input || typeof input !== "object") throw new Error("Bad kit");
  const raw = input as Record<string, unknown>;
  const repo = String(raw.repo ?? "");
  const path = String(raw.path ?? "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(repo)) {
    throw new Error("Bad repo");
  }
  if (!/^(?!.*\.\.)[A-Za-z0-9._+@ ()/-]{1,240}$/.test(path) || !path.toLowerCase().endsWith(".gguf")) {
    throw new Error("Pack a .gguf file. Safetensors cannot be served by llama-server.");
  }
  const quant = String(raw.quant ?? "");
  if (!QUANTS.has(quant)) throw new Error("Bad quant");
  const piUser = String(raw.piUser ?? "pi");
  if (!/^[a-z_][a-z0-9_-]{0,31}$/.test(piUser)) throw new Error("Bad Pi username");
  const port = Number(raw.port);
  const ctx = Number(raw.ctx);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Bad port");
  if (!Number.isInteger(ctx) || ctx < 256 || ctx > 32768) throw new Error("Bad context");
  const bytes = Number(raw.bytes);
  const outputBytes = Number(raw.outputBytes);
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error("Bad size");
  if (!Number.isFinite(outputBytes) || outputBytes < 0) throw new Error("Bad output size");
  const params = raw.params == null ? null : Number(raw.params);
  return {
    repo,
    path,
    quant: quant as QuantId | "keep",
    piUser,
    port,
    ctx,
    embedBinary: raw.embedBinary !== false,
    bytes,
    outputBytes,
    params: params != null && Number.isFinite(params) ? params : null,
  };
}

export async function buildKitTar(spec: KitSpec) {
  const entries = textEntries(spec);
  if (spec.embedBinary) {
    const bin = await ubuntuArm64();
    entries.push({
      name: `dropforge-kit/vendor/${LLAMA_ASSET}`,
      data: bin as Uint8Array<ArrayBuffer>,
      mode: 0o644,
    });
  }
  return buildTar(entries);
}
