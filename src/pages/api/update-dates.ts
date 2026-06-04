import type { APIRoute } from 'astro';

export const prerender = false;

const GITHUB_TOKEN  = import.meta.env.GITHUB_TOKEN;
const GITHUB_REPO   = import.meta.env.GITHUB_REPO  || 'miroirduclown-crypto/nicolas-cornut-site';
const GITHUB_BRANCH = import.meta.env.GITHUB_BRANCH || 'main';
const FILE_PATH     = 'src/data/dates.json';

const GITHUB_HEADERS = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'nicolas-cornut-site',
};

async function getFileSha(): Promise<{ sha: string; content: string }> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
    { headers: GITHUB_HEADERS }
  );
  const data = await res.json() as { sha: string; content: string };
  return data;
}

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const body = await request.json();

    // Récupère le fichier actuel depuis GitHub
    const { sha, content: encoded } = await getFileSha();
    const current = JSON.parse(atob(encoded.replace(/\n/g, '')));

    // Met à jour les dates
    for (const [key, value] of Object.entries(body)) {
      if (current[key]) {
        (current[key] as any).dates = value;
      }
    }

    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2))));

    // Commit via l'API GitHub
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          ...GITHUB_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Back office — mise à jour des dates',
          content: newContent,
          sha,
          branch: GITHUB_BRANCH,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json() as { message?: string };
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers });
  }
};
