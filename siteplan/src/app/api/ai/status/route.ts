import { AI_MODEL, aiEnabled } from "@/lib/ai/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = aiEnabled();
  return Response.json({ enabled, model: enabled ? AI_MODEL : null });
}
