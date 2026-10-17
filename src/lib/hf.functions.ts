import { createServerFn } from "@tanstack/react-start";
import { parseGguf, parseSafetensors, type HeaderSummary } from "@/lib/headers";
import { classifyGuard, guardPasses, guardQueries, hfParamCap, maxParams, type GuardClass } from "@/lib/fit";
import { paramsFromName } from "@/lib/format";

const REPO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
const FILEPATH = /^(?!.*\.\.)[A-Za-z0-9._+@ ()/-]{1,240}$/;

const BUCKETS: Record<string, string> = {
  any: "",
  sub1: "min:0,max:1B",
  "1-4": "min:1B,max:4B",
  "4-8": "min:4B,max:8B",
  "8-14": "min:8B,max:14B",
};

const LICENSES = new Set([
  "",
  "apache-2.0",
  "mit",
  "llama3",
  "llama3.1",
  "llama3.2",
  "llama3.3",
  "gemma",
  "cc-by-nc-4.0",
  "cc-by-4.0",
]);

export type ModelHit = {
  id: string;
  downloads: number;
  likes: number;
  pipeline: string | null;
  license: string | null;
  params: number | null;
  gated: boolean;
  updated: string | null;
  guard: GuardClass;
};

export type RemoteFile = {
  path: string;
  bytes: number;
  kind: "gguf" | "safetensors";
};

function tokenOf(value: unknown) {
  const token = String(value ?? "").trim();
  if (!token) return "";
  if (!/^hf_[A-Za-z0-9]{8,}$/.test(token)) return "";
  return token;
}

function hfHeaders(token: string) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "DropForge/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function licenseOf(tags: string[] | undefined) {
  const tag = tags?.find((item) => item.startsWith("license:"));
  return tag ? tag.slice("license:".length) : null;
}

function parseSearch(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Bad search");
  const raw = input as Record<string, unknown>;
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
  const ramGiB = ram === 2 || ram === 4 || ram === 8 || ram === 16 ? ram : 8;
  return { q, bucket, license, kind, task, guard, board, os, use, ramGiB, token: tokenOf(raw.token) };
}

async function oneSearch(q: string, data: ReturnType<typeof parseSearch>) {
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
  const res = await fetch(url, { headers: hfHeaders(data.token), signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Hugging Face returned ${res.status}`);
  return (await res.json()) as Array<{
    id?: string;
    downloads?: number;
    likes?: number;
    pipeline_tag?: string;
    tags?: string[];
    gated?: boolean | string | null;
    safetensors?: { total?: number };
    lastModified?: string;
  }>;
}

export const searchModels = createServerFn({ method: "POST" })
  .validator(parseSearch)
  .handler(async ({ data }) => {
    try {
      const queries = guardQueries(data.q, data.guard);
      const settled = await Promise.allSettled(queries.map((q) => oneSearch(q, data)));
      const failed = settled.filter((item) => item.status === "rejected");
      const bodies = settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));
      if (!bodies.length && failed.length) {
        const reason = failed[0].status === "rejected" ? failed[0].reason : null;
        const message = reason instanceof Error ? reason.message : "Search failed";
        return { ok: false as const, error: message };
      }
      const cap =
        data.bucket === "fits" ? maxParams(data.ramGiB, data.os, data.use)
        : data.bucket === "sub1" ? 1e9
        : data.bucket === "1-4" ? 4e9
        : data.bucket === "4-8" ? 8e9
        : data.bucket === "8-14" ? 14e9
        : null;
      const seen = new Set<string>();
      const models: ModelHit[] = [];
      for (const model of bodies) {
        const id = model.id ?? "";
        if (!id.includes("/") || seen.has(id)) continue;
        const guard = classifyGuard(`${id} ${(model.tags ?? []).join(" ")}`);
        if (!guardPasses(data.guard, guard)) continue;
        const params = model.safetensors?.total ?? paramsFromName(id);
        if (cap && params && params > cap * 1.05) continue;
        seen.add(id);
        const gated = model.gated === true || (typeof model.gated === "string" && model.gated.length > 0);
        models.push({
          id,
          downloads: model.downloads ?? 0,
          likes: model.likes ?? 0,
          pipeline: model.pipeline_tag ?? null,
          license: licenseOf(model.tags),
          params,
          gated,
          updated: model.lastModified ?? null,
          guard,
        });
      }
      const rank = { uncensored: 0, reduced: 1, standard: 2 };
      models.sort((a, b) => rank[a.guard] - rank[b.guard] || b.downloads - a.downloads);
      return { ok: true as const, models: models.slice(0, 30) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Search failed" };
    }
  });

function parseRepo(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Bad request");
  const raw = input as Record<string, unknown>;
  const repo = String(raw.repo ?? "");
  if (!REPO.test(repo)) throw new Error("Repo id must look like org/name");
  return { repo, token: tokenOf(raw.token) };
}

export const listFiles = createServerFn({ method: "POST" })
  .validator(parseRepo)
  .handler(async ({ data }) => {
    try {
      const url = `https://huggingface.co/api/models/${data.repo.split("/").map(encodeURIComponent).join("/")}/tree/main?recursive=1`;
      const res = await fetch(url, { headers: hfHeaders(data.token), signal: AbortSignal.timeout(20000) });
      if (res.status === 401 || res.status === 403) {
        return { ok: false as const, error: "This repo is gated. Add a Hugging Face token in Settings." };
      }
      if (!res.ok) return { ok: false as const, error: `File list returned ${res.status}` };
      const body = (await res.json()) as Array<{ path?: string; size?: number; type?: string }>;
      const files: RemoteFile[] = [];
      for (const item of Array.isArray(body) ? body : []) {
        const path = item.path ?? "";
        const lower = path.toLowerCase();
        const kind = lower.endsWith(".gguf") ? "gguf" : lower.endsWith(".safetensors") ? "safetensors" : null;
        if (!kind || item.type === "directory") continue;
        files.push({ path, bytes: item.size ?? 0, kind });
      }
      files.sort((a, b) => a.bytes - b.bytes);
      return { ok: true as const, files };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "File list failed" };
    }
  });

