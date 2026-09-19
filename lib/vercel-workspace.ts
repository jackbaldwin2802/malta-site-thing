import { get, put } from "@vercel/blob";

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

async function readLatestWorkspace(): Promise<WorkspaceData> {
  assertStorage();
  const result = await get(WORKSPACE_PATH, { access: "public", useCache: false });
  if (!result) return emptyWorkspace();
  if (result.statusCode !== 200 || !result.stream) throw new Error("Unable to read the shared workspace.");

  const value = await new Response(result.stream).json() as Partial<WorkspaceData>;
  return {
    posts: Array.isArray(value.posts) ? value.posts : [],
    media: Array.isArray(value.media) ? value.media : [],
    ideas: Array.isArray(value.ideas) ? value.ideas : [],
    creators: Array.isArray(value.creators) ? value.creators : [],
    comments: Array.isArray(value.comments) ? value.comments : [],
  };
}

export async function readVercelWorkspace(): Promise<WorkspaceData> {
  return readLatestWorkspace();
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
