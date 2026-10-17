export type LoraPlan = {
  onDevice: boolean;
  reason: string;
  rank: number;
  alpha: number;
  lr: string;
  epochs: number;
  targets: string;
  script: string;
};

export function countJsonl(sample: string) {
  const lines = sample.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let rows = 0;
  let bad = 0;
  let chars = 0;
  for (const line of lines) {
    chars += line.length;
    try {
      const row = JSON.parse(line) as Record<string, unknown>;
      if (row && typeof row === "object") rows += 1;
      else bad += 1;
    } catch {
      bad += 1;
    }
  }
  return { rows, bad, chars, tokens: Math.round(chars / 4) };
}

export function loraPlan(model: string, params: number | null): LoraPlan {
  const under = params != null && params > 0 && params < 1_000_000_000;
  const reason = under
    ? "Under 1B clears the memory gate for a rank-8 LoRA on a GPU or a fat CPU. The phone still does not run the optimizer. AdamW state alone is most of the 16 GB, and Tensor G4 has no training stack."
    : params != null && params >= 1_000_000_000
      ? "At or above 1B this is refused on device. Optimizer state is about 8 bytes per parameter before gradients and activations. Take it to a remote GPU."
      : "Parameter count is unknown, so the on-device gate stays shut. Confirm it is under 1B before you even talk about LoRA.";
  const script = `#!/usr/bin/env python3
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
`;
  return {
    onDevice: false,
    reason,
    rank: 8,
    alpha: 16,
    lr: "2e-4",
    epochs: 1,
    targets: "q_proj, v_proj",
    script,
  };
}