function parseInspect(input: unknown) {
  const base = parseRepo(input);
  const raw = input as Record<string, unknown>;
  const path = String(raw.path ?? "");
  if (!FILEPATH.test(path)) throw new Error("Bad file path");
  const kind = raw.kind === "safetensors" ? "safetensors" : "gguf";
  return { ...base, path, kind };
}

async function readCapped(url: string, headers: Record<string, string>, cap: number) {
  const res = await fetch(url, {
    headers: { ...headers, Range: `bytes=0-${cap - 1}` },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok && res.status !== 206) {
    return { error: `Header fetch returned ${res.status}`, bytes: null as Uint8Array | null };
  }
  const reader = res.body?.getReader();
  if (!reader) return { error: "No response body", bytes: null };
  const chunks: Uint8Array[] = [];
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
  return { error: null as string | null, bytes: out };
}

export const inspectFile = createServerFn({ method: "POST" })
  .validator(parseInspect)
  .handler(async ({ data }): Promise<{ ok: true; header: HeaderSummary } | { ok: false; error: string }> => {
    try {
      const repo = data.repo.split("/").map(encodeURIComponent).join("/");
      const file = data.path.split("/").map(encodeURIComponent).join("/");
      const url = `https://huggingface.co/${repo}/resolve/main/${file}`;
      const first = await readCapped(url, hfHeaders(data.token), data.kind === "gguf" ? 1_500_000 : 65_536);
      if (!first.bytes) return { ok: false, error: first.error ?? "Could not read the header" };
      if (data.kind === "safetensors") {
        const head = parseSafetensors(first.bytes);
        if (head.truncated && first.bytes.length >= 8) {
          const dv = new DataView(first.bytes.buffer, first.bytes.byteOffset, first.bytes.byteLength);
          const headerLen = dv.getUint32(0, true) + dv.getUint32(4, true) * 2 ** 32;
          if (headerLen > 0 && headerLen < 2_000_000) {
            const second = await readCapped(url, hfHeaders(data.token), headerLen + 8);
            if (second.bytes) return { ok: true, header: parseSafetensors(second.bytes) };
          }
        }
        return { ok: true, header: head };
      }
      return { ok: true, header: parseGguf(first.bytes) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Inspect failed" };
    }
  });
