// Lecture des variables d'environnement / secrets.
// Astro v6 : sur Cloudflare, l'env est exposé via le module virtuel "cloudflare:workers".
// En local dev (astro dev sous Node), ce module n'existe pas → fallback sur import.meta.env.

let cfEnv: Record<string, any> | undefined;
try {
  // Import statique résolu par l'adaptateur Cloudflare en production.
  // @ts-ignore - module virtuel Cloudflare
  const mod = await import('cloudflare:workers');
  cfEnv = (mod as any).env;
} catch {
  cfEnv = undefined;
}

export function getEnv(key: string): string | undefined {
  try {
    const v = cfEnv?.[key];
    if (v !== undefined && v !== null && v !== '') return v as string;
  } catch {}
  try {
    return (import.meta.env as any)?.[key];
  } catch {
    return undefined;
  }
}
