/**
 * Single API handler for Vercel — keeps deployment under the 12 serverless function limit (Hobby).
 * All /api/* requests are rewritten to /api/proxy?path=... ; this file routes to api-handlers/ by path and method.
 */
function getPathSegments(request) {
  const url = new URL(request.url);
  // Rewrite sends /api/price -> /api/proxy?path=price, /api/admin/set-price -> /api/proxy?path=admin/set-price
  const pathParam = url.searchParams.get('path');
  if (pathParam) {
    const segments = pathParam.split('/').filter(Boolean);
    if (segments.length) return segments;
  }
  const pathname = url.pathname || '';
  const base = '/api';
  if (!pathname.startsWith(base)) return [];
  const rest = pathname.slice(base.length).replace(/^\/+/, '').replace(/^proxy\/?/, '');
  return rest ? rest.split('/') : [];
}

function jsonResponse(data, status = 404) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ROUTES = {
  'GET price': '../api-handlers/price.js',
  'POST create-order': '../api-handlers/create-order.js',
  'POST verify-unlock': '../api-handlers/verify-unlock.js',
  'POST admin-login': '../api-handlers/admin-login.js',
  'POST priest-login': '../api-handlers/priest-login.js',
  'POST admin/set-price': '../api-handlers/admin/set-price.js',
  'POST admin/create-temple': '../api-handlers/admin/create-temple.js',
  'GET admin/list-temples': '../api-handlers/admin/list-temples.js',
  'GET admin/marathons': '../api-handlers/admin/marathons.js',
  'GET priest/marathons': '../api-handlers/priest/marathons.js',
  'POST priest/marathons': '../api-handlers/priest/marathons.js',
  'POST priest/link': '../api-handlers/priest/link.js',
  'GET marathons/discover': '../api-handlers/marathons/discover.js',
  'POST marathons/join': '../api-handlers/marathons/join.js',
};

async function route(request, method, pathSegments) {
  const pathKey = pathSegments.join('/');
  const routeKey = `${method} ${pathKey}`;
  const modulePath = ROUTES[routeKey];
  if (!modulePath) return jsonResponse({ error: 'Not found' }, 404);
  try {
    const mod = await import(modulePath);
    const handler = mod[method];
    if (typeof handler !== 'function') return jsonResponse({ error: 'Method not allowed' }, 405);
    return await handler(request);
  } catch (e) {
    console.error('api router', routeKey, e);
    return jsonResponse({ error: e.message || 'Internal error' }, 500);
  }
}

export async function GET(request) {
  const pathSegments = getPathSegments(request);
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return jsonResponse({ error: 'Not found' }, 404);
  }
  return route(request, 'GET', pathSegments);
}

export async function POST(request) {
  const pathSegments = getPathSegments(request);
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return jsonResponse({ error: 'Not found' }, 404);
  }
  return route(request, 'POST', pathSegments);
}
