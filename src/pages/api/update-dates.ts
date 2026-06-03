import type { APIRoute } from 'astro';

export const prerender = false;

// Cet endpoint ne fonctionne qu'en développement local (nécessite Node.js fs)
// En production, les dates sont mises à jour localement puis redéployées.

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  // En production Cloudflare, on renvoie une erreur explicite
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ ok: false, error: 'Admin disponible en local uniquement.' }), { status: 403, headers });
  }

  try {
    // Import dynamique pour éviter les erreurs sur Cloudflare
    const { writeFile, readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { join, dirname } = await import('node:path');

    const DATES_FILE = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../data/dates.json'
    );

    const body = await request.json();
    const current = JSON.parse(await readFile(DATES_FILE, 'utf-8'));

    for (const [key, value] of Object.entries(body)) {
      if (current[key]) {
        (current[key] as any).dates = value;
      }
    }

    await writeFile(DATES_FILE, JSON.stringify(current, null, 2), 'utf-8');
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers });
  }
};
