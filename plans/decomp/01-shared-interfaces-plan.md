# Workstream Plan: Shared Schemas, Fixtures, and Anti-Debt Checks

## Goal

Create the stable interfaces that allow all other agents to work asynchronously without changing each other’s files.

## Branch

```text
work/shared-interfaces
```

## Owned files

```text
packages/schemas/src/offers.ts
packages/schemas/src/orders.ts
packages/schemas/src/receipts.ts
packages/schemas/src/tools.ts
packages/schemas/src/traces.ts
packages/schemas/src/promptHistory.ts
packages/crypto/src/hash.ts
packages/crypto/src/encryption.ts
packages/crypto/src/redaction.ts
features/*.feature
tests/static/*
fixtures/**
plans/interface-change-log.md
```

## Does not own

```text
contracts/**
packages/hedera/**
services/**
apps/web/**
demo/**
```

## Interfaces to publish

### Offer

```ts
type Offer = {
  offerId: string;
  sellerAccountId: string;
  sellerEvmAddress: string;
  providerId: string;
  modelId: string;
  endpointHash: string;
  inputPriceInfPerMTok: string;
  outputPriceInfPerMTok: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  proofPolicyHash: string;
  active: boolean;
};
```

### VerifiedReceipt

```ts
type VerifiedReceipt = {
  orderId: string;
  buyerAccountId: string;
  sellerAccountId: string;
  providerId: string;
  modelId: string;
  endpointId: string;
  requestHash: string;
  responseHash: string;
  proofHash: string;
  inputTokens: number;
  outputTokens: number;
  completedAt: string;
  verifierSignature: string;
};
```

### Trace contract

```text
runs/order-<orderId>/
  request.redacted.json
  offers.json
  manifest.json
  context.json
  decision.json
  x402-escrow.json
  scheduled-refund.json
  zktls-receipt.json
  batch-settlement.json
  summary.json
```

## Async development contract

Other workstreams may consume fixtures and generated types but may not change schema names or fields without updating:

```text
plans/interface-change-log.md
tests/static/architecture.test.ts
features/*.feature
```

## Test plan

Add or update:

```text
tests/static/architecture.test.ts
tests/static/schema-contract.test.ts
tests/static/no-prompt-leakage.test.ts
```

Required commands:

```text
pnpm test
pnpm test:static
pnpm build
```

## Tasks

1. Freeze the shared types listed above.
2. Add schema fixtures for:
   - three offers: Alpha, Beta, Gamma
   - one valid receipt
   - one invalid receipt with wrong model
   - one invalid receipt with wrong response hash
   - one prompt-history fixture with summaries and redacted excerpts
3. Add forbidden-pattern static scan.
4. Add no-public-plaintext fixture test.
5. Add `plans/interface-change-log.md`.

## Done when

- `pnpm build` passes.
- `pnpm test` passes.
- Static scan blocks forbidden product-code patterns.
- Fixtures are sufficient for UI, MCP, seller node, contracts, and demo workstreams.
