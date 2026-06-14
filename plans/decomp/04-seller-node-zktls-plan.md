# Workstream Plan: Seller Node and zkTLS Verifier

## Goal

Implement the seller-side service that only serves funded escrow orders, calls the LLM provider through real zkTLS, and returns a `VerifiedReceipt` that the payment execution workstream can settle.

## Branch

```text
work/seller-zktls
```

## Owned files

```text
services/seller-node/**
services/verifier/**
features/real-zktls.feature
features/no-prompt-leakage.feature
```

## Does not own

```text
contracts/**
packages/hedera/src/batch.ts
packages/hedera/src/x402.ts
services/proofrouter-mcp/**
apps/web/**
```

## Seller proxy API

```http
POST /v1/inference
```

Request:

```json
{
  "orderId": "string",
  "requestHash": "string",
  "prompt": "string",
  "modelId": "string",
  "proofPolicyHash": "string"
}
```

Response:

```json
{
  "orderId": "string",
  "responseText": "string",
  "responseHash": "string",
  "receipt": {
    "orderId": "string",
    "modelId": "string",
    "requestHash": "string",
    "responseHash": "string",
    "proofHash": "string",
    "inputTokens": 0,
    "outputTokens": 0,
    "verifierSignature": "string"
  }
}
```

## Hard gates

- Reject missing order ID.
- Reject order not funded.
- Reject model mismatch.
- Never log provider API key.
- Never write raw prompt to public trace/log.
- No verifier stub in product source.

## Async development contract

Payment execution calls:

```ts
callSellerProxy({
  orderId,
  offer,
  prompt,
  requestHash
})
```

and receives:

```ts
{
  responseText,
  responseHash,
  receipt
}
```

## Test plan

Commands:

```text
pnpm test:zktls
pnpm test
```

Tests:

- funded-order gate
- no API key leakage
- real zkTLS proof for canonical provider request
- wrong model rejected
- wrong response hash rejected
- valid receipt conforms to `packages/schemas/src/receipts.ts`

## Tasks

1. Implement seller proxy skeleton.
2. Implement funded-order lookup against ProofEscrow or a passed proof of funded order.
3. Implement real provider call through zkTLS client.
4. Implement verifier receipt signing.
5. Implement redaction for logs and traces.
6. Provide a small `pnpm test:zktls` fixture.

## Done when

- `pnpm test:zktls` passes.
- Seller proxy cannot be called before escrow funding.
- Receipt can be consumed by payment execution without schema changes.
