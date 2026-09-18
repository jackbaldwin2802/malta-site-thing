import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  try {
    if (!env.DB || !env.BUCKET) throw new Error("Media storage is unavailable.");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose an image or video." }, { status: 400 });
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return Response.json({ error: "Only image and video files are supported." }, { status: 415 });
    if (file.size > 100 * 1024 * 1024) return Response.json({ error: "Files must be 100 MB or smaller." }, { status: 413 });
    const id = crypto.randomUUID();
    const key = `media/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    const owner = request.headers.get("oai-authenticated-user-email") ?? "Malta team";
    await env.DB.prepare("INSERT INTO media_assets (id,filename,caption,status,mime_type,object_key,uploaded_by,used_count,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id, file.name, String(form.get("caption") ?? ""), "Draft", file.type, key, owner, 0, new Date().toISOString()).run();
    return Response.json({ id, url: `/api/media/${id}` }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
