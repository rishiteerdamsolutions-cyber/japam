import { Link } from 'react-router-dom';

/** API docs placeholder – links to OpenAPI spec. */
export function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gloss-bubblegum text-amber-200 p-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-amber-400 hover:text-amber-300 text-sm mb-6 inline-block">
          ← Back to Japam
        </Link>
        <h1 className="text-2xl font-bold text-amber-400 mb-4">API Reference</h1>
        <p className="text-amber-200/90 mb-4">
          Base URL: <code className="bg-black/30 px-1 rounded">/api</code>
        </p>
        <p className="text-amber-200/80 mb-6">
          OpenAPI 3.0 spec:{' '}
          <a
            href="/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline hover:text-amber-300"
          >
            /openapi.json
          </a>
        </p>
        <h2 className="text-lg font-semibold text-amber-400 mb-2">Key endpoints</h2>
        <ul className="space-y-2 text-sm text-amber-200/90">
          <li><code className="bg-black/30 px-1 rounded">GET /api/health</code> – Health check</li>
          <li><code className="bg-black/30 px-1 rounded">GET /api/price</code> – Unlock price</li>
          <li><code className="bg-black/30 px-1 rounded">POST /api/create-order</code> – Create payment order</li>
          <li><code className="bg-black/30 px-1 rounded">POST /api/verify-unlock</code> – Verify payment (Bearer)</li>
          <li><code className="bg-black/30 px-1 rounded">POST /api/admin-login</code> – Admin login</li>
          <li><code className="bg-black/30 px-1 rounded">POST /api/priest-login</code> – Priest login</li>
          <li><code className="bg-black/30 px-1 rounded">GET /api/marathons/discover</code> – Discover marathons</li>
        </ul>
      </div>
    </div>
  );
}
