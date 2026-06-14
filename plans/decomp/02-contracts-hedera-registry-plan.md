# Workstream Plan: Contracts and Hedera Registry

## Goal

Implement and verify the onchain market substrate: seller offers, proof-gated escrow, verifier registry, HTS INF token, one HCS audit topic, one HFS market manifest, and Mirror Node seller history.

## Branch

```text
work/contracts-hedera
```

## Owned files

```text
contracts/src/ProxyRegistry.sol
contracts/src/ProofEscrow.sol
contracts/src/VerifierRegistry.sol
contracts/test/*.test.ts
packages/hedera/src/contracts.ts
packages/hedera/src/hts.ts
packages/hedera/src/hcs.ts
packages/hedera/src/hfs.ts
packages/hedera/src/mirror.ts
demo/seed.ts
```

## Does not own

```text
services/proofrouter-mcp/**
services/seller-node/**
services/verifier/**
apps/web/**
packages/schemas/**
packages/crypto/**
```

## Component boundary

Export concrete Hedera helpers:

```ts
deployOrLoadContracts()
createOrLoadInfToken()
createOrLoadAuditTopic()
createOrLoadMarketManifest()
readMarketManifest()
getSellerHederaHistory()
```

Do not create `ChainAdapter`, `PaymentAdapter`, or multi-chain abstractions.

## Contract requirements

### ProxyRegistry

- `publishOffer`
- `updateOffer`
- `deactivateOffer`
- event: `OfferPublished`
- event: `OfferUpdated`

### ProofEscrow

- `openOrder`
- `settle`
- `refundExpired`
- event: `OrderOpened`
- event: `OrderSettled`
- event: `OrderRefunded`

### VerifierRegistry

- approved verifier support only as required by the current plan.
- no fallback verifier mode.

## Async development contract

Payment and seller teams depend on:

```text
contract addresses
ABI files
HTS INF token ID
HCS audit topic ID
HFS market manifest file ID
```

Write them into a single generated config:

```text
config/hedera.generated.json
```

## Test plan

Component command:

```text
pnpm test:contracts
pnpm demo:deploy
pnpm demo:seed
```

Minimum tests:

- contract compile
- `refundExpired` is the only timeout function
- `settle` rejects wrong model/response hash/signature
- HTS INF exists and is used in generated config
- one HCS topic exists
- one HFS manifest exists
- Mirror helper returns a seller history summary with no score formula

## Tasks

1. Complete runtime contract call tests.
2. Confirm deployed contract IDs are current.
3. Ensure INF token association and funding path is documented for buyer/seller accounts.
4. Ensure HFS manifest includes:
   - contract addresses
   - INF token ID
   - HCS audit topic ID
   - seller offers
   - MCP endpoint
   - x402 metadata
   - proof policy hash
5. Provide fixtures for the payment execution workstream.

## Done when

- `pnpm test:contracts` passes.
- `pnpm demo:deploy` passes.
- `pnpm demo:seed` passes.
- `config/hedera.generated.json` contains exactly one INF token, one HCS topic, and one HFS manifest.
