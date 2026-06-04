import type { APIRoute } from 'astro';
import { getEnv } from '../lib/env';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const { email, prenom } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ success: false, error: 'Email invalide.' }), { status: 400, headers });
    }

    const apiKey = getEnv('BREVO_API_KEY');
    const listId = Number(getEnv('BREVO_LIST_ID')) || 28;

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: prenom || '' },
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    // 201 = créé, 204 = déjà existant mis à jour
    if (res.status === 201 || res.status === 204) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    const data = await res.json();
    // Code 300 = contact déjà dans la liste = on considère ça un succès
    if (data.code === 'duplicate_parameter') {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ success: false, error: data.message || 'Erreur Brevo.' }), { status: 500, headers });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Erreur serveur.' }), { status: 500, headers });
  }
};
