# Lean BDD/TDD Plan v5: 0-wAIst — AI Subscription De-Re-Seller Router Agent

**Companion document for:** `0-waist-prd-v5.md`  
**Audience:** Codex Desktop running with WSL2 backend  
**Goal:** Implement the PRD with behavior-driven development and test-driven refinements while avoiding overengineering, fallbacks, duplicate logic, and parallel product paths.

---

## 0. Locked decisions under test

```text
1A: Live scheduled refund execution in P0.
2A: One P0 settlement shell after the Chainlink CRE chain-support gate.
3A: HTS INF token for P0 escrow and Quick Buy.
4A: Real zkTLS mandatory in P0, verified only by a deployed Chainlink CRE workflow.
5A: Full Hedera x402 Quick Buy in P0.
6A: Live Dynamic/Fireblocks wallet in P0.
7A: Real MCP server in P0.
8A: Local encrypted prompt-history viewer with summaries and redaction controls in P0.
9A: Chainlink CRE is the only trusted zkTLS verification authority for P0 settlement.
```

All inference orders must use the same product path:

```text
seller selected -> x402 funds ProofEscrow with INF -> scheduled refund created -> seller proxy call -> compact zkTLS proof submitted to Chainlink CRE -> CRE DON verifies proof -> CRE report settles or authorizes ProofEscrow -> HCS audit logs CRE report hash and settlement tx
```

Quick Buy and Router Agent differ only in seller selection.

`CRE_CHAIN_SUPPORT_GATE` must run before coding final settlement. If Chainlink CRE EVM report writes support the target chain, use direct CRE report settlement. If Hedera Testnet is not supported for direct CRE writes, choose one alternate shell before implementation: either a CRE-supported settlement receiver chain, or a CRE-verified receipt registry that authorizes native Hedera Batch settlement. Do not keep both settlement shells live.

---

## 1. Anti-overengineering test doctrine

Tests and static checks must fail on accidental complexity.

Forbidden product-code patterns:

```text
expireOrder
manualRefund
timeoutRefund
forceRefund
settleSequential
settleThenLog
sequential_settle_and_log
scoreRoutes
route_score
price_weight
privacy_weight
reputation_weight
weighted_score
PaymentAdapter
ChainAdapter
FallbackVerifier
demoVerifier
stubVerifier
fakeProof
mockVerifier
LocalVerifier
VerifierService in non-CRE product path
services/verifier in product path
localVerifier
verifierPrivateKey
signReceipt outside cre/
approveVerifier
revokeVerifier
isVerifier
approveLocalVerifier
submitLocalReceipt
nonCreVerifier
nonCreReceipt
creFallback
CRE_SIMULATION_ONLY
creSimulationTrusted
VERIFIER_MODE
MockVerifierService in non-test files
ERC8004AgentRegistryLite
HCS_DECISIONS_TOPIC_ID
HCS_RECEIPTS_TOPIC_ID
HFS_ALPHA_MANIFEST_FILE_ID
HFS_BETA_MANIFEST_FILE_ID
HFS_GAMMA_MANIFEST_FILE_ID
/api/tools duplicate MCP tool path
```

Allowed:

```text
mock CRE report in isolated contract unit tests
CRE workflow simulation tests that cannot satisfy trusted demo acceptance
CRE local trigger tests that cannot satisfy trusted demo acceptance
CRE report fixtures in tests
mock external client in isolated unit tests
one HCS audit topic with typed messages
one HFS market manifest file
explicit clients at external boundaries
```

---

## 2. Required repo shape

```text
0-waist-inference/
  README.md
  package.json
  pnpm-workspace.yaml

  features/
    quick-buy.feature
    router-agent.feature
    proof-escrow.feature
    hedera-primitives.feature
    scheduled-refund.feature
    cre-zktls-verifier.feature
    cre-report-settlement.feature
    dynamic-wallet.feature
    mcp-tools.feature
    prompt-history.feature
    no-prompt-leakage.feature
    demo-readiness.feature

  packages/
    schemas/
      src/offers.ts
      src/orders.ts
      src/receipts.ts
      src/tools.ts
      src/traces.ts
      src/promptHistory.ts
    crypto/
      src/hash.ts
      src/encryption.ts
      src/redaction.ts
    hedera/
      src/contracts.ts
      src/hcs.ts
      src/hfs.ts
      src/hts.ts
      src/mirror.ts
      src/schedule.ts
      src/batch.ts
      src/x402.ts
      src/dynamic.ts
      src/agentKit.ts
      src/guardrails.ts

  contracts/
    src/ProxyRegistry.sol
    src/ProofEscrow.sol
    src/CreReportReceiver.sol
    test/*.test.ts

  cre/
    zktls-verifier/
      project.yaml
      workflow.yaml
      package.json
      tsconfig.json
      main.ts
      src/

  services/
    proofrouter-mcp/
    seller-node/

  apps/
    web/

  demo/
    seed.ts
    runJudgeMode.ts
    healthcheck.ts

  runs/
```

