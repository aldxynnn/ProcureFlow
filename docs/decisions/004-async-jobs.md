# ADR 004 — BullMQ for Non-Blocking Reminders

## Context
Approval and RFQ deadline reminders do not need to block synchronous user requests.

## Decision
Use Redis + BullMQ for delayed reminders.

## Alternatives
A cron process could work for very small deployments, but BullMQ provides retries and structured job semantics using the mandated Redis stack.

## Consequence
Redis becomes a real dependency for worker processing; it is not used as an arbitrary cache.
