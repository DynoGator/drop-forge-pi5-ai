import { n as LLAMA_URL, r as textEntries, t as LLAMA_ASSET } from "./deploy-C1Ot8-dU.mjs";
import { existsSync, readFileSync } from "node:fs";
//#region node_modules/.nitro/vite/services/ssr/assets/kit.server-DOUfWOvR.js
function writeString(buf, offset, value, length) {
	const bytes = new TextEncoder().encode(value);
	buf.set(bytes.subarray(0, Math.min(bytes.length, length)), offset);
}
function writeOctal(buf, offset, value, length) {
	const digits = Math.max(0, length - 1);
	const s = Math.floor(value).toString(8).padStart(digits, "0").slice(-digits);
	for (let i = 0; i < digits; i += 1) buf[offset + i] = s.charCodeAt(i);
	buf[offset + length - 1] = 0;
}
function pad512(n) {
	return (512 - n % 512) % 512;
}
function headerFor(name, size, mode) {
	if (name.length > 100) throw new Error(`Tar path too long: ${name}`);
	const buf = /* @__PURE__ */ new Uint8Array(512);
	writeString(buf, 0, name, 100);
	writeOctal(buf, 100, mode, 8);
	writeOctal(buf, 108, 0, 8);
	writeOctal(buf, 116, 0, 8);
	writeOctal(buf, 124, size, 12);
	writeOctal(buf, 136, Math.floor(Date.now() / 1e3), 12);
	for (let i = 148; i < 156; i += 1) buf[i] = 32;
	buf[156] = "0".charCodeAt(0);
	writeString(buf, 257, "ustar", 5);
	buf[262] = 0;
	writeString(buf, 263, "00", 2);
	writeString(buf, 265, "dropforge", 32);
	writeString(buf, 297, "dropforge", 32);
	let sum = 0;
	for (let i = 0; i < 512; i += 1) sum += buf[i];
	const chk = sum.toString(8).padStart(6, "0");
	for (let i = 0; i < 6; i += 1) buf[148 + i] = chk.charCodeAt(i);
	buf[154] = 0;
	buf[155] = 32;
	return buf;
}
function buildTar(entries) {
	let total = 1024;
	for (const entry of entries) total += 512 + entry.data.length + pad512(entry.data.length);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const entry of entries) {
		const header = headerFor(entry.name, entry.data.length, entry.mode ?? 420);
		out.set(header, offset);
		offset += 512;
		out.set(entry.data, offset);
		offset += entry.data.length + pad512(entry.data.length);
	}
	return out;
}
var LOCAL = `/tmp/${LLAMA_ASSET}`;
var memory = null;
async function ubuntuArm64() {
	if (memory) return memory;
	if (existsSync(LOCAL)) {
		const disk = new Uint8Array(readFileSync(LOCAL));
		if (disk.length > 1e6) {
			memory = disk;
			return disk;
		}
	}
	const res = await fetch(LLAMA_URL, { signal: AbortSignal.timeout(12e4) });
	if (!res.ok) throw new Error(`llama.cpp release returned ${res.status}`);
	const buf = new Uint8Array(await res.arrayBuffer());
	if (buf.length < 1e6) throw new Error("llama.cpp download looks truncated");
	memory = buf;
	return buf;
}
var QUANTS = /* @__PURE__ */ new Set([
	"Q4_K_M",
	"Q5_K_M",
	"Q8_0",
	"IQ3_XS",
	"IQ2_M",
	"keep"
]);
function parseKit(input) {
	if (!input || typeof input !== "object") throw new Error("Bad kit");
	const raw = input;
	const repo = String(raw.repo ?? "");
	const path = String(raw.path ?? "");
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(repo)) throw new Error("Bad repo");
	if (!/^(?!.*\.\.)[A-Za-z0-9._+@ ()/-]{1,240}$/.test(path) || !path.toLowerCase().endsWith(".gguf")) throw new Error("Pack a .gguf file. Safetensors cannot be served by llama-server.");
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
		quant,
		piUser,
		port,
		ctx,
		embedBinary: raw.embedBinary !== false,
		bytes,
		outputBytes,
		params: params != null && Number.isFinite(params) ? params : null
	};
}
async function buildKitTar(spec) {
	const entries = textEntries(spec);
	if (spec.embedBinary) {
		const bin = await ubuntuArm64();
		entries.push({
			name: `dropforge-kit/vendor/${LLAMA_ASSET}`,
			data: bin,
			mode: 420
		});
	}
	return buildTar(entries);
}
//#endregion
export { buildKitTar, parseKit };