Do not create separate `hedera-tools`, `buyer-agent`, or `prompt-history` services unless the PRD is updated.

---

## 3. Global invariants

### Invariant 1: no plaintext prompt leakage

Public artifacts must not contain raw prompts:

```text
HCS messages
contract calldata/events
public trace files
server logs
README examples
HashScan-visible metadata
HFS manifest
```

Tests:

```ts
expect(hcsPayload).not.toContain(rawPrompt);
expect(publicTrace).not.toContain(rawPrompt);
expect(JSON.stringify(contractEvent)).not.toContain(rawPrompt);
```

### Invariant 2: no formula router

Static checks fail on forbidden formula terms in section 1.

### Invariant 3: same product order path

Both Quick Buy and Router Agent must call the same execution function or workflow, for example:

```ts
executeInferenceOrder(selectedOffer, prompt, budget, modeContext)
```

This function owns:

```text
x402 escrow funding
scheduled refund creation
seller proxy call
submit compact zkTLS proof to CRE
wait for CRE report
settle or authorize settlement from CRE report
HCS CRE audit log
trace writing
```

### Invariant 4: no seller proxy call before escrow funding

```text
seller proxy request is blocked until ProofEscrow order is funded with INF
```

### Invariant 5: no settlement before real proof

```text
settleFromCreReport, or the selected CRE-authorized Hedera Batch path, is blocked until a deployed Chainlink CRE workflow produces a report that binds orderId, requestHash, responseHash, model, token usage, provider endpoint, and proof policy hash.
```

### Invariant 6: one timeout function

Only this function exists:

```solidity
function refundExpired(uint256 orderId) external;
```

### Invariant 7: one audit topic and one market manifest

P0 uses:

```text
HCS_AUDIT_TOPIC_ID
HFS_MARKET_MANIFEST_FILE_ID
```

No required per-event HCS topics or per-seller HFS files.

### Invariant 8: same order ID everywhere

The same `orderId` appears in:

```text
UI
dashboard
Dynamic policy trace
openOrder tx
scheduled refund tx
selected settlement tx
HCS audit message
HFS manifest context
local traces
CRE report
```

---

## 4. Milestone map

Build one vertical slice, not independent feature islands.

```text
M0: Skeleton, shared schemas, static checks, health checks
M1: Contracts and INF escrow semantics
M2: Hedera primitives: HTS, one HCS topic, one HFS manifest, Mirror helper, guardrails
M3: Real MCP server and shared execution workflow
M4: Dynamic + full x402 escrow funding
M5: Seller node and Chainlink CRE zkTLS verifier workflow
M6: Scheduled refund execution
M7: CRE report settlement + HCS audit
M8: Router Agent context and encrypted prompt history
M9: UI, dashboard, README, demo readiness
```

### Implementation status — 2026-06-14

| Milestone | Status | Notes |
|---|---|---|
| M0 | Partial complete | Workspace, shared schemas, static checks, build/test/e2e scripts, and health check are implemented. Health intentionally fails for missing live credentials. |
| M1 | Partial complete | Contract source now compiles and implements INF locking, approved-verifier settlement, unused-INF refund, and the single `refundExpired` timeout entrypoint. Live deployments exist: `ProxyRegistry` `0.0.9226646`, `ProofEscrow` `0.0.9226648`, `VerifierRegistry` `0.0.9226643`. The approved-verifier contract path is now marked as legacy demo scaffolding to be replaced by CRE report receiver/registry semantics. Runtime contract call tests remain open. |
| M2 | Partial complete | Hedera SDK HCS/HFS/HTS helpers exist. Live HCS topic `0.0.9226268`, HFS manifest `0.0.9226269`, HTS `INF` token `0.0.9226625`, and refreshed manifest transaction `0.0.9186037@1781389738.626703938` are visible on Hedera Testnet. Buyer/seller wallet association and funding remain blocked by wallet credentials. |
| M3 | Partial complete | ProofRouter HTTP service, tool registry, and official MCP stdio server exist. MCP client smoke coverage lists and calls tools over the protocol. `proofrouter.publish_seller_offer` uses the shared seller registration handler. `proofrouter.submit_proof_to_cre` now signs a local verifier placeholder receipt when CRE is unavailable, and remains labeled as placeholder evidence. |
| M4 | Partial complete | Dynamic/x402 credentials are present and readiness passes. Hedera SDK helper now ABI-encodes/builds/submits `ProofEscrow.openOrder`, and ProofRouter HTTP/MCP can prepare the exact x402 escrow transaction. Actual buyer wallet execution and INF allowance/funding remain open. |
| M5 | Partial complete | Seller-node service exists and gates `/v1/chat/completions` behind structured escrow evidence headers that include order id, request hash, ProofEscrow target, network, and INF asset. Local verifier EVM signer is generated in ignored `.env` and approved in the live `VerifierRegistry`. Chainlink CRE deploy access is requested but not enabled, no workflow exists, Reclaim has no provider, and trusted CRE/real zkTLS remains blocked. |
| M6 | Partial complete | SDK helper builds and can submit a Hedera Scheduled Transaction targeting `ProofEscrow.refundExpired(orderId)`. Live execution remains blocked until a real funded order exists. |
| M7 | Partial complete | SDK helper ABI-encodes `ProofEscrow.settle`, builds a native Hedera `BatchTransaction` with an HCS receipt message, and exposes readiness in the API/UI for the placeholder demo path. Current CRE discovery says Hedera direct workflow support is false, so trusted live settlement is deferred to the Sepolia CRE settlement plus Hedera audit plan. |
| M8 | Partial complete | Encrypted prompt-history summaries and Router Agent LLM decision path exist. |
| M9 | Partial complete | Frontend, README, and demo scripts exist; dashboard is folded into the first UI for the minimal demo. UI now exposes seller onboarding and `ProofEscrow.openOrder` escrow preparation for registry-backed offers. Hedera Agent Kit package/core plugin readiness is wired through `@hashgraph/hedera-agent-kit`. |

