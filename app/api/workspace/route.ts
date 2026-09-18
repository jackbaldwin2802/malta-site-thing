import { env } from "cloudflare:workers";

const allowedStatuses = new Set(["Draft", "In review", "Changes requested", "Approved", "Scheduled", "Published", "Archived"]);

function db() {
  if (!env.DB) throw new Error("Workspace storage is unavailable.");
  return env.DB;
}

export async function GET() {
  try {
    const [posts, media, ideas, creators] = await db().batch([
      db().prepare("SELECT * FROM posts ORDER BY scheduled_at ASC"),
      db().prepare("SELECT * FROM media_assets ORDER BY created_at DESC"),
      db().prepare("SELECT * FROM ideas ORDER BY created_at DESC"),
      db().prepare("SELECT * FROM creators ORDER BY created_at DESC"),
    ]);
    return Response.json({ posts: posts.results, media: media.results, ideas: ideas.results, creators: creators.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load workspace" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const entity = String(body.entity ?? "");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const owner = request.headers.get("oai-authenticated-user-email") ?? "Malta team";

    if (entity === "post") {
      const title = String(body.title ?? "").trim();
      const scheduledAt = String(body.scheduledAt ?? "").trim();
      const mediaId = String(body.mediaId ?? "").trim() || null;
      if (!title || !scheduledAt) return Response.json({ error: "Title and schedule are required." }, { status: 400 });
      const statements = [db().prepare("INSERT INTO posts (id,title,caption,format,status,scheduled_at,location,tone,assignee,media_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(id, title, String(body.caption ?? ""), String(body.format ?? "Reel"), "Draft", scheduledAt, String(body.location ?? ""), String(body.tone ?? "sea"), owner, mediaId, now)];
      if (mediaId) statements.push(db().prepare("UPDATE media_assets SET used_count = used_count + 1 WHERE id = ?").bind(mediaId));
      await db().batch(statements);
    } else if (entity === "idea") {
      const title = String(body.title ?? "").trim();
      if (!title) return Response.json({ error: "Idea title is required." }, { status: 400 });
      await db().prepare("INSERT INTO ideas (id,kind,title,notes,color,created_by,created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(id, String(body.kind ?? "Idea"), title, String(body.notes ?? ""), String(body.color ?? "coral"), owner, now).run();
    } else if (entity === "creator") {
      const name = String(body.name ?? "").trim();
      if (!name) return Response.json({ error: "Creator name is required." }, { status: 400 });
      await db().prepare("INSERT INTO creators (id,name,handle,specialties,status,instagram,location,bio,notes,next_action,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(id, name, String(body.handle ?? ""), JSON.stringify(body.specialties ?? []), "Prospect", String(body.instagram ?? ""), String(body.location ?? ""), String(body.bio ?? ""), "", String(body.nextAction ?? ""), now).run();
    } else {
      return Response.json({ error: "Unsupported workspace record." }, { status: 400 });
    }
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const entity = String(body.entity ?? "");
    const id = String(body.id ?? "");
    if (!id) return Response.json({ error: "Record id is required." }, { status: 400 });
    if (entity === "post") {
      const status = String(body.status ?? "");
      if (!allowedStatuses.has(status)) return Response.json({ error: "Invalid workflow status." }, { status: 400 });
      await db().prepare("UPDATE posts SET status = ? WHERE id = ?").bind(status, id).run();
    } else if (entity === "idea") {
      await db().prepare("UPDATE ideas SET title = ?, notes = ? WHERE id = ?").bind(String(body.title ?? ""), String(body.notes ?? ""), id).run();
    } else if (entity === "creator") {
      await db().prepare("UPDATE creators SET status = ?, next_action = ? WHERE id = ?").bind(String(body.status ?? "Prospect"), String(body.nextAction ?? ""), id).run();
    } else {
      return Response.json({ error: "Unsupported workspace record." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const entity = String(body.entity ?? "");
    const id = String(body.id ?? "");
    if (!id) return Response.json({ error: "Record id is required." }, { status: 400 });
    if (entity === "post") {
      const post = await db().prepare("SELECT media_id FROM posts WHERE id = ?").bind(id).first<{ media_id: string | null }>();
      const statements = [db().prepare("DELETE FROM posts WHERE id = ?").bind(id)];
      if (post?.media_id) statements.push(db().prepare("UPDATE media_assets SET used_count = MAX(used_count - 1, 0) WHERE id = ?").bind(post.media_id));
      await db().batch(statements);
    } else if (entity === "idea") {
      await db().prepare("DELETE FROM ideas WHERE id = ?").bind(id).run();
    } else if (entity === "creator") {
      await db().prepare("DELETE FROM creators WHERE id = ?").bind(id).run();
    } else {
      return Response.json({ error: "Unsupported workspace record." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to remove" }, { status: 500 });
  }
}
