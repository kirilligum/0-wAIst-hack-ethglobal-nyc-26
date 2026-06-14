# Workstream Plan: Buyer MCP Server and Router Agent

## Goal

Implement the real ProofRouter MCP server and Router Agent. Quick Buy selects the cheapest compatible offer. Router Agent receives context and selects a seller without weighted formulas. Both pass a selected offer into the shared execution path owned by the payment execution workstream.

## Branch

```text
work/buyer-mcp-agent
```

## Owned files

```text
services/proofrouter-mcp/**
packages/schemas/src/tools.ts
features/mcp-tools.feature
features/router-agent.feature
features/prompt-history.feature
```

Prompt history files are shared with the web/dashboard team only through exported functions.

## Does not own

```text
contracts/**
packages/hedera/src/dynamic.ts
packages/hedera/src/x402.ts
packages/hedera/src/schedule.ts
packages/hedera/src/batch.ts
services/seller-node/**
services/verifier/**
apps/web/**
```

## Required MCP tools

```text
proofrouter.list_proxy_offers
proofrouter.get_cheapest_offer
proofrouter.get_seller_hedera_history
proofrouter.read_market_manifest
proofrouter.read_hcs_audit_history
proofrouter.get_buyer_prompt_history
proofrouter.build_context_packet
proofrouter.open_order_via_x402
proofrouter.create_refund_schedule
proofrouter.call_seller_proxy
proofrouter.wait_for_zktls_receipt
proofrouter.batch_settle_and_log
proofrouter.get_dynamic_wallet_policy
```

Some tools call into the payment execution workstream. The MCP server owns the tool protocol, not the implementation of Hedera side effects.

## No formula rule

Forbidden in this workstream:

```text
scoreRoutes
route_score
price_weight
privacy_weight
reputation_weight
weighted_score
```

The agent may produce a narrative decision from context. Quick Buy may sort offers by advertised price.

## Async development contract

Expose one call for UI and demo:

```ts
runRouterAgent({
  prompt,
  budgetInf,
  buyerId
}): Promise<AgentDecision>
```

Where:

```ts
type AgentDecision = {
  selectedOfferId: string;
  selectedSeller: string;
  rejected: Array<{ seller: string; reason: string }>;
  decisionSummary: string;
};
```

Do not execute payment inside `runRouterAgent`. Payment execution starts after selected offer is returned.

## Test plan

Commands:

```text
pnpm test:mcp
pnpm test
```

Tests:

- MCP server lists tools.
- MCP client can call `proofrouter.list_proxy_offers`.
- Context packet contains offers, HFS manifest data, Mirror seller history, HCS audit history, and encrypted prompt-history summaries.
- Router Agent returns a valid decision.
- Static scan confirms no formula tokens.

## Tasks

1. Implement tool schemas.
2. Implement MCP server.
3. Implement prompt-history read path and redacted summaries.
4. Implement `build_context_packet`.
5. Implement `get_cheapest_offer`.
6. Implement `runRouterAgent`.
7. Add seeded Alpha/Beta/Gamma scenario.

## Done when

- A real MCP client can list and call tools.
- Router Agent selects Gamma in the seeded sensitive prompt scenario.
- Quick Buy selects Alpha in the seeded cheapest compatible scenario.
- Neither path executes payment directly.
