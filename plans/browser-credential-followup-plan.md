# Browser Credential Follow-Up Plan

Status: in_progress
Owner: next Codex CLI session with access to the logged-in browser
Last updated: 2026-06-14

Goal: finish only the remaining browser/dashboard credential work, write the values into repo-local `.env`, and report what is still blocked. Do not commit `.env` or paste secrets into committed files.

Current captured state (2026-06-14):

- `DYNAMIC_*`, `X402_*`, `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, and `CLOUDFLARE_ACCOUNT_ID` are already in `.env`.
- `RECLAIM_PROVIDER_ID`, `ZKTLS_VERIFIER_URL`, `ZKTLS_PROVIDER_POLICY_ID` remain unset.
  - Reclaim app metadata payload (`GET /api/applications/<appId>`) currently returns `providerId: []` and `httpProviderId: []`.
- Chainlink CRE dashboard metadata is now partly captured:
  - `CRE_ORGANIZATION_ID=org_nrrLxzUpfXMi7kRe`
  - `CRE_DERIVED_WORKFLOW_OWNER=b94422f7538773a7c1ca21ea231ef0eef38ec29a`
  - `CRE_DON_ID=zone-a`
  - `CRE_GATEWAY_URL=https://01.gateway.zone-a.cre.chain.link`
- CRE CLI metadata is now partly captured:
  - `CRE_DEPLOY_ACCESS_STATUS=requested`
  - `CRE_PRIVATE_REGISTRY_ID=private`
  - `CRE_ONCHAIN_REGISTRY_ID=onchain:ethereum-mainnet`
  - `CRE_ONCHAIN_REGISTRY_ADDRESS=0x4Ac54353FA4Fa961AfcC5ec4B118596d3305E7e5`
  - `CRE_HEDERA_DIRECT_SUPPORTED=false`
  - `CRE_SUPPORTED_TEST_CHAIN=ethereum-testnet-sepolia`
  - `CRE_SUPPORTED_TEST_CHAIN_SELECTOR=16015286601757825753`
  - `CRE_SUPPORTED_TEST_FORWARDER=0xF8344CFd5c43616a4366C34E3EEE75af79a74482`
- `CRE_WORKFLOW_ID`, `CRE_TARGET`, `CRE_CHAIN_SELECTOR`, `CRE_REPORT_RECEIVER`, and `CRE_SETTLEMENT_SHELL` remain unset.

## Current Credential State

Present in `.env` by key-presence check:

```text
OPENAI_API_KEY
HEDERA_OPERATOR_ID
HEDERA_OPERATOR_KEY
HCS_AUDIT_TOPIC_ID
HFS_MARKET_MANIFEST_FILE_ID
PROXY_REGISTRY_ADDRESS
PROOF_ESCROW_ADDRESS
VERIFIER_REGISTRY_ADDRESS
HTS_INF_TOKEN_ID
DYNAMIC_ORGANIZATION_ID
DYNAMIC_ENVIRONMENT_ID
DYNAMIC_CLIENT_ID
DYNAMIC_WALLET_POLICY_ID
DYNAMIC_JWKS_URL
X402_FACILITATOR_URL
X402_NETWORK
X402_PAYMENT_ASSET
RECLAIM_APP_ID
RECLAIM_APP_SECRET
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_PAGES_PROJECT
```

Still missing from `.env`:

```text
RECLAIM_PROVIDER_ID
ZKTLS_VERIFIER_URL
ZKTLS_PROVIDER_POLICY_ID
CRE_WORKFLOW_ID
CRE_GATEWAY_URL
CRE_DON_ID
CRE_TARGET
CRE_CHAIN_SELECTOR
CRE_REPORT_RECEIVER
```

## What These Missing Values Block

```text
RECLAIM_PROVIDER_ID
ZKTLS_VERIFIER_URL
ZKTLS_PROVIDER_POLICY_ID
  Blocks: real zkTLS proof capture/verification, M5 trusted proof path, full-P0 health passing, and any settlement claim that depends on real proof.

CRE_WORKFLOW_ID
CRE_DON_ID
CRE_GATEWAY_URL
CRE_TARGET
CRE_CHAIN_SELECTOR
CRE_REPORT_RECEIVER
  Blocks: Chainlink CRE-only verification plan, CRE_CHAIN_SUPPORT_GATE, M7 trusted CRE settlement design, CRE report audit metadata, and any demo claim that CRE verified the proof through a deployed workflow.
```

