import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { inspectFile, listFiles, searchModels, type ModelHit, type RemoteFile } from "@/lib/hf.functions";
import { formatBytes, formatCount, formatParams, paramsFromName } from "@/lib/format";
import {
  BOARDS,
  GUARDS,
  OS_LIST,
  USES,
  assessChoice,
  boardById,
  coerceRam,
  formatTps,
  recommend,
  usableBytes,
  useById,
  type GuardId,
  type UseId,
} from "@/lib/fit";
import { detectQuant } from "@/lib/quants";
import { fileId, readSettings, useForge } from "@/lib/store";
import { Banner, Button } from "@/components/ui";

const BUCKETS = [
  { id: "fits", label: "Fits this rig" },
  { id: "sub1", label: "Under 1B" },
  { id: "1-4", label: "1–4B" },
  { id: "4-8", label: "4–8B" },
  { id: "any", label: "Any size" },
] as const;

const LICENSES = [
  { id: "", label: "Any license" },
  { id: "apache-2.0", label: "Apache-2.0" },
  { id: "mit", label: "MIT" },
  { id: "llama3.2", label: "Llama 3.2" },
  { id: "llama3.1", label: "Llama 3.1" },
  { id: "gemma", label: "Gemma" },
] as const;

const GUARD_LABEL = { uncensored: "Uncensored", reduced: "Reduced", standard: "Aligned" } as const;