Current verification:

```text
pnpm build      PASS
pnpm test       PASS
pnpm test:e2e   PASS
pnpm demo:deploy PASS with live HTS INF and contract deployments
pnpm demo:verifier PASS with live VerifierRegistry approval as legacy demo scaffolding; not trusted P0 completion evidence
pnpm demo:seed  PASS with real Hedera Testnet HCS activity and HFS manifest refresh
pnpm demo:seller PASS with live ProxyRegistry seller offer transaction 0.0.9186037@1781396121.704889572
pnpm demo:judge PASS with real OpenAI call and Hedera HCS audit
pnpm demo:health PASS for placeholder demo path, with trustedCreReady=false and verification.mode=local-verifier-placeholder
curl /api/hedera-actions PASS locally; seller registry publication ready; x402 order readiness true; proof/settlement readiness uses local verifier placeholder while CRE is blocked
MCP stdio smoke PASS; client lists and calls `proofrouter.list_proxy_offers`
targeted M4/M5 tests PASS for `ProofEscrow.openOrder` encoding, ProofRouter x402 preparation, and seller escrow-evidence enforcement
```

Temporary exception: Chainlink CRE deploy access is requested but not enabled. No CRE workflow exists, no Sepolia receiver/target exists, Reclaim has no provider, and Hedera is not directly listed as a CRE-supported workflow chain. The current executable proof path uses a real approved local verifier signer and `ProofEscrow`-compatible receipt signatures. This is acceptable for continued demo implementation, but it is not trusted CRE completion evidence. Later trusted CRE work should follow `plans/sepolia-cre-settlement-hedera-audit-plan.md`.

---

## 4.1 Direct-Plan Refinements Adopted — 2026-06-13

The uploaded `0-wAIst Direct BDD/TDD Implementation Plan v2.0.0` adds useful verification discipline. The current lean plan remains the implementation source of truth, with these refinements adopted for the remaining phases.

### Execution controls

```text
repair_attempt_limit_per_blocked_external_subtask: 2
reflection_after_failure: one short failure analysis before the next code edit
stop_threshold: stop and request scope/credential guidance when a locked live integration cannot be proven without a forbidden alternate path
checkpoint_rule: commit at coherent phase boundaries and after live Hedera-visible progress
browser_rule: do not block implementation on browser automation while both Codex in-app browser and Chrome bridge are unavailable
```

### Requirement IDs for new tests and evidence