These are not blocked by the missing values above:

```text
frontend polish and UI wiring
seller onboarding UX and seller registry publication
local seller-node/LiteLLM/OpenAI-compatible proxy work
MCP server/tool schema work
Router Agent context and prompt-history work
Hedera HCS/HFS/HTS helper work
scheduled refund helper work
Cloudflare frontend deployment setup
test hardening around existing mocked/blocked states
plan/README updates that clearly label blocked live integrations
```

## Task A: Finish Reclaim Provider Setup (in-progress)

Use the logged-in browser session.

1. Open `https://dev.reclaimprotocol.org/`.
2. Select the existing app that matches `.env` `RECLAIM_APP_ID`.
3. Inspect linked providers for the app.
4. Record current state as evidence:
   - For this run, provider list is currently empty (`providerId: []` in app metadata).
5. If a suitable provider already exists, copy its provider ID into `.env`.
6. If no provider exists, create or link a provider/policy that can prove the seller's LLM-provider response facts:
   - provider host
   - endpoint
   - requested model
   - returned model, if exposed
   - HTTP success status
   - token usage fields, if exposed
   - response hash, response bytes, or a stable field set sufficient to derive the response hash
   - order binding fields such as `orderId` and `requestHash`, if they can be embedded safely
7. Put the provider ID into `.env`:

```bash
RECLAIM_PROVIDER_ID=
```

8. If Reclaim exposes a verifier, app backend, callback, or SDK verification endpoint needed by our implementation, add it to `.env`:

```bash
ZKTLS_VERIFIER_URL=
```

9. If Reclaim exposes a separate provider policy/rule identifier, put it into `.env`:

```bash
ZKTLS_PROVIDER_POLICY_ID=
```

9. If Reclaim uses only `RECLAIM_PROVIDER_ID` and has no separate verifier URL or policy ID, add explicit comments in `.env`:

```bash
# ZKTLS_VERIFIER_URL intentionally blank: Reclaim SDK/API verifies through RECLAIM_APP_ID, RECLAIM_APP_SECRET, and RECLAIM_PROVIDER_ID.
# ZKTLS_PROVIDER_POLICY_ID intentionally same as RECLAIM_PROVIDER_ID unless implementation separates provider and policy.
```

Do not mark this complete until the CLI session can explain which Reclaim value maps to each `.env` field.

### 2026-06-14 Re-attach verification run

- Browser session reconnected successfully and controlled via CDP (`http://127.0.0.1:9222`).
- Reclaim app route checked directly:
  - `https://dev.reclaimprotocol.org/my-applications/0x6Eab35016641042044f4071787B4f9dE4935A3AD?tab=integration`
  - `https://dev.reclaimprotocol.org/my-providers`
- Evidence from Reclaim APIs using valid Firebase access token:
  - `GET /api/applications/0x6Eab35016641042044f4071787B4f9dE4935A3AD` → `providerId: []`, `httpProviderId: []`
  - `GET /api/applications/providers/0x6Eab35016641042044f4071787B4f9dE4935A3AD` → `providers: []`
  - `GET /api/providers/user/paginated?pageKey=0&pageSize=20&searchQuery=&providerType=ALL&providerStatus=ALL&providerVisibility=ALL&sortByCreatedLatest=true` → `providers: []`
  - `GET /api/subscription/customer/info` → `subscriptionPlan: Free Plan`, `isPaidCustomer: false`
- UI verification:
  - `My Providers` screen has zero user providers and shows `New Provider` + filter tabs only.
  - No provider creation form fields were exposed in-session after `New Provider` click (no additional API routes fired besides listed above).
  - No app provider-linking action or provider assignment endpoint was discoverable from this session.
- `POST /api/providers/register` continues to return generic `500` on attempted payload guesses; no successful provider registration path discovered yet.

- `RECLAIM_PROVIDER_ID`, `ZKTLS_VERIFIER_URL`, `ZKTLS_PROVIDER_POLICY_ID` remain unset.

## Task B: Collect Chainlink CRE Dashboard/CLI Values (pending)

