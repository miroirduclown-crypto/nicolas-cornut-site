import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = (ctx) => {
  const out: string[] = [];
  try {
    out.push('locals: ' + (ctx.locals ? 'present' : 'null'));
  } catch (e) { out.push('locals err: ' + String(e)); }
  try {
    const rt = (ctx.locals as any)?.runtime;
    out.push('runtime: ' + (rt ? 'present' : 'null'));
  } catch (e) { out.push('runtime err: ' + String(e)); }
  try {
    const env = (ctx.locals as any)?.runtime?.env;
    out.push('runtime.env: ' + (env ? 'present' : 'null'));
    if (env) out.push('keys: ' + Object.keys(env).join(','));
  } catch (e) { out.push('env err: ' + String(e)); }

  return new Response(out.join('\n'), {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
};
