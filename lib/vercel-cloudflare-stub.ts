// Vercel can render the public preview without Cloudflare's D1/R2 bindings.
// The API routes already return a clear unavailable response when these are absent.
export const env = { DB: null, BUCKET: null };