```text
REQ-001 exact product name in README/UI/dashboard/submission text
REQ-002 one canonical executeInferenceOrder path after seller selection
REQ-003 Quick Buy chooses cheapest active compatible offer
REQ-004 Router Agent chooses from context and MCP tools without formula scoring
REQ-005 sellers publish offers through ProxyRegistry
REQ-006 Dynamic/x402 funds ProofEscrow with HTS INF
REQ-007 deployed Chainlink CRE workflow verifies zkTLS proof and produces the only trusted report accepted by settlement
REQ-008 live scheduled transaction targets refundExpired(orderId)
REQ-009 one settlement shell is selected after `CRE_CHAIN_SUPPORT_GATE`: direct CRE report settlement, or CRE-authorized Hedera Batch settlement
REQ-010 UI includes clean user page and technical agent dashboard
REQ-011 no fallback paths, duplicate paths, generic adapters, or hidden formula logic
REQ-012 demo:health fails fast with structured missing-dependency errors
REQ-013 public artifacts never contain plaintext prompts, API keys, auth headers, or private prompt text
REQ-014 Router Agent uses one real ProofRouter MCP server
REQ-015 Dynamic delegated wallet is the live buyer wallet path
REQ-016 one HFS market manifest, one HCS audit topic, and one canonical trace format
REQ-017 every order trace keeps consistent orderId, requestHash, responseHash, proofHash, scheduleId, CRE report hash, settlement transaction ID, and HCS sequence
REQ-018 CRE workflow deployment, target DON, report receiver, gateway, chain selector, and proof/report quota gates pass before trusted demo claim
```

### Verification IDs to use as the command surface grows

```text
TEST-001 static architecture and anti-debt scan
TEST-002 core schemas and ProofEscrow contract behavior
TEST-003 Hedera primitives and artifact resolution
TEST-004 Dynamic x402 escrow funding
TEST-005 Chainlink CRE zkTLS verification
TEST-006 live scheduled refund
TEST-007 CRE report settlement or CRE-authorized Hedera Batch settlement with HCS receipt
TEST-008 MCP Router Agent and encrypted prompt history
TEST-009 canonical UI and execution E2E
TEST-010 submission documentation static check
TEST-011 full verification suite
EVAL-001 seeded Router Agent decision reaches 100% pass without formula tokens
EVAL-002 three consecutive canonical demo runs pass under 180 seconds each
EVAL-003 Hedera artifact completeness reaches 100%
```

Existing commands remain valid while the fuller command aliases are introduced. New tests should include grep-able IDs such as `// TEST-008` when practical.

CRE-specific command aliases should be added only when the matching implementation exists:

```text
pnpm cre:build
pnpm cre:simulate
pnpm cre:deploy
pnpm cre:trigger
pnpm test:cre
pnpm cre:networks
```

CRE-specific tests:

```text
TEST-CRE-001 CRE workflow builds from `cre/zktls-verifier`
TEST-CRE-002 CRE simulation verifies a valid compact proof presentation
TEST-CRE-003 deployed CRE workflow reports active workflowId, DON, gateway, and target
TEST-CRE-004 wrong model is rejected by CRE verification
TEST-CRE-005 wrong responseHash is rejected by CRE verification
TEST-CRE-006 ProofEscrow or selected receiver accepts only a CRE-authenticated report
TEST-CRE-007 local verifier signatures and non-CRE receipts cannot settle
TEST-CRE-008 demo:health fails when only local CRE simulation is configured
TEST-CRE-009 proof input and report payload stay within CRE quota gates
TEST-CRE-010 HCS audit contains CRE report metadata and no plaintext prompt
```

### Trace and artifact contract

The canonical trace directory should converge on this shape as live integrations land:

```text
runs/order-<orderId>/
  request.redacted.json
  offers.json
  manifest.json
  context.json
  decision.json
  x402-escrow.json
  scheduled-refund.json
  cre-proof.redacted.json
  cre-report.json
  cre-settlement.json
  hcs-cre-receipt.json
  summary.json
```

Public trace files may include hashes, summaries, redacted excerpts, transaction IDs, schedule IDs, HCS sequence numbers, CRE workflowId, DON identifier, report hash, report transaction ID, proof policy hash, and report receiver address/account. They must not include plaintext prompts, provider API keys, auth headers, raw TLS transcript data, or private keys.

### Evidence and ADR loop

Maintain `plans/execution-log.md` for bounded phase status, completed steps, quantitative results, failed attempts, deviations, and ADR updates. Add ADR files before final submission for:

```text
ADR-001 one canonical execution path
ADR-002 Chainlink CRE as the only real zkTLS verification authority
ADR-003 HTS INF as the only P0 product asset
ADR-004 x402 funds ProofEscrow, never direct final seller payment
ADR-005 Dynamic delegated wallet path
ADR-006 refundExpired(orderId) as the only timeout function
ADR-007 one CRE-selected settlement shell after chain-support gate
ADR-008 one HCS audit topic and one HFS market manifest
ADR-009 real MCP server as the only agent tool protocol
ADR-010 Router Agent uses context and tools, not formula scoring
ADR-011 encrypted local prompt history and hash-only public artifacts
ADR-012 CRE network support, gateway, and proof/report quota gates
```

### Chainlink CRE plan intake — 2026-06-14

Adopt the Chainlink CRE refinement as follows:

