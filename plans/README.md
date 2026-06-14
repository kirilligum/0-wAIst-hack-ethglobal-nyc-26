# Parallel Plan Files for 0-wAIst

Use these files with Codex Desktop agents working in WSL2 worktrees.

## Read order

1. `00-master-parallel-plan.md`
2. `08-branching-and-agent-coordination.md`
3. The component plan for the assigned branch.

## Component plans

- `01-shared-interfaces-plan.md`
- `02-contracts-hedera-registry-plan.md`
- `03-buyer-mcp-router-agent-plan.md`
- `04-seller-node-zktls-plan.md`
- `05-payment-execution-plan.md`
- `06-web-ui-dashboard-plan.md`
- `07-demo-integration-and-merge-plan.md`

## Integration rule

Selection may differ. Execution cannot differ.

```text
Quick Buy selects cheapest compatible offer.
Router Agent selects seller from context.
Both call the same canonical execution path.
```

## Do not add

```text
fallbacks
legacy paths
mock verifier in product code
formula router
duplicate API paths
generic adapters
extra HCS topics
extra HFS manifests
alternate settlement path
```
