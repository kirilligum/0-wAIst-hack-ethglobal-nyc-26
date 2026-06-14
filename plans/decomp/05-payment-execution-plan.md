# Workstream Plan: Payment Execution

## Goal

Own the one canonical execution function. This component connects selected seller offers to Dynamic delegated wallet, x402 escrow funding, scheduled refund, seller proxy, zkTLS receipt, Hedera Batch settlement, HCS audit, and trace writing.

## Branch

```text
work/payment-execution
```

## Owned files

```text
packages/hedera/src/dynamic.ts
packages/hedera/src/x402.ts
packages/hedera/src/schedule.ts
packages/hedera/src/batch.ts
packages/hedera/src/guardrails.ts
demo/runJudgeMode.ts
demo/healthcheck.ts
```

If the repo already has `executeInferenceOrder` in a service package, this workstream owns that file. Do not duplicate it elsewhere.

## Does not own

```text
contracts/**
services/proofrouter-mcp/**
services/seller-node/**
services/verifier/**
apps/web/**
```

## Canonical function

```ts
executeInferenceOrder({
  selectedOffer,
  prompt,
  budgetInf,
  modeContext,
  buyerWallet
}): Promise<InferenceOrderResult>
```

The function must do the steps in order:

1. Build redacted request and hashes.
2. Use Dynamic delegated wallet to satisfy x402 payment.
3. Fund `ProofEscrow` with HTS `INF`.
4. Create scheduled refund targeting `refundExpired(orderId)`.
5. Call seller proxy.
6. Wait for real zkTLS receipt.
7. Submit Hedera Batch settlement plus HCS audit.
8. Write trace files.

## Forbidden

```text
settleSequential
settleThenLog
directSellerPayment
HBAR settlement
local wallet substitute
manualRefund
timeoutRefund
```

## Async development contract

Buyer MCP and UI only call this component after selecting an offer.

Seller node only receives calls from this component.

Contracts/Hedera provide address and token config.

## Test plan

Commands:

```text
pnpm test:hedera
pnpm demo:health
```

Tests:

- Dynamic policy present.
- x402 funds escrow with INF.
- scheduled refund created.
- seller proxy not called before funding.
- batch settlement not called before receipt.
- HCS audit receives hash-only message.
- trace files use canonical shape.

## Tasks

1. Implement `dynamic.ts`.
2. Implement `x402.ts`.
3. Implement `schedule.ts`.
4. Implement `batch.ts`.
5. Implement direct guard assertions.
6. Implement `executeInferenceOrder`.
7. Wire trace writing.
8. Update `demo:health` for all required dependencies.

## Done when

- `pnpm demo:health` reports all payment prerequisites ready.
- `executeInferenceOrder` is the only product code path that opens orders, schedules refunds, calls seller proxy, and settles.