```text
CRE-only verification: accepted. Local verifier signatures, service-level receipt signing, and non-CRE proof acceptance are forbidden in the P0 product path.
Direct CRE settlement: accepted only after `CRE_CHAIN_SUPPORT_GATE` proves the target settlement chain is supported by the CRE EVM write/report capability.
Hedera Batch settlement: retained only as the selected fallback shell if CRE direct writes to Hedera are unsupported and a CRE-authenticated registry/receiver can cryptographically authorize the batch.
CRE simulation: allowed for development tests, never as trusted demo or completion evidence.
Proof packaging: use compact proof presentations or hashes where needed to stay within CRE HTTP input, observation, response, and report payload quotas.
```

Credential update, 2026-06-14:

```text
CRE deploy access status is requested, not enabled.
No CRE workflow exists yet.
Hedera direct CRE workflow support is recorded as false for the current dashboard/CLI state.
Sepolia is the selected supported test chain for the later trusted CRE settlement path.
Captured non-secret CRE values include CRE_DON_ID=zone-a, CRE_GATEWAY_URL=https://01.gateway.zone-a.cre.chain.link, CRE_SUPPORTED_TEST_CHAIN=ethereum-testnet-sepolia, and CRE_SUPPORTED_TEST_CHAIN_SELECTOR=16015286601757825753.
Do not claim direct CRE-to-Hedera settlement. Keep Hedera as HCS audit and HFS market manifest until CRE support changes.
Implementation details for the later path live in plans/sepolia-cre-settlement-hedera-audit-plan.md.
```

### Useful deltas not adopted verbatim

```text
HCS message naming: the direct plan says DECISION/SCHEDULE/RECEIPT, while the current PRD/schema already allow DECISION/RECEIPT/TIMEOUT/SETTLEMENT. Do not remove existing message types midstream; add CRE_RECEIPT for CRE report audit evidence and consider adding SCHEDULE as a typed alias when scheduled-refund trace work lands.
Repository shape: keep the current pnpm workspace packages/services/apps layout instead of moving files into a flat src/ tree.
Hardhat: do not add Hardhat solely because the direct plan mentions it; add it only if local Solidity runtime tests need it beyond the current solc compile coverage.
```

---

# M0. Skeleton, schemas, and health checks

## BDD

```gherkin
Feature: Project skeleton
  Scenario: Developer can run standard commands
    Given the repo is checked out in WSL2
    When the developer runs pnpm install, pnpm build, pnpm test, and pnpm demo:health
    Then the workspace builds
    And demo:health fails loudly for missing real integrations
```

## TDD tasks

1. Create pnpm workspace.
2. Create shared schemas for offers, orders, receipts, tools, traces, and prompt history.
3. Create static checks for forbidden terms.
4. Add `demo:health` with structured missing-dependency output.
5. Maintain `plans/execution-log.md` for phase evidence and blocked external integrations.
6. Add command aliases for `test:static`, `test:contracts`, `test:hedera`, `test:mcp`, `test:zktls`, eval commands, and `verify:all` as those suites become real.

## Done when

```text
pnpm install
pnpm build
pnpm test
pnpm demo:health
```

run successfully, with `demo:health` failing only for intentionally missing external env vars before setup.

---

# M1. Contracts and INF escrow semantics

## BDD

```gherkin
Feature: Proof-gated INF escrow
  Scenario: Seller is paid only after a valid CRE report
    Given a seller has published an offer
    And a buyer has funded ProofEscrow with INF through the order path
    When the selected settlement shell receives a CRE-authenticated report matching the order
    Then ProofEscrow settles INF to the seller
    And refunds unused INF to the buyer

  Scenario: Wrong CRE report cannot settle
    Given an open order
    When a report has the wrong modelId or responseHash
    Then settle reverts
```

## Contract TDD

### ProxyRegistry

```text
publishOffer stores seller/model/provider/prices
only seller can update own offer
deactivateOffer prevents active selection by callers
hfsManifestFileIdHash is stored
```

### CRE report receiver/registry

```text
stores accepted CRE workflowId, DON identifier, report receiver, and proof policy hash
rejects reports from unconfigured workflow/DON/receiver
rejects arbitrary local verifier signatures
does not expose approveVerifier, revokeVerifier, or isVerifier product paths
non-owner cannot mutate CRE configuration
```

### ProofEscrow

```text
openOrder locks INF in escrow
openOrder snapshots offer price
settle verifies CRE report or selected CRE-authorized registry state
settle rejects mismatched orderId/buyer/seller/hash
settle computes payment from token counts and snapshotted price
settle pays seller INF and refunds unused INF
refundExpired refunds only after deadline
refundExpired rejects settled order
no expireOrder function exists
```

## Done when

Contract tests pass and ABIs are exported without duplicated type definitions.

---

# M2. Hedera primitives with one topic and one manifest

## BDD

