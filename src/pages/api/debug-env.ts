import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const headers = { 'Content-Type': 'application/json' };

  const info: any = {
    has_locals: !!locals,
    has_runtime: !!(locals as any)?.runtime,
    has_runtime_env: !!(locals as any)?.runtime?.env,
    runtime_env_keys: [],
    import_meta_keys: [],
  };

  try {
    const env = (locals as any)?.runtime?.env;
    if (env) info.runtime_env_keys = Object.keys(env);
  } catch (e) { info.runtime_err = String(e); }

  try {
    info.import_meta_keys = Object.keys(import.meta.env || {});
  } catch (e) { info.meta_err = String(e); }

  return new Response(JSON.stringify(info, null, 2), { status: 200, headers });
};
