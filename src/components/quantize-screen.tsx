import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { formatBytes, formatParams } from "@/lib/format";
import { PHONE, assessChoice, formatTps, quantizeSeconds, recommend } from "@/lib/fit";
import {
  QUANTS,
  estimateQuantOutput,
  gib,
  quantById,
  quantizableSource,
  quantizePeakRam,
  sourceBpw,
  type QuantId,
} from "@/lib/quants";
import { readSettings, useForge } from "@/lib/store";
import { Banner, Button, Stat, Terminal } from "@/components/ui";

export function QuantizeScreen() {
  const navigate = useNavigate();
  const files = useForge((s) => s.files);
  const selectedId = useForge((s) => s.selectedId);
  const select = useForge((s) => s.select);
  const quant = useForge((s) => s.quant);
  const setQuant = useForge((s) => s.setQuant);
  const settings = readSettings(useForge((s) => s.settings));
  const commitPlan = useForge((s) => s.commitPlan);
  const file = files.find((item) => item.id === selectedId) ?? null;
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const plan = useMemo(() => {
    if (!file) return null;
    const detected = file.detectedQuant ?? file.header?.fileTypeName ?? null;
    const convertible = file.kind === "gguf" && quantizableSource(detected);
    const src = sourceBpw(file.kind, detected);
    const dst = quantById(quant);
    const keep = !convertible || file.kind !== "gguf";
    const outputBytes =
      !dst || keep || src == null ? file.bytes : estimateQuantOutput(file.bytes, src, dst.bpw);
    const peak = keep || file.kind !== "gguf" ? 0 : quantizePeakRam(file.bytes, outputBytes);
    const params = file.header?.parameterCount ?? file.params;
    const phoneFree = gib(settings.pixelFreeGiB);
    const fit = file.kind === "gguf"
      ? assessChoice({
          params: file.header?.parameterCount ?? file.params,
          bytes: file.bytes,
          kind: "gguf",
          detected,
          quant: convertible ? quant : "keep",
          ramGiB: settings.piRamGiB,
          os: settings.os,
          use: settings.use,
          ctx: settings.ctx,
        })
      : null;
    const suggested = recommend({
      params: file.header?.parameterCount ?? file.params,
      bytes: file.bytes,
      kind: file.kind,
      detected,
      ramGiB: settings.piRamGiB,
      os: settings.os,
      use: settings.use,
    });
    return {
      detected,
      convertible,
      outputBytes,
      peak,
      params,
      infer: fit?.totalBytes ?? 0,
      phoneOk: peak === 0 || peak < phoneFree * 0.9,
      piOk: fit ? fit.verdict !== "no" : false,
      phoneFree,
      piBudget: fit?.usableBytes ?? 0,
      mode: keep ? ("keep" as const) : quant,
      fit,
      suggested,
      seconds: peak ? quantizeSeconds(file.bytes, outputBytes) : 0,
    };
  }, [file, quant, settings]);

  async function rehearse() {
    if (!file || !plan) return;
    setRunning(true);
    const tensors =
      file.header?.tensorCount && file.header.tensorCount > 0
        ? Math.min(file.header.tensorCount, 400)
        : 96;
    const head = [
      "llama-quantize b11706",
      "rehearsal — the binary runs on the phone, not in this console",
      `input   ${file.path}  ${formatBytes(file.bytes)}`,
      `target  ${plan.mode}`,
      plan.mode === "keep"
        ? "source is not F16/BF16/F32, or it is safetensors. Quantize will not run."
        : `peak RAM ${formatBytes(plan.peak)}  ·  Pixel free ${formatBytes(plan.phoneFree)}  ·  ${plan.phoneOk ? "fits" : "DOES NOT FIT"}`,
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
      const shown = Math.round((step / totalSteps) * tensors);
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
      at: Date.now(),
    });
    setRunning(false);
  }

  if (!file) {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl">Quantize</h1>
        <Banner>Stage a file on the Hub screen first.</Banner>
        <Button variant="ghost" onClick={() => void navigate({ to: "/", search: { tab: "models" } })}>
          Back to Hub
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl">Quantize</h1>
        <p className="mt-1 text-sm text-muted">
          The phone quantizes with llama-quantize on four Tensor G4 performance cores. The Pi only receives the finished GGUF.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {files.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item.id)}
            className={`max-w-64 shrink-0 rounded-lg border px-3 py-2 text-left ${item.id === file.id ? "border-brass bg-surface" : "border-line bg-bg"}`}
          >
            <span className="block truncate text-sm">{item.path}</span>
            <span className="font-mono text-xs text-muted tabular-nums">{formatBytes(item.bytes)}</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface px-3 py-3">
        <div className="text-sm text-fg">{file.repo}</div>
        <div className="mt-1 truncate font-mono text-xs text-muted">{file.path}</div>
        <p className="mt-2 font-mono text-xs text-muted tabular-nums">
          {file.kind}
          {plan?.detected ? ` · ${plan.detected}` : ""}
          {file.header?.architecture ? ` · ${file.header.architecture}` : ""}
          {file.header?.tensorCount ? ` · ${file.header.tensorCount} tensors` : ""}
          {plan?.params ? ` · ${formatParams(plan.params)}` : ""}
          {file.header?.truncated ? " · header truncated" : ""}
        </p>
      </div>

      {plan?.suggested && plan.suggested.quant !== quant && plan.convertible ? (
        <Banner>
          Best for this rig is {plan.suggested.quant} · {formatTps(plan.suggested.tps)} · {plan.suggested.note}
        </Banner>
      ) : null}

      <div className="rounded-lg border border-line bg-surface px-3 py-3 text-sm">
        <div className="font-mono text-xs text-brass">{PHONE.name} · {PHONE.soc}</div>
        <p className="mt-1 text-muted">
          {PHONE.threads} threads on the X4 and the three A720s, using i8mm and dotprod. The four A520s stay free so the screen does not hitch. The NPU is idle — there is no public GGUF kernel for it. Mali-G715 is not in the quantize path.
        </p>
        {plan && plan.peak > 0 ? (
          <p className="mt-2 font-mono text-xs tabular-nums text-fg">
            About {plan.seconds}s · peak {formatBytes(plan.peak)} · {plan.phoneOk ? "fits free RAM" : "over free RAM"}
          </p>
        ) : null}
      </div>

      {file.kind === "safetensors" ? (
        <Banner tone="warn">
          llama-quantize does not read safetensors. Stage a GGUF, or convert with convert_hf_to_gguf.py on the Pi or in Termux before this step.
        </Banner>
      ) : null}
      {file.kind === "gguf" && plan && !plan.convertible ? (
        <Banner>
          This file already looks like {plan.detected}. Pack it as-is. Requantize needs an F16 or BF16 source, and llama-quantize will refuse without --allow-requantize.
        </Banner>
      ) : null}

      <div className="grid gap-2">
        {QUANTS.map((item) => {
          const disabled = file.kind !== "gguf" || !plan?.convertible;
          const active = quant === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => setQuant(item.id as QuantId)}
              className={`rounded-lg border px-3 py-3 text-left disabled:opacity-40 ${active ? "border-brass bg-surface" : "border-line bg-bg"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-fg">{item.id}</span>
                <span className="font-mono text-xs text-muted tabular-nums">{item.bpw.toFixed(2)} bpw</span>
              </div>
              <p className="mt-1 text-sm text-muted">{item.blurb}</p>
            </button>
          );
        })}
      </div>

      {quantById(quant)?.imatrix ? (
        <Banner tone="warn">
          {quant} wants an imatrix. The phone build passes --imatrix when you import one. Without it the quant still runs and looks worse.
        </Banner>
      ) : null}

      {plan ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Before" value={formatBytes(file.bytes)} sub={plan.detected ?? file.kind} />
          <Stat label="After" value={formatBytes(plan.outputBytes)} sub={plan.mode === "keep" ? "unchanged" : "estimate"} />
          <Stat
            label="Quantize RAM"
            value={plan.peak ? formatBytes(plan.peak) : "—"}
            sub={plan.peak ? (plan.phoneOk ? "fits Pixel free RAM" : "over Pixel free RAM") : "not run"}
            bad={plan.peak > 0 && !plan.phoneOk}
          />
          <Stat
            label="Pi inference"
            value={formatBytes(plan.infer)}
            sub={plan.piOk ? `${plan.fit?.verdict ?? "ok"} · ${formatTps(plan.fit?.tps ?? 0)}` : plan.fit?.note ?? "over the rig"}
            bad={!plan.piOk}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={running} onClick={() => void rehearse()}>
          {running ? "Running" : "Rehearse quantize"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!plan?.suggested || !plan.convertible}
          onClick={() => {
            const next = plan?.suggested?.quant;
            if (next === "Q4_K_M" || next === "Q5_K_M" || next === "Q8_0" || next === "IQ3_XS" || next === "IQ2_M") {
              setQuant(next);
            }
          }}
        >
          Use recommended
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (!file || !plan) return;
            commitPlan({
              fileId: file.id,
              quant: plan.mode,
              outputBytes: plan.outputBytes,
              peakRam: plan.peak,
              at: Date.now(),
            });
            void navigate({ to: "/", search: { tab: "pack" } });
          }}
        >
          Use this plan
        </Button>
      </div>
      {lines.length ? <Terminal lines={lines} /> : null}
    </div>
  );
}
