import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpFromLine,
  Cpu,
  FlaskConical,
  Package,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useForge, type Settings as ForgeSettings, readSettings } from "@/lib/store";
import { Field, inputClass } from "@/components/ui";

export const TABS = [
  { id: "models", label: "Models", icon: Search },
  { id: "quantize", label: "Quant", icon: Cpu },
  { id: "pack", label: "Pack", icon: Package },
  { id: "push", label: "Push", icon: ArrowUpFromLine },
  { id: "train", label: "Train", icon: FlaskConical },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function Shell({
  tab,
  onTab,
  children,
}: {
  tab: TabId;
  onTab: (tab: TabId) => void;
  children: ReactNode;
}) {
  const files = useForge((s) => s.files);
  const settings = readSettings(useForge((s) => s.settings));
  useEffect(() => {
    void useForge.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-fg md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-line md:flex md:flex-col md:sticky md:top-0 md:h-dvh md:px-3 md:py-4">
        <Wordmark />
        <nav className="mt-6 flex flex-col gap-1">
          {TABS.map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => onTab(item.id)} />
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <SettingsButton />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-bg px-4 py-3 md:px-6">
          <div className="md:hidden">
            <Wordmark compact />
          </div>
          <p className="hidden min-w-0 flex-1 text-sm text-muted md:block">
            Pixel prep. Pi 5 or CM5. Bookworm or Trixie desktop.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-xs text-muted tabular-nums">
              {files.length} staged · {settings.board === "cm5" ? "CM5" : "Pi 5"} {settings.piRamGiB} GB
            </span>
            <span className="md:hidden">
              <SettingsButton />
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-28 md:px-6 md:py-6 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-bg md:hidden">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${active ? "text-brass" : "text-muted"}`}
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "px-2"}>
      <div className="font-mono text-xs tracking-widest text-brass">DROP FORGE</div>
      {compact ? null : (
        <p className="mt-1 text-sm text-muted">Pi 5 and CM5. Bookworm or Trixie.</p>
      )}
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-left text-sm ${active ? "bg-surface text-brass" : "text-fg"}`}
    >
      <Icon className="size-4" aria-hidden />
      <span>{item.label}</span>
      {item.id === "train" ? <span className="ml-auto font-mono text-xs text-warn">exp</span> : null}
    </button>
  );
}

function SettingsButton() {
  const settings = readSettings(useForge((s) => s.settings));
  const patch = useForge((s) => s.patchSettings);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ForgeSettings>(settings);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(useForge.getState().settings);
        setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-fg" aria-label="Settings">
          <Settings className="size-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-bg/80" />
        <Dialog.Content className="fixed inset-x-3 top-16 z-40 mx-auto max-h-[80dvh] max-w-lg overflow-auto rounded-lg border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-lg text-fg">Rig</Dialog.Title>
            <Dialog.Close className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted" aria-label="Close">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted">
            The phone build keeps the token in encrypted storage. Here it stays in this browser and is only forwarded to Hugging Face.
          </Dialog.Description>
          <div className="mt-4 grid gap-3">
            <Field label="Hugging Face token" hint="Optional. Needed for gated repos. Not saved on the server.">
              <input
                className={inputClass}
                type="password"
                autoComplete="off"
                value={draft.hfToken}
                onChange={(e) => setDraft({ ...draft, hfToken: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pi RAM">
                <select
                  className={inputClass}
                  value={draft.piRamGiB}
                  onChange={(e) => setDraft({ ...draft, piRamGiB: Number(e.target.value) as 2 | 4 | 8 | 16 })}
                >
                  <option value={2}>2 GB</option>
                  <option value={4}>4 GB</option>
                  <option value={8}>8 GB</option>
                  <option value={16}>16 GB</option>
                </select>
              </Field>
              <Field label="Pixel free RAM" hint="Of 16 GB, after GrapheneOS.">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={draft.pixelFreeGiB}
                  onChange={(e) => setDraft({ ...draft, pixelFreeGiB: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Context">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={draft.ctx}
                  onChange={(e) => setDraft({ ...draft, ctx: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="llama-server port">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={draft.port}
                  onChange={(e) => setDraft({ ...draft, port: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <Field label="Pi user">
              <input className={inputClass} value={draft.piUser} onChange={(e) => setDraft({ ...draft, piUser: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pi host" hint="LAN address. Used on the Push screen.">
                <input className={inputClass} value={draft.piHost} placeholder="192.168.1.20" onChange={(e) => setDraft({ ...draft, piHost: e.target.value })} />
              </Field>
              <Field label="SSH port">
                <input className={inputClass} inputMode="numeric" value={draft.piSshPort} onChange={(e) => setDraft({ ...draft, piSshPort: Number(e.target.value) || 22 })} />
              </Field>
            </div>
            <a className="text-sm text-brass underline" href="/dropforge-android.zip">
              Download the Android project
            </a>
            <button
              type="button"
              className="min-h-11 rounded-lg bg-brass px-3 text-sm font-medium text-ink"
              onClick={() => {
                patch({
                  ...draft,
                  pixelFreeGiB: Math.min(16, Math.max(1, draft.pixelFreeGiB)),
                  ctx: Math.min(32768, Math.max(256, Math.round(draft.ctx) || 4096)),
                  port: Math.min(65535, Math.max(1, Math.round(draft.port) || 8080)),
                  piSshPort: Math.min(65535, Math.max(1, Math.round(draft.piSshPort) || 22)),
                  piUser: draft.piUser.trim() || "pi",
                });
                setOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
