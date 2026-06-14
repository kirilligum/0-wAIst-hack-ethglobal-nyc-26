# Sepolia CRE Settlement + Hedera Audit Plan

## Goal

Build the practical live-path integration where Chainlink CRE verifies and settles 0-wAIst orders on a CRE-supported EVM testnet, while Hedera remains the immutable audit and marketplace data layer.

This is the recommended option because Chainlink CRE does not currently list Hedera as a directly supported workflow chain, but it does list Sepolia as a supported test chain. The product story becomes:

`seller selection -> x402-funded ProofEscrow lock on Sepolia -> scheduled refund window -> seller proxy call -> Reclaim/CRE verification -> Sepolia settlement -> Hedera HCS audit`

Hedera is not removed. It owns public audit and manifest anchoring:

- `HCS_AUDIT_TOPIC_ID`: hash-only order/proof/settlement audit events.
- `HFS_MARKET_MANIFEST_FILE_ID`: public market/seller manifest.

## Non-goals

- Do not claim CRE directly settles on Hedera.
- Do not add a Hedera fallback verifier.
- Do not add a fake proof verifier or demo verifier.
- Do not add an HBAR payment fallback.
- Do not add a duplicate settlement path.
- Do not rename the canonical refund function: `refundExpired(uint256 orderId)`.
- Do not add duplicate HCS topics or per-seller HFS manifests.

## Current known state

Captured non-secret CRE values:

```dotenv
CRE_ORGANIZATION_ID=org_nrrLxzUpfXMi7kRe
CRE_DEPLOY_ACCESS_STATUS=requested
CRE_DERIVED_WORKFLOW_OWNER=b94422f7538773a7c1ca21ea231ef0eef38ec29a
CRE_DEFAULT_DON_FAMILY=zone-a
CRE_PRIVATE_REGISTRY_ID=private
CRE_ONCHAIN_REGISTRY_ID=onchain:ethereum-mainnet
CRE_ONCHAIN_REGISTRY_ADDRESS=0x4Ac54353FA4Fa961AfcC5ec4B118596d3305E7e5
CRE_HEDERA_DIRECT_SUPPORTED=false
CRE_SUPPORTED_TEST_CHAIN=ethereum-testnet-sepolia
CRE_SUPPORTED_TEST_CHAIN_SELECTOR=16015286601757825753
CRE_SUPPORTED_TEST_FORWARDER=0xF8344CFd5c43616a4366C34E3EEE75af79a74482
CRE_DON_ID=zone-a
CRE_GATEWAY_URL=https://01.gateway.zone-a.cre.chain.link
```

Still pending:

```dotenv
CRE_WORKFLOW_ID=
CRE_TARGET=
CRE_CHAIN_SELECTOR=
CRE_REPORT_RECEIVER=
CRE_SETTLEMENT_SHELL=
RECLAIM_PROVIDER_ID=
ZKTLS_VERIFIER_URL=
ZKTLS_PROVIDER_POLICY_ID=
```

Reasons pending:

- Chainlink CRE deployment access has been requested but is not approved yet.
- No CRE workflow exists yet.
- No Sepolia report receiver or escrow target has been deployed yet.
- Reclaim has no provider configured yet.

## Target architecture

### Runtime services

`services/proofrouter-mcp` remains the canonical order workflow owner.

It should coordinate:

1. Seller selection.
2. Order creation.
3. x402-funded lock against the Sepolia `ProofEscrow` path.
4. Seller proxy call.
5. Reclaim proof collection or verification input preparation.
6. CRE workflow invocation or report submission.
7. Settlement result handling.
8. Hedera HCS audit emission.

`services/seller-node` remains the seller endpoint implementation and should not gain settlement policy.

### Contracts

Sepolia owns the live escrow/settlement contract path.

Required contract behavior:

- Lock an order against a buyer-funded escrow balance.
- Accept a valid CRE report from the configured receiver/forwarder path.
- Release seller payment when the report verifies the expected order facts.
- Preserve `refundExpired(uint256 orderId)` as the canonical refund function.
- Emit enough event data for the router service to write a hash-only Hedera audit event.

### Chainlink CRE

CRE owns verification and settlement authorization on Sepolia.

Target responsibilities:

- Verify the Reclaim zkTLS proof material or proof-derived claim bundle.
- Bind the proof to:
  - `orderId`
  - seller id/address
  - provider/model identity
  - prompt/request hash
  - response hash
  - token/cost facts required for settlement
- Submit or authorize settlement against the Sepolia receiver.

### Hedera

Hedera owns public auditability, not CRE settlement.

HCS audit event should include only public/hash-safe fields:

