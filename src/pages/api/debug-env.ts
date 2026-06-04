import type { APIRoute } from 'astro';
import { getEnv } from '../../lib/env';

export const prerender = false;

export const GET: APIRoute = () => {
  // Ne révèle pas les valeurs : juste si chaque clé est présente
  const status = {
    GITHUB_TOKEN: getEnv('GITHUB_TOKEN') ? 'OK' : 'MANQUANT',
    BREVO_API_KEY: getEnv('BREVO_API_KEY') ? 'OK' : 'MANQUANT',
  };
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
