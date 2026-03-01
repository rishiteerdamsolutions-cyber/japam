/**
 * Single API handler for Vercel — keeps deployment under the 12 serverless function limit (Hobby).
 * All /api/* requests are rewritten to /api/proxy?path=... ; routes via static imports so handlers are bundled.
 */

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',').map((o) => o.trim());
  const allowOrigin = allowed.includes(origin) || origin.endsWith('.vercel.app') ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function withCors(response, request) {
  const cors = getCorsHeaders(request);
  const newHeaders = new Headers(response.headers);
  Object.entries(cors).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
}

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
import * as userProfileHandler from './_handlers/user/profile.js';
import * as userPausedGameHandler from './_handlers/user/paused-game.js';
import * as userLastActiveHandler from './_handlers/user/last-active.js';
import * as userReactHandler from './_handlers/user/react.js';
import * as publicActiveUsersHandler from './_handlers/public/active-users.js';
import * as userReminderHandler from './_handlers/user/reminder.js';
import * as donateOrderHandler from './_handlers/donate-order.js';
import * as verifyDonateHandler from './_handlers/verify-donate.js';
import * as donorsHandler from './_handlers/donors.js';
import * as levelsConfigHandler from './_handlers/levels-config.js';
import * as adminLevelsHandler from './_handlers/admin/levels.js';
import * as adminBlockUserHandler from './_handlers/admin/block-user.js';
import * as adminUnblockUserHandler from './_handlers/admin/unblock-user.js';
import * as adminDeleteTempleHandler from './_handlers/admin/delete-temple.js';
import * as adminDeleteMarathonHandler from './_handlers/admin/delete-marathon.js';
import * as apavargaJoinHandler from './_handlers/apavarga/join.js';
import * as apavargaChatsHandler from './_handlers/apavarga/chats.js';
import * as apavargaMessagesHandler from './_handlers/apavarga/messages.js';
import * as apavargaStatusHandler from './_handlers/apavarga/status.js';
import * as apavargaAppointmentsHandler from './_handlers/apavarga/appointments.js';
import * as apavargaAppointmentsListHandler from './_handlers/apavarga/appointments-list.js';
import * as apavargaAppointmentsConfirmHandler from './_handlers/apavarga/appointments-confirm.js';
import * as apavargaAppointmentsArrivalHandler from './_handlers/apavarga/appointments-arrival.js';
import * as apavargaTemplesHandler from './_handlers/apavarga/temples.js';
import * as apavargaPriestSettingsHandler from './_handlers/apavarga/priest-settings.js';
import * as apavargaGroupsHandler from './_handlers/apavarga/groups.js';
import * as apavargaGroupsManageHandler from './_handlers/apavarga/groups-manage.js';
import * as apavargaCleanupHandler from './_handlers/apavarga/cleanup.js';

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
  'GET user/profile': userProfileHandler,
  'POST user/profile': userProfileHandler,
  'GET user/paused-game': userPausedGameHandler,
  'POST user/paused-game': userPausedGameHandler,
  'POST user/last-active': userLastActiveHandler,
  'POST user/react': userReactHandler,
  'GET public/active-users': publicActiveUsersHandler,
  'GET user/reminder': userReminderHandler,
  'POST user/reminder': userReminderHandler,
  'POST donate-order': donateOrderHandler,
  'POST verify-donate': verifyDonateHandler,
  'GET donors': donorsHandler,
  'POST apavarga/join': apavargaJoinHandler,
  'GET apavarga/chats': apavargaChatsHandler,
  'POST apavarga/chats': apavargaChatsHandler,
  'GET apavarga/messages': apavargaMessagesHandler,
  'POST apavarga/messages': apavargaMessagesHandler,
  'GET apavarga/status/feed': apavargaStatusHandler,
  'POST apavarga/status': apavargaStatusHandler,
  'POST apavarga/appointments/request': apavargaAppointmentsHandler,
  'GET apavarga/appointments/list': apavargaAppointmentsListHandler,
  'POST apavarga/appointments/confirm': apavargaAppointmentsConfirmHandler,
  'POST apavarga/appointments/arrival-confirm': apavargaAppointmentsArrivalHandler,
  'GET apavarga/temples': apavargaTemplesHandler,
  'GET apavarga/priest/settings': apavargaPriestSettingsHandler,
  'POST apavarga/priest/settings': apavargaPriestSettingsHandler,
  'GET apavarga/groups': apavargaGroupsHandler,
  'POST apavarga/groups': apavargaGroupsHandler,
  'POST apavarga/groups/manage': apavargaGroupsManageHandler,
  'POST apavarga/cleanup': apavargaCleanupHandler,
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

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request) {
  const pathSegments = getPathSegments(request);
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return withCors(jsonResponse({ error: 'Not found' }, 404), request);
  }
  const res = await route(request, 'GET', pathSegments);
  return withCors(res, request);
}

export async function POST(request) {
  const pathSegments = getPathSegments(request);
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return withCors(jsonResponse({ error: 'Not found' }, 404), request);
  }
  const res = await route(request, 'POST', pathSegments);
  return withCors(res, request);
}
