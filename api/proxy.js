/**
 * Single API handler for Vercel — keeps deployment under the 12 serverless function limit (Hobby).
 * All /api/* requests are rewritten to /api/proxy?path=... ; routes via static imports so handlers are bundled.
 */

import { checkRateLimit } from './_handlers/rateLimit.js';
import { captureException } from './_handlers/_sentry.js';
import { getAdminTokenFromRequest, verifyAdminToken } from './_handlers/_lib.js';

function parseAllowedOrigins() {
  const raw =
    process.env.CORS_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,https://japam.digital,https://www.japam.digital';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin, allowedList) {
  if (!origin) return false;
  if (allowedList.includes(origin)) return true;
  const previews =
    process.env.CORS_ALLOW_VERCEL_PREVIEWS === '1' ||
    process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true';
  if (!previews) return false;
  try {
    const u = new URL(origin);
    return u.protocol === 'https:' && u.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function getCorsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowed = parseAllowedOrigins();
  let allowOrigin = '';
  if (origin && isOriginAllowed(origin, allowed)) {
    allowOrigin = origin;
  } else if (!origin && allowed.length) {
    allowOrigin = allowed[0];
  } else if (allowed.length) {
    allowOrigin = allowed[0];
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin || 'null',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-Cron-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // HSTS: force HTTPS for 1 year on API subdomain (do not include subdomains here — frontend handles that via vercel.json)
  'Strict-Transport-Security': 'max-age=31536000',
  // Permissions: disable unused browser features to reduce attack surface
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self), usb=()',
};

function withCors(response, request) {
  const cors = getCorsHeaders(request);
  const newHeaders = new Headers(response.headers);
  Object.entries(cors).forEach(([k, v]) => newHeaders.set(k, v));
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
}

import * as priceHandler from './_handlers/price.js';
import * as createOrderHandler from './_handlers/create-order.js';
import * as createLivesOrderHandler from './_handlers/create-lives-order.js';
import * as verifyUnlockHandler from './_handlers/verify-unlock.js';
import * as verifyLivesHandler from './_handlers/verify-lives.js';
import * as adminLoginHandler from './_handlers/admin-login.js';
import * as priestLoginHandler from './_handlers/priest-login.js';
import * as adminSetPriceHandler from './_handlers/admin/set-price.js';
import * as adminCreateTempleHandler from './_handlers/admin/create-temple.js';
import * as adminCreateMarathonHandler from './_handlers/admin/create-marathon.js';
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
import * as userLivesHandler from './_handlers/user/lives.js';
import * as userLivesConsumeHandler from './_handlers/user/lives-consume.js';
import * as userLivesGrantHandler from './_handlers/user/lives-grant.js';
import * as userRewardVideoEventHandler from './_handlers/user/reward-video-event.js';
import * as userReactHandler from './_handlers/user/react.js';
import * as userShareEventHandler from './_handlers/user/share-event.js';
import * as userReferralEventHandler from './_handlers/user/referral-event.js';
import * as userReferralAttributeHandler from './_handlers/user/referral-attribute.js';
import * as publicActiveUsersHandler from './_handlers/public/active-users.js';
import * as userReminderHandler from './_handlers/user/reminder.js';
import * as donateOrderHandler from './_handlers/donate-order.js';
import * as verifyDonateHandler from './_handlers/verify-donate.js';
import * as donorsHandler from './_handlers/donors.js';
import * as levelsConfigHandler from './_handlers/levels-config.js';
import * as configRewardVideosHandler from './_handlers/config/reward-videos.js';
import * as configRewardVideosNextHandler from './_handlers/config/reward-videos-next.js';
import * as adminRewardVideosHandler from './_handlers/admin/reward-videos.js';
import * as adminRewardVideoAnalyticsHandler from './_handlers/admin/reward-video-analytics.js';
import * as adminLevelsHandler from './_handlers/admin/levels.js';
import * as adminBlockUserHandler from './_handlers/admin/block-user.js';
import * as adminUnblockUserHandler from './_handlers/admin/unblock-user.js';
import * as adminDeleteTempleHandler from './_handlers/admin/delete-temple.js';
import * as adminDeleteMarathonHandler from './_handlers/admin/delete-marathon.js';
import * as adminMarathonEditHandler from './_handlers/admin/marathon-edit.js';
import * as apavargaJoinHandler from './_handlers/apavarga/join.js';
import * as apavargaChatsHandler from './_handlers/apavarga/chats.js';
import * as apavargaBlocksHandler from './_handlers/apavarga/blocks.js';
import * as apavargaBlocksUnblockHandler from './_handlers/apavarga/blocks-unblock.js';
import * as apavargaMessagesHandler from './_handlers/apavarga/messages.js';
import * as apavargaStatusHandler from './_handlers/apavarga/status.js';
import * as apavargaStatusViewedHandler from './_handlers/apavarga/status-viewed.js';
import * as apavargaAppointmentsHandler from './_handlers/apavarga/appointments.js';
import * as apavargaAppointmentsListHandler from './_handlers/apavarga/appointments-list.js';
import * as apavargaAppointmentsConfirmHandler from './_handlers/apavarga/appointments-confirm.js';
import * as apavargaAppointmentsArrivalHandler from './_handlers/apavarga/appointments-arrival.js';
import * as apavargaAppointmentsPayOrderHandler from './_handlers/apavarga/appointments-pay-order.js';
import * as apavargaAppointmentsPayVerifyHandler from './_handlers/apavarga/appointments-pay-verify.js';
import * as apavargaTemplesHandler from './_handlers/apavarga/temples.js';
import * as apavargaPriestSettingsHandler from './_handlers/apavarga/priest-settings.js';
import * as apavargaGroupsHandler from './_handlers/apavarga/groups.js';
import * as apavargaGroupsManageHandler from './_handlers/apavarga/groups-manage.js';
import * as apavargaRealsHandler from './_handlers/apavarga/reals.js';
import * as apavargaSeekersHandler from './_handlers/apavarga/seekers.js';
import * as apavargaCustomTokenHandler from './_handlers/apavarga/custom-token.js';
import * as apavargaCleanupHandler from './_handlers/apavarga/cleanup.js';
import * as cronRefreshActiveUsersHandler from './_handlers/cron/refresh-active-users.js';
import * as cronAnalyticsDailyHandler from './_handlers/cron/analytics-daily.js';
import * as cronUpdateMahaYagnaCountersHandler from './_handlers/cron/update-maha-yagna-counters.js';
import * as mahaYagnasListHandler from './_handlers/maha-yagnas/list.js';
import * as mahaYagnasMyContributionHandler from './_handlers/maha-yagnas/my-contribution.js';
import * as mahaYagnasJoinHandler from './_handlers/maha-yagnas/join.js';
import * as mahaYagnasLeaderboardHandler from './_handlers/maha-yagnas/leaderboard.js';
import * as mahaYagnasResetContributionHandler from './_handlers/maha-yagnas/reset-contribution.js';
import * as adminMahaYagnasHandler from './_handlers/admin/maha-yagnas.js';
import * as adminMahaYagnasEditHandler from './_handlers/admin/maha-yagnas-edit.js';
import * as priestMahaYagnasHandler from './_handlers/priest/maha-yagnas.js';
import * as priestMarathonEditHandler from './_handlers/priest/marathon-edit.js';
import * as priestMahaYagnasEditHandler from './_handlers/priest/maha-yagnas-edit.js';
import * as healthHandler from './_handlers/health.js';
import * as adminAnalyticsOverviewHandler from './_handlers/admin/analytics-overview.js';
import * as adminAnalyticsUsersHandler from './_handlers/admin/analytics-users.js';
import * as adminAnalyticsTimeseriesHandler from './_handlers/admin/analytics-timeseries.js';
import * as occasionsAnniversaryCreateHandler from './_handlers/occasions/anniversary-create.js';
import * as occasionsAnniversaryJoinHandler from './_handlers/occasions/anniversary-join.js';
import * as occasionsAnniversaryCompleteHandler from './_handlers/occasions/anniversary-complete.js';
import * as occasionsBirthdayCompleteHandler from './_handlers/occasions/birthday-complete.js';
import * as occasionsListHandler from './_handlers/occasions/list.js';
import * as occasionsAnniversaryActiveHandler from './_handlers/occasions/anniversary-active.js';
import * as userDeleteAccountHandler from './_handlers/user/delete-account.js';
import * as userExportDataHandler from './_handlers/user/export-data.js';
import * as couponsApplyHandler from './_handlers/coupons/apply.js';
import * as adminCouponsHandler from './_handlers/admin/coupons.js';
import * as cashfreeWebhookHandler from './_handlers/cashfree-webhook.js';

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
  'POST create-lives-order': createLivesOrderHandler,
  'POST verify-unlock': verifyUnlockHandler,
  'POST verify-lives': verifyLivesHandler,
  'POST admin-login': adminLoginHandler,
  'POST priest-login': priestLoginHandler,
  'POST admin/set-price': adminSetPriceHandler,
  'POST admin/create-temple': adminCreateTempleHandler,
  'POST admin/create-marathon': adminCreateMarathonHandler,
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
  'POST admin/marathon-edit': adminMarathonEditHandler,
  'GET levels-config': levelsConfigHandler,
  'GET config/reward-videos': configRewardVideosHandler,
  'POST config/reward-videos/next': configRewardVideosNextHandler,
  'POST admin/reward-videos': adminRewardVideosHandler,
  'GET admin/reward-video-analytics': adminRewardVideoAnalyticsHandler,
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
  'GET user/lives': userLivesHandler,
  'POST user/lives/consume': userLivesConsumeHandler,
  'POST user/lives/grant': userLivesGrantHandler,
  'POST user/reward-video-event': userRewardVideoEventHandler,
  'POST user/react': userReactHandler,
  'POST user/share-event': userShareEventHandler,
  'POST user/referral-event': userReferralEventHandler,
  'POST user/referral-attribute': userReferralAttributeHandler,
  'GET public/active-users': publicActiveUsersHandler,
  'GET user/reminder': userReminderHandler,
  'POST user/reminder': userReminderHandler,
  'POST donate-order': donateOrderHandler,
  'POST verify-donate': verifyDonateHandler,
  'GET donors': donorsHandler,
  'POST apavarga/join': apavargaJoinHandler,
  'GET apavarga/chats': apavargaChatsHandler,
  'POST apavarga/chats': apavargaChatsHandler,
  'GET apavarga/blocks': apavargaBlocksHandler,
  'POST apavarga/blocks': apavargaBlocksHandler,
  'POST apavarga/blocks/unblock': apavargaBlocksUnblockHandler,
  'GET apavarga/messages': apavargaMessagesHandler,
  'POST apavarga/messages': apavargaMessagesHandler,
  'GET apavarga/status/feed': apavargaStatusHandler,
  'POST apavarga/status': apavargaStatusHandler,
  'POST apavarga/status/viewed': apavargaStatusViewedHandler,
  'POST apavarga/appointments/request': apavargaAppointmentsHandler,
  'GET apavarga/appointments/list': apavargaAppointmentsListHandler,
  'POST apavarga/appointments/confirm': apavargaAppointmentsConfirmHandler,
  'POST apavarga/appointments/arrival-confirm': apavargaAppointmentsArrivalHandler,
  'POST apavarga/appointments/pay-order': apavargaAppointmentsPayOrderHandler,
  'POST apavarga/appointments/pay-verify': apavargaAppointmentsPayVerifyHandler,
  'GET apavarga/temples': apavargaTemplesHandler,
  'GET apavarga/priest/settings': apavargaPriestSettingsHandler,
  'POST apavarga/priest/settings': apavargaPriestSettingsHandler,
  'GET apavarga/groups': apavargaGroupsHandler,
  'POST apavarga/groups': apavargaGroupsHandler,
  'POST apavarga/groups/manage': apavargaGroupsManageHandler,
  'GET apavarga/reals': apavargaRealsHandler,
  'POST apavarga/reals': apavargaRealsHandler,
  'GET apavarga/seekers': apavargaSeekersHandler,
  'POST apavarga/custom-token': apavargaCustomTokenHandler,
  'POST apavarga/cleanup': apavargaCleanupHandler,
  'GET cron/refresh-active-users': cronRefreshActiveUsersHandler,
  'GET cron/analytics-daily': cronAnalyticsDailyHandler,
  'GET cron/update-maha-yagna-counters': cronUpdateMahaYagnaCountersHandler,
  'GET admin/analytics-overview': adminAnalyticsOverviewHandler,
  'GET admin/analytics-users': adminAnalyticsUsersHandler,
  'GET admin/analytics-timeseries': adminAnalyticsTimeseriesHandler,
  'GET maha-yagnas/list': mahaYagnasListHandler,
  'GET maha-yagnas/my-contribution': mahaYagnasMyContributionHandler,
  'POST maha-yagnas/join': mahaYagnasJoinHandler,
  'POST maha-yagnas/reset-contribution': mahaYagnasResetContributionHandler,
  'GET maha-yagnas/leaderboard': mahaYagnasLeaderboardHandler,
  'GET admin/maha-yagnas': adminMahaYagnasHandler,
  'POST admin/maha-yagnas': adminMahaYagnasHandler,
  'POST admin/maha-yagnas-edit': adminMahaYagnasEditHandler,
  'GET priest/maha-yagnas': priestMahaYagnasHandler,
  'POST priest/maha-yagnas': priestMahaYagnasHandler,
  'POST priest/marathon-edit': priestMarathonEditHandler,
  'POST priest/maha-yagnas-edit': priestMahaYagnasEditHandler,
  'GET health': healthHandler,
  'POST occasions/anniversary/create': occasionsAnniversaryCreateHandler,
  'POST occasions/anniversary/join': occasionsAnniversaryJoinHandler,
  'POST occasions/anniversary/complete': occasionsAnniversaryCompleteHandler,
  'POST occasions/birthday/complete': occasionsBirthdayCompleteHandler,
  'GET occasions/list': occasionsListHandler,
  'GET occasions/anniversary/active': occasionsAnniversaryActiveHandler,
  'DELETE user/account': userDeleteAccountHandler,
  'GET user/export': userExportDataHandler,
  'POST coupons/apply': couponsApplyHandler,
  'GET admin/coupons': adminCouponsHandler,
  'POST admin/coupons': adminCouponsHandler,
  'DELETE admin/coupons': adminCouponsHandler,
  'POST cashfree-webhook': cashfreeWebhookHandler,
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
    captureException(e, { route: routeKey }).catch(() => {});
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function OPTIONS(request) {
  return withCors(new Response(null, { status: 204 }), request);
}

function enforceAdminRouteGate(request, pathKey) {
  if (!pathKey.startsWith('admin/')) return null;
  const token = getAdminTokenFromRequest(request);
  if (!verifyAdminToken(token)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  return null;
}

async function applyRateLimit(request, pathKey) {
  if (pathKey === 'health') return null;
  // Cashfree webhook: signature is the auth; do not rate-limit or Cashfree retries
  // from the same IP pool would be dropped. The handler is idempotent anyway.
  if (pathKey === 'cashfree-webhook') return null;
  const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('x-cron-secret');
  const hasCronAuth = cronSecret && (auth === `Bearer ${cronSecret}` || auth === cronSecret);
  const isCronRoute = pathKey.startsWith('cron/') || pathKey === 'apavarga/cleanup';
  if (isCronRoute && hasCronAuth) return null;
  const result = await checkRateLimit(request, pathKey);
  if (!result.allowed) {
    const res = new Response(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter || 60,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
          'X-RateLimit-Limit': String(result.limit || 100),
        },
      },
    );
    return res;
  }
  return null;
}

