import { del, get, list, put } from "@vercel/blob";

export type WorkspaceRow = Record<string, any>;

export type WorkspaceData = {
  posts: WorkspaceRow[];
  media: WorkspaceRow[];
  ideas: WorkspaceRow[];
  creators: WorkspaceRow[];
  comments: WorkspaceRow[];
};

const WORKSPACE_PATH = "workspace/malta-media-management.json";
const MEDIA_RECORD_PREFIX = "workspace/media-records/";

const emptyWorkspace = (): WorkspaceData => ({
  posts: [],
  media: [],
  ideas: [],
  creators: [],
  comments: [],
});

function assertStorage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Vercel Blob storage is not connected yet.");
  }
}

async function readLatestWorkspace(): Promise<WorkspaceData> {
  assertStorage();
  const result = await get(WORKSPACE_PATH, { access: "public", useCache: false });
  let value: Partial<WorkspaceData> = emptyWorkspace();
  if (result) {
    if (result.statusCode !== 200 || !result.stream) throw new Error("Unable to read the shared workspace.");
    value = await new Response(result.stream).json() as Partial<WorkspaceData>;
  }
  const workspace: WorkspaceData = {
    posts: Array.isArray(value.posts) ? value.posts : [],
    media: Array.isArray(value.media) ? value.media : [],
    ideas: Array.isArray(value.ideas) ? value.ideas : [],
    creators: Array.isArray(value.creators) ? value.creators : [],
    comments: Array.isArray(value.comments) ? value.comments : [],
  };

  const recordList = await list({ prefix: MEDIA_RECORD_PREFIX, limit: 1000 });
  const records = await Promise.all(recordList.blobs.map(async (blob) => {
    const record = await get(blob.pathname, { access: "public", useCache: false });
    if (!record || record.statusCode !== 200 || !record.stream) return null;
    return await new Response(record.stream).json() as WorkspaceRow;
  }));
  const existingIds = new Set(workspace.media.map((item) => String(item.id)));
  const existingUrls = new Set(workspace.media.map((item) => String(item.url ?? "")).filter(Boolean));
  for (const record of records) {
    const recordUrl = String(record?.url ?? "");
    if (record?.id && !existingIds.has(String(record.id)) && (!recordUrl || !existingUrls.has(recordUrl))) {
      workspace.media.unshift(record);
      existingIds.add(String(record.id));
      if (recordUrl) existingUrls.add(recordUrl);
    }
  }
  return workspace;
}

export async function readVercelWorkspace(): Promise<WorkspaceData> {
  return readLatestWorkspace();
}

export async function writeVercelMediaRecord(record: WorkspaceRow) {
  assertStorage();
  await put(`${MEDIA_RECORD_PREFIX}${record.id}.json`, JSON.stringify(record), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function deleteVercelMediaRecord(id: string) {
  assertStorage();
  await del(`${MEDIA_RECORD_PREFIX}${id}.json`);
}

export async function mutateVercelWorkspace(mutator: (workspace: WorkspaceData) => void | Promise<void>) {
  const workspace = await readLatestWorkspace();
  await mutator(workspace);
  await put(WORKSPACE_PATH, JSON.stringify(workspace), {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
    contentType: "application/json",
  });
  return workspace;
}
