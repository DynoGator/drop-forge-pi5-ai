import { useMemo, useState } from "react";
import { formatParams } from "@/lib/format";
import { countJsonl, loraPlan } from "@/lib/lora";
import { useForge } from "@/lib/store";
import { Banner, Button, Field, Terminal, inputClass } from "@/components/ui";

const SAMPLE = `{"text": "User: what is a K-quant?\\nAssistant: Q4_K_M stores most tensors at about 4.85 bits per weight."}`;

export function TrainScreen() {
  const files = useForge((s) => s.files);
  const selected = useForge((s) => s.files.find((file) => file.id === s.selectedId) ?? null);
  const [model, setModel] = useState(selected?.repo ?? "");
  const [paramsText, setParamsText] = useState(selected?.params ? String(selected.params) : "");
  const [sample, setSample] = useState(SAMPLE);
  const [checked, setChecked] = useState<string | null>(null);

  const params = Number(paramsText);
  const parsedParams = Number.isFinite(params) && params > 0 ? params : selected?.params ?? null;
  const plan = useMemo(() => loraPlan(model.trim(), parsedParams), [model, parsedParams]);
  const stats = useMemo(() => countJsonl(sample), [sample]);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl">Train <span className="font-mono text-sm text-warn">experimental</span></h1>
        <p className="mt-1 text-sm text-muted">
          Full training does not run on this phone, and this app does not send the job to a cloud API. The script below is for a GPU box you already have.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 text-sm text-fg">
        <p>
          Pixel 9 Pro XL is 16 GB LPDDR5X and a Tensor G4. No CUDA. Sustained power is about what the skin will tolerate, then it throttles.
        </p>
        <p>
          AdamW keeps two fp32 moments per parameter, 8 bytes, plus weights and gradients. A 1B model is already ~12 GB before activations. A 7B model is not a conversation. Sequence 2048 activations eat whatever RAM is left.
        </p>
        <p>
          Adreno and the Mali-G715 have no backward pass worth shipping, and the Tensor NPU is not open for this. No root does not change that.
        </p>
      </div>

      <div className="grid gap-3">
        <Field label="Base model" hint="Sub-1B is the only LoRA path this screen will describe as plausible.">
          <input className={inputClass} value={model} placeholder="Qwen/Qwen2.5-0.5B-Instruct" onChange={(event) => setModel(event.target.value)} />
        </Field>
        {files.length ? (
          <label className="text-sm text-muted">
            From library
            <select
              className={`${inputClass} mt-1`}
              value={selected?.id ?? ""}
              onChange={(event) => {
                const file = files.find((item) => item.id === event.target.value);
                if (!file) return;
                useForge.getState().select(file.id);
                setModel(file.repo);
                if (file.params) setParamsText(String(file.params));
              }}
            >
              <option value="">Select a staged repo</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.repo} · {formatParams(file.params)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Field label="Parameter count" hint="Integer. 0.5B is 500000000.">
          <input className={inputClass} inputMode="numeric" value={paramsText} onChange={(event) => setParamsText(event.target.value)} />
        </Field>
        <Field label="jsonl sample" hint="A handful of rows. The phone checks them. It does not train on them.">
          <textarea className={`${inputClass} min-h-32 py-2 font-mono text-xs`} value={sample} onChange={(event) => setSample(event.target.value)} />
        </Field>
      </div>

      <Banner tone={parsedParams != null && parsedParams >= 1_000_000_000 ? "warn" : "info"}>{plan.reason}</Banner>

      <div className="grid grid-cols-2 gap-2 font-mono text-sm">
        <div className="rounded-lg border border-line px-3 py-2">
          <div className="text-xs text-muted">LoRA</div>
          rank {plan.rank} · alpha {plan.alpha}
        </div>
        <div className="rounded-lg border border-line px-3 py-2">
          <div className="text-xs text-muted">Train</div>
          lr {plan.lr} · {plan.epochs} epoch
        </div>
        <div className="col-span-2 rounded-lg border border-line px-3 py-2">
          <div className="text-xs text-muted">Targets</div>
          {plan.targets}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (stats.bad) setChecked(`${stats.rows} good rows, ${stats.bad} bad lines, ~${stats.tokens} tokens.`);
            else setChecked(`${stats.rows} jsonl rows, ~${stats.tokens} tokens. Dataset gate only — no optimizer started.`);
          }}
        >
          Check dataset
        </Button>
      </div>
      {checked ? <Banner>{checked}</Banner> : null}

      <div>
        <h2 className="text-sm text-muted">PEFT script</h2>
        <p className="mt-1 text-sm text-muted">
          Lightweight path is Hugging Face PEFT, rank 8, q_proj and v_proj. Run it on a GPU box or, if you insist, a Termux Python that will thermal-limit. The script exits if the model is not under 1B.
        </p>
      </div>
      <Terminal lines={plan.script.split("\n")} />
    </div>
  );
}
