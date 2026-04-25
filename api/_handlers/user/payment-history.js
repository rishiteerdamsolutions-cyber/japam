import {
  getDb,
  jsonResponse,
  verifyFirebaseUser,
  jsonInternalServerError,
  getUserUnlockInfo,
  isPremiumActiveFromDonorData,
  getPremiumExpiryMsFromDonorData,
} from '../_lib.js';

function toIsoStringSafe(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && typeof v.toDate === 'function') {
    try {
      return v.toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function orderKind(data, orderId) {
  if (data?.purpose === 'donate' || data?.isDonation === true) return 'donate';
  const id = String(orderId);
  if (id.startsWith('japam-donate-')) return 'donate';
  if (id.startsWith('japam-lives-') || data?.purpose === 'lives') return 'lives';
  return 'unlock';
}

function orderAmountPaise(data, kind) {
  if (kind === 'donate') {
    if (typeof data?.amountPaise === 'number') return data.amountPaise;
    return null;
  }
  if (kind === 'lives') {
    if (typeof data?.chargedPaise === 'number') return data.chargedPaise;
    if (typeof data?.amountPaise === 'number') return data.amountPaise;
    return null;
  }
  if (typeof data?.chargedPaise === 'number') return data.chargedPaise;
  if (typeof data?.basePricePaise === 'number') return data.basePricePaise;
  return null;
}

/** GET /api/user/payment-history — Pro / Premium / Cashfree order rows for the signed-in user. */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const [unlockInfo, donorSnap, ordersSnap] = await Promise.all([
      getUserUnlockInfo(db, uid),
      db.collection('donors').doc(uid).get(),
      db.collection('orders').where('uid', '==', uid).limit(200).get(),
    ]);

    const donorData = donorSnap.exists ? donorSnap.data() || {} : null;
    const premiumActive = isPremiumActiveFromDonorData(donorData);
    const premMs = getPremiumExpiryMsFromDonorData(donorData);
    const isLifetime = donorData?.lifetimeDonor === true;
    let premiumExpiresAt = null;
    if (isLifetime) premiumExpiresAt = null;
    else if (premMs != null && Number.isFinite(premMs) && premMs !== Number.POSITIVE_INFINITY) {
      premiumExpiresAt = new Date(premMs).toISOString();
    }

    const totalDonationPaise =
      typeof donorData?.totalAmountPaise === 'number'
        ? donorData.totalAmountPaise
        : typeof donorData?.amount === 'number'
          ? donorData.amount
          : null;

    const items = ordersSnap.docs.map((doc) => {
      const d = doc.data() || {};
      const orderId = doc.id;
      const kind = orderKind(d, orderId);
      return {
        orderId,
        kind,
        status: typeof d.status === 'string' ? d.status : 'unknown',
        createdAt: toIsoStringSafe(d.createdAt),
        fulfilledAt: toIsoStringSafe(d.fulfilledAt),
        fulfilledVia: d.fulfilledVia ?? null,
        amountPaise: orderAmountPaise(d, kind),
        couponCode: d.couponCode != null ? String(d.couponCode) : null,
      };
    });

    items.sort((a, b) => {
      const ta = a.createdAt || a.fulfilledAt || '';
      const tb = b.createdAt || b.fulfilledAt || '';
      return String(tb).localeCompare(String(ta));
    });

    return jsonResponse(
      {
        subscription: {
          pro: {
            hasAccess: unlockInfo.hasPaid,
            isActive: unlockInfo.isActive,
            unlockedAt: unlockInfo.unlockedAt,
            unlockExpiresAt: unlockInfo.unlockExpiresAt,
          },
          premium: {
            isActive: premiumActive,
            isLifetime,
            totalDonationPaise,
            premiumExpiresAt,
          },
        },
        orders: items,
      },
      200
    );
  } catch (e) {
    console.error('user payment-history GET', e);
    return jsonInternalServerError(e, 'api/_handlers/user/payment-history.js');
  }
}
