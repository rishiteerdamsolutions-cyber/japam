/**
 * Single API handler for Vercel — keeps deployment under the 12 serverless function limit (Hobby).
 * All /api/* requests are rewritten to /api/proxy?path=... ; routes via static imports so handlers are bundled.
 */
import * as priceHandler from './_handlers/price.js';
import * as createOrderHandler from './_handlers/create-order.js';
import * as verifyUnlockHandler from './_handlers/verify-unlock.js';
import * as adminLoginHandler from './_handlers/admin-login.js';
import * as priestLoginHandler from './_handlers/priest-login.js';
import * as adminSetPriceHandler from './_handlers/admin/set-price.js';
import * as adminCreateTempleHandler from './_handlers/admin/create-temple.js';
import * as adminListTemplesHandler from './_handlers/admin/list-temples.js';
import * as adminMarathonsHandler from './_handlers/admin/marathons.js';
import * as adminUnlockedUsersHandler from './_handlers/admin/unlocked-users.js';
import * as adminDataHandler from './_handlers/admin/data.js';
import * as priestMarathonsHandler from './_handlers/priest/marathons.js';
import * as priestLinkHandler from './_handlers/priest/link.js';
import * as marathonsDiscoverHandler from './_handlers/marathons/discover.js';
import * as marathonsJoinHandler from './_handlers/marathons/join.js';
import * as marathonsMyParticipationsHandler from './_handlers/marathons/my-participations.js';
import * as userProgressHandler from './_handlers/user/progress.js';
import * as userJapaHandler from './_handlers/user/japa.js';
import * as userUnlockHandler from './_handlers/user/unlock.js';
import * as donateOrderHandler from './_handlers/donate-order.js';
import * as verifyDonateHandler from './_handlers/verify-donate.js';
import * as donorsHandler from './_handlers/donors.js';
import * as levelsConfigHandler from './_handlers/levels-config.js';
import * as adminLevelsHandler from './_handlers/admin/levels.js';
import * as adminBlockUserHandler from './_handlers/admin/block-user.js';
import * as adminUnblockUserHandler from './_handlers/admin/unblock-user.js';
import * as adminDeleteTempleHandler from './_handlers/admin/delete-temple.js';
import * as adminDeleteMarathonHandler from './_handlers/admin/delete-marathon.js';

function getPathSegments(request) {
  const url = new URL(request.url);
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

const HANDLERS = {
  'GET price': priceHandler,
  'POST create-order': createOrderHandler,
  'POST verify-unlock': verifyUnlockHandler,
  'POST admin-login': adminLoginHandler,
  'POST priest-login': priestLoginHandler,
  'POST admin/set-price': adminSetPriceHandler,
  'POST admin/create-temple': adminCreateTempleHandler,
  'GET admin/list-temples': adminListTemplesHandler,
  'POST admin/list-temples': adminListTemplesHandler,
  'GET admin/marathons': adminMarathonsHandler,
  'POST admin/marathons': adminMarathonsHandler,
  'GET admin/unlocked-users': adminUnlockedUsersHandler,
  'POST admin/unlocked-users': adminUnlockedUsersHandler,
  'POST admin/data': adminDataHandler,
  'GET admin/levels': adminLevelsHandler,
  'POST admin/levels': adminLevelsHandler,
  'POST admin/block-user': adminBlockUserHandler,
  'POST admin/unblock-user': adminUnblockUserHandler,
  'POST admin/delete-temple': adminDeleteTempleHandler,
  'POST admin/delete-marathon': adminDeleteMarathonHandler,
  'GET levels-config': levelsConfigHandler,
  'GET priest/marathons': priestMarathonsHandler,
  'POST priest/marathons': priestMarathonsHandler,
  'POST priest/link': priestLinkHandler,
  'GET marathons/discover': marathonsDiscoverHandler,
  'GET marathons/my-participations': marathonsMyParticipationsHandler,
  'POST marathons/join': marathonsJoinHandler,
  'GET user/progress': userProgressHandler,
  'POST user/progress': userProgressHandler,
  'GET user/japa': userJapaHandler,
  'POST user/japa': userJapaHandler,
  'GET user/unlock': userUnlockHandler,
  'POST donate-order': donateOrderHandler,
  'POST verify-donate': verifyDonateHandler,
  'GET donors': donorsHandler,
};

async function route(request, method, pathSegments) {
  const pathKey = pathSegments.join('/');
  const routeKey = `${method} ${pathKey}`;
  const mod = HANDLERS[routeKey];
  if (!mod) return jsonResponse({ error: 'Not found' }, 404);
  try {
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
