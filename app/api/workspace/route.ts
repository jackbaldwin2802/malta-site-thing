import { env } from "cloudflare:workers";
import { mutateVercelWorkspace, readVercelWorkspace } from "@/lib/vercel-workspace";

const allowedStatuses = new Set(["Pending", "Approved", "Denied", "Needs revisions", "Draft", "In review", "Changes requested"]);
const onVercel = () => Boolean(process.env.VERCEL);

async function createVercelRecord(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const entity = String(body.entity ?? "");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const owner = "Malta team";

  await mutateVercelWorkspace((workspace) => {
    if (entity === "post") {
      const title = String(body.title ?? "").trim();
      const scheduledAt = String(body.scheduledAt ?? "").trim();
      const mediaId = String(body.mediaId ?? "").trim() || null;
      if (!title || !scheduledAt) throw new Error("Title and schedule are required.");
      workspace.posts.push({ id, title, caption: String(body.caption ?? ""), format: String(body.format ?? "Reel"), status: "Pending", scheduled_at: scheduledAt, location: String(body.location ?? ""), tone: String(body.tone ?? "crimson"), assignee: owner, media_id: mediaId, created_at: now });
      if (mediaId) {
        const media = workspace.media.find((item) => item.id === mediaId);
        if (media) media.used_count = Number(media.used_count ?? 0) + 1;
      }
    } else if (entity === "comment") {
      const postId = String(body.postId ?? "").trim();
      const commentBody = String(body.body ?? "").trim();
      if (!postId || !commentBody) throw new Error("Post and comment are required.");
      if (!workspace.posts.some((post) => post.id === postId)) throw new Error("Post not found.");
      workspace.comments.push({ id, post_id: postId, body: commentBody, author: owner, created_at: now });
    } else if (entity === "idea") {
      const title = String(body.title ?? "").trim();
      if (!title) throw new Error("Idea title is required.");
      workspace.ideas.push({ id, kind: String(body.kind ?? "Idea"), title, notes: String(body.notes ?? ""), color: String(body.color ?? "coral"), media_id: String(body.mediaId ?? "") || null, linked_to: null, created_by: owner, created_at: now });
    } else if (entity === "creator") {
      const name = String(body.name ?? "").trim();
      if (!name) throw new Error("Creator name is required.");
      workspace.creators.push({ id, name, handle: String(body.handle ?? ""), specialties: JSON.stringify(body.specialties ?? []), status: "Prospect", instagram: String(body.instagram ?? ""), location: String(body.location ?? ""), bio: String(body.bio ?? ""), notes: "", next_action: String(body.nextAction ?? ""), created_at: now });
    } else {
      throw new Error("Unsupported workspace record.");
    }
  });

  return Response.json(entity === "comment" ? { id, author: owner, createdAt: now } : { id }, { status: 201 });
}

async function updateVercelRecord(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const entity = String(body.entity ?? "");
  const id = String(body.id ?? "");
  if (!id) return Response.json({ error: "Record id is required." }, { status: 400 });
  await mutateVercelWorkspace((workspace) => {
    if (entity === "post") {
      const status = String(body.status ?? "");
      if (!allowedStatuses.has(status)) throw new Error("Invalid workflow status.");
      const post = workspace.posts.find((item) => item.id === id);
      if (post) post.status = status;
    } else if (entity === "idea") {
      const idea = workspace.ideas.find((item) => item.id === id);
      if (idea) Object.assign(idea, { title: String(body.title ?? ""), notes: String(body.notes ?? ""), linked_to: String(body.linkedTo ?? "") || null });
    } else if (entity === "creator") {
      const creator = workspace.creators.find((item) => item.id === id);
      if (creator) Object.assign(creator, { status: String(body.status ?? "Prospect"), next_action: String(body.nextAction ?? "") });
    } else {
      throw new Error("Unsupported workspace record.");
    }
  });
  return Response.json({ ok: true });
}

async function deleteVercelRecord(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const entity = String(body.entity ?? "");
  const id = String(body.id ?? "");
  if (!id) return Response.json({ error: "Record id is required." }, { status: 400 });
  await mutateVercelWorkspace((workspace) => {
    if (entity === "post") {
      const post = workspace.posts.find((item) => item.id === id);
      workspace.posts = workspace.posts.filter((item) => item.id !== id);
      workspace.comments = workspace.comments.filter((item) => item.post_id !== id);
      if (post?.media_id) {
        const media = workspace.media.find((item) => item.id === post.media_id);
        if (media) media.used_count = Math.max(Number(media.used_count ?? 0) - 1, 0);
      }
    } else if (entity === "idea") {
      workspace.ideas = workspace.ideas.filter((item) => item.id !== id).map((item) => item.linked_to === id ? { ...item, linked_to: null } : item);
    } else if (entity === "creator") {
      workspace.creators = workspace.creators.filter((item) => item.id !== id);
    } else {
      throw new Error("Unsupported workspace record.");
    }
  });
  return Response.json({ ok: true });
}

