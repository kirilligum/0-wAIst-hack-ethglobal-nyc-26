# Workstream Plan: Web UI and Agent Dashboard

## Goal

Build the judge-facing frontend without duplicating backend logic. The user UI is simple. The dashboard shows internals. Both consume existing APIs/tools and must not implement payment, routing, verifier, or Hedera logic locally.

## Branch

```text
work/web-ui-dashboard
```

## Owned files

```text
apps/web/**
features/demo-readiness.feature
```

## Does not own

```text
contracts/**
packages/hedera/**
services/proofrouter-mcp/**
services/seller-node/**
services/verifier/**
packages/schemas/**
packages/crypto/**
```

## User UI

Fields:

```text
Prompt
Budget INF
Mode: Quick Buy / Router Agent
Run
```

Output:

```text
Selected seller
Proof status
Payment status
Answer
```

Do not show raw transaction hashes in the clean user UI.

## Dashboard

Show:

```text
orderId
context summary
candidate sellers
agent decision
MCP timeline
Dynamic policy status
x402 escrow status
scheduled refund status
zkTLS receipt card
batch settlement status
HCS audit status
trace links
```

## Async development contract

Use fixtures from `packages/schemas` until backend endpoints are ready.

Fixtures are allowed only in UI tests/dev rendering. Product demo must call real backend/MCP/execution path.

## Test plan

Commands:

```text
pnpm test:e2e
pnpm build
```

Tests:

- product name exact
- Quick Buy mode renders
- Router Agent mode renders
- dashboard renders canonical order trace
- user page does not render raw transaction internals
- no plaintext prompt appears in public dashboard audit artifacts

## Tasks

1. Build simple user page.
2. Build dashboard page/panel.
3. Add trace viewer.
4. Add status badges.
5. Add E2E tests from seeded fixture.
6. Wire to real endpoints after payment execution is ready.

## Done when

- `pnpm test:e2e` passes.
- UI can be shown in the three-window demo.
- UI contains no duplicate business logic.
