# Security Model & Threat Assumptions

## Implemented baseline controls

- password hashing with bcryptjs;
- short-lived JWT access tokens;
- rotating, revocable refresh tokens in HttpOnly cookies;
- RBAC at API layer;
- organization-scoped resource queries;
- server-side validation;
- CORS restriction to configured frontend origin;
- Helmet security headers;
- attachment content-type and size validation;
- S3 tenant-prefixed object keys;
- short-lived S3 signed URLs;
- secrets supplied through environment variables;
- audit logging for material state transitions.

## Threat assumptions

The MVP assumes a trusted infrastructure/operator boundary and does not provide a full enterprise identity platform.

## Known limitations

- no SSO/OIDC/SCIM in MVP;
- no per-user MFA;
- no login/API rate limiting or managed bot/rate-limit service;
- no malware scanning pipeline for uploaded files;
- no formal penetration test;
- no formal compliance certification;
- authorization coverage must continue to be regression-tested as new resources are added.

The project therefore makes no claim of being "fully secure" or production-certified.
