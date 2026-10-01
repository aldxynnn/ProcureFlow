# ADR 005 — S3 for Attachments

## Context
Quotation and invoice documents are binary objects with different lifecycle/storage characteristics from relational records.

## Decision
Store binaries in S3 and metadata/reference in PostgreSQL. Object keys are prefixed with organization ID and access is issued via short-lived signed URLs.

## Development adapter
Local filesystem storage is provided for Docker development; production should use S3.
