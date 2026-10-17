import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/kit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { buildKitTar, parseKit } = await import("@/lib/kit.server");
          const spec = parseKit(await request.json());
          const bytes = await buildKitTar(spec);
          return new Response(bytes as unknown as BodyInit, {
            headers: {
              "Content-Type": "application/x-tar",
              "Content-Disposition": 'attachment; filename="dropforge-kit.tar"',
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Kit failed";
          return new Response(message, { status: 400, headers: { "Content-Type": "text/plain" } });
        }
      },
    },
  },
});
