# ADR 003 — Integer Cents for Monetary Fields

## Context
Floating-point values are not appropriate for persisted currency arithmetic.

## Decision
Store prices and amounts as integer cents using PostgreSQL `BIGINT` and format them at the application boundary.

## Consequence
Arithmetic is deterministic for the supported single-currency MVP. Multi-currency and advanced tax engines remain post-MVP.
