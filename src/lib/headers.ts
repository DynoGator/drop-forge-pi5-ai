export type HeaderSummary = {
  format: "gguf" | "safetensors";
  version: number | null;
  tensorCount: number | null;
  architecture: string | null;
  name: string | null;
  fileTypeName: string | null;
  parameterCount: number | null;
  blockCount: number | null;
  contextLength: number | null;
  embeddingLength: number | null;
  truncated: boolean;
};

const FILE_TYPES: Record<number, string> = {
  0: "F32",
  1: "F16",
  2: "Q4_0",
  3: "Q4_1",
  7: "Q8_0",
  8: "Q5_0",
  9: "Q5_1",
  10: "Q2_K",
  11: "Q3_K_S",
  12: "Q3_K_M",
  13: "Q3_K_L",
  14: "Q4_K_S",
  15: "Q4_K_M",
  16: "Q5_K_S",
  17: "Q5_K_M",
  18: "Q6_K",
  19: "IQ2_XXS",
  20: "IQ2_XS",
  21: "IQ3_XXS",
  22: "IQ1_S",
  23: "IQ4_NL",
  24: "IQ3_S",
  25: "IQ2_S",
  26: "IQ4_XS",
  27: "IQ1_M",
  28: "BF16",
};

class Truncated extends Error {
  constructor() {
    super("truncated");
    this.name = "Truncated";
  }
}

class Reader {
  private o = 0;
  private readonly b: Uint8Array;
  constructor(b: Uint8Array) {
    this.b = b;
  }
  get offset() {
    return this.o;
  }
  remaining() {
    return this.b.length - this.o;
  }
  private need(n: number) {
    if (this.o + n > this.b.length) throw new Truncated();
  }
  skip(n: number) {
    this.need(n);
    this.o += n;
  }
  u8() {
    this.need(1);
    const value = this.b[this.o] ?? 0;
    this.o += 1;
    return value;
  }
  u32() {
    this.need(4);
    const v = new DataView(this.b.buffer, this.b.byteOffset + this.o, 4).getUint32(0, true);
    this.o += 4;
    return v;
  }
  i32() {
    this.need(4);
    const v = new DataView(this.b.buffer, this.b.byteOffset + this.o, 4).getInt32(0, true);
    this.o += 4;
    return v;
  }
  u64() {
    this.need(8);
    const dv = new DataView(this.b.buffer, this.b.byteOffset + this.o, 8);
    const lo = dv.getUint32(0, true);
    const hi = dv.getUint32(4, true);
    this.o += 8;
    return hi * 2 ** 32 + lo;
  }
  f32() {
    this.need(4);
    const v = new DataView(this.b.buffer, this.b.byteOffset + this.o, 4).getFloat32(0, true);
    this.o += 4;
    return v;
  }
  str() {
    const n = this.u64();
    if (n > this.remaining()) throw new Truncated();
    const s = new TextDecoder().decode(this.b.subarray(this.o, this.o + n));
    this.o += n;
    return s;
  }
}

function skipValue(r: Reader, type: number) {
  switch (type) {
    case 0:
    case 1:
    case 7:
      r.u8();
      return;
    case 2:
    case 3:
      r.skip(2);
      return;
    case 4:
    case 5:
    case 6:
      r.skip(4);
      return;
    case 10:
    case 11:
    case 12:
      r.skip(8);
      return;
    case 8: {
      const n = r.u64();
      if (n > r.remaining()) throw new Truncated();
      r.skip(n);
      return;
    }
    case 9: {
      const elem = r.u32();
      const count = r.u64();
      for (let i = 0; i < count; i += 1) skipValue(r, elem);
      return;
    }
    default:
      throw new Truncated();
  }
}

function readScalar(r: Reader, type: number): number | string | boolean | null {
  switch (type) {
    case 0:
    case 1:
      return r.u8();
    case 2:
    case 3:
      r.skip(2);
      return null;
    case 4:
      return r.u32();
    case 5:
      return r.i32();
    case 6:
      return r.f32();
    case 7:
      return r.u8() !== 0;
    case 8:
      return r.str();
    case 10:
    case 11:
      return r.u64();
    case 12:
      r.skip(8);
      return null;
    default:
      skipValue(r, type);
      return null;
  }
}

function interesting(key: string) {
  return (
    key === "general.architecture" ||
    key === "general.name" ||
    key === "general.file_type" ||
    key === "general.parameter_count" ||
    key === "general.size_label" ||
    key.endsWith(".block_count") ||
    key.endsWith(".context_length") ||
    key.endsWith(".embedding_length")
  );
}

export function parseGguf(buf: Uint8Array): HeaderSummary {
  const base: HeaderSummary = {
    format: "gguf",
    version: null,
    tensorCount: null,
    architecture: null,
    name: null,
    fileTypeName: null,
    parameterCount: null,
    blockCount: null,
    contextLength: null,
    embeddingLength: null,
    truncated: false,
  };
  if (buf.length < 24) return { ...base, truncated: true };
  const magic = String.fromCharCode(buf[0] ?? 0, buf[1] ?? 0, buf[2] ?? 0, buf[3] ?? 0);
  if (magic !== "GGUF") throw new Error("Not a GGUF file");
  const r = new Reader(buf);
  r.skip(4);
  const version = r.u32();
  base.version = version;
  if (version < 2) throw new Error(`GGUF v${version} is too old to plan against`);
  base.tensorCount = r.u64();
  const kv = r.u64();
  try {
    for (let i = 0; i < kv; i += 1) {
      const key = r.str();
      const type = r.u32();
      if (!interesting(key) || type === 9) {
        skipValue(r, type);
        continue;
      }
      const value = readScalar(r, type);
      if (key === "general.architecture" && typeof value === "string") base.architecture = value;
      if (key === "general.name" && typeof value === "string") base.name = value;
      if (key === "general.file_type" && typeof value === "number") {
        base.fileTypeName = FILE_TYPES[value] ?? `type ${value}`;
      }
      if (key === "general.parameter_count" && typeof value === "number") base.parameterCount = value;
      if (key.endsWith(".block_count") && typeof value === "number") base.blockCount = value;
      if (key.endsWith(".context_length") && typeof value === "number") base.contextLength = value;
      if (key.endsWith(".embedding_length") && typeof value === "number") base.embeddingLength = value;
    }
  } catch (err) {
    if (err instanceof Truncated) base.truncated = true;
    else throw err;
  }
  return base;
}

export function parseSafetensors(buf: Uint8Array): HeaderSummary {
  const base: HeaderSummary = {
    format: "safetensors",
    version: null,
    tensorCount: null,
    architecture: null,
    name: null,
    fileTypeName: "safetensors",
    parameterCount: null,
    blockCount: null,
    contextLength: null,
    embeddingLength: null,
    truncated: false,
  };
  if (buf.length < 8) return { ...base, truncated: true };
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const headerLen = dv.getUint32(0, true) + dv.getUint32(4, true) * 2 ** 32;
  if (headerLen <= 0 || headerLen > 8_000_000) throw new Error("Safetensors header is an unexpected size");
  if (buf.length < 8 + headerLen) return { ...base, truncated: true };
  const json = new TextDecoder().decode(buf.subarray(8, 8 + headerLen));
  const obj = JSON.parse(json) as Record<string, { shape?: number[] }>;
  let tensors = 0;
  let params = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (key === "__metadata__") continue;
    const shape = value?.shape;
    if (!shape?.length) continue;
    tensors += 1;
    params += shape.reduce((acc, dim) => acc * dim, 1);
  }
  base.tensorCount = tensors;
  base.parameterCount = params || null;
  return base;
}
