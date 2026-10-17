import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModelsScreen } from "@/components/models-screen";
import { PackScreen } from "@/components/pack-screen";
import { PushScreen } from "@/components/push-screen";
import { QuantizeScreen } from "@/components/quantize-screen";
import { Shell, type TabId } from "@/components/shell";
import { TrainScreen } from "@/components/train-screen";

function validateSearch(search: Record<string, unknown>): { tab: TabId } {
  const tab = search.tab;
  if (tab === "quantize" || tab === "pack" || tab === "push" || tab === "train") return { tab };
  return { tab: "models" };
}

export const Route = createFileRoute("/")({
  validateSearch,
  component: Home,
});

function Home() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <Shell
      tab={tab}
      onTab={(next) => {
        void navigate({ to: "/", search: { tab: next } });
      }}
    >
      {tab === "models" ? <ModelsScreen /> : null}
      {tab === "quantize" ? <QuantizeScreen /> : null}
      {tab === "pack" ? <PackScreen /> : null}
      {tab === "push" ? <PushScreen /> : null}
      {tab === "train" ? <TrainScreen /> : null}
    </Shell>
  );
}