export function ModelsScreen() {
  const navigate = useNavigate();
  const settings = readSettings(useForge((s) => s.settings));
  const patch = useForge((s) => s.patchSettings);
  const stage = useForge((s) => s.stage);
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]["id"]>("fits");
  const [license, setLicense] = useState("");
  const [kind, setKind] = useState<"gguf" | "safetensors">("gguf");
  const [task, setTask] = useState<"text-generation" | "any">("text-generation");
  const [models, setModels] = useState<ModelHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, RemoteFile[]>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [listing, setListing] = useState<string | null>(null);
  const [staging, setStaging] = useState<string | null>(null);

  const usable = usableBytes(settings.piRamGiB, settings.os);
  const use = useById(settings.use);

  function setBoard(id: "pi5" | "cm5") {
    patch({ board: id, piRamGiB: coerceRam(id, settings.piRamGiB) });
  }

  function setUse(id: UseId) {
    patch({ use: id, ctx: useById(id).ctx });
  }

  async function run(next?: { q?: string; bucket?: (typeof BUCKETS)[number]["id"]; guard?: GuardId }) {
    const query = next?.q ?? q;
    const size = next?.bucket ?? bucket;
    const guard = next?.guard ?? settings.guard;
    if (next?.q != null) setQ(next.q);
    if (next?.bucket) setBucket(next.bucket);
    if (next?.guard) patch({ guard: next.guard });
    setLoading(true);
    setError(null);
    const result = await searchModels({
      data: {
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
        ram: settings.piRamGiB,
      },
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setModels(result.models);
  }

  async function openModel(id: string) {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    setFileError(null);
    if (files[id]) return;
    setListing(id);
    const result = await listFiles({ data: { repo: id, token: settings.hfToken } });
    setListing(null);
    if (!result.ok) {
      setFileError(result.error);
      return;
    }
    const wanted = result.files.filter((file) => file.kind === kind);
    setFiles((prev) => ({ ...prev, [id]: wanted.length ? wanted : result.files }));
  }

  function stageFile(model: ModelHit, file: RemoteFile) {
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
      stagedAt: Date.now(),
    });
    void navigate({ to: "/", search: { tab: "quantize" } });
    void inspectFile({
      data: { repo: model.id, path: file.path, kind: file.kind, token: settings.hfToken },
    }).then((inspected) => {
      setStaging(null);
      if (inspected.ok) {
        useForge.getState().attachHeader(id, inspected.header, inspected.header.parameterCount ?? params);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl text-fg">Hub</h1>
        <p className="mt-1 text-sm text-muted">
          Pick the board, then only look at models that fit it. Weights download onto the phone. Hugging Face is contacted when you search, not otherwise.
        </p>
      </div>

      <section className="grid gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm text-fg">Rig</h2>
          <p className="font-mono text-xs text-brass tabular-nums">{formatBytes(usable)} free after the desktop</p>
        </div>
        <ChipRow>
          {BOARDS.map((item) => (
            <FilterChip key={item.id} active={settings.board === item.id} onClick={() => setBoard(item.id)}>
              {item.label}
            </FilterChip>
          ))}
        </ChipRow>
        <ChipRow>
          {boardById(settings.board).rams.map((ram) => (
            <FilterChip key={ram} active={settings.piRamGiB === ram} onClick={() => patch({ piRamGiB: ram })}>
              {ram} GB
            </FilterChip>
          ))}
        </ChipRow>
        <ChipRow>
          {OS_LIST.map((item) => (
            <FilterChip key={item.id} active={settings.os === item.id} onClick={() => patch({ os: item.id })}>
              {item.label}
            </FilterChip>
          ))}
          {USES.map((item) => (
            <FilterChip key={item.id} active={settings.use === item.id} onClick={() => setUse(item.id)}>
              {item.label}
            </FilterChip>
          ))}
        </ChipRow>
        <ChipRow>
          {GUARDS.map((item) => (
            <FilterChip key={item.id} active={settings.guard === item.id} onClick={() => patch({ guard: item.id })}>
              {item.label}
            </FilterChip>
          ))}
        </ChipRow>
        <p className="text-xs text-muted">
          Pi 5 and CM5 use the same Cortex-A76. {use.label} wants {use.ctx} context and at least {use.minTps} t/s.
          Uncensored matches the repo name — abliterated, uncensored, heretic — not a scan of the weights.
        </p>
      </section>

      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <div className="flex gap-2">
          <input
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg placeholder:text-muted"
            value={q}
            placeholder="qwen, llama, smollm"
            onChange={(event) => setQ(event.target.value)}
            aria-label="Search models"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching" : "Search"}
          </Button>
        </div>
        <ChipRow>
          {BUCKETS.map((item) => (
            <FilterChip key={item.id} active={bucket === item.id} onClick={() => setBucket(item.id)}>
              {item.label}
            </FilterChip>
          ))}
        </ChipRow>
        <ChipRow>
          <FilterChip active={kind === "gguf"} onClick={() => setKind("gguf")}>GGUF</FilterChip>
          <FilterChip active={kind === "safetensors"} onClick={() => setKind("safetensors")}>Safetensors</FilterChip>
          <FilterChip active={task === "text-generation"} onClick={() => setTask("text-generation")}>Text</FilterChip>
          <FilterChip active={task === "any"} onClick={() => setTask("any")}>Any task</FilterChip>
        </ChipRow>
        <label className="block text-sm text-muted">
          License
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-fg"
            value={license}
            onChange={(event) => setLicense(event.target.value)}
          >
            {LICENSES.map((item) => (
              <option key={item.id || "any"} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <ChipRow>
          <Button type="button" variant="ghost" onClick={() => void run({ q: "Qwen2.5-0.5B", bucket: "fits" })}>
            Qwen2.5 0.5B
          </Button>
          <Button type="button" variant="ghost" onClick={() => void run({ q: "Llama-3.2-1B", bucket: "fits" })}>
            Llama 3.2 1B
          </Button>
          <Button type="button" variant="ghost" onClick={() => void run({ q: "heretic", bucket: "sub1", guard: "uncensored" })}>
            Heretic
          </Button>
        </ChipRow>
      </form>

      {error ? <Banner tone="warn">{error}</Banner> : null}
      {models && models.length === 0 ? (
        <Banner>Nothing matched. Switch guardrails to Reduced or Any, or widen the size.</Banner>
      ) : null}

      <ul className="grid gap-2">
        {models?.map((model) => {
          const plan = recommend({
            params: model.params,
            bytes: null,
            kind,
            detected: "F16",
            ramGiB: settings.piRamGiB,
            os: settings.os,
            use: settings.use,
          });
          return (
            <li key={model.id} className="rounded-lg border border-line bg-surface">
              <button type="button" className="w-full px-3 py-3 text-left" onClick={() => void openModel(model.id)}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-fg">{model.id}</span>
                  <span className={`shrink-0 font-mono text-xs ${model.guard === "uncensored" ? "text-brass" : "text-muted"}`}>
                    {GUARD_LABEL[model.guard]}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted tabular-nums">
                  {formatParams(model.params)} · {formatCount(model.downloads)} downloads · {model.license ?? "license ?"}
                  {model.gated ? " · gated" : ""}
                </p>
                {plan ? (
                  <p className={`mt-1 font-mono text-xs tabular-nums ${plan.verdict === "no" ? "text-warn" : "text-fg"}`}>
                    {plan.verdict === "fits" ? "Fits" : plan.verdict === "tight" ? "Tight" : "Won't fit"}
                    {" · "}
                    {plan.quant} · {formatBytes(plan.modelBytes)} · {formatTps(plan.tps)} · {plan.ctx} ctx
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">Open the files. Size is not in the name.</p>
                )}
              </button>
              {open === model.id ? (
                <div className="border-t border-line px-3 py-3">
                  {listing === model.id ? <p className="text-sm text-muted">Reading the file tree…</p> : null}
                  {fileError ? <Banner tone="warn">{fileError}</Banner> : null}
                  <ul className="grid gap-2">
                    {(files[model.id] ?? []).map((file) => {
                      const id = fileId(model.id, file.path);
                      const filePlan = assessChoice({
                        params: model.params ?? paramsFromName(file.path),
                        bytes: file.bytes,
                        kind: file.kind,
                        detected: file.kind === "gguf" ? detectQuant(file.path) : null,
                        quant: "Q4_K_M",
                        ramGiB: settings.piRamGiB,
                        os: settings.os,
                        use: settings.use,
                      });
                      return (
                        <li key={file.path} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-fg">{file.path}</div>
                            <div className="font-mono text-xs text-muted tabular-nums">
                              {formatBytes(file.bytes)}
                              {file.kind === "gguf" && detectQuant(file.path) ? ` · ${detectQuant(file.path)}` : ""}
                              {filePlan ? ` · ${filePlan.verdict === "no" ? "won't fit" : filePlan.verdict} · ${formatTps(filePlan.tps)}` : ""}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={model.gated || staging === id}
                            onClick={() => stageFile(model, file)}
                          >
                            {model.gated ? "Token" : staging === id ? "Staging" : "Stage"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 overflow-x-auto">{children}</div>;
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg border px-3 min-h-11 text-sm ${active ? "border-brass bg-brass text-ink" : "border-line bg-bg text-fg"}`}
    >
      {children}
    </button>
  );
}