```gherkin
Feature: Hedera primitives
  Scenario: Demo seed creates minimal Hedera state
    Given the demo seed runs on Hedera Testnet
    Then the INF token exists
    And buyer and seller accounts are associated with INF
    And one HCS audit topic exists
    And one HFS market manifest exists
    And Mirror Node can read seller history
```

## TDD tasks

### `packages/hedera/src/hts.ts`

```text
createOrLoadInfToken returns token ID
associateInfToken associates required accounts
transferInf records transaction ID
product code rejects HBAR settlement asset
```

### `packages/hedera/src/hcs.ts`

```text
createOrLoadAuditTopic returns topic ID
submitAuditMessage accepts typed DECISION/RECEIPT/TIMEOUT/SETTLEMENT/CRE_RECEIPT messages
submitAuditMessage rejects raw prompt/response fields
returns sequence number
```

### `packages/hedera/src/hfs.ts`

```text
createOrLoadMarketManifest returns file ID
readMarketManifest validates schema
manifest includes sellers, x402 endpoints, MCP endpoint, audit topic, proof policy, payment asset INF, CRE workflowId, CRE workflow name, CRE gateway URL, CRE target, CRE chain selector name, CRE report receiver, proof policy hash, and DON identifier
```

### `packages/hedera/src/mirror.ts`

```text
query seller settlement events
query audit topic messages
return plain-language seller history summary
return no formula score
```

### `packages/hedera/src/guardrails.ts`

```text
blocks spend above Dynamic policy
blocks unknown contract calls
blocks plaintext HCS message
blocks proxy call before escrow funding
blocks settlement before CRE report or selected CRE-authorized registry state
```

## Done when

`pnpm demo:seed` creates/loads INF, one audit topic, and one market manifest; no extra P0 topic/file env vars are required.

---

# M3. Real MCP server and shared execution workflow

## BDD

```gherkin
Feature: ProofRouter MCP tools
  Scenario: Product actions go through MCP
    Given the ProofRouter MCP server is running
    When an MCP client lists tools
    Then all required ProofRouter tools are advertised
    When Quick Buy and Router Agent execute an order
    Then both use the same executeInferenceOrder workflow after seller selection
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
proofrouter.submit_proof_to_cre
proofrouter.wait_for_cre_report
proofrouter.settle_from_cre_report
proofrouter.log_cre_settlement_audit
proofrouter.get_dynamic_wallet_policy
```

## Tests

```text
tool schemas validate inputs and outputs
MCP server advertises required tools
tool errors include code, message, and orderId when relevant
MCP smoke test can call list_proxy_offers
Quick Buy and Router Agent share executeInferenceOrder after seller selection
no HTTP-only substitute is used for P0
```

## Done when

A real MCP client can list and call tools, and product actions do not bypass MCP.

---

# M4. Dynamic + full x402 escrow funding

## BDD

```gherkin
Feature: x402 funds ProofEscrow with INF
  Scenario: Buyer funds an order through x402
    Given the buyer Dynamic wallet has INF
    And a seller proxy returns HTTP 402 Payment Required
    When the buyer pays through Hedera x402
    Then ProofEscrow opens and locks INF
    And the seller proxy is allowed to serve only after the funded order exists
```

## TDD tasks

```text
Dynamic session present validation
INF balance/association validation
policy budget validation
seller returns 402 when no payment/order exists
402 payload includes escrowContract, INF asset, offerId, requestHash, proofMode
x402 payment opens/funds ProofEscrow
seller rejects invalid x402 payment
seller serves after escrow funding is confirmed
```

Status:

- [x] `packages/hedera` has typed `ProofEscrow.openOrder` calldata, transaction builder, readiness check, and submit helper.
- [x] `proofrouter.open_order_via_x402` and `POST /api/orders/open-via-x402` prepare the exact `openOrder` call for a numeric on-chain `offerId`.
- [x] Live submission path blocks unless the configured Hedera signer is explicitly confirmed as the buyer wallet.
- [ ] Dynamic delegated buyer execution, INF allowance, and x402-funded `ProofEscrow.openOrder` remain open.
- [ ] Full funded-order lookup before seller serve remains open.

## Done when

Quick Buy can fund ProofEscrow through x402 with INF and receive an order ID.

---

# M5. Seller node and Chainlink CRE zkTLS verifier workflow

## BDD

```gherkin
Feature: Chainlink CRE zkTLS verification
  Scenario: Seller response is verified by CRE before settlement
    Given an INF-funded ProofEscrow order exists
    When the seller proxy calls the LLM provider
    Then the seller produces a compact zkTLS proof presentation bound to orderId, requestHash, and responseHash
    And the proof is submitted to the deployed Chainlink CRE workflow
    And the CRE DON validates provider host, endpoint, model, status, tokens, response hash, and order binding
    And the CRE workflow emits the only report accepted by settlement
```

