import { env } from "cloudflare:workers";
import { writeVercelMediaRecord } from "@/lib/vercel-workspace";

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL) {
      const body = await request.json() as Record<string, unknown>;
      const filename = String(body.filename ?? "").trim();
      const mimeType = String(body.mimeType ?? "").trim();
      const url = String(body.url ?? "").trim();
      const pathname = String(body.pathname ?? "").trim();
      if (!filename || (!mimeType.startsWith("image/") && !mimeType.startsWith("video/"))) {
        return Response.json({ error: "Choose a valid image or video." }, { status: 400 });
      }
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".blob.vercel-storage.com")) {
        return Response.json({ error: "The uploaded media URL is invalid." }, { status: 400 });
      }
      const id = crypto.randomUUID();
      await writeVercelMediaRecord({
        id,
        filename,
        caption: String(body.caption ?? ""),
        status: "Draft",
        mime_type: mimeType,
        object_key: pathname || url,
        url,
        uploaded_by: "Malta team",
        used_count: 0,
        created_at: new Date().toISOString(),
      });
      return Response.json({ id, url }, { status: 201 });
    }
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