export async function GET(request) {
  const pathSegments = getPathSegments(request);
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return withCors(jsonResponse({ error: 'Not found' }, 404), request);
  }
  const pathKey = pathSegments.join('/');
  const rateLimitRes = await applyRateLimit(request, pathKey);
  if (rateLimitRes) return withCors(rateLimitRes, request);
  const adminGate = enforceAdminRouteGate(request, pathKey);
  if (adminGate) return withCors(adminGate, request);
  const res = await route(request, 'GET', pathSegments);
  return withCors(res, request);
}

export async function POST(request) {
  const pathSegments = getPathSegments(request);
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return withCors(jsonResponse({ error: 'Not found' }, 404), request);
  }
  const pathKey = pathSegments.join('/');
  const rateLimitRes = await applyRateLimit(request, pathKey);
  if (rateLimitRes) return withCors(rateLimitRes, request);
  const adminGate = enforceAdminRouteGate(request, pathKey);
  if (adminGate) return withCors(adminGate, request);
  const res = await route(request, 'POST', pathSegments);
  return withCors(res, request);
}

export async function DELETE(request) {
  const pathSegments = getPathSegments(request);
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return withCors(jsonResponse({ error: 'Not found' }, 404), request);
  }
  const pathKey = pathSegments.join('/');
  const rateLimitRes = await applyRateLimit(request, pathKey);
  if (rateLimitRes) return withCors(rateLimitRes, request);
  const adminGate = enforceAdminRouteGate(request, pathKey);
  if (adminGate) return withCors(adminGate, request);
  const res = await route(request, 'DELETE', pathSegments);
  return withCors(res, request);
}