## TDD tasks

### Seller node

```text
rejects missing escrow order
calls shared runVerifiedInference
binds orderId/requestHash into provider request
redacts API key and private prompt in logs/traces
submits compact proof material to Chainlink CRE
never calls the LLM from the CRE workflow
never sends plaintext prompt, API key, or raw auth header to public artifacts
```

Status:

- [x] `services/seller-node` package added with `/health`, `/x402`, and `/v1/chat/completions`.
- [x] Missing payment/escrow evidence returns HTTP 402 with Hedera `INF` x402 challenge details.
- [x] Seller proxy now rejects a bare order id and requires structured escrow evidence headers for order id, request hash, ProofEscrow target, network, and `INF`.
- [x] LiteLLM-compatible upstream path uses `LITELLM_BASE_URL`/`LITELLM_API_KEY`; OpenAI direct path is available when seller uses `OPENAI_API_KEY`.
- [x] Seller publication path added to API, MCP, frontend, and `pnpm demo:seller`.
- [x] Live `ProxyRegistry.publishOffer` transaction succeeded for `registryOfferId=1`.
- [ ] Seller-node escrow confirmation still needs real funded `ProofEscrow` order lookup before serving in full P0 mode.
- [ ] `runVerifiedInference`, compact zkTLS proof generation, and CRE submission remain blocked until zkTLS provider policy/credentials and CRE workflow configuration are ready.

### CRE zkTLS workflow

```text
builds from `cre/zktls-verifier`
simulates locally for development only
deploys to a real CRE DON before trusted demo acceptance
verifies TLS proof origin
verifies endpoint
verifies model
verifies token usage fields
verifies responseHash
verifies orderId/requestHash binding
emits CRE report with workflowId, donId, proofHash, requestHash, responseHash, token usage, and model
rejects wrong model
rejects wrong response hash
rejects unverified proof
rejects oversized proof input/report payloads
```

## Done when

No P0 settlement can occur without a report from the configured deployed Chainlink CRE workflow. Local CRE simulation may pass tests, but cannot satisfy trusted demo completion.

---

# M6. Scheduled refund execution

## BDD

```gherkin
Feature: Scheduled refund execution
  Scenario: Expired order is refunded through scheduled transaction
    Given an INF-funded order is Open
    And the deadline passes without settlement
    When the Hedera Scheduled Transaction targeting refundExpired(orderId) executes
    Then the order becomes Refunded
    And buyer receives the locked INF balance
```

## TDD tasks

```text
create scheduled transaction targeting ProofEscrow.refundExpired(orderId)
record schedule ID in trace
verify scheduled execution on Hedera Testnet
verify ProofEscrow status becomes Refunded
verify no manual refund demo function exists
```

## Done when

The timeout path is demonstrated through real scheduled execution, or P0 fails.

---

# M7. CRE report settlement + HCS audit

## BDD

```gherkin
Feature: CRE-authenticated settlement
  Scenario: CRE report settles or authorizes settlement and logs receipt
    Given an INF-funded order has a real CRE report from the configured workflow
    And CRE_CHAIN_SUPPORT_GATE selected exactly one settlement shell
    When the MCP tools settle from the CRE report and log the audit message
    Then ProofEscrow settles INF to the seller
    And a CRE_RECEIPT message is written to the HCS audit topic
    And the order becomes Settled
```

## TDD tasks

```text
run CRE_CHAIN_SUPPORT_GATE before settlement implementation
verify CRE EVM write/report support for the configured chain selector
if direct CRE report writes are supported, implement settleFromCreReport/onReport only
if direct CRE writes to Hedera are unsupported, implement CRE-authenticated registry/receiver plus native Hedera Batch only
do not keep both settlement shells active after the gate
reject settlement without a configured CRE workflow report
reject local verifier signatures and non-CRE receipts
reject plaintext fields in HCS audit messages
record CRE report hash, report tx hash when present, settlement transaction ID, and HCS sequence
verify HCS CRE_RECEIPT message sequence exists
```

## Done when

Settlement and HCS audit log are visible in the selected CRE-authenticated shell. The demo copy must not claim trusted CRE settlement if only local simulation is configured.

---

# M8. Router Agent context and encrypted prompt history

## BDD

```gherkin
Feature: Router Agent chooses from context
  Scenario: Agent rejects a cheaper overexposed seller
    Given Alpha is cheapest but new
    And Beta is cheap and reputable but saw related prompt history
    And Gamma is more expensive but reputable and low-exposure
    And the prompt is sensitive
    When the Router Agent receives the context packet through MCP
    Then the agent selects Gamma
    And the agent explains why Alpha and Beta were rejected
    And no route formula or weighted score is used
    And the shared inference order path executes
```