function db() {
  if (!env.DB) throw new Error("Workspace storage is unavailable.");
  return env.DB;
}

export async function GET() {
  try {
    if (onVercel()) return Response.json(await readVercelWorkspace());
    const [posts, media, ideas, creators, comments] = await db().batch([
      db().prepare("SELECT * FROM posts ORDER BY scheduled_at ASC"),
      db().prepare("SELECT * FROM media_assets ORDER BY created_at DESC"),
      db().prepare("SELECT * FROM ideas ORDER BY created_at DESC"),
      db().prepare("SELECT * FROM creators ORDER BY created_at DESC"),
      db().prepare("SELECT * FROM post_comments ORDER BY created_at ASC"),
    ]);
    return Response.json({ posts: posts.results, media: media.results, ideas: ideas.results, creators: creators.results, comments: comments.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load workspace" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (onVercel()) return await createVercelRecord(request);
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
        .bind(id, title, String(body.caption ?? ""), String(body.format ?? "Reel"), "Pending", scheduledAt, String(body.location ?? ""), String(body.tone ?? "sea"), owner, mediaId, now)];
      if (mediaId) statements.push(db().prepare("UPDATE media_assets SET used_count = used_count + 1 WHERE id = ?").bind(mediaId));
      await db().batch(statements);
    } else if (entity === "comment") {
      const postId = String(body.postId ?? "").trim();
      const commentBody = String(body.body ?? "").trim();
      if (!postId || !commentBody) return Response.json({ error: "Post and comment are required." }, { status: 400 });
      const exists = await db().prepare("SELECT id FROM posts WHERE id = ?").bind(postId).first();
      if (!exists) return Response.json({ error: "Post not found." }, { status: 404 });
      await db().prepare("INSERT INTO post_comments (id,post_id,body,author,created_at) VALUES (?,?,?,?,?)").bind(id, postId, commentBody, owner, now).run();
      return Response.json({ id, author: owner, createdAt: now }, { status: 201 });
    } else if (entity === "idea") {
      const title = String(body.title ?? "").trim();
      if (!title) return Response.json({ error: "Idea title is required." }, { status: 400 });
      await db().prepare("INSERT INTO ideas (id,kind,title,notes,color,media_id,linked_to,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(id, String(body.kind ?? "Idea"), title, String(body.notes ?? ""), String(body.color ?? "coral"), String(body.mediaId ?? "") || null, null, owner, now).run();
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
    if (onVercel()) return await updateVercelRecord(request);
    const body = await request.json() as Record<string, unknown>;
    const entity = String(body.entity ?? "");
    const id = String(body.id ?? "");
    if (!id) return Response.json({ error: "Record id is required." }, { status: 400 });
    if (entity === "post") {
      const status = String(body.status ?? "");
      if (!allowedStatuses.has(status)) return Response.json({ error: "Invalid workflow status." }, { status: 400 });
      await db().prepare("UPDATE posts SET status = ? WHERE id = ?").bind(status, id).run();
    } else if (entity === "idea") {
      await db().prepare("UPDATE ideas SET title = ?, notes = ?, linked_to = ? WHERE id = ?").bind(String(body.title ?? ""), String(body.notes ?? ""), String(body.linkedTo ?? "") || null, id).run();
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
    if (onVercel()) return await deleteVercelRecord(request);
    const body = await request.json() as Record<string, unknown>;
    const entity = String(body.entity ?? "");
    const id = String(body.id ?? "");
    if (!id) return Response.json({ error: "Record id is required." }, { status: 400 });
    if (entity === "post") {
      const post = await db().prepare("SELECT media_id FROM posts WHERE id = ?").bind(id).first<{ media_id: string | null }>();
      const statements = [db().prepare("DELETE FROM post_comments WHERE post_id = ?").bind(id), db().prepare("DELETE FROM posts WHERE id = ?").bind(id)];
      if (post?.media_id) statements.push(db().prepare("UPDATE media_assets SET used_count = MAX(used_count - 1, 0) WHERE id = ?").bind(post.media_id));
      await db().batch(statements);
    } else if (entity === "idea") {
      await db().batch([
        db().prepare("UPDATE ideas SET linked_to = NULL WHERE linked_to = ?").bind(id),
        db().prepare("DELETE FROM ideas WHERE id = ?").bind(id),
      ]);
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
