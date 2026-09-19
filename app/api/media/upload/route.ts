import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return Response.json({ error: "Uploads must come from the Malta site." }, { status: 403 });
    }

    const body = await request.json() as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("media/")) throw new Error("Invalid upload path.");
        return {
          allowedContentTypes: ["image/*", "video/*"],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