## TDD tasks

```text
encrypted prompt-history read/write
summaries default visible
redacted excerpt reveal works
context packet includes prompt history summaries
agent decision schema validates
static formula checks pass
Router Agent uses executeInferenceOrder after selection
```

## Done when

Router Agent chooses Gamma from seeded context and uses the same order execution workflow as Quick Buy.

---

# M9. UI, dashboard, README, demo readiness

## BDD

```gherkin
Feature: Three-window demo readiness
  Scenario: Judge can see simple UI, agent internals, and real Hedera proof
    Given the demo is seeded
    When the presenter opens the user UI, dashboard, and external proof tools
    Then the user UI is simple
    And the dashboard shows context/tool/proof details
    And external tools show HashScan/HCS/HFS/Mirror artifacts
    And the same orderId appears everywhere
```

## UI tests

### User UI

```text
renders product name exactly
shows Quick Buy and Router Agent modes
shows budget input and run button
does not render raw transaction hashes
shows selected route/proof/payment status
```

### Agent dashboard

```text
shows order ID
shows context summary
shows candidate sellers
shows agent decision
shows MCP timeline
shows Dynamic policy status
shows encrypted prompt-history viewer
shows CRE zkTLS report card
shows Hedera action checklist
```

## README tests

```text
README contains product name
README contains one shared product path
README contains Mermaid architecture and sequence diagrams
README contains Hedera usage section
README or docs contain ADR index matching implemented behavior
README does not claim unsupported fallback or future behavior as complete
```

---

## 5. Demo health check

`pnpm demo:health` must verify:

```text
WSL path is not /mnt/c
required env vars are present
Hedera Testnet reachable
Dynamic configured
INF token ID configured and usable
one HCS audit topic configured
one HFS market manifest configured
contracts deployed
MCP server running
seller node running
CRE CLI installed and authenticated
CRE workflow builds
CRE workflow deployed and active for trusted demo
CRE workflowId, DON identifier, gateway, target, and proof policy hash configured
CRE_CHAIN_SUPPORT_GATE passes or records the selected fallback settlement shell
CRE proof input and report payload quota gates pass
x402 facilitator reachable
scheduled transaction capability verified
selected settlement capability verified
no forbidden files/functions/patterns detected
```

Failure output must be structured JSON plus human-readable summary.

Example:

```json
{
  "status": "fail",
  "missing": ["CRE_WORKFLOW_ID", "ZKTLS_PROVIDER_POLICY_ID"],
  "blockedFeature": "cre-zktls",
  "message": "P0 cannot run without deployed CRE zkTLS verification configuration."
}
```

---

## 6. Acceptance test matrix

| Area | Required proof |
|---|---|
| Quick Buy | Alpha chosen; x402 INF funds ProofEscrow; scheduled refund created; CRE zkTLS report; selected CRE-authenticated settlement |
| Router Agent | Gamma chosen from context; no formula patterns; same product path used |
| Escrow | Open -> Settled and Open -> Refunded paths verified |
| Scheduled refund | real scheduled transaction execution on Hedera Testnet |
| CRE settlement | direct CRE report settlement or CRE-authorized Hedera Batch settlement, with HCS CRE_RECEIPT log |
| HTS | INF used for every product payment |
| HCS | one audit topic with hash-only messages |
| HFS | one market manifest read by MCP |
| Mirror Node | seller history included in context packet |
| Dynamic | live wallet/delegation signs required action |
| MCP | product actions use real MCP server |
| zkTLS | real proof material required before CRE report acceptance |
| Chainlink CRE | deployed workflow/DON/gateway configured; local simulation is not trusted completion evidence |
| Prompt history | encrypted local store; no public raw prompt leakage |
| README | demo docs match actual behavior |

---

## 7. BDD-to-demo mapping

The 3-minute demo should show:

```text
1. README top section with one shared product path.
2. User UI Quick Buy selects Alpha.
3. Dynamic/x402 funds ProofEscrow with INF.
4. Router Agent context shows Alpha/Beta/Gamma.
5. Agent decision selects Gamma without formula score.
6. Scheduled refund transaction is shown for timeout path.
7. Seller proxy serves request after escrow funding.
8. CRE zkTLS report card verifies workflow/DON/provider/model/tokens/hash.
9. Selected CRE-authenticated settlement plus HCS CRE_RECEIPT log is shown externally.
10. Final response appears in user UI.
```

---

## 8. Final Codex instruction

Implement the smallest direct system that passes these behaviors. Do not create fallback paths, extra adapters, optional integration branches, duplicated schemas, duplicate services, formula routing, local verifier trust, or performance-specific complexity. If a required external dependency is not working, make the failure explicit in tests and `pnpm demo:health`.