Use the logged-in browser session and/or the authenticated Chainlink CRE CLI.

1. Open the Chainlink CRE dashboard or docs flow used by the logged-in account.
2. Confirm whether the account has access to deploy CRE workflows.
3. Install/authenticate the CRE CLI if needed.
4. Create or identify the `0-wAIst` zkTLS verifier workflow target.

Progress update:

- Active CRE dashboard tab was observed at `https://app.chain.link/cre/discover`.
- The dashboard organization is active but gated:
  - `organizationId: org_nrrLxzUpfXMi7kRe`
  - `restrictionStatus: GATED`
  - `defaultDonFamily: zone-a`
  - `vaultGatewayUrl: https://01.gateway.zone-a.cre.chain.link`
  - `derivedWorkflowOwners: ["b94422f7538773a7c1ca21ea231ef0eef38ec29a"]`
- `GET/GraphQL workflows` responses return `data: []`, `count: 0`; no deployed workflow exists yet.
- Dashboard says deployment to a Chainlink DON is gated and requires `cre account access`.
- CRE CLI `v1.20.0` is installed at `$HOME/.cre/bin/cre`.
- `cre login` later completed successfully from the user's terminal.
- `cre whoami` confirms:
  - email: `kirill.igum@gmail.com`
  - organization id: `org_nrrLxzUpfXMi7kRe`
  - organization name: `My Org`
  - deploy access: `Not enabled`
- `cre account access` was rerun after login; access request was submitted successfully with the 0-wAIst use case.
- `cre account list-key` reports no linked workflow owners.
- `cre workflow list --output json` returns `[]`.
- `cre registry list` reports these registries:
  - `private`
  - `onchain:ethereum-mainnet`, address `0x4Ac54353FA4Fa961AfcC5ec4B118596d3305E7e5`
- `cre workflow supported-chains` does not list Hedera. It does list `ethereum-testnet-sepolia` with selector `16015286601757825753` and mock forwarder `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`.
5. Capture these values into `.env` once they exist:

```bash
CRE_WORKFLOW_ID=
CRE_DON_ID=zone-a
CRE_GATEWAY_URL=https://01.gateway.zone-a.cre.chain.link
CRE_TARGET=
CRE_CHAIN_SELECTOR=
CRE_REPORT_RECEIVER=
```

6. Run the CRE network/support check required by `0-waist-bdd-tdd-plan-v5.md`:

```bash
# Future command name from the plan once implemented:
pnpm cre:networks
```

7. If `pnpm cre:networks` does not exist yet, record the manual evidence instead:
   - supported EVM chains shown by CRE docs/CLI
   - whether Hedera Testnet is supported by the required CRE write/report capability
   - the selected settlement shell:
     - direct CRE report settlement on supported target chain, or
     - CRE-authenticated registry/receiver plus native Hedera Batch settlement

8. If Hedera Testnet is not supported for direct CRE writes, do not invent direct Hedera CRE settlement. Record the unsupported status and leave implementation to continue on non-settlement work until the project chooses the shell.

## Task C: Verify `.env` Without Printing Secrets

Run a key-presence check only:

```bash
for key in RECLAIM_PROVIDER_ID ZKTLS_VERIFIER_URL ZKTLS_PROVIDER_POLICY_ID CRE_WORKFLOW_ID CRE_DON_ID CRE_GATEWAY_URL CRE_TARGET CRE_CHAIN_SELECTOR CRE_REPORT_RECEIVER; do
  if grep -Eq "^${key}=.+" .env; then
    printf '%s=present\n' "$key"
  else
    printf '%s=missing\n' "$key"
  fi
done
```

Then run:

```bash
pnpm demo:health
pnpm build
pnpm test
```

If `demo:health` still fails, report the missing key names and the feature they block. Do not paste secret values into the response.

## Return-To-Implementation Prompt

After updating `.env`, tell the main implementation session:

```text
I updated .env with the remaining Reclaim/zkTLS/CRE credential fields. Key-presence check: <paste present/missing names only>. Continue implementation from plans/browser-credential-followup-plan.md and 0-waist-bdd-tdd-plan-v5.md.

## Implementation Status (this run)

- Reclaim capture status: app IDs/captures done; provider/policy fields still pending.
- CRE capture status: all six `CRE_*` values still pending.
```