- order id
- route id
- seller id
- buyer public identifier or hash
- Sepolia chain selector
- Sepolia escrow/receiver address
- transaction hash
- proof/report hash
- response hash
- settlement status
- timestamp

HFS market manifest should continue to describe the available sellers/providers without embedding secrets or private prompts.

## Environment model

### Required Sepolia variables

Add or confirm these in `.env.example` and `.env` once values exist:

```dotenv
SEPOLIA_RPC_URL=
SEPOLIA_CHAIN_ID=11155111
SEPOLIA_DEPLOYER_PRIVATE_KEY=
SEPOLIA_PROOF_ESCROW_ADDRESS=
SEPOLIA_REPORT_RECEIVER_ADDRESS=
SEPOLIA_X402_ASSET_ADDRESS=
```

Notes:

- `SEPOLIA_DEPLOYER_PRIVATE_KEY` is a secret and must never be committed.
- `SEPOLIA_PROOF_ESCROW_ADDRESS` becomes the concrete Sepolia escrow target.
- `SEPOLIA_REPORT_RECEIVER_ADDRESS` becomes the contract CRE reports into or authorizes through.

### Required CRE variables

Set these only after deployment/access is available:

```dotenv
CRE_WORKFLOW_ID=
CRE_TARGET=
CRE_CHAIN_SELECTOR=16015286601757825753
CRE_REPORT_RECEIVER=
CRE_SETTLEMENT_SHELL=
```

Mapping:

- `CRE_CHAIN_SELECTOR`: Sepolia selector `16015286601757825753`.
- `CRE_TARGET`: Sepolia target contract or workflow target address, depending on final CRE wiring.
- `CRE_REPORT_RECEIVER`: Sepolia report receiver contract address.
- `CRE_SETTLEMENT_SHELL`: workflow artifact/path/name used by the CLI or deployment scripts.

### Existing Hedera variables

Keep these as required for the audit layer:

```dotenv
HEDERA_NETWORK=
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HCS_AUDIT_TOPIC_ID=
HFS_MARKET_MANIFEST_FILE_ID=
```

## Implementation phases

## Phase 1: Make the architecture explicit

Files likely touched:

- `.env.example`
- `plans/browser-credential-followup-plan.md`
- `plans/credential-acquisition-plan.md`
- `plans/execution-log.md`
- README or demo docs if they currently imply Hedera-native CRE settlement.

Tasks:

- Document Sepolia as the CRE settlement chain.
- Document Hedera as the HCS/HFS audit and manifest layer.
- Mark `CRE_HEDERA_DIRECT_SUPPORTED=false`.
- Ensure no docs claim direct CRE-to-Hedera settlement.
- Keep audit-only Hedera demo language clearly separate from the full CRE settlement path.

Acceptance criteria:

- A new developer can tell which chain settles and which chain audits.
- No public artifact claims Hedera is CRE-supported.
- Pending values are explicitly tied to deploy approval and contract deployment.

## Phase 2: Deploy Sepolia escrow and report receiver

Files likely touched:

- `contracts/`
- `contracts/test/`
- `demo/`
- `.env.example`

Tasks:

- Confirm or implement `ProofEscrow` for Sepolia.
- Confirm or implement a CRE-compatible report receiver.
- Preserve `refundExpired(uint256 orderId)`.
- Add constructor/config for the authorized CRE forwarder/receiver path.
- Add event fields needed for HCS audit mirroring.
- Add deployment script for Sepolia.
- Add minimal contract tests for:
  - funded order lock
  - valid settlement
  - expired refund
  - unauthorized report rejection
  - duplicate settlement rejection

Acceptance criteria:

- Sepolia contract addresses are available.
- `.env` can be filled with:
  - `SEPOLIA_PROOF_ESCROW_ADDRESS`
  - `SEPOLIA_REPORT_RECEIVER_ADDRESS`
- The router can identify the Sepolia transaction hash for HCS audit.

## Phase 3: Wire ProofRouter to Sepolia settlement

Files likely touched:

- `services/proofrouter-mcp/src/`
- `packages/schemas/src/`
- `packages/hedera/src/`
- `packages/crypto/src/`

Tasks:

- Add a single settlement adapter for the Sepolia CRE path.
- Do not add generic payment adapters unless needed by this path.
- Ensure Quick Buy and Router Agent share the same order execution workflow after seller selection.
- Add order state fields for:
  - Sepolia escrow address
  - Sepolia transaction hash
  - CRE workflow id
  - CRE report hash
  - HCS audit transaction/status
- Keep private prompts, auth headers, API keys, and raw proof secrets out of logs and HCS payloads.

Acceptance criteria:

- Both Quick Buy and Router Agent call the same settlement workflow.
- Seller selection policy is the only intended behavioral difference.
- HCS audit receives the hash-only settlement result after Sepolia settlement.

