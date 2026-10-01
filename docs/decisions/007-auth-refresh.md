# ADR 007 — Rotating Opaque Refresh Tokens

## Context
Refresh tokens need revocation and rotation; long-lived JWTs would make individual revocation harder.

## Decision
Issue an opaque random refresh token, store an HMAC hash in PostgreSQL, rotate on use, and send it in an HttpOnly cookie scoped to `/api/auth`.

## Consequence
Sessions can be revoked individually. Access JWTs remain short-lived.
