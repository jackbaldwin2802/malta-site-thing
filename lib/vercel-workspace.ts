import { BlobPreconditionFailedError, get, put } from "@vercel/blob";

export type WorkspaceRow = Record<string, any>;

export type WorkspaceData = {
  posts: WorkspaceRow[];
  media: WorkspaceRow[];
  ideas: WorkspaceRow[];
  creators: WorkspaceRow[];
  comments: WorkspaceRow[];
};

const WORKSPACE_PATH = "workspace/malta-media-management.json";

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

async function readLatestWorkspace(): Promise<{ workspace: WorkspaceData; etag?: string }> {
  assertStorage();
  const result = await get(WORKSPACE_PATH, { access: "public", useCache: false });
  if (!result) return { workspace: emptyWorkspace() };
  if (result.statusCode !== 200 || !result.stream) throw new Error("Unable to read the shared workspace.");

  const value = await new Response(result.stream).json() as Partial<WorkspaceData>;
  return { workspace: {
    posts: Array.isArray(value.posts) ? value.posts : [],
    media: Array.isArray(value.media) ? value.media : [],
    ideas: Array.isArray(value.ideas) ? value.ideas : [],
    creators: Array.isArray(value.creators) ? value.creators : [],
    comments: Array.isArray(value.comments) ? value.comments : [],
  }, etag: result.blob.etag };
}

export async function readVercelWorkspace(): Promise<WorkspaceData> {
  return (await readLatestWorkspace()).workspace;
}

export async function mutateVercelWorkspace(mutator: (workspace: WorkspaceData) => void | Promise<void>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { workspace, etag } = await readLatestWorkspace();
    await mutator(workspace);
    try {
      await put(WORKSPACE_PATH, JSON.stringify(workspace), {
        access: "public",
        allowOverwrite: Boolean(etag),
        addRandomSuffix: false,
        cacheControlMaxAge: 60,
        contentType: "application/json",
        ...(etag ? { ifMatch: etag } : {}),
      });
      return workspace;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) || attempt === 4) throw error;
    }
  }
  throw new Error("Unable to save the latest workspace changes.");
}