## Phase 4: Create and deploy the CRE workflow

Files likely touched:

- `services/proofrouter-mcp/`
- `demo/`
- `plans/credential-acquisition-plan.md`
- `.env.example`
- `.env`

Prerequisite:

- `CRE_DEPLOY_ACCESS_STATUS` is approved.

Tasks:

- Create the CRE workflow project/artifact.
- Configure the workflow for Sepolia:
  - chain selector `16015286601757825753`
  - report receiver address
  - authorized forwarder/receiver path
- Bind workflow verification to Reclaim proof fields.
- Deploy the workflow.
- Fill:
  - `CRE_WORKFLOW_ID`
  - `CRE_TARGET`
  - `CRE_CHAIN_SELECTOR=16015286601757825753`
  - `CRE_REPORT_RECEIVER`
  - `CRE_SETTLEMENT_SHELL`

Acceptance criteria:

- `cre workflow list --output json` returns the deployed workflow.
- The workflow id is recorded in `.env`.
- The workflow can produce or authorize the settlement report used by the Sepolia receiver.

## Phase 5: Configure Reclaim provider

Files likely touched:

- `.env.example`
- `.env`
- `services/proofrouter-mcp/src/`
- `plans/credential-acquisition-plan.md`

Tasks:

- Create the Reclaim provider for the seller LLM response facts.
- Avoid arbitrary target URLs that do not prove the seller response.
- Fill:
  - `RECLAIM_PROVIDER_ID`
  - `ZKTLS_VERIFIER_URL`
  - `ZKTLS_PROVIDER_POLICY_ID`
- Add policy documentation for what the proof proves.

Acceptance criteria:

- Reclaim proof binds to the same order facts CRE uses.
- The proof does not expose private prompts, API keys, auth headers, or raw seller secrets.

## Phase 6: End-to-end demo path

Files likely touched:

- `demo/`
- `apps/web/src/`
- `services/proofrouter-mcp/src/`

Tasks:

- Add one curated demo command for the full path:
  - start services
  - create order
  - fund Sepolia escrow
  - call seller
  - verify through Reclaim/CRE
  - settle on Sepolia
  - write Hedera HCS audit
  - show final status in web UI
- Keep the existing Hedera audit-only smoke path as a clearly labeled fallback, not as the primary settlement story.

Acceptance criteria:

- Demo output includes:
  - order id
  - seller id
  - Sepolia settlement tx hash
  - CRE workflow/report id or hash
  - Hedera HCS audit transaction/id
  - final order status
- The web UI can explain the split:
  - Sepolia settled by CRE.
  - Hedera stores public audit and manifest records.

## Risk register

| Risk | Impact | Mitigation |
|---|---:|---|
| CRE deploy access remains pending | Blocks live CRE workflow | Keep Hedera audit-only demo as fallback and mark CRE path pending approval |
| Reclaim provider cannot prove seller response facts quickly | Blocks zkTLS proof path | Narrow proof scope to hash-bound response facts and document exact claim limits |
| Sepolia receiver shape does not match CRE report format | Blocks settlement | Build receiver only after confirming CRE report/forwarder contract expectations |
| Demo has too many moving parts | High live-demo risk | Keep one scripted happy path and one audit-only fallback |
| Docs overclaim Hedera-native CRE support | Sponsor/judge credibility risk | Keep `CRE_HEDERA_DIRECT_SUPPORTED=false` visible in docs and env notes |

## Final demo narrative

Use this wording:

“0-wAIst uses Chainlink CRE on Sepolia for the verifiable settlement path because CRE does not currently support Hedera as a workflow settlement chain. Hedera remains the public trust layer: the router writes hash-only HCS audit records and maintains the HFS market manifest there. The split avoids fake fallback verification while preserving both sponsor integrations honestly.”

## Completion checklist

- [ ] Sepolia escrow deployed.
- [ ] Sepolia report receiver deployed.
- [ ] `CRE_CHAIN_SELECTOR=16015286601757825753` set.
- [ ] `CRE_REPORT_RECEIVER` set.
- [ ] `CRE_TARGET` set.
- [ ] CRE workflow deployed and `CRE_WORKFLOW_ID` set.
- [ ] Reclaim provider created and `RECLAIM_PROVIDER_ID` set.
- [ ] ProofRouter uses one shared order workflow for Quick Buy and Router Agent.
- [ ] Hedera HCS audit event emitted after Sepolia settlement.
- [ ] HFS market manifest remains the canonical public seller manifest.
- [ ] Demo script shows Sepolia settlement tx plus Hedera audit tx.
- [ ] Docs explicitly say Hedera is the audit layer, not the CRE settlement chain.
