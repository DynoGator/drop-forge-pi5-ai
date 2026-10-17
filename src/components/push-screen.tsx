import { useState } from "react";
import { useForge } from "@/lib/store";
import { Banner, Button, Field, inputClass } from "@/components/ui";

export function PushScreen() {
  const settings = useForge((s) => s.settings);
  const patch = useForge((s) => s.patchSettings);
  const kit = useForge((s) => s.lastKit);
  const [user, setUser] = useState(settings.piUser || "pi");
  const [host, setHost] = useState(settings.piHost);
  const [port, setPort] = useState(String(settings.piSshPort || 22));
  const [auth, setAuth] = useState<"key" | "password">("key");
  const [runInstall, setRunInstall] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const safeHost = host.trim();
  const safeUser = user.trim() || "pi";
  const safePort = Number(port) || 22;
  const remote = "dropforge-kit.tar";
  const scp = safeHost
    ? `scp -P ${safePort} dropforge-kit.tar ${safeUser}@${safeHost}:~/${remote}`
    : "scp -P 22 dropforge-kit.tar pi@PI_HOST:~/dropforge-kit.tar";
  const install = "tar -xf dropforge-kit.tar && sudo -n sh dropforge-kit/install.sh";
  const ssh = safeHost
    ? `ssh -p ${safePort} ${safeUser}@${safeHost} '${install}'`
    : `ssh -p 22 pi@PI_HOST '${install}'`;

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied("copy failed");
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl">Push</h1>
        <p className="mt-1 text-sm text-muted">
          The Android build opens SSH from the phone with JSch, checks the host key, SCPs the tarball, and can run the installer. This console is not on your LAN, so it will not pretend to reach the Pi. It writes the exact commands.
        </p>
      </div>

      {kit ? (
        <Banner>
          Last kit: {kit.repo} · {kit.quant} · binary {kit.embed ? "embedded" : "downloaded on the Pi"}.
        </Banner>
      ) : (
        <Banner>No kit built this session. You can still copy the commands and point them at a tarball you already have.</Banner>
      )}

      <div className="grid gap-3">
        <Field label="Pi address" hint="LAN IP or hostname. Password and key stay on the phone, not here.">
          <input className={inputClass} value={host} placeholder="192.168.1.20" onChange={(event) => setHost(event.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="User">
            <input className={inputClass} value={user} onChange={(event) => setUser(event.target.value)} />
          </Field>
          <Field label="SSH port">
            <input className={inputClass} inputMode="numeric" value={port} onChange={(event) => setPort(event.target.value)} />
          </Field>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAuth("key")} className={`min-h-11 flex-1 rounded-lg border text-sm ${auth === "key" ? "border-brass bg-brass text-ink" : "border-line text-fg"}`}>
            Private key
          </button>
          <button type="button" onClick={() => setAuth("password")} className={`min-h-11 flex-1 rounded-lg border text-sm ${auth === "password" ? "border-brass bg-brass text-ink" : "border-line text-fg"}`}>
            Password
          </button>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={runInstall} onChange={(event) => setRunInstall(event.target.checked)} />
          After the copy, run install.sh with sudo -n
        </label>
        <p className="text-sm text-muted">
          {auth === "key"
            ? "On the phone you import an OpenSSH or PEM key through the file picker. It can be kept in the keystore. It is never typed into this console."
            : "On the phone the password is held in memory for the session and not written to disk."}
          {" "}sudo -n fails unless the Pi user has passwordless sudo, which the default Raspberry Pi OS image does.
        </p>
      </div>

      <Command label="Copy" text={scp} copied={copied} onCopy={copy} />
      {runInstall ? <Command label="Install" text={ssh} copied={copied} onCopy={copy} /> : null}

      <Button
        type="button"
        variant="ghost"
        onClick={() => patch({ piHost: safeHost, piUser: safeUser, piSshPort: safePort })}
      >
        Remember host
      </Button>
      <Banner>
        First connection on the phone shows the SHA256 host key and waits. It does not set StrictHostKeyChecking=no.
      </Banner>
    </div>
  );
}

function Command({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: string | null;
  onCopy: (label: string, text: string) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <Button type="button" variant="ghost" onClick={() => onCopy(label, text)}>
          {copied === label ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-auto font-mono text-xs text-fg">{text}</pre>
    </div>
  );
}
