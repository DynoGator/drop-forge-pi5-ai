//#region node_modules/.nitro/vite/services/ssr/assets/format-BJ4-AqxL.js
var QUANTS = [
	{
		id: "Q4_K_M",
		bpw: 4.85,
		blurb: "Default for a Pi 5. K-quant, the size/quality knee.",
		imatrix: false
	},
	{
		id: "Q5_K_M",
		bpw: 5.69,
		blurb: "Cleaner than Q4. A 7B still fits an 8 GB Pi at 4k context if nothing else is running.",
		imatrix: false
	},
	{
		id: "Q8_0",
		bpw: 8.5,
		blurb: "Near F16. Heavy. 8B-class wants a 16 GB Pi.",
		imatrix: false
	},
	{
		id: "IQ3_XS",
		bpw: 3.3,
		blurb: "3-bit importance quant. Without an imatrix the quality falls off a cliff.",
		imatrix: true
	},
	{
		id: "IQ2_M",
		bpw: 2.7,
		blurb: "Aggressive. Use only when Q4 will not fit. Imatrix strongly preferred.",
		imatrix: true
	}
];
var OVERHEAD_CAP = 50331648;
var EXTRA_BPW = {
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
	IQ4_XS: 4.25
};
var DETECT_ORDER = [
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
	"F32"
];
function detectQuant(filename) {
	const u = (filename.split("/").pop() ?? filename).toUpperCase();
	for (const q of DETECT_ORDER) {
		const token = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/_/g, "[_\\-]?");
		if (new RegExp(`(?:^|[^A-Z0-9])${token}(?:[^A-Z0-9]|$)`).test(u)) return q === "FP16" ? "F16" : q;
	}
	return null;
}
function quantById(id) {
	return QUANTS.find((q) => q.id === id) ?? null;
}
function sourceBpw(kind, quant) {
	if (kind === "safetensors") return 16;
	if (!quant || quant === "F16" || quant === "BF16") return 16;
	if (quant === "F32") return 32;
	return quantById(quant)?.bpw ?? EXTRA_BPW[quant] ?? null;
}
function quantizableSource(detected) {
	return detected === null || detected === "F16" || detected === "BF16" || detected === "F32";
}
function estimateQuantOutput(inputBytes, srcBpw, dstBpw) {
	const overhead = Math.min(OVERHEAD_CAP, Math.max(8388608, inputBytes * .04));
	const weights = Math.max(inputBytes - overhead, inputBytes * .8);
	return Math.round(weights * (dstBpw / srcBpw) + overhead);
}
/** Peak RSS llama-quantize tends to touch on a phone: the source file plus scratch. */
function quantizePeakRam(inputBytes, outputBytes) {
	return Math.round(inputBytes * 1.05 + outputBytes * .15 + 671088640);
}
function gib(n) {
	return n * 1024 ** 3;
}
/** Pi 5 and CM5 are the same SoC (BCM2712, Cortex-A76 ×4). RAM and the carrier differ. */
var BOARDS = [{
	id: "pi5",
	label: "Pi 5",
	rams: [
		4,
		8,
		16
	]
}, {
	id: "cm5",
	label: "CM5",
	rams: [
		2,
		4,
		8,
		16
	]
}];
var OS_LIST = [{
	id: "bookworm",
	label: "Bookworm",
	reserveGiB: 1.15,
	note: "Debian 12, full desktop"
}, {
	id: "trixie",
	label: "Trixie",
	reserveGiB: 1.25,
	note: "Debian 13, full desktop"
}];
var USES = [
	{
		id: "chat",
		label: "Chat",
		ctx: 4096,
		minTps: 12
	},
	{
		id: "code",
		label: "Code",
		ctx: 8192,
		minTps: 8
	},
	{
		id: "notes",
		label: "Notes",
		ctx: 16384,
		minTps: 6
	},
	{
		id: "always",
		label: "Always-on",
		ctx: 2048,
		minTps: 25
	}
];
var GUARDS = [
	{
		id: "uncensored",
		label: "Uncensored"
	},
	{
		id: "reduced",
		label: "Reduced"
	},
	{
		id: "any",
		label: "Any"
	}
];
var STRONG = /abliterat|uncensor|unfilter|de-?censor|heretic|no[-_ ]?guard|jailbreak/i;
var RELAXED = /dolphin|noromaid|openhermes|mythomax|wizardlm|nous-hermes|godzilla/i;
var ORDER = {
	chat: [
		"Q5_K_M",
		"Q4_K_M",
		"Q8_0",
		"IQ3_XS",
		"IQ2_M"
	],
	code: [
		"Q5_K_M",
		"Q8_0",
		"Q4_K_M",
		"IQ3_XS",
		"IQ2_M"
	],
	notes: [
		"Q4_K_M",
		"Q5_K_M",
		"IQ3_XS",
		"IQ2_M",
		"Q8_0"
	],
	always: [
		"Q4_K_M",
		"IQ3_XS",
		"IQ2_M",
		"Q5_K_M",
		"Q8_0"
	]
};
var SCRATCH = 201326592;
var KERNEL = 201326592;
/** Pixel 9 Pro XL. Quantize is CPU. The NPU has no public GGUF kernel. */
var PHONE = {
	name: "Pixel 9 Pro XL",
	soc: "Tensor G4",
	threads: 4,
	quantBytesPerSec: 22e8
};
function boardById(id) {
	return BOARDS.find((item) => item.id === id) ?? BOARDS[0];
}
function osById(id) {
	return OS_LIST.find((item) => item.id === id) ?? OS_LIST[0];
}
function useById(id) {
	return USES.find((item) => item.id === id) ?? USES[0];
}
function coerceRam(board, ram) {
	const allowed = boardById(board).rams;
	if (allowed.includes(ram)) return ram;
	return allowed.reduce((best, item) => Math.abs(item - ram) < Math.abs(best - ram) ? item : best);
}
/** RAM left after the full desktop and a small kernel/firmware reserve. */
function usableBytes(ramGiB, os) {
	const reserve = osById(os).reserveGiB * 1024 ** 3 + KERNEL;
	return Math.max(268435456, gib(ramGiB) - reserve);
}
function classifyGuard(text) {
	if (STRONG.test(text)) return "uncensored";
	if (RELAXED.test(text)) return "reduced";
	return "standard";
}
function guardPasses(filter, kind) {
	if (filter === "any") return true;
	if (filter === "uncensored") return kind === "uncensored";
	return kind === "uncensored" || kind === "reduced";
}
function guardQueries(q, filter) {
	const base = q.trim();
	if (filter === "any") return [base];
	if (filter === "uncensored") return base ? [
		`${base} abliterated`,
		`${base} uncensored`,
		`${base} heretic`
	] : [
		"abliterated",
		"uncensored",
		"heretic"
	];
	return base ? [
		base,
		`${base} abliterated`,
		`${base} dolphin`
	] : [
		"abliterated",
		"dolphin",
		"uncensored"
	];
}
function kvBytes(params, ctx) {
	const p = params > 0 ? params : 1e9;
	return ctx * 14e4 * (p / 7e9);
}
/** Generation speed on a Pi 5 or CM5, 4 threads, memory-bound. Same CPU, so same curve. */
function piTokensPerSec(modelBytes, kv) {
	const gb = modelBytes / 1024 ** 3;
	if (gb <= .05) return 0;
	let speed = 26 / gb;
	if (kv > modelBytes) speed *= .75;
	return Math.max(1.5, Math.min(90, speed));
}
function quantizeSeconds(inputBytes, outputBytes) {
	return Math.max(8, Math.round((inputBytes + outputBytes) / PHONE.quantBytesPerSec));
}
function verdictOf(total, usable) {
	if (total < usable * .72) return "fits";
	if (total < usable * .92) return "tight";
	return "no";
}
function modelBytesFor(input) {
	const dst = quantById(input.quant);
	if (!dst) return null;
	if (input.kind !== "gguf" || !quantizableSource(input.detected)) {
		if (!input.bytes) return null;
		const bpw = sourceBpw(input.kind, input.detected) ?? dst.bpw;
		const params = input.params && input.params > 0 ? input.params : input.bytes * 8 / bpw;
		return {
			bytes: input.bytes,
			params
		};
	}
	const src = sourceBpw(input.kind, input.detected);
	if (input.bytes && src) return {
		bytes: estimateQuantOutput(input.bytes, src, dst.bpw),
		params: input.params && input.params > 0 ? input.params : input.bytes * 8 / src
	};
	if (input.params && input.params > 0) return {
		bytes: Math.round(input.params * dst.bpw / 8 + 12582912),
		params: input.params
	};
	return null;
}
function assessChoice(input) {
	const usable = usableBytes(input.ramGiB, input.os);
	const use = useById(input.use);
	const ctx = input.ctx ?? use.ctx;
	const keep = input.kind !== "gguf" || !quantizableSource(input.detected);
	const quant = keep ? "keep" : input.quant === "keep" ? "Q4_K_M" : input.quant;
	const sized = quant === "keep" ? null : modelBytesFor({
		...input,
		quant
	});
	let modelBytes = 0;
	let params = input.params ?? 0;
	if (keep) {
		if (!input.bytes) return null;
		modelBytes = input.bytes;
		const bpw = sourceBpw(input.kind, input.detected) ?? 4.85;
		params = params > 0 ? params : input.bytes * 8 / bpw;
	} else if (sized) {
		modelBytes = sized.bytes;
		params = sized.params;
	} else return null;
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
		note
	};
}
function recommend(input) {
	if (input.kind !== "gguf" || !quantizableSource(input.detected)) return assessChoice({
		...input,
		quant: "keep"
	});
	const use = useById(input.use);
	let slow = null;
	let worst = null;
	for (const quant of ORDER[use.id]) {
		const contexts = use.id === "notes" ? [
			use.ctx,
			8192,
			4096,
			2048
		] : [use.ctx];
		for (const ctx of contexts) {
			if (ctx > use.ctx) continue;
			const hit = assessChoice({
				...input,
				quant,
				ctx
			});
			if (!hit) continue;
			if (ctx < use.ctx && hit.verdict !== "no") hit.note = `Context cut to ${ctx} so it fits. ${hit.note}`;
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
var PARAM_STEPS = [
	3e8,
	5e8,
	8e8,
	1e9,
	15e8,
	3e9,
	4e9,
	7e9,
	8e9,
	12e9,
	14e9,
	22e9,
	32e9
];
/** Largest parameter count that still fits this rig at the smallest quant we ship. */
function maxParams(ramGiB, os, use) {
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
			use
		});
		if (hit && hit.verdict !== "no") best = params;
	}
	return best;
}
function hfParamCap(params) {
	if (params >= 1e9) return `min:0,max:${Math.ceil(params / 1e9 * 10) / 10}B`;
	return `min:0,max:${Math.max(50, Math.ceil(params / 1e6 / 50) * 50)}M`;
}
function formatTps(n) {
	if (!Number.isFinite(n) || n <= 0) return "—";
	return `~${Math.round(n)} t/s`;
}
QUANTS.map((item) => item.id);
function formatBytes(n) {
	if (!Number.isFinite(n)) return "—";
	const sign = n < 0 ? "-" : "";
	let v = Math.abs(n);
	const units = [
		"B",
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let u = 0;
	while (v >= 1024 && u < units.length - 1) {
		v /= 1024;
		u += 1;
	}
	const digits = u === 0 || v >= 100 ? 0 : v >= 10 ? 1 : 2;
	return `${sign}${v.toFixed(digits)} ${units[u]}`;
}
function formatCount(n) {
	if (!Number.isFinite(n)) return "—";
	if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
	return String(Math.round(n));
}
function formatParams(n) {
	if (!n || n <= 0) return "—";
	if (n >= 0xe8d4a51000) return `${(n / 0xe8d4a51000).toFixed(2)}T`;
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
	return String(Math.round(n));
}
function paramsFromName(text) {
	const m = text.match(/(\d+(?:\.\d+)?)\s*[Bb]\b/);
	if (!m) return null;
	const v = Number(m[1]);
	return Number.isFinite(v) ? v * 1e9 : null;
}
//#endregion
export { useById as A, quantById as C, recommend as D, quantizeSeconds as E, sourceBpw as O, paramsFromName as S, quantizePeakRam as T, gib as _, QUANTS as a, hfParamCap as b, boardById as c, detectQuant as d, estimateQuantOutput as f, formatTps as g, formatParams as h, PHONE as i, usableBytes as k, classifyGuard as l, formatCount as m, GUARDS as n, USES as o, formatBytes as p, OS_LIST as r, assessChoice as s, BOARDS as t, coerceRam as u, guardPasses as v, quantizableSource as w, maxParams as x, guardQueries as y };
