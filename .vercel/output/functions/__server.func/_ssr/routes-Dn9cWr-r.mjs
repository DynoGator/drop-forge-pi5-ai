import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogOverlay, c as DialogTrigger, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { A as useById, C as quantById, D as recommend, E as quantizeSeconds, O as sourceBpw, S as paramsFromName, T as quantizePeakRam, _ as gib, a as QUANTS, c as boardById, d as detectQuant, f as estimateQuantOutput, g as formatTps, h as formatParams, i as PHONE, k as usableBytes, m as formatCount, n as GUARDS, o as USES, p as formatBytes, r as OS_LIST, s as assessChoice, t as BOARDS, u as coerceRam, w as quantizableSource } from "./format-BJ4-AqxL.mjs";
import { t as LLAMA_ASSET } from "./deploy-C1Ot8-dU.mjs";
import { a as Package, c as ArrowUpFromLine, i as Search, o as FlaskConical, r as Settings, s as Cpu, t as X } from "../_libs/lucide-react.mjs";
import { n as Route$1, r as previewPathPrefix } from "./router-Bh3VGkfd.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Dn9cWr-r.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var REPO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
var FILEPATH = /^(?!.*\.\.)[A-Za-z0-9._+@ ()/-]{1,240}$/;
var BUCKETS$1 = {
	any: "",
	sub1: "min:0,max:1B",
	"1-4": "min:1B,max:4B",
	"4-8": "min:4B,max:8B",
	"8-14": "min:8B,max:14B"
};
var LICENSES$1 = /* @__PURE__ */ new Set([
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
function parseSearch(input) {
	if (!input || typeof input !== "object") throw new Error("Bad search");
	const raw = input;
	const q = String(raw.q ?? "").trim().slice(0, 120);
	const bucket = String(raw.bucket ?? "fits");
	if (bucket !== "fits" && !(bucket in BUCKETS$1)) throw new Error("Bad parameter filter");
	const license = String(raw.license ?? "");
	if (!LICENSES$1.has(license)) throw new Error("Bad license filter");
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
var searchModels = createServerFn({ method: "POST" }).validator(parseSearch).handler(createSsrRpc("880aad88c8feaa00dc167ac1312321d33410450a79e380eaf01bebd65c4165c5"));
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
var listFiles = createServerFn({ method: "POST" }).validator(parseRepo).handler(createSsrRpc("035a2ce7a9024a20b83b5c9012f1aa1315075ecf19b4a199a13990c034edeb9c"));
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
var inspectFile = createServerFn({ method: "POST" }).validator(parseInspect).handler(createSsrRpc("3bb5c100de2b2b82b7f6dc4d667f4c966da946a89d5d2bd0079bddca7f85ea0b"));
var defaultSettings = {
	hfToken: "",
	board: "pi5",
	os: "bookworm",
	use: "chat",
	guard: "uncensored",
	piRamGiB: 8,
	ctx: 4096,
	port: 8080,
	piUser: "pi",
	piHost: "",
	piSshPort: 22,
	pixelFreeGiB: 12
};
function readSettings(settings) {
	return {
		...defaultSettings,
		...settings
	};
}
var useForge = create()(persist((set) => ({
	files: [],
	selectedId: null,
	quant: "Q4_K_M",
	settings: defaultSettings,
	lastPlan: null,
	lastKit: null,
	stage: (file) => set((state) => ({
		files: [file, ...state.files.filter((item) => item.id !== file.id)].slice(0, 40),
		selectedId: file.id
	})),
	unstage: (id) => set((state) => ({
		files: state.files.filter((item) => item.id !== id),
		selectedId: state.selectedId === id ? null : state.selectedId
	})),
	attachHeader: (id, header, params) => set((state) => ({ files: state.files.map((item) => item.id === id ? {
		...item,
		header,
		params: params ?? item.params
	} : item) })),
	select: (id) => set({ selectedId: id }),
	setQuant: (quant) => set({ quant }),
	patchSettings: (patch) => set((state) => ({ settings: {
		...defaultSettings,
		...state.settings,
		...patch
	} })),
	commitPlan: (plan) => set({ lastPlan: plan }),
	commitKit: (kit) => set({ lastKit: kit })
}), {
	name: "dropforge",
	storage: createJSONStorage(() => localStorage),
	skipHydration: true,
	partialize: (state) => ({
		files: state.files,
		selectedId: state.selectedId,
		quant: state.quant,
		settings: state.settings,
		lastPlan: state.lastPlan,
		lastKit: state.lastKit
	})
}));
function fileId(repo, path) {
	return `${repo}::${path}`;
}
var variants = {
	brass: "bg-brass text-ink border border-brass",
	ghost: "bg-surface text-fg border border-line",
	quiet: "bg-transparent text-muted border border-transparent",
	warn: "bg-transparent text-warn border border-warn"
};
function Button({ variant = "brass", className = "", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		...props,
		className: `inline-flex items-center justify-center gap-2 rounded-lg px-3 min-h-11 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`
	});
}
var inputClass = "w-full rounded-lg border border-line bg-bg px-3 min-h-11 text-base text-fg placeholder:text-muted";
function Field({ label, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mb-1 block text-sm text-muted",
				children: label
			}),
			children,
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 block text-xs text-muted",
				children: hint
			}) : null
		]
	});
}
function Banner({ children, tone = "info" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `rounded-lg border px-3 py-2 text-sm text-fg ${tone === "warn" ? "border-warn" : "border-line"}`,
		children
	});
}
function Stat({ label, value, sub, bad }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-line bg-surface px-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `mt-1 font-mono text-lg tabular-nums ${bad ? "text-warn" : "text-fg"}`,
				children: value
			}),
			sub ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-0.5 text-xs text-muted",
				children: sub
			}) : null
		]
	});
}
function Terminal({ lines }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
		className: "max-h-80 overflow-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-5 text-fg",
		children: lines.length ? lines.join("\n") : " "
	});
}
var BUCKETS = [
	{
		id: "fits",
		label: "Fits this rig"
	},
	{
		id: "sub1",
		label: "Under 1B"
	},
	{
		id: "1-4",
		label: "1–4B"
	},
	{
		id: "4-8",
		label: "4–8B"
	},
	{
		id: "any",
		label: "Any size"
	}
];
var LICENSES = [
	{
		id: "",
		label: "Any license"
	},
	{
		id: "apache-2.0",
		label: "Apache-2.0"
	},
	{
		id: "mit",
		label: "MIT"
	},
	{
		id: "llama3.2",
		label: "Llama 3.2"
	},
	{
		id: "llama3.1",
		label: "Llama 3.1"
	},
	{
		id: "gemma",
		label: "Gemma"
	}
];
var GUARD_LABEL = {
	uncensored: "Uncensored",
	reduced: "Reduced",
	standard: "Aligned"
};
function ModelsScreen() {
	const navigate = useNavigate();
	const settings = readSettings(useForge((s) => s.settings));
	const patch = useForge((s) => s.patchSettings);
	const stage = useForge((s) => s.stage);
	const [q, setQ] = (0, import_react.useState)("");
	const [bucket, setBucket] = (0, import_react.useState)("fits");
	const [license, setLicense] = (0, import_react.useState)("");
	const [kind, setKind] = (0, import_react.useState)("gguf");
	const [task, setTask] = (0, import_react.useState)("text-generation");
	const [models, setModels] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [open, setOpen] = (0, import_react.useState)(null);
	const [files, setFiles] = (0, import_react.useState)({});
	const [fileError, setFileError] = (0, import_react.useState)(null);
	const [listing, setListing] = (0, import_react.useState)(null);
	const [staging, setStaging] = (0, import_react.useState)(null);
	const usable = usableBytes(settings.piRamGiB, settings.os);
	const use = useById(settings.use);
	function setBoard(id) {
		patch({
			board: id,
			piRamGiB: coerceRam(id, settings.piRamGiB)
		});
	}
	function setUse(id) {
		patch({
			use: id,
			ctx: useById(id).ctx
		});
	}
	async function run(next) {
		const query = next?.q ?? q;
		const size = next?.bucket ?? bucket;
		const guard = next?.guard ?? settings.guard;
		if (next?.q != null) setQ(next.q);
		if (next?.bucket) setBucket(next.bucket);
		if (next?.guard) patch({ guard: next.guard });
		setLoading(true);
		setError(null);
		const result = await searchModels({ data: {
			q: query,
			bucket: size,
			license,
			kind,
			task,
			token: settings.hfToken,
			guard,
			board: settings.board,
			os: settings.os,
			use: settings.use,
			ram: settings.piRamGiB
		} });
		setLoading(false);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		setModels(result.models);
	}
	async function openModel(id) {
		if (open === id) {
			setOpen(null);
			return;
		}
		setOpen(id);
		setFileError(null);
		if (files[id]) return;
		setListing(id);
		const result = await listFiles({ data: {
			repo: id,
			token: settings.hfToken
		} });
		setListing(null);
		if (!result.ok) {
			setFileError(result.error);
			return;
		}
		const wanted = result.files.filter((file) => file.kind === kind);
		setFiles((prev) => ({
			...prev,
			[id]: wanted.length ? wanted : result.files
		}));
	}
	function stageFile(model, file) {
		if (model.gated) return;
		const id = fileId(model.id, file.path);
		setStaging(id);
		const params = model.params ?? paramsFromName(file.path);
		stage({
			id,
			repo: model.id,
			path: file.path,
			bytes: file.bytes,
			kind: file.kind,
			license: model.license,
			params,
			detectedQuant: file.kind === "gguf" ? detectQuant(file.path) : null,
			gated: model.gated,
			header: null,
			stagedAt: Date.now()
		});
		navigate({
			to: "/",
			search: { tab: "quantize" }
		});
		inspectFile({ data: {
			repo: model.id,
			path: file.path,
			kind: file.kind,
			token: settings.hfToken
		} }).then((inspected) => {
			setStaging(null);
			if (inspected.ok) useForge.getState().attachHeader(id, inspected.header, inspected.header.parameterCount ?? params);
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl text-fg",
				children: "Hub"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Pick the board, then only look at models that fit it. Weights download onto the phone. Hugging Face is contacted when you search, not otherwise."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-3 rounded-lg border border-line bg-surface p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm text-fg",
							children: "Rig"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs text-brass tabular-nums",
							children: [formatBytes(usable), " free after the desktop"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, { children: BOARDS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: settings.board === item.id,
						onClick: () => setBoard(item.id),
						children: item.label
					}, item.id)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, { children: boardById(settings.board).rams.map((ram) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterChip, {
						active: settings.piRamGiB === ram,
						onClick: () => patch({ piRamGiB: ram }),
						children: [ram, " GB"]
					}, ram)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ChipRow, { children: [OS_LIST.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: settings.os === item.id,
						onClick: () => patch({ os: item.id }),
						children: item.label
					}, item.id)), USES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: settings.use === item.id,
						onClick: () => setUse(item.id),
						children: item.label
					}, item.id))] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, { children: GUARDS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: settings.guard === item.id,
						onClick: () => patch({ guard: item.id }),
						children: item.label
					}, item.id)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"Pi 5 and CM5 use the same Cortex-A76. ",
							use.label,
							" wants ",
							use.ctx,
							" context and at least ",
							use.minTps,
							" t/s. Uncensored matches the repo name — abliterated, uncensored, heretic — not a scan of the weights."
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3",
				onSubmit: (event) => {
					event.preventDefault();
					run();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg placeholder:text-muted",
							value: q,
							placeholder: "qwen, llama, smollm",
							onChange: (event) => setQ(event.target.value),
							"aria-label": "Search models"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: loading,
							children: loading ? "Searching" : "Search"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, { children: BUCKETS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: bucket === item.id,
						onClick: () => setBucket(item.id),
						children: item.label
					}, item.id)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ChipRow, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							active: kind === "gguf",
							onClick: () => setKind("gguf"),
							children: "GGUF"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							active: kind === "safetensors",
							onClick: () => setKind("safetensors"),
							children: "Safetensors"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							active: task === "text-generation",
							onClick: () => setTask("text-generation"),
							children: "Text"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
							active: task === "any",
							onClick: () => setTask("any"),
							children: "Any task"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm text-muted",
						children: ["License", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-fg",
							value: license,
							onChange: (event) => setLicense(event.target.value),
							children: LICENSES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: item.id,
								children: item.label
							}, item.id || "any"))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ChipRow, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => void run({
								q: "Qwen2.5-0.5B",
								bucket: "fits"
							}),
							children: "Qwen2.5 0.5B"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => void run({
								q: "Llama-3.2-1B",
								bucket: "fits"
							}),
							children: "Llama 3.2 1B"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => void run({
								q: "heretic",
								bucket: "sub1",
								guard: "uncensored"
							}),
							children: "Heretic"
						})
					] })
				]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, {
				tone: "warn",
				children: error
			}) : null,
			models && models.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, { children: "Nothing matched. Switch guardrails to Reduced or Any, or widen the size." }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid gap-2",
				children: models?.map((model) => {
					const plan = recommend({
						params: model.params,
						bytes: null,
						kind,
						detected: "F16",
						ramGiB: settings.piRamGiB,
						os: settings.os,
						use: settings.use
					});
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-lg border border-line bg-surface",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "w-full px-3 py-3 text-left",
							onClick: () => void openModel(model.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-fg",
										children: model.id
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `shrink-0 font-mono text-xs ${model.guard === "uncensored" ? "text-brass" : "text-muted"}`,
										children: GUARD_LABEL[model.guard]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 font-mono text-xs text-muted tabular-nums",
									children: [
										formatParams(model.params),
										" · ",
										formatCount(model.downloads),
										" downloads · ",
										model.license ?? "license ?",
										model.gated ? " · gated" : ""
									]
								}),
								plan ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: `mt-1 font-mono text-xs tabular-nums ${plan.verdict === "no" ? "text-warn" : "text-fg"}`,
									children: [
										plan.verdict === "fits" ? "Fits" : plan.verdict === "tight" ? "Tight" : "Won't fit",
										" · ",
										plan.quant,
										" · ",
										formatBytes(plan.modelBytes),
										" · ",
										formatTps(plan.tps),
										" · ",
										plan.ctx,
										" ctx"
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted",
									children: "Open the files. Size is not in the name."
								})
							]
						}), open === model.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-line px-3 py-3",
							children: [
								listing === model.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: "Reading the file tree…"
								}) : null,
								fileError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, {
									tone: "warn",
									children: fileError
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "grid gap-2",
									children: (files[model.id] ?? []).map((file) => {
										const id = fileId(model.id, file.path);
										const filePlan = assessChoice({
											params: model.params ?? paramsFromName(file.path),
											bytes: file.bytes,
											kind: file.kind,
											detected: file.kind === "gguf" ? detectQuant(file.path) : null,
											quant: "Q4_K_M",
											ramGiB: settings.piRamGiB,
											os: settings.os,
											use: settings.use
										});
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "flex items-center justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "truncate text-sm text-fg",
													children: file.path
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "font-mono text-xs text-muted tabular-nums",
													children: [
														formatBytes(file.bytes),
														file.kind === "gguf" && detectQuant(file.path) ? ` · ${detectQuant(file.path)}` : "",
														filePlan ? ` · ${filePlan.verdict === "no" ? "won't fit" : filePlan.verdict} · ${formatTps(filePlan.tps)}` : ""
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												type: "button",
												variant: "ghost",
												disabled: model.gated || staging === id,
												onClick: () => stageFile(model, file),
												children: model.gated ? "Token" : staging === id ? "Staging" : "Stage"
											})]
										}, file.path);
									})
								})
							]
						}) : null]
					}, model.id);
				})
			})
		]
	});
}
function ChipRow({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex gap-2 overflow-x-auto",
		children
	});
}
function FilterChip({ active, children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: `shrink-0 rounded-lg border px-3 min-h-11 text-sm ${active ? "border-brass bg-brass text-ink" : "border-line bg-bg text-fg"}`,
		children
	});
}
function apiUrl(path) {
	if (typeof window === "undefined") return path;
	return `${previewPathPrefix(window.location.hostname, window.location.pathname) ?? ""}${path}`;
}
function PackScreen() {
	const navigate = useNavigate();
	const files = useForge((s) => s.files);
	const selectedId = useForge((s) => s.selectedId);
	const select = useForge((s) => s.select);
	const quant = useForge((s) => s.quant);
	const settings = readSettings(useForge((s) => s.settings));
	const commitKit = useForge((s) => s.commitKit);
	const commitPlan = useForge((s) => s.commitPlan);
	const file = files.find((item) => item.id === selectedId) ?? null;
	const [embed, setEmbed] = (0, import_react.useState)(true);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [built, setBuilt] = (0, import_react.useState)(null);
	const plan = (0, import_react.useMemo)(() => {
		if (!file || file.kind !== "gguf") return null;
		const detected = file.detectedQuant ?? file.header?.fileTypeName ?? null;
		const convertible = quantizableSource(detected);
		const src = sourceBpw("gguf", detected);
		const dst = quantById(quant);
		const mode = convertible && dst && src != null ? quant : "keep";
		const outputBytes = mode === "keep" || !dst || src == null ? file.bytes : estimateQuantOutput(file.bytes, src, dst.bpw);
		const params = file.header?.parameterCount ?? file.params;
		return {
			detected,
			mode,
			outputBytes,
			fit: assessChoice({
				params,
				bytes: mode === "keep" ? file.bytes : outputBytes,
				kind: "gguf",
				detected: mode === "keep" ? detected : mode,
				quant: "keep",
				ramGiB: settings.piRamGiB,
				os: settings.os,
				use: settings.use,
				ctx: settings.ctx
			}),
			peak: mode === "keep" ? 0 : quantizePeakRam(file.bytes, outputBytes),
			usable: usableBytes(settings.piRamGiB, settings.os),
			params
		};
	}, [
		file,
		quant,
		settings
	]);
	async function build() {
		if (!file || !plan) return;
		setBusy(true);
		setError(null);
		setBuilt(null);
		try {
			const res = await fetch(apiUrl("/api/kit"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					repo: file.repo,
					path: file.path,
					quant: plan.mode,
					piUser: settings.piUser,
					port: settings.port,
					ctx: settings.ctx,
					embedBinary: embed,
					bytes: file.bytes,
					outputBytes: plan.outputBytes,
					params: file.header?.parameterCount ?? file.params
				})
			});
			if (!res.ok) throw new Error(await res.text());
			const blob = await res.blob();
			const name = `dropforge-${file.repo.split("/")[1] ?? "model"}-${plan.mode}.tar`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = name;
			link.click();
			URL.revokeObjectURL(url);
			commitPlan({
				fileId: file.id,
				quant: plan.mode,
				outputBytes: plan.outputBytes,
				peakRam: 0,
				at: Date.now()
			});
			commitKit({
				repo: file.repo,
				path: file.path,
				quant: plan.mode,
				embed,
				at: Date.now()
			});
			setBuilt(name);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Pack failed");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl",
				children: "Pack"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Tarball for Raspberry Pi OS desktop, Bookworm or Trixie, Pi 5 or CM5. install.sh tries the prebuilt binary, then compiles llama.cpp on the board if Bookworm’s glibc is too old. Put the finished GGUF in the tarball on the phone so the Pi does not quantize."
			})] }),
			!files.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, { children: "Stage a GGUF before packing." }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-x-auto",
				children: files.filter((item) => item.kind === "gguf").map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => select(item.id),
					className: `max-w-64 shrink-0 rounded-lg border px-3 py-2 text-left ${item.id === file?.id ? "border-brass bg-surface" : "border-line bg-bg"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-sm",
						children: item.path
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs text-muted tabular-nums",
						children: formatBytes(item.bytes)
					})]
				}, item.id))
			}),
			file && file.kind !== "gguf" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, {
				tone: "warn",
				children: "Safetensors stay in the library. llama-server needs a GGUF. Pick another staged file."
			}) : null,
			file && plan ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Ships as",
							value: plan.mode === "keep" ? "as-is" : plan.mode,
							sub: file.path
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "GGUF",
							value: formatBytes(plan.outputBytes),
							sub: plan.mode === "keep" ? "already quantized" : "after quantize"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "On the rig",
							value: plan.fit ? formatTps(plan.fit.tps) : "—",
							sub: plan.fit ? `${plan.fit.verdict} · ${formatBytes(plan.fit.totalBytes)} of ${formatBytes(plan.usable)}` : "no estimate",
							bad: plan.fit?.verdict === "no"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Listen",
							value: `:${settings.port}`,
							sub: `${settings.ctx} ctx · ${settings.os} · ${settings.board === "cm5" ? "CM5" : "Pi 5"}`
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex min-h-11 items-center gap-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: embed,
							onChange: (event) => setEmbed(event.target.checked)
						}),
						"Embed ",
						LLAMA_ASSET,
						" (~14 MB). Uncheck and install.sh downloads it on the Pi."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "grid gap-1 font-mono text-xs text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "dropforge-kit/install.sh" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "dropforge-kit/README.txt" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "dropforge-kit/MODEL.json" }),
						embed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["dropforge-kit/vendor/", LLAMA_ASSET] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "model.gguf — added by the phone when the file is in private storage" })
					]
				}),
				plan.mode !== "keep" && plan.peak > plan.usable ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banner, {
					tone: "warn",
					children: [
						"Quantizing this file needs about ",
						formatBytes(plan.peak),
						". This rig has ",
						formatBytes(plan.usable),
						" after the desktop. Quantize on the Pixel, then pack the smaller GGUF."
					]
				}) : null,
				plan.mode !== "keep" && plan.peak <= plan.usable ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banner, { children: [
					"install.sh will download the full source (",
					formatBytes(file.bytes),
					") onto the Pi and run llama-quantize there. On the phone, quantize first and the tarball carries the smaller GGUF instead."
				] }) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						disabled: busy,
						onClick: () => void build(),
						children: busy ? "Packing" : "Build tarball"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: () => void navigate({
							to: "/",
							search: { tab: "push" }
						}),
						children: "Push screen"
					})]
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, {
					tone: "warn",
					children: error
				}) : null,
				built ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banner, { children: [
					"Downloaded ",
					built,
					". Copy it to the Pi, then sudo sh dropforge-kit/install.sh."
				] }) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "overflow-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs text-fg",
					children: `tar -xf dropforge-kit.tar && sudo sh dropforge-kit/install.sh`
				})
			] }) : null
		]
	});
}
function PushScreen() {
	const settings = useForge((s) => s.settings);
	const patch = useForge((s) => s.patchSettings);
	const kit = useForge((s) => s.lastKit);
	const [user, setUser] = (0, import_react.useState)(settings.piUser || "pi");
	const [host, setHost] = (0, import_react.useState)(settings.piHost);
	const [port, setPort] = (0, import_react.useState)(String(settings.piSshPort || 22));
	const [auth, setAuth] = (0, import_react.useState)("key");
	const [runInstall, setRunInstall] = (0, import_react.useState)(true);
	const [copied, setCopied] = (0, import_react.useState)(null);
	const safeHost = host.trim();
	const safeUser = user.trim() || "pi";
	const safePort = Number(port) || 22;
	const scp = safeHost ? `scp -P ${safePort} dropforge-kit.tar ${safeUser}@${safeHost}:~/dropforge-kit.tar` : "scp -P 22 dropforge-kit.tar pi@PI_HOST:~/dropforge-kit.tar";
	const install = "tar -xf dropforge-kit.tar && sudo -n sh dropforge-kit/install.sh";
	const ssh = safeHost ? `ssh -p ${safePort} ${safeUser}@${safeHost} '${install}'` : `ssh -p 22 pi@PI_HOST '${install}'`;
	async function copy(label, text) {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(label);
		} catch {
			setCopied("copy failed");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl",
				children: "Push"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "The Android build opens SSH from the phone with JSch, checks the host key, SCPs the tarball, and can run the installer. This console is not on your LAN, so it will not pretend to reach the Pi. It writes the exact commands."
			})] }),
			kit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banner, { children: [
				"Last kit: ",
				kit.repo,
				" · ",
				kit.quant,
				" · binary ",
				kit.embed ? "embedded" : "downloaded on the Pi",
				"."
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, { children: "No kit built this session. You can still copy the commands and point them at a tarball you already have." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Pi address",
						hint: "LAN IP or hostname. Password and key stay on the phone, not here.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							value: host,
							placeholder: "192.168.1.20",
							onChange: (event) => setHost(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "User",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								value: user,
								onChange: (event) => setUser(event.target.value)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "SSH port",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								inputMode: "numeric",
								value: port,
								onChange: (event) => setPort(event.target.value)
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setAuth("key"),
							className: `min-h-11 flex-1 rounded-lg border text-sm ${auth === "key" ? "border-brass bg-brass text-ink" : "border-line text-fg"}`,
							children: "Private key"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setAuth("password"),
							className: `min-h-11 flex-1 rounded-lg border text-sm ${auth === "password" ? "border-brass bg-brass text-ink" : "border-line text-fg"}`,
							children: "Password"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-h-11 items-center gap-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: runInstall,
							onChange: (event) => setRunInstall(event.target.checked)
						}), "After the copy, run install.sh with sudo -n"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							auth === "key" ? "On the phone you import an OpenSSH or PEM key through the file picker. It can be kept in the keystore. It is never typed into this console." : "On the phone the password is held in memory for the session and not written to disk.",
							" ",
							"sudo -n fails unless the Pi user has passwordless sudo, which the default Raspberry Pi OS image does."
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Command, {
				label: "Copy",
				text: scp,
				copied,
				onCopy: copy
			}),
			runInstall ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Command, {
				label: "Install",
				text: ssh,
				copied,
				onCopy: copy
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				onClick: () => patch({
					piHost: safeHost,
					piUser: safeUser,
					piSshPort: safePort
				}),
				children: "Remember host"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, { children: "First connection on the phone shows the SHA256 host key and waits. It does not set StrictHostKeyChecking=no." })
		]
	});
}
function Command({ label, text, copied, onCopy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-line bg-surface p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm text-muted",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				onClick: () => onCopy(label, text),
				children: copied === label ? "Copied" : "Copy"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "overflow-auto font-mono text-xs text-fg",
			children: text
		})]
	});
}
function QuantizeScreen() {
	const navigate = useNavigate();
	const files = useForge((s) => s.files);
	const selectedId = useForge((s) => s.selectedId);
	const select = useForge((s) => s.select);
	const quant = useForge((s) => s.quant);
	const setQuant = useForge((s) => s.setQuant);
	const settings = readSettings(useForge((s) => s.settings));
	const commitPlan = useForge((s) => s.commitPlan);
	const file = files.find((item) => item.id === selectedId) ?? null;
	const [lines, setLines] = (0, import_react.useState)([]);
	const [running, setRunning] = (0, import_react.useState)(false);
	const plan = (0, import_react.useMemo)(() => {
		if (!file) return null;
		const detected = file.detectedQuant ?? file.header?.fileTypeName ?? null;
		const convertible = file.kind === "gguf" && quantizableSource(detected);
		const src = sourceBpw(file.kind, detected);
		const dst = quantById(quant);
		const keep = !convertible || file.kind !== "gguf";
		const outputBytes = !dst || keep || src == null ? file.bytes : estimateQuantOutput(file.bytes, src, dst.bpw);
		const peak = keep || file.kind !== "gguf" ? 0 : quantizePeakRam(file.bytes, outputBytes);
		const params = file.header?.parameterCount ?? file.params;
		const phoneFree = gib(settings.pixelFreeGiB);
		const fit = file.kind === "gguf" ? assessChoice({
			params: file.header?.parameterCount ?? file.params,
			bytes: file.bytes,
			kind: "gguf",
			detected,
			quant: convertible ? quant : "keep",
			ramGiB: settings.piRamGiB,
			os: settings.os,
			use: settings.use,
			ctx: settings.ctx
		}) : null;
		const suggested = recommend({
			params: file.header?.parameterCount ?? file.params,
			bytes: file.bytes,
			kind: file.kind,
			detected,
			ramGiB: settings.piRamGiB,
			os: settings.os,
			use: settings.use
		});
		return {
			detected,
			convertible,
			outputBytes,
			peak,
			params,
			infer: fit?.totalBytes ?? 0,
			phoneOk: peak === 0 || peak < phoneFree * .9,
			piOk: fit ? fit.verdict !== "no" : false,
			phoneFree,
			piBudget: fit?.usableBytes ?? 0,
			mode: keep ? "keep" : quant,
			fit,
			suggested,
			seconds: peak ? quantizeSeconds(file.bytes, outputBytes) : 0
		};
	}, [
		file,
		quant,
		settings
	]);
	async function rehearse() {
		if (!file || !plan) return;
		setRunning(true);
		const tensors = file.header?.tensorCount && file.header.tensorCount > 0 ? Math.min(file.header.tensorCount, 400) : 96;
		const head = [
			"llama-quantize b11706",
			"rehearsal — the binary runs on the phone, not in this console",
			`input   ${file.path}  ${formatBytes(file.bytes)}`,
			`target  ${plan.mode}`,
			plan.mode === "keep" ? "source is not F16/BF16/F32, or it is safetensors. Quantize will not run." : `peak RAM ${formatBytes(plan.peak)}  ·  Pixel free ${formatBytes(plan.phoneFree)}  ·  ${plan.phoneOk ? "fits" : "DOES NOT FIT"}`
		];
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (plan.mode === "keep" || !plan.phoneOk) {
			head.push(plan.phoneOk ? "stopped" : "stopped: not enough free RAM on the Pixel");
			setLines(head);
			setRunning(false);
			return;
		}
		const totalSteps = reduce ? 1 : 8;
		for (let step = 1; step <= totalSteps; step += 1) {
			const shown = Math.round(step / totalSteps * tensors);
			const block = Math.max(0, Math.floor((shown - 1) / 7));
			head.push(`[${String(shown).padStart(4)}/${String(tensors).padStart(4)}] blk.${block}.attn_q.weight`);
			setLines([...head]);
			if (!reduce) await new Promise((resolve) => setTimeout(resolve, 40));
		}
		head.push(`estimated output  ${formatBytes(plan.outputBytes)}`);
		head.push("actual bytes       written on device after llama-quantize exits");
		setLines([...head]);
		commitPlan({
			fileId: file.id,
			quant: plan.mode,
			outputBytes: plan.outputBytes,
			peakRam: plan.peak,
			at: Date.now()
		});
		setRunning(false);
	}
	if (!file) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl",
				children: "Quantize"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, { children: "Stage a file on the Hub screen first." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: () => void navigate({
					to: "/",
					search: { tab: "models" }
				}),
				children: "Back to Hub"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl",
				children: "Quantize"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "The phone quantizes with llama-quantize on four Tensor G4 performance cores. The Pi only receives the finished GGUF."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-x-auto",
				children: files.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => select(item.id),
					className: `max-w-64 shrink-0 rounded-lg border px-3 py-2 text-left ${item.id === file.id ? "border-brass bg-surface" : "border-line bg-bg"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-sm",
						children: item.path
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs text-muted tabular-nums",
						children: formatBytes(item.bytes)
					})]
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-line bg-surface px-3 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm text-fg",
						children: file.repo
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 truncate font-mono text-xs text-muted",
						children: file.path
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-xs text-muted tabular-nums",
						children: [
							file.kind,
							plan?.detected ? ` · ${plan.detected}` : "",
							file.header?.architecture ? ` · ${file.header.architecture}` : "",
							file.header?.tensorCount ? ` · ${file.header.tensorCount} tensors` : "",
							plan?.params ? ` · ${formatParams(plan.params)}` : "",
							file.header?.truncated ? " · header truncated" : ""
						]
					})
				]
			}),
			plan?.suggested && plan.suggested.quant !== quant && plan.convertible ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banner, { children: [
				"Best for this rig is ",
				plan.suggested.quant,
				" · ",
				formatTps(plan.suggested.tps),
				" · ",
				plan.suggested.note
			] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-line bg-surface px-3 py-3 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "font-mono text-xs text-brass",
						children: [
							PHONE.name,
							" · ",
							PHONE.soc
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-muted",
						children: [PHONE.threads, " threads on the X4 and the three A720s, using i8mm and dotprod. The four A520s stay free so the screen does not hitch. The NPU is idle — there is no public GGUF kernel for it. Mali-G715 is not in the quantize path."]
					}),
					plan && plan.peak > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-xs tabular-nums text-fg",
						children: [
							"About ",
							plan.seconds,
							"s · peak ",
							formatBytes(plan.peak),
							" · ",
							plan.phoneOk ? "fits free RAM" : "over free RAM"
						]
					}) : null
				]
			}),
			file.kind === "safetensors" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, {
				tone: "warn",
				children: "llama-quantize does not read safetensors. Stage a GGUF, or convert with convert_hf_to_gguf.py on the Pi or in Termux before this step."
			}) : null,
			file.kind === "gguf" && plan && !plan.convertible ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banner, { children: [
				"This file already looks like ",
				plan.detected,
				". Pack it as-is. Requantize needs an F16 or BF16 source, and llama-quantize will refuse without --allow-requantize."
			] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2",
				children: QUANTS.map((item) => {
					const disabled = file.kind !== "gguf" || !plan?.convertible;
					const active = quant === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled,
						onClick: () => setQuant(item.id),
						className: `rounded-lg border px-3 py-3 text-left disabled:opacity-40 ${active ? "border-brass bg-surface" : "border-line bg-bg"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-sm text-fg",
								children: item.id
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-xs text-muted tabular-nums",
								children: [item.bpw.toFixed(2), " bpw"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: item.blurb
						})]
					}, item.id);
				})
			}),
			quantById(quant)?.imatrix ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banner, {
				tone: "warn",
				children: [quant, " wants an imatrix. The phone build passes --imatrix when you import one. Without it the quant still runs and looks worse."]
			}) : null,
			plan ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Before",
						value: formatBytes(file.bytes),
						sub: plan.detected ?? file.kind
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "After",
						value: formatBytes(plan.outputBytes),
						sub: plan.mode === "keep" ? "unchanged" : "estimate"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Quantize RAM",
						value: plan.peak ? formatBytes(plan.peak) : "—",
						sub: plan.peak ? plan.phoneOk ? "fits Pixel free RAM" : "over Pixel free RAM" : "not run",
						bad: plan.peak > 0 && !plan.phoneOk
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Pi inference",
						value: formatBytes(plan.infer),
						sub: plan.piOk ? `${plan.fit?.verdict ?? "ok"} · ${formatTps(plan.fit?.tps ?? 0)}` : plan.fit?.note ?? "over the rig",
						bad: !plan.piOk
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						disabled: running,
						onClick: () => void rehearse(),
						children: running ? "Running" : "Rehearse quantize"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						disabled: !plan?.suggested || !plan.convertible,
						onClick: () => {
							const next = plan?.suggested?.quant;
							if (next === "Q4_K_M" || next === "Q5_K_M" || next === "Q8_0" || next === "IQ3_XS" || next === "IQ2_M") setQuant(next);
						},
						children: "Use recommended"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: () => {
							if (!file || !plan) return;
							commitPlan({
								fileId: file.id,
								quant: plan.mode,
								outputBytes: plan.outputBytes,
								peakRam: plan.peak,
								at: Date.now()
							});
							navigate({
								to: "/",
								search: { tab: "pack" }
							});
						},
						children: "Use this plan"
					})
				]
			}),
			lines.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { lines }) : null
		]
	});
}
var TABS = [
	{
		id: "models",
		label: "Models",
		icon: Search
	},
	{
		id: "quantize",
		label: "Quant",
		icon: Cpu
	},
	{
		id: "pack",
		label: "Pack",
		icon: Package
	},
	{
		id: "push",
		label: "Push",
		icon: ArrowUpFromLine
	},
	{
		id: "train",
		label: "Train",
		icon: FlaskConical
	}
];
function Shell({ tab, onTab, children }) {
	const files = useForge((s) => s.files);
	const settings = readSettings(useForge((s) => s.settings));
	(0, import_react.useEffect)(() => {
		useForge.persist.rehydrate();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg md:grid md:grid-cols-[13rem_minmax(0,1fr)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "hidden border-r border-line md:flex md:flex-col md:sticky md:top-0 md:h-dvh md:px-3 md:py-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "mt-6 flex flex-col gap-1",
						children: TABS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavButton, {
							item,
							active: tab === item.id,
							onClick: () => onTab(item.id)
						}, item.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-auto pt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsButton, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg px-4 py-3 md:px-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "md:hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { compact: true })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hidden min-w-0 flex-1 text-sm text-muted md:block",
							children: "Pixel prep. Pi 5 or CM5. Bookworm or Trixie desktop."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-auto flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-xs text-muted tabular-nums",
								children: [
									files.length,
									" staged · ",
									settings.board === "cm5" ? "CM5" : "Pi 5",
									" ",
									settings.piRamGiB,
									" GB"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "md:hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsButton, {})
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "mx-auto w-full max-w-3xl px-4 py-4 pb-28 md:px-6 md:py-6 md:pb-10",
					children
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-bg md:hidden",
				children: TABS.map((item) => {
					const Icon = item.icon;
					const active = tab === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => onTab(item.id),
						className: `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${active ? "text-brass" : "text-muted"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "size-5",
							"aria-hidden": true
						}), item.label]
					}, item.id);
				})
			})
		]
	});
}
function Wordmark({ compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: compact ? "" : "px-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-mono text-xs tracking-widest text-brass",
			children: "DROP FORGE"
		}), compact ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted",
			children: "Pi 5 and CM5. Bookworm or Trixie."
		})]
	});
}
function NavButton({ item, active, onClick }) {
	const Icon = item.icon;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: `flex min-h-11 items-center gap-2 rounded-lg px-2 text-left text-sm ${active ? "bg-surface text-brass" : "text-fg"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
				className: "size-4",
				"aria-hidden": true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.label }),
			item.id === "train" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-auto font-mono text-xs text-warn",
				children: "exp"
			}) : null
		]
	});
}
function SettingsButton() {
	const settings = readSettings(useForge((s) => s.settings));
	const patch = useForge((s) => s.patchSettings);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)(settings);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: (next) => {
			if (next) setDraft(useForge.getState().settings);
			setOpen(next);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-fg",
				"aria-label": "Settings",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-4" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-30 bg-bg/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "fixed inset-x-3 top-16 z-40 mx-auto max-h-[80dvh] max-w-lg overflow-auto rounded-lg border border-line bg-surface p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						className: "text-lg text-fg",
						children: "Rig"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
						className: "inline-flex min-h-11 min-w-11 items-center justify-center text-muted",
						"aria-label": "Close",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "mt-1 text-sm text-muted",
					children: "The phone build keeps the token in encrypted storage. Here it stays in this browser and is only forwarded to Hugging Face."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Hugging Face token",
							hint: "Optional. Needed for gated repos. Not saved on the server.",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								type: "password",
								autoComplete: "off",
								value: draft.hfToken,
								onChange: (e) => setDraft({
									...draft,
									hfToken: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Pi RAM",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: inputClass,
									value: draft.piRamGiB,
									onChange: (e) => setDraft({
										...draft,
										piRamGiB: Number(e.target.value)
									}),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: 2,
											children: "2 GB"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: 4,
											children: "4 GB"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: 8,
											children: "8 GB"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: 16,
											children: "16 GB"
										})
									]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Pixel free RAM",
								hint: "Of 16 GB, after GrapheneOS.",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									inputMode: "decimal",
									value: draft.pixelFreeGiB,
									onChange: (e) => setDraft({
										...draft,
										pixelFreeGiB: Number(e.target.value) || 0
									})
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Context",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									inputMode: "numeric",
									value: draft.ctx,
									onChange: (e) => setDraft({
										...draft,
										ctx: Number(e.target.value) || 0
									})
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "llama-server port",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									inputMode: "numeric",
									value: draft.port,
									onChange: (e) => setDraft({
										...draft,
										port: Number(e.target.value) || 0
									})
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Pi user",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: inputClass,
								value: draft.piUser,
								onChange: (e) => setDraft({
									...draft,
									piUser: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Pi host",
								hint: "LAN address. Used on the Push screen.",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									value: draft.piHost,
									placeholder: "192.168.1.20",
									onChange: (e) => setDraft({
										...draft,
										piHost: e.target.value
									})
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "SSH port",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: inputClass,
									inputMode: "numeric",
									value: draft.piSshPort,
									onChange: (e) => setDraft({
										...draft,
										piSshPort: Number(e.target.value) || 22
									})
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "text-sm text-brass underline",
							href: "/dropforge-android.zip",
							children: "Download the Android project"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 rounded-lg bg-brass px-3 text-sm font-medium text-ink",
							onClick: () => {
								patch({
									...draft,
									pixelFreeGiB: Math.min(16, Math.max(1, draft.pixelFreeGiB)),
									ctx: Math.min(32768, Math.max(256, Math.round(draft.ctx) || 4096)),
									port: Math.min(65535, Math.max(1, Math.round(draft.port) || 8080)),
									piSshPort: Math.min(65535, Math.max(1, Math.round(draft.piSshPort) || 22)),
									piUser: draft.piUser.trim() || "pi"
								});
								setOpen(false);
							},
							children: "Save"
						})
					]
				})
			]
		})] })]
	});
}
function countJsonl(sample) {
	const lines = sample.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	let rows = 0;
	let bad = 0;
	let chars = 0;
	for (const line of lines) {
		chars += line.length;
		try {
			const row = JSON.parse(line);
			if (row && typeof row === "object") rows += 1;
			else bad += 1;
		} catch {
			bad += 1;
		}
	}
	return {
		rows,
		bad,
		chars,
		tokens: Math.round(chars / 4)
	};
}
function loraPlan(model, params) {
	return {
		onDevice: false,
		reason: params != null && params > 0 && params < 1e9 ? "Under 1B clears the memory gate for a rank-8 LoRA on a GPU or a fat CPU. The phone still does not run the optimizer. AdamW state alone is most of the 16 GB, and Tensor G4 has no training stack." : params != null && params >= 1e9 ? "At or above 1B this is refused on device. Optimizer state is about 8 bytes per parameter before gradients and activations. Take it to a remote GPU." : "Parameter count is unknown, so the on-device gate stays shut. Confirm it is under 1B before you even talk about LoRA.",
		rank: 8,
		alpha: 16,
		lr: "2e-4",
		epochs: 1,
		targets: "q_proj, v_proj",
		script: `#!/usr/bin/env python3
"""Drop Forge LoRA stub. Not for the phone.
Requires: pip install peft transformers datasets accelerate
Runs where CUDA exists, or on a CPU box you are willing to wait on.
"""
import sys
PARAMS = ${params ?? -1}
if PARAMS >= 1_000_000_000:
    sys.exit("refusing: model is not under 1B")
if PARAMS < 0:
    sys.exit("refusing: parameter count unknown")

from datasets import load_dataset
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer

MODEL = ${JSON.stringify(model || "org/model")}
tokenizer = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL)
model = get_peft_model(model, LoraConfig(
    r=8, lora_alpha=16, lora_dropout=0.05, bias="none",
    task_type="CAUSAL_LM", target_modules=["q_proj", "v_proj"],
))
data = load_dataset("json", data_files="train.jsonl")["train"]

