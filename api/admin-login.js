import { createAdminToken, jsonResponse } from './_lib.js';

const ADMIN_ID = process.env.ADMIN_ID || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { adminId, password } = body;
    if (!ADMIN_ID || !ADMIN_PASSWORD) {
      return jsonResponse({ error: 'Admin not configured' }, 503);
    }
    if (String(adminId || '').trim() !== ADMIN_ID || password !== ADMIN_PASSWORD) {
      return jsonResponse({ error: 'Wrong Admin ID or password' }, 401);
    }
    const token = createAdminToken();
    return jsonResponse({ token });
  } catch (e) {
    console.error('admin-login', e);
    return jsonResponse({ error: 'Login failed' }, 500);
  }
}
