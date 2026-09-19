import { env } from "cloudflare:workers";
import { del } from "@vercel/blob";
import { deleteVercelMediaRecord, mutateVercelWorkspace, readVercelWorkspace } from "@/lib/vercel-workspace";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.VERCEL) {
    const { id } = await context.params;
    const workspace = await readVercelWorkspace();
    const row = workspace.media.find((item) => item.id === id);
    if (!row?.url) return new Response("Not found", { status: 404 });
    return Response.redirect(String(row.url), 307);
  }
  if (!env.DB || !env.BUCKET) return new Response("Not available", { status: 503 });
  const { id } = await context.params;
  const row = await env.DB.prepare("SELECT object_key, mime_type FROM media_assets WHERE id = ?").bind(id).first<{ object_key: string; mime_type: string }>();
  if (!row) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(row.object_key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": row.mime_type, "cache-control": "private, max-age=3600" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.VERCEL) {
      const { id } = await context.params;
      const body = await request.json() as { caption?: unknown };
      await mutateVercelWorkspace((workspace) => {
        const media = workspace.media.find((item) => item.id === id);
        if (media) media.caption = String(body.caption ?? "");
      });
      return Response.json({ ok: true });
    }
    if (!env.DB) return Response.json({ error: "Media storage is unavailable." }, { status: 503 });
    const { id } = await context.params;
    const body = await request.json() as { caption?: unknown };
    await env.DB.prepare("UPDATE media_assets SET caption = ? WHERE id = ?").bind(String(body.caption ?? ""), id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save notes" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.VERCEL) {
      const { id } = await context.params;
      let blobUrl = "";
      await mutateVercelWorkspace((workspace) => {
        const media = workspace.media.find((item) => item.id === id);
        if (!media) throw new Error("Media not found.");
        blobUrl = String(media.url ?? media.object_key ?? "");
        workspace.posts = workspace.posts.map((item) => item.media_id === id ? { ...item, media_id: null } : item);
        workspace.ideas = workspace.ideas.map((item) => item.media_id === id ? { ...item, media_id: null } : item);
        workspace.media = workspace.media.filter((item) => item.id !== id);
      });
      await deleteVercelMediaRecord(id);
      if (blobUrl) await del(blobUrl);
      return Response.json({ ok: true });
    }
    if (!env.DB || !env.BUCKET) return Response.json({ error: "Media storage is unavailable." }, { status: 503 });
    const { id } = await context.params;
    const row = await env.DB.prepare("SELECT object_key FROM media_assets WHERE id = ?").bind(id).first<{ object_key: string }>();
    if (!row) return Response.json({ error: "Media not found." }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare("UPDATE posts SET media_id = NULL WHERE media_id = ?").bind(id),
      env.DB.prepare("UPDATE ideas SET media_id = NULL WHERE media_id = ?").bind(id),
      env.DB.prepare("DELETE FROM media_assets WHERE id = ?").bind(id),
    ]);
    await env.BUCKET.delete(row.object_key);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to remove media" }, { status: 500 });
  }
}
