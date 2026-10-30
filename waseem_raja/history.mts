import { createHash, randomBytes } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles, sessions } from '../db/schema.js';
import { validateSession } from '../session-validation.mjs';

export default async (req: Request, context: any) => {
  const headers = { 'Cache-Control': 'no-store', 'Vary': 'Cookie' };
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) return reply({ error: 'Method not allowed' }, 405);
  if (req.method !== 'GET' && req.headers.get('origin') !== new URL(req.url).origin) return reply({ error: 'Same-origin requests only' }, 403);
  let cookie = context.cookies.get('apex_history');
  if (!cookie || !/^[a-f0-9]{64}$/.test(cookie)) {
    cookie = randomBytes(32).toString('hex');
    context.cookies.set({ name: 'apex_history', value: cookie, httpOnly: true, secure: true, sameSite: 'Strict', path: '/', maxAge: 31536000 });
  }
  const owner = createHash('sha256').update(cookie).digest('hex');
  try {
    if (req.method === 'GET') {
      const [profile] = await db.select({ name: profiles.name, shield: profiles.shield }).from(profiles).where(eq(profiles.owner, owner));
      const history = await db.select({ id: sessions.id, kind: sessions.kind, day: sessions.day, result: sessions.result, createdAt: sessions.createdAt }).from(sessions).where(eq(sessions.owner, owner)).orderBy(desc(sessions.createdAt)).limit(500);
      return reply({ profile: profile || null, history });
    }
    if (req.method === 'DELETE') {
      await db.delete(sessions).where(eq(sessions.owner, owner));
      await db.delete(profiles).where(eq(profiles.owner, owner));
      context.cookies.delete('apex_history');
      return reply({ ok: true });
    }
    const raw = await req.text();
    if (raw.length > 4096) return reply({ error: 'Request too large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Invalid request' }, 400);
    if (req.method === 'PUT') {
      if (typeof body.name !== 'string' || body.name.length > 40 || typeof body.shield !== 'boolean') return reply({ error: 'Invalid preferences' }, 400);
      const value = { owner, name: body.name.trim(), shield: body.shield ? 'on' : 'off' };
      await db.insert(profiles).values(value).onConflictDoUpdate({ target: profiles.owner, set: { name: value.name, shield: value.shield } });
      return reply({ ok: true });
    }
    const result = validateSession(body);
    if (!result) return reply({ error: 'Invalid session measurements' }, 400);
    // A stable client session ID makes retrying a save safe.
    await db.insert(sessions).values({ id: body.id, owner, kind: body.kind, day: body.day, result }).onConflictDoNothing();
    return reply({ ok: true });
  } catch {
    return reply({ error: 'History is temporarily unavailable. Your camera can still run; retry saving your result.' }, 503);
  }
};
export const config = { path: '/api/history' };
