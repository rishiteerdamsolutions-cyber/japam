/** GET /api/health - Readiness probe for monitoring/load balancers. Returns 200 when API is up. */
export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, timestamp: new Date().toISOString(), service: 'japam-api' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