def tok(batch):
    text = batch.get("text") or batch.get("prompt") or []
    return tokenizer(text, truncation=True, max_length=512)

args = TrainingArguments(
    output_dir="dropforge-lora",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    num_train_epochs=1,
    learning_rate=2e-4,
    logging_steps=5,
    save_strategy="epoch",
    fp16=False,
    bf16=False,
)
Trainer(model=model, args=args, train_dataset=data.map(tok, batched=True)).train()
model.save_pretrained("dropforge-lora")
`
	};
}
var SAMPLE = `{"text": "User: what is a K-quant?\\nAssistant: Q4_K_M stores most tensors at about 4.85 bits per weight."}`;
function TrainScreen() {
	const files = useForge((s) => s.files);
	const selected = useForge((s) => s.files.find((file) => file.id === s.selectedId) ?? null);
	const [model, setModel] = (0, import_react.useState)(selected?.repo ?? "");
	const [paramsText, setParamsText] = (0, import_react.useState)(selected?.params ? String(selected.params) : "");
	const [sample, setSample] = (0, import_react.useState)(SAMPLE);
	const [checked, setChecked] = (0, import_react.useState)(null);
	const params = Number(paramsText);
	const parsedParams = Number.isFinite(params) && params > 0 ? params : selected?.params ?? null;
	const plan = (0, import_react.useMemo)(() => loraPlan(model.trim(), parsedParams), [model, parsedParams]);
	const stats = (0, import_react.useMemo)(() => countJsonl(sample), [sample]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-2xl",
				children: ["Train ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-sm text-warn",
					children: "experimental"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Full training does not run on this phone, and this app does not send the job to a cloud API. The script below is for a GPU box you already have."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 rounded-lg border border-line bg-surface p-3 text-sm text-fg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Pixel 9 Pro XL is 16 GB LPDDR5X and a Tensor G4. No CUDA. Sustained power is about what the skin will tolerate, then it throttles." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "AdamW keeps two fp32 moments per parameter, 8 bytes, plus weights and gradients. A 1B model is already ~12 GB before activations. A 7B model is not a conversation. Sequence 2048 activations eat whatever RAM is left." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Adreno and the Mali-G715 have no backward pass worth shipping, and the Tensor NPU is not open for this. No root does not change that." })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Base model",
						hint: "Sub-1B is the only LoRA path this screen will describe as plausible.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							value: model,
							placeholder: "Qwen/Qwen2.5-0.5B-Instruct",
							onChange: (event) => setModel(event.target.value)
						})
					}),
					files.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-muted",
						children: ["From library", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: `${inputClass} mt-1`,
							value: selected?.id ?? "",
							onChange: (event) => {
								const file = files.find((item) => item.id === event.target.value);
								if (!file) return;
								useForge.getState().select(file.id);
								setModel(file.repo);
								if (file.params) setParamsText(String(file.params));
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Select a staged repo"
							}), files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: file.id,
								children: [
									file.repo,
									" · ",
									formatParams(file.params)
								]
							}, file.id))]
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Parameter count",
						hint: "Integer. 0.5B is 500000000.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							inputMode: "numeric",
							value: paramsText,
							onChange: (event) => setParamsText(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "jsonl sample",
						hint: "A handful of rows. The phone checks them. It does not train on them.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: `${inputClass} min-h-32 py-2 font-mono text-xs`,
							value: sample,
							onChange: (event) => setSample(event.target.value)
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, {
				tone: parsedParams != null && parsedParams >= 1e9 ? "warn" : "info",
				children: plan.reason
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 font-mono text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-line px-3 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted",
								children: "LoRA"
							}),
							"rank ",
							plan.rank,
							" · alpha ",
							plan.alpha
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-line px-3 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted",
								children: "Train"
							}),
							"lr ",
							plan.lr,
							" · ",
							plan.epochs,
							" epoch"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2 rounded-lg border border-line px-3 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted",
							children: "Targets"
						}), plan.targets]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "ghost",
					onClick: () => {
						if (stats.bad) setChecked(`${stats.rows} good rows, ${stats.bad} bad lines, ~${stats.tokens} tokens.`);
						else setChecked(`${stats.rows} jsonl rows, ~${stats.tokens} tokens. Dataset gate only — no optimizer started.`);
					},
					children: "Check dataset"
				})
			}),
			checked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banner, { children: checked }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm text-muted",
				children: "PEFT script"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Lightweight path is Hugging Face PEFT, rank 8, q_proj and v_proj. Run it on a GPU box or, if you insist, a Termux Python that will thermal-limit. The script exits if the model is not under 1B."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { lines: plan.script.split("\n") })
		]
	});
}
function Home() {
	const { tab } = Route$1.useSearch();
	const navigate = useNavigate();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		tab,
		onTab: (next) => {
			navigate({
				to: "/",
				search: { tab: next }
			});
		},
		children: [
			tab === "models" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelsScreen, {}) : null,
			tab === "quantize" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuantizeScreen, {}) : null,
			tab === "pack" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackScreen, {}) : null,
			tab === "push" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PushScreen, {}) : null,
			tab === "train" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrainScreen, {}) : null
		]
	});
}
//#endregion
export { Home as component };
