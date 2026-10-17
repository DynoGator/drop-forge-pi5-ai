import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { S as paramsFromName, b as hfParamCap, l as classifyGuard, v as guardPasses, x as maxParams, y as guardQueries } from "./format-BJ4-AqxL.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/hf.functions-K_92DMvN.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var FILE_TYPES = {
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
	28: "BF16"
};
var Truncated = class extends Error {
	constructor() {
		super("truncated");
		this.name = "Truncated";
	}
};
var Reader = class {
	o = 0;
	b;
	constructor(b) {
		this.b = b;
	}
	get offset() {
		return this.o;
	}
	remaining() {
		return this.b.length - this.o;
	}
	need(n) {
		if (this.o + n > this.b.length) throw new Truncated();
	}
	skip(n) {
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
};
function skipValue(r, type) {
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
		default: throw new Truncated();
	}
}
function readScalar(r, type) {
	switch (type) {
		case 0:
		case 1: return r.u8();
		case 2:
		case 3:
			r.skip(2);
			return null;
		case 4: return r.u32();
		case 5: return r.i32();
		case 6: return r.f32();
		case 7: return r.u8() !== 0;
		case 8: return r.str();
		case 10:
		case 11: return r.u64();
		case 12:
			r.skip(8);
			return null;
		default:
			skipValue(r, type);
			return null;
	}
}
function interesting(key) {
	return key === "general.architecture" || key === "general.name" || key === "general.file_type" || key === "general.parameter_count" || key === "general.size_label" || key.endsWith(".block_count") || key.endsWith(".context_length") || key.endsWith(".embedding_length");
}
function parseGguf(buf) {
	const base = {
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
		truncated: false
	};
	if (buf.length < 24) return {
		...base,
		truncated: true
	};
	if (String.fromCharCode(buf[0] ?? 0, buf[1] ?? 0, buf[2] ?? 0, buf[3] ?? 0) !== "GGUF") throw new Error("Not a GGUF file");
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
			if (key === "general.file_type" && typeof value === "number") base.fileTypeName = FILE_TYPES[value] ?? `type ${value}`;
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
function parseSafetensors(buf) {
	const base = {
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
		truncated: false
	};
	if (buf.length < 8) return {
		...base,
		truncated: true
	};
	const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const headerLen = dv.getUint32(0, true) + dv.getUint32(4, true) * 2 ** 32;
	if (headerLen <= 0 || headerLen > 8e6) throw new Error("Safetensors header is an unexpected size");
	if (buf.length < 8 + headerLen) return {
		...base,
		truncated: true
	};
	const json = new TextDecoder().decode(buf.subarray(8, 8 + headerLen));
	const obj = JSON.parse(json);
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
var REPO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
var FILEPATH = /^(?!.*\.\.)[A-Za-z0-9._+@ ()/-]{1,240}$/;
var BUCKETS = {
	any: "",
	sub1: "min:0,max:1B",
	"1-4": "min:1B,max:4B",
	"4-8": "min:4B,max:8B",
	"8-14": "min:8B,max:14B"
};
var LICENSES = /* @__PURE__ */ new Set([
	"",
	"apache-2.0",
	"mit",
	"llama3",
	"llama3.1",
	"llama3.2",
	"llama3.3",
	"gemma",
	"cc-by-nc-4.0",
	"cc-by-4.0"
]);
function tokenOf(value) {
	const token = String(value ?? "").trim();
	if (!token) return "";
	if (!/^hf_[A-Za-z0-9]{8,}$/.test(token)) return "";
	return token;
}
function hfHeaders(token) {
	const headers = {
		Accept: "application/json",
		"User-Agent": "DropForge/1.0"
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	return headers;
}
function licenseOf(tags) {
	const tag = tags?.find((item) => item.startsWith("license:"));
	return tag ? tag.slice(8) : null;
}
function parseSearch(input) {
	if (!input || typeof input !== "object") throw new Error("Bad search");
	const raw = input;
	const q = String(raw.q ?? "").trim().slice(0, 120);
	const bucket = String(raw.bucket ?? "fits");
	if (bucket !== "fits" && !(bucket in BUCKETS)) throw new Error("Bad parameter filter");
	const license = String(raw.license ?? "");
	if (!LICENSES.has(license)) throw new Error("Bad license filter");
	const kind = raw.kind === "safetensors" ? "safetensors" : "gguf";
	const task = raw.task === "any" ? "any" : "text-generation";
	const guard = raw.guard === "reduced" || raw.guard === "any" ? raw.guard : "uncensored";
	const board = raw.board === "cm5" ? "cm5" : "pi5";
	const os = raw.os === "trixie" ? "trixie" : "bookworm";
	const use = raw.use === "code" || raw.use === "notes" || raw.use === "always" ? raw.use : "chat";
	const ram = Number(raw.ram);
	return {
		q,
		bucket,
		license,
		kind,
		task,
		guard,
		board,
		os,
		use,
		ramGiB: ram === 2 || ram === 4 || ram === 8 || ram === 16 ? ram : 8,
		token: tokenOf(raw.token)
	};
}
async function oneSearch(q, data) {
	const url = new URL("https://huggingface.co/api/models");
	if (q) url.searchParams.set("search", q);
	url.searchParams.set("limit", "20");
	url.searchParams.set("sort", "downloads");
	url.searchParams.set("direction", "-1");
	url.searchParams.set("full", "true");
	url.searchParams.append("filter", data.kind);
	if (data.license) url.searchParams.append("filter", `license:${data.license}`);
	const num = data.bucket === "fits" ? hfParamCap(maxParams(data.ramGiB, data.os, data.use)) : BUCKETS[data.bucket];
	if (num) url.searchParams.set("num_parameters", num);
	if (data.task === "text-generation") url.searchParams.set("pipeline_tag", "text-generation");
	const res = await fetch(url, {
		headers: hfHeaders(data.token),
		signal: AbortSignal.timeout(2e4)
	});
	if (!res.ok) throw new Error(`Hugging Face returned ${res.status}`);
	return await res.json();
}
var searchModels_createServerFn_handler = createServerRpc({
	id: "880aad88c8feaa00dc167ac1312321d33410450a79e380eaf01bebd65c4165c5",
	name: "searchModels",
	filename: "src/lib/hf.functions.ts"
}, (opts) => searchModels.__executeServer(opts));
var searchModels = createServerFn({ method: "POST" }).validator(parseSearch).handler(searchModels_createServerFn_handler, async ({ data }) => {
	try {
		const queries = guardQueries(data.q, data.guard);
		const settled = await Promise.allSettled(queries.map((q) => oneSearch(q, data)));
		const failed = settled.filter((item) => item.status === "rejected");
		const bodies = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
		if (!bodies.length && failed.length) {
			const reason = failed[0].status === "rejected" ? failed[0].reason : null;
			return {
				ok: false,
				error: reason instanceof Error ? reason.message : "Search failed"
			};
		}
		const cap = data.bucket === "fits" ? maxParams(data.ramGiB, data.os, data.use) : data.bucket === "sub1" ? 1e9 : data.bucket === "1-4" ? 4e9 : data.bucket === "4-8" ? 8e9 : data.bucket === "8-14" ? 14e9 : null;
		const seen = /* @__PURE__ */ new Set();
		const models = [];
		for (const model of bodies) {
			const id = model.id ?? "";
			if (!id.includes("/") || seen.has(id)) continue;
			const guard = classifyGuard(`${id} ${(model.tags ?? []).join(" ")}`);
			if (!guardPasses(data.guard, guard)) continue;
			const params = model.safetensors?.total ?? paramsFromName(id);
			if (cap && params && params > cap * 1.05) continue;
			seen.add(id);
			const gated = model.gated === true || typeof model.gated === "string" && model.gated.length > 0;
			models.push({
				id,
				downloads: model.downloads ?? 0,
				likes: model.likes ?? 0,
				pipeline: model.pipeline_tag ?? null,
				license: licenseOf(model.tags),
				params,
				gated,
				updated: model.lastModified ?? null,
				guard
			});
		}
		const rank = {
			uncensored: 0,
			reduced: 1,
			standard: 2
		};
		models.sort((a, b) => rank[a.guard] - rank[b.guard] || b.downloads - a.downloads);
		return {
			ok: true,
			models: models.slice(0, 30)
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Search failed"
		};
	}
});
function parseRepo(input) {
	if (!input || typeof input !== "object") throw new Error("Bad request");
	const raw = input;
	const repo = String(raw.repo ?? "");
	if (!REPO.test(repo)) throw new Error("Repo id must look like org/name");
	return {
		repo,
		token: tokenOf(raw.token)
	};
}
var listFiles_createServerFn_handler = createServerRpc({
	id: "035a2ce7a9024a20b83b5c9012f1aa1315075ecf19b4a199a13990c034edeb9c",
	name: "listFiles",
	filename: "src/lib/hf.functions.ts"
}, (opts) => listFiles.__executeServer(opts));
var listFiles = createServerFn({ method: "POST" }).validator(parseRepo).handler(listFiles_createServerFn_handler, async ({ data }) => {
	try {
		const url = `https://huggingface.co/api/models/${data.repo.split("/").map(encodeURIComponent).join("/")}/tree/main?recursive=1`;
		const res = await fetch(url, {
			headers: hfHeaders(data.token),
			signal: AbortSignal.timeout(2e4)
		});
		if (res.status === 401 || res.status === 403) return {
			ok: false,
			error: "This repo is gated. Add a Hugging Face token in Settings."
		};
		if (!res.ok) return {
			ok: false,
			error: `File list returned ${res.status}`
		};
		const body = await res.json();
		const files = [];
		for (const item of Array.isArray(body) ? body : []) {
			const path = item.path ?? "";
			const lower = path.toLowerCase();
			const kind = lower.endsWith(".gguf") ? "gguf" : lower.endsWith(".safetensors") ? "safetensors" : null;
			if (!kind || item.type === "directory") continue;
			files.push({
				path,
				bytes: item.size ?? 0,
				kind
			});
		}
		files.sort((a, b) => a.bytes - b.bytes);
		return {
			ok: true,
			files
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "File list failed"
		};
	}
});
function parseInspect(input) {
	const base = parseRepo(input);
	const raw = input;
	const path = String(raw.path ?? "");
	if (!FILEPATH.test(path)) throw new Error("Bad file path");
	const kind = raw.kind === "safetensors" ? "safetensors" : "gguf";
	return {
		...base,
		path,
		kind
	};
}
async function readCapped(url, headers, cap) {
	const res = await fetch(url, {
		headers: {
			...headers,
			Range: `bytes=0-${cap - 1}`
		},
		redirect: "follow",
		signal: AbortSignal.timeout(25e3)
	});
	if (!res.ok && res.status !== 206) return {
		error: `Header fetch returned ${res.status}`,
		bytes: null
	};
	const reader = res.body?.getReader();
	if (!reader) return {
		error: "No response body",
		bytes: null
	};
	const chunks = [];
	let got = 0;
	while (got < cap) {
		const next = await reader.read();
		if (next.done) break;
		const slice = next.value;
		chunks.push(slice);
		got += slice.length;
		if (got >= cap) {
			await reader.cancel();
			break;
		}
	}
	const out = new Uint8Array(Math.min(got, cap));
	let offset = 0;
	for (const chunk of chunks) {
		const take = Math.min(chunk.length, out.length - offset);
		out.set(chunk.subarray(0, take), offset);
		offset += take;
		if (offset >= out.length) break;
	}
	return {
		error: null,
		bytes: out
	};
}
var inspectFile_createServerFn_handler = createServerRpc({
	id: "3bb5c100de2b2b82b7f6dc4d667f4c966da946a89d5d2bd0079bddca7f85ea0b",
	name: "inspectFile",
	filename: "src/lib/hf.functions.ts"
}, (opts) => inspectFile.__executeServer(opts));
var inspectFile = createServerFn({ method: "POST" }).validator(parseInspect).handler(inspectFile_createServerFn_handler, async ({ data }) => {
	try {
		const url = `https://huggingface.co/${data.repo.split("/").map(encodeURIComponent).join("/")}/resolve/main/${data.path.split("/").map(encodeURIComponent).join("/")}`;
		const first = await readCapped(url, hfHeaders(data.token), data.kind === "gguf" ? 15e5 : 65536);
		if (!first.bytes) return {
			ok: false,
			error: first.error ?? "Could not read the header"
		};
		if (data.kind === "safetensors") {
			const head = parseSafetensors(first.bytes);
			if (head.truncated && first.bytes.length >= 8) {
				const dv = new DataView(first.bytes.buffer, first.bytes.byteOffset, first.bytes.byteLength);
				const headerLen = dv.getUint32(0, true) + dv.getUint32(4, true) * 2 ** 32;
				if (headerLen > 0 && headerLen < 2e6) {
					const second = await readCapped(url, hfHeaders(data.token), headerLen + 8);
					if (second.bytes) return {
						ok: true,
						header: parseSafetensors(second.bytes)
					};
				}
			}
			return {
				ok: true,
				header: head
			};
		}
		return {
			ok: true,
			header: parseGguf(first.bytes)
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Inspect failed"
		};
	}
});
//#endregion
export { inspectFile_createServerFn_handler, listFiles_createServerFn_handler, searchModels_createServerFn_handler };
