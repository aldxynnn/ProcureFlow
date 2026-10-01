# Verification status

## Static verification

- TypeScript/TSX source was inspected for malformed imports, duplicated declarations, and invalid relative paths.
- JSON/YAML/config files were inspected for structural consistency.
- Prisma schema and committed migrations were inspected for model/relation consistency.
- Runtime API boundaries were reviewed for tenant scope, role scope, state transitions, validation, and transaction boundaries.
- The project no longer seeds demo accounts or demo business data at application startup.
- First-run provisioning is explicit through `/api/setup/initialize` and the `/setup` web flow.
- The documented API golden path covers request → approval → RFQ invitations → quotes → selection → PO approval → PO issue → goods receipt → invoice verification → invoice approval.

## Runtime limitation

The authoring environment does not provide a Docker daemon and did not have a complete offline npm dependency cache, so the complete Docker runtime path could not be executed inside the authoring environment. This repository therefore does not claim that an external Docker host has been runtime-verified here.

## First local verification

From the project root:

```powershell
docker compose down -v
docker compose up --build
```

Then complete the first-run setup at `http://localhost:3000/setup`.

Verify:

- frontend: `http://localhost:3000`
- API health: `http://localhost:4000/health`
- Swagger: `http://localhost:4000/docs`
- API e2e: `npm --workspace apps/api run test:e2e`
