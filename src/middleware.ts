import type { MiddlewareHandler } from 'astro';

// Politique de sécurité du contenu (CSP) — autorise uniquement les sources légitimes
const CSP = [
  "default-src 'self'",
  // Scripts : le site a des scripts inline (header, formulaire) → 'unsafe-inline' nécessaire
  "script-src 'self' 'unsafe-inline'",
  // Styles inline + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images : self + data URIs + images distantes (logos, pochettes podcast)
  "img-src 'self' data: https:",
  // iFrames autorisées : lecteur Spotify + formulaire Brevo
  "frame-src https://open.spotify.com https://9b68bf88.sibforms.com",
  // Requêtes sortantes : self (endpoints) + Brevo (au cas où)
  "connect-src 'self' https://api.brevo.com",
  // Empêche l'intégration du site dans une iframe tierce (anti-clickjacking)
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://9b68bf88.sibforms.com https://forms.gle",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export const onRequest: MiddlewareHandler = async (_ctx, next) => {
  const response = await next();
  // Ne pas toucher aux réponses de redirection Access ni aux types binaires
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(k)) response.headers.set(k, v);
  }
  return response;
};
