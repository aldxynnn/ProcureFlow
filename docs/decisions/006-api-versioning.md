# ADR 006 — No API Version Prefix in MVP

## Context
The REST API has a single controlled consumer (the portfolio frontend) and no public compatibility contract.

## Decision
Use `/api/...` without `/v1` in MVP.

## Consequence
A version prefix can be introduced later when there is a real backwards-compatibility requirement rather than adding ceremony up front.
