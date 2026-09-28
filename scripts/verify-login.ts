/* Verify login + shipments API (run with: npx tsx scripts/verify-login.ts) */
async function main() {
  const base = 'http://127.0.0.1:3000';

  const r1 = await fetch(`${base}/api/auth/csrf`);
  const csrfCookie = r1.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const { csrfToken } = (await r1.json()) as { csrfToken: string };

  const r2 = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({
      csrfToken,
      email: 'admin@jacxi.com',
      password: 'afghan123',
      json: 'true',
    }),
    redirect: 'manual',
  });
  console.log('signin status:', r2.status);
  const authCookies = r2.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

  const r3 = await fetch(`${base}/api/auth/session`, { headers: { Cookie: authCookies } });
  const session = await r3.json();
  console.log('session:', JSON.stringify(session).slice(0, 250));

  const r4 = await fetch(
    `${base}/api/search?page=1&limit=10&type=shipments&sortBy=createdAt&sortOrder=desc`,
    { headers: { Cookie: authCookies } },
  );
  const data = await r4.json();
  const rows = data.shipments ?? data.results ?? data.data ?? [];
  console.log('shipments API status:', r4.status);
  console.log(
    'total:',
    data.totalCount ?? data.total ?? data.pagination?.total ?? rows.length,
  );
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
