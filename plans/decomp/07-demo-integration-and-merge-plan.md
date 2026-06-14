# Workstream Plan: Demo Integration, Merge, and Submission

## Goal

Integrate the component branches, maintain demo scripts, enforce one-path architecture, and produce submission artifacts.

## Branch

```text
work/demo-integration
```

## Owned files

```text
demo/**
README.md
plans/**
runs/**
tests/e2e/**
tests/static/**
```

## Does not own

```text
contracts/**
packages/hedera/src/*.ts
services/**
apps/web/** business logic
```

## Integration responsibilities

- Maintain the merge order.
- Run anti-debt static scans.
- Produce `demo:health`.
- Produce `demo:judge`.
- Maintain `plans/execution-log.md`.
- Produce final README-as-slides.
- Record live artifact IDs.
- Keep the three-window demo script aligned with implementation.

## Required demo scripts

```text
pnpm demo:seed
pnpm demo:health
pnpm demo:judge
```

If a script does not exist yet, this workstream creates it only after the owning components expose the required functions.

## Three-window demo

Window 1:

```text
apps/web user UI
```

Window 2:

```text
agent dashboard / trace view
```

Window 3:

```text
HashScan, HCS/HFS/Mirror artifacts, terminal logs
```

## Integration test plan

Commands:

```text
pnpm build
pnpm test
pnpm test:e2e
pnpm demo:health
pnpm demo:judge
```

`demo:health` must check:

```text
WSL path is not /mnt/c
Hedera Testnet reachable
Dynamic configured
INF usable
one HCS audit topic configured
one HFS manifest configured
contracts deployed
MCP server running
seller node running
verifier running with real zkTLS mode
x402 facilitator reachable
scheduled transaction capability verified
batch transaction capability verified
no forbidden patterns detected
```

## Merge plan

1. Merge `work/shared-interfaces`.
2. Merge `work/contracts-hedera`.
3. Merge `work/buyer-mcp-agent` after interfaces compile.
4. Merge `work/seller-zktls` after receipt schema stabilizes.
5. Merge `work/payment-execution` after contracts, seller, and MCP boundaries are callable.
6. Merge `work/web-ui-dashboard` when E2E can run against fixtures.
7. Merge `work/demo-integration` last.

## Conflict policy

- Schema conflicts go to shared-interface owner.
- Contract ABI conflicts go to contracts-Hedera owner.
- Execution order conflicts go to payment-execution owner.
- UI cannot resolve backend conflicts by duplicating logic.
- Demo cannot resolve missing integration by adding fallbacks.

## Final submission artifacts

```text
README.md
plans/execution-log.md
runs/order-<id>/summary.json
HashScan links
HCS topic sequence links or Mirror output
HFS manifest file ID
zkTLS proof/receipt card
screen recording
```

## Done when

- All component branches are merged.
- `pnpm build` passes.
- `pnpm test` passes.
- `pnpm test:e2e` passes.
- `pnpm demo:judge` completes one canonical order.
- `pnpm demo:health` is green for the final demo environment or explicitly lists a non-submitted blocker.
