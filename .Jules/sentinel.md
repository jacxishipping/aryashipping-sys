## 2025-02-28 - [Prevent Server-Side Request Forgery]
**Vulnerability:** Found an SSRF vulnerability where URLs were blindly fetched on the server in `src/app/api/photos/download/route.ts`.
**Learning:** External URL parameters used in API routes can easily lead to SSRF if not strictly validated against an allowed list of trusted domains.
**Prevention:** Implement an allowlist using native `URL` parsing to strictly validate the hostname against trusted origins, being careful about exact domain matching or strict subdomain matching logic, and enforce the HTTPS protocol.

## 2026-09-25 - [Strict Parameterization for Prisma SQL]
**Vulnerability:** Found uses of `$queryRawUnsafe` and `$executeRawUnsafe` which pose a high risk for SQL injection, as they rely on the caller to handle parameterization correctly.
**Learning:** While manual parameterization (e.g. `$1`) was used, these 'Unsafe' variants inherently bypass Prisma's built-in protections, making it far too easy for future code changes to accidentally introduce SQL injection via string concatenation.
**Prevention:** Strictly enforce the use of `$queryRaw` and `$executeRaw` alongside the `Prisma.sql` tagged template literal for all raw database queries to guarantee native parameterization and defend against injection.
