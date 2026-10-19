import { z } from 'zod';

// Offset pagination shared by every list endpoint. The client sends `?page=&limit=`;
// we clamp both to safe bounds (never trust the client for how much to return) and
// hand back the `skip`/`limit` for the query plus a meta block for the response.
//
// Lenient on purpose: garbage or out-of-range values fall back / clamp instead of
// erroring, so a bad querystring never 500s or 400s a plain read.
export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

// `.catch` makes each field fall back when the value is missing or unparseable;
// we then clamp into range so e.g. limit=9999 becomes maxLimit, not the default.
const rawSchema = (defaultLimit: number) =>
  z.object({
    page: z.coerce.number().int().catch(1),
    limit: z.coerce.number().int().catch(defaultLimit),
  });

export function parsePagination(
  query: unknown,
  opts?: { defaultLimit?: number; maxLimit?: number },
): Pagination {
  const defaultLimit = opts?.defaultLimit ?? 24;
  const maxLimit = opts?.maxLimit ?? 100;
  const raw = rawSchema(defaultLimit).parse(query ?? {});
  const page = Math.max(1, raw.page);
  const limit = Math.min(Math.max(1, raw.limit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

// The page info the client needs to render controls. `hasMore` saves the frontend
// doing the arithmetic.
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function pageMeta(total: number, p: Pagination): PageMeta {
  return {
    page: p.page,
    limit: p.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.limit)),
    hasMore: p.page * p.limit < total,
  };
}
