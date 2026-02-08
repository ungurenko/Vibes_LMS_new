---
paths: "api/**/*.ts"
---

# External Service Integrations

## Checklist: Before Adding Any Integration

1. **Check library types** — install package, verify TypeScript types in docs (e.g. `PutBlobResult` may not have `size`)
2. **Set env variables BEFORE deploy** — add to `.env.local` AND Vercel Dashboard
3. **Update CLAUDE.md** — add new env variable to Environment Variables section
4. **Add detailed error logging** — include context (filename, size, etc.)

## Vercel Blob Storage

Token: `BLOB_READ_WRITE_TOKEN` (Vercel Dashboard -> Storage -> Blob -> Settings)

```typescript
import { put } from '@vercel/blob';

try {
  const blob = await put(filename, buffer, { access: 'public' });
  return res.json(successResponse({ url: blob.url }));
} catch (error) {
  console.error('Vercel Blob upload error:', {
    filename,
    size: buffer.length,
    error: error instanceof Error ? error.message : error
  });
  return res.status(500).json(errorResponse(
    `Upload error: ${error instanceof Error ? error.message : 'Unknown'}`
  ));
}
```

**Common mistake:** `blob.size` doesn't exist — use `buffer.length` instead.

## OpenRouter API

Token: `OPENROUTER_API_KEY`

Used in `api/tools.ts` for AI chat streaming. Models configured per tool type in `ai_system_instructions` table.

## Deployment Note

Add env variables to Vercel Dashboard BEFORE deploying. Missing tokens cause 500 errors that require redeployment after adding them.
