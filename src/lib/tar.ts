export type TarEntry = {
  name: string;
  data: Uint8Array<ArrayBufferLike>;
  mode?: number;
};

function writeString(buf: Uint8Array, offset: number, value: string, length: number) {
  const bytes = new TextEncoder().encode(value);
  buf.set(bytes.subarray(0, Math.min(bytes.length, length)), offset);
}

function writeOctal(buf: Uint8Array, offset: number, value: number, length: number) {
  const digits = Math.max(0, length - 1);
  const s = Math.floor(value).toString(8).padStart(digits, "0").slice(-digits);
  for (let i = 0; i < digits; i += 1) buf[offset + i] = s.charCodeAt(i);
  buf[offset + length - 1] = 0;
}

function pad512(n: number) {
  return (512 - (n % 512)) % 512;
}

function headerFor(name: string, size: number, mode: number): Uint8Array {
  if (name.length > 100) throw new Error(`Tar path too long: ${name}`);
  const buf = new Uint8Array(512);
  writeString(buf, 0, name, 100);
  writeOctal(buf, 100, mode, 8);
  writeOctal(buf, 108, 0, 8);
  writeOctal(buf, 116, 0, 8);
  writeOctal(buf, 124, size, 12);
  writeOctal(buf, 136, Math.floor(Date.now() / 1000), 12);
  for (let i = 148; i < 156; i += 1) buf[i] = 0x20;
  buf[156] = "0".charCodeAt(0);
  writeString(buf, 257, "ustar", 5);
  buf[262] = 0;
  writeString(buf, 263, "00", 2);
  writeString(buf, 265, "dropforge", 32);
  writeString(buf, 297, "dropforge", 32);
  let sum = 0;
  for (let i = 0; i < 512; i += 1) sum += buf[i]!;
  const chk = sum.toString(8).padStart(6, "0");
  for (let i = 0; i < 6; i += 1) buf[148 + i] = chk.charCodeAt(i);
  buf[154] = 0;
  buf[155] = 0x20;
  return buf;
}

export function buildTar(entries: TarEntry[]): Uint8Array {
  let total = 1024;
  for (const entry of entries) total += 512 + entry.data.length + pad512(entry.data.length);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const entry of entries) {
    const header = headerFor(entry.name, entry.data.length, entry.mode ?? 0o644);
    out.set(header, offset);
    offset += 512;
    out.set(entry.data, offset);
    offset += entry.data.length + pad512(entry.data.length);
  }
  return out;
}
