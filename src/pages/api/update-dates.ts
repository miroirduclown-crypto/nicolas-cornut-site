import type { APIRoute } from 'astro';

export const prerender = false;

const FILE_PATH = 'src/data/dates.json';

// Récupère une variable d'env depuis le runtime Cloudflare (prod) ou import.meta.env (local dev)
function getEnv(locals: any, key: string): string | undefined {
  try {
    const fromRuntime = locals?.runtime?.env?.[key];
    if (fromRuntime !== undefined && fromRuntime !== null) return fromRuntime;
  } catch {}
  try {
    return (import.meta.env as any)?.[key];
  } catch { return undefined; }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const GITHUB_TOKEN  = getEnv(locals, 'GITHUB_TOKEN');
    const GITHUB_REPO   = getEnv(locals, 'GITHUB_REPO')  || 'miroirduclown-crypto/nicolas-cornut-site';
    const GITHUB_BRANCH = getEnv(locals, 'GITHUB_BRANCH') || 'main';

    const ghHeaders = {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'nicolas-cornut-site',
    };

    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: 'GITHUB_TOKEN manquant côté serveur.' }), { status: 500, headers });
    }

    const body = await request.json();

    // Récupère le fichier actuel depuis GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
      { headers: ghHeaders }
    );
    const fileData = await getRes.json() as { sha?: string; content?: string; message?: string };

    if (!fileData.content || !fileData.sha) {
      return new Response(JSON.stringify({ ok: false, error: `Lecture GitHub échouée : ${fileData.message || 'réponse invalide'}` }), { status: 500, headers });
    }

    const current = JSON.parse(atob(fileData.content.replace(/\n/g, '')));

    // Met à jour les dates
    for (const [key, value] of Object.entries(body)) {
      if (current[key]) {
        (current[key] as any).dates = value;
      }
    }

    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2))));

    // Commit via l'API GitHub
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Back office — mise à jour des dates',
          content: newContent,
          sha: fileData.sha,
          branch: GITHUB_BRANCH,
        }),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json() as { message?: string };
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers });
  }
};
