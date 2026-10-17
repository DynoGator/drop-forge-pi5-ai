import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HeaderSummary } from "@/lib/headers";
import type { BoardId, GuardId, OsId, RamGiB, UseId } from "@/lib/fit";
import type { QuantId } from "@/lib/quants";

export type StagedFile = {
  id: string;
  repo: string;
  path: string;
  bytes: number;
  kind: "gguf" | "safetensors";
  license: string | null;
  params: number | null;
  detectedQuant: string | null;
  gated: boolean;
  header: HeaderSummary | null;
  stagedAt: number;
};

export type Settings = {
  hfToken: string;
  board: BoardId;
  os: OsId;
  use: UseId;
  guard: GuardId;
  piRamGiB: RamGiB;
  ctx: number;
  port: number;
  piUser: string;
  piHost: string;
  piSshPort: number;
  pixelFreeGiB: number;
};

export type Plan = {
  fileId: string;
  quant: QuantId | "keep";
  outputBytes: number;
  peakRam: number;
  at: number;
};

export type KitRecord = {
  repo: string;
  path: string;
  quant: QuantId | "keep";
  embed: boolean;
  at: number;
};

type ForgeState = {
  files: StagedFile[];
  selectedId: string | null;
  quant: QuantId;
  settings: Settings;
  lastPlan: Plan | null;
  lastKit: KitRecord | null;
  stage: (file: StagedFile) => void;
  unstage: (id: string) => void;
  attachHeader: (id: string, header: HeaderSummary, params: number | null) => void;
  select: (id: string | null) => void;
  setQuant: (quant: QuantId) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  commitPlan: (plan: Plan) => void;
  commitKit: (kit: KitRecord) => void;
};

const defaultSettings: Settings = {
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
  pixelFreeGiB: 12,
};

export function readSettings(settings: Partial<Settings> | undefined): Settings {
  return { ...defaultSettings, ...settings };
}

export const useForge = create<ForgeState>()(
  persist(
    (set) => ({
      files: [],
      selectedId: null,
      quant: "Q4_K_M",
      settings: defaultSettings,
      lastPlan: null,
      lastKit: null,
      stage: (file) =>
        set((state) => ({
          files: [file, ...state.files.filter((item) => item.id !== file.id)].slice(0, 40),
          selectedId: file.id,
        })),
      unstage: (id) =>
        set((state) => ({
          files: state.files.filter((item) => item.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),
      attachHeader: (id, header, params) =>
        set((state) => ({
          files: state.files.map((item) =>
            item.id === id
              ? { ...item, header, params: params ?? item.params }
              : item,
          ),
        })),
      select: (id) => set({ selectedId: id }),
      setQuant: (quant) => set({ quant }),
      patchSettings: (patch) =>
        set((state) => ({ settings: { ...defaultSettings, ...state.settings, ...patch } })),
      commitPlan: (plan) => set({ lastPlan: plan }),
      commitKit: (kit) => set({ lastKit: kit }),
    }),
    {
      name: "dropforge",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        files: state.files,
        selectedId: state.selectedId,
        quant: state.quant,
        settings: state.settings,
        lastPlan: state.lastPlan,
        lastKit: state.lastKit,
      }),
    },
  ),
);

export function fileId(repo: string, path: string) {
  return `${repo}::${path}`;
}
