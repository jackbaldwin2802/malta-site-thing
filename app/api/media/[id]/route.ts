import { env } from "cloudflare:workers";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!env.DB || !env.BUCKET) return new Response("Not available", { status: 503 });
  const { id } = await context.params;
  const row = await env.DB.prepare("SELECT object_key, mime_type FROM media_assets WHERE id = ?").bind(id).first<{ object_key: string; mime_type: string }>();
  if (!row) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(row.object_key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": row.mime_type, "cache-control": "private, max-age=3600" } });
}
