// Some hosting environments (e.g. the v0 preview sandbox) inject this project's
// secrets only under a `_2`-suffixed name (NEXTAUTH_SECRET_2, RESEND_API_KEY_2, ...)
// while the application code reads the canonical, un-suffixed name. This side-effect
// module runs at the earliest import and back-fills each un-suffixed variable from
// its `_2` counterpart when the canonical one is missing. In production, where the
// canonical names exist, this is a no-op because we never overwrite a set value.
function backfillSuffixedEnv() {
  try {
    for (const key of Object.keys(process.env)) {
      if (!key.endsWith("_2")) continue;
      const base = key.slice(0, -2);
      if (!base) continue;
      const value = process.env[key];
      if (value && !process.env[base]) {
        process.env[base] = value;
      }
    }
  } catch {
    // process.env may be read-only in some runtimes; inline fallbacks cover those cases.
  }
}

function backfillDatabaseEnv() {
  try {
    if (!process.env.DATABASE_URL) {
      const dbUrl =
        process.env.jacxi_PRISMA_DATABASE_URL ||
        process.env.jacxi_DATABASE_URL ||
        process.env.jacxi_POSTGRES_URL;
      if (dbUrl) {
        process.env.DATABASE_URL = dbUrl;
      }
    }
    if (!process.env.DIRECT_URL) {
      const directUrl =
        process.env.jacxi_POSTGRES_URL ||
        process.env.jacxi_DATABASE_URL ||
        process.env.DATABASE_URL;
      if (directUrl) {
        process.env.DIRECT_URL = directUrl;
      }
    }
  } catch {
    // ignore
  }
}

backfillSuffixedEnv();
backfillDatabaseEnv();

export {};
