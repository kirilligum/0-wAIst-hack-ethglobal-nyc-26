# Branching and Multi-Agent Coordination

## Branch list

```text
main
integration/demo-cut
work/shared-interfaces
work/contracts-hedera
work/buyer-mcp-agent
work/seller-zktls
work/payment-execution
work/web-ui-dashboard
work/demo-integration
```

## Worktree setup

Recommended local worktree layout:

```bash
git worktree add ../0-waist-shared work/shared-interfaces
git worktree add ../0-waist-contracts work/contracts-hedera
git worktree add ../0-waist-buyer work/buyer-mcp-agent
git worktree add ../0-waist-seller work/seller-zktls
git worktree add ../0-waist-payment work/payment-execution
git worktree add ../0-waist-web work/web-ui-dashboard
git worktree add ../0-waist-demo work/demo-integration
```

## Commit conventions

```text
shared: freeze offer/order/receipt schemas
contracts: add ProofEscrow refundExpired tests
hedera: seed INF/HCS/HFS artifacts
buyer: add MCP tool list
seller: add funded-order proxy gate
payment: implement x402 escrow funding
web: add dashboard trace card
demo: add health gate for batch settlement
```

## Merge readiness checklist

Every PR must include:

```text
Owned files only
No forbidden product-code patterns
At least one relevant command output
No plaintext prompt/API key leakage
No duplicated schema or execution logic
No new env var unless documented in .env.example
```

## Cross-workstream handoff format

```text
Branch:
Owner:
Ready for:
Blocked by:
Changed interfaces:
Commands run:
Artifacts produced:
Next recommended step:
```

## Conflict prevention

- Do not modify `packages/schemas/**` outside `work/shared-interfaces`.
- Do not modify `contracts/**` outside `work/contracts-hedera`.
- Do not modify `executeInferenceOrder` outside `work/payment-execution`.
- Do not add a new public API path for MCP tools.
- Do not add `*_TOPIC_ID` or `*_MANIFEST_FILE_ID` variables for per-seller artifacts.
- Do not add fallback code to let demos pass.

## Conflict resolution

1. If schema/ABI changed, update shared fixtures first.
2. If a dependency is blocked, stop and report blocker; do not add a fallback.
3. If two branches need the same file, split ownership by function and create a small interface PR first.
4. If tests conflict, prefer keeping the stricter no-fallback/no-leakage test.

## Async check-in cadence

Every 60–90 minutes, each agent updates `plans/execution-log.md` with:

```text
last command
current blocker
owned files changed
next file to edit
merge risk
```
