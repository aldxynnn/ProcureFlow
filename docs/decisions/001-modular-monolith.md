# ADR 001 — Modular Monolith

## Context
ProcureFlow has multiple business capabilities but a portfolio-scale runtime.

## Decision
Deploy one NestJS application split into domain modules.

## Alternatives
Microservices would isolate deployment/scaling but introduce network boundaries, distributed observability and transaction complexity that are not justified yet.

## Consequence
Transactions remain local to PostgreSQL and deployments remain simple. Module boundaries are still explicit so future extraction is possible if a real requirement emerges.
