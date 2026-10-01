# ADR 002 — Shared Database Tenant Isolation

## Context
MVP needs clear organization isolation without database-per-tenant operational overhead.

## Decision
Use a shared PostgreSQL database with organization-scoped rows. User membership is limited to one organization in MVP.

## Consequence
Queries must never rely on client-supplied organization IDs for access control. Application authorization derives the tenant from the authenticated principal and applies it to every business query.
