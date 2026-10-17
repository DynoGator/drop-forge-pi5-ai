import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LLAMA_ASSET, LLAMA_TAG } from "@/lib/deploy";
import { formatBytes } from "@/lib/format";
import { assessChoice, formatTps, usableBytes } from "@/lib/fit";
import {
  estimateQuantOutput,
  quantById,
  quantizableSource,
  quantizePeakRam,
  sourceBpw,
} from "@/lib/quants";
import { apiUrl } from "@/lib/api-url";
import { readSettings, useForge } from "@/lib/store";
import { Banner, Button, Stat } from "@/components/ui";

export function PackScreen() {
  const navigate = useNavigate();
  const files = useForge((s) => s.files);
  const selectedId = useForge((s) => s.selectedId);
  const select = useForge((s) => s.select);
  const quant = useForge((s) => s.quant);
  const settings = readSettings(useForge((s) => s.settings));
  const commitKit = useForge((s) => s.commitKit);
  const commitPlan = useForge((s) => s.commitPlan);
  const file = files.find((item) => item.id === selectedId) ?? null;
  const [embed, setEmbed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState<string | null>(null);

  const plan = useMemo(() => {
    if (!file || file.kind !== "gguf") return null;
    const detected = file.detectedQuant ?? file.header?.fileTypeName ?? null;
    const convertible = quantizableSource(detected);
    const src = sourceBpw("gguf", detected);
    const dst = quantById(quant);
    const mode: "Q4_K_M" | "Q5_K_M" | "Q8_0" | "IQ3_XS" | "IQ2_M" | "keep" =
      convertible && dst && src != null ? quant : "keep";
    const outputBytes = mode === "keep" || !dst || src == null
      ? file.bytes
      : estimateQuantOutput(file.bytes, src, dst.bpw);
    const params = file.header?.parameterCount ?? file.params;
    const fit = assessChoice({
      params,
      bytes: mode === "keep" ? file.bytes : outputBytes,
      kind: "gguf",
      detected: mode === "keep" ? detected : mode,
      quant: "keep",
      ramGiB: settings.piRamGiB,
      os: settings.os,
      use: settings.use,
      ctx: settings.ctx,
    });
    const peak = mode === "keep" ? 0 : quantizePeakRam(file.bytes, outputBytes);
    const usable = usableBytes(settings.piRamGiB, settings.os);
    return { detected, mode, outputBytes, fit, peak, usable, params };
  }, [file, quant, settings]);

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
          params: file.header?.parameterCount ?? file.params,
        }),
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
        at: Date.now(),
      });
      commitKit({ repo: file.repo, path: file.path, quant: plan.mode, embed, at: Date.now() });
      setBuilt(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pack failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl">Pack</h1>
        <p className="mt-1 text-sm text-muted">
          Tarball for Raspberry Pi OS desktop, Bookworm or Trixie, Pi 5 or CM5. install.sh tries the prebuilt binary, then compiles llama.cpp on the board if Bookworm’s glibc is too old. Put the finished GGUF in the tarball on the phone so the Pi does not quantize.
        </p>
      </div>

      {!files.length ? <Banner>Stage a GGUF before packing.</Banner> : null}
      <div className="flex gap-2 overflow-x-auto">
        {files.filter((item) => item.kind === "gguf").map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item.id)}
            className={`max-w-64 shrink-0 rounded-lg border px-3 py-2 text-left ${item.id === file?.id ? "border-brass bg-surface" : "border-line bg-bg"}`}
          >
            <span className="block truncate text-sm">{item.path}</span>
            <span className="font-mono text-xs text-muted tabular-nums">{formatBytes(item.bytes)}</span>
          </button>
        ))}
      </div>

      {file && file.kind !== "gguf" ? (
        <Banner tone="warn">Safetensors stay in the library. llama-server needs a GGUF. Pick another staged file.</Banner>
      ) : null}

      {file && plan ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Ships as" value={plan.mode === "keep" ? "as-is" : plan.mode} sub={file.path} />
            <Stat label="GGUF" value={formatBytes(plan.outputBytes)} sub={plan.mode === "keep" ? "already quantized" : "after quantize"} />
            <Stat
              label="On the rig"
              value={plan.fit ? formatTps(plan.fit.tps) : "—"}
              sub={plan.fit ? `${plan.fit.verdict} · ${formatBytes(plan.fit.totalBytes)} of ${formatBytes(plan.usable)}` : "no estimate"}
              bad={plan.fit?.verdict === "no"}
            />
            <Stat label="Listen" value={`:${settings.port}`} sub={`${settings.ctx} ctx · ${settings.os} · ${settings.board === "cm5" ? "CM5" : "Pi 5"}`} />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={embed} onChange={(event) => setEmbed(event.target.checked)} />
            Embed {LLAMA_ASSET} (~14 MB). Uncheck and install.sh downloads it on the Pi.
          </label>
          <ul className="grid gap-1 font-mono text-xs text-muted">
            <li>dropforge-kit/install.sh</li>
            <li>dropforge-kit/README.txt</li>
            <li>dropforge-kit/MODEL.json</li>
            {embed ? <li>dropforge-kit/vendor/{LLAMA_ASSET}</li> : null}
            <li>model.gguf — added by the phone when the file is in private storage</li>
          </ul>
          {plan.mode !== "keep" && plan.peak > plan.usable ? (
            <Banner tone="warn">
              Quantizing this file needs about {formatBytes(plan.peak)}. This rig has {formatBytes(plan.usable)} after the desktop. Quantize on the Pixel, then pack the smaller GGUF.
            </Banner>
          ) : null}
          {plan.mode !== "keep" && plan.peak <= plan.usable ? (
            <Banner>
              install.sh will download the full source ({formatBytes(file.bytes)}) onto the Pi and run llama-quantize there. On the phone, quantize first and the tarball carries the smaller GGUF instead.
            </Banner>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void build()}>
              {busy ? "Packing" : "Build tarball"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void navigate({ to: "/", search: { tab: "push" } })}>
              Push screen
            </Button>
          </div>
          {error ? <Banner tone="warn">{error}</Banner> : null}
          {built ? <Banner>Downloaded {built}. Copy it to the Pi, then sudo sh dropforge-kit/install.sh.</Banner> : null}
          <pre className="overflow-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs text-fg">
            {`tar -xf dropforge-kit.tar && sudo sh dropforge-kit/install.sh`}
          </pre>
        </>
      ) : null}
    </div>
  );
}
