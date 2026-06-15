# Credential Acquisition Plan

Status: credentials captured from the active authenticated browser session. Dynamic, Reclaim, and Cloudflare account-level fields are now fully captured and pasted into `.env`; `ZKTLS_VERIFIER_URL`, `ZKTLS_PROVIDER_POLICY_ID`, and `RECLAIM_PROVIDER_ID` remain pending until provider/policy is configured.

Goal: collect the remaining full-P0 credentials and paste them into the repo-local `.env` file. Do not commit `.env`.

## Browser Capability Split

Latest check: Codex Desktop in-app browser automation currently reports `no-iab-backends` for this thread. The Google Chrome bridge is being fixed separately. Until one of those bridges is controllable, do not block implementation on browser automation.

Follow-up check after the Hedera action-status UI change: the in-app browser bridge reported `Browser is not available: iab`. The local API was still verified from shell at `http://localhost:8787/api/hedera-actions`.

Tasks Codex can still do without authenticated browser control:

- [x] Verify local app/API from shell: `http://localhost:5173` and `http://localhost:8787`.
- [x] Verify public HashScan links after Hedera transactions are submitted.
- [x] Look up public docs and update repo plans.
- [x] Run `pnpm demo:seed`, `pnpm demo:judge`, `pnpm demo:health`, `pnpm build`, and `pnpm test`.
- [x] Run MCP protocol smoke tests for the local `proofrouter-mcp` stdio server.
- [ ] After credentials are pasted into `.env`, run health/build/test and continue implementation.

Tasks for the separate browser/login session:

- [ ] Use logged-in provider dashboards to copy credential values.
- [ ] Paste those values into the repo-local `.env` file.
- [ ] Do not paste secrets into committed files, docs, issues, PR descriptions, or chat unless explicitly intended.
- [ ] If the Codex Desktop browser bridge becomes controllable, use it for navigation and non-secret page reading; still put final credential values into `.env`.
- [ ] If the Chrome bridge becomes controllable, claim the already-authenticated dashboard tab only after confirming the target tab and credential values needed.

## Already Working

These are already present locally and should stay in `.env`:

```bash
MOCK_LLM_MODEL=mock-llm-v1
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=...
HEDERA_OPERATOR_KEY=...
HCS_AUDIT_TOPIC_ID=...
HFS_MARKET_MANIFEST_FILE_ID=...
HTS_INF_TOKEN_ID=...
HTS_INF_TOKEN_EVM_ADDRESS=...
PROXY_REGISTRY_ADDRESS=...
PROXY_REGISTRY_CONTRACT_ID=...
PROOF_ESCROW_ADDRESS=...
PROOF_ESCROW_CONTRACT_ID=...
VERIFIER_REGISTRY_ADDRESS=...
VERIFIER_REGISTRY_CONTRACT_ID=...
```

The current minimal demo is protected on branch `codex/minimal-hedera-demo`.

## 1. Dynamic Wallet Credentials

Official docs:

- Dynamic SDK/API keys: https://www.dynamic.xyz/docs/overview/developer-dashboard/tokens-api-keys
- Dynamic delegated access: https://www.dynamic.xyz/docs/overview/wallets/embedded-wallets/mpc/delegated-access/overview
- Dynamic policies/rules: https://www.dynamic.xyz/docs/overview/wallets/embedded-wallets/mpc/policies

Captured values from the active session:

- Dynamic organization id: `7988d9db-1812-4586-8e44-044fe7327346`
- Dynamic environment id: `85c876cb-0f8c-46d1-81f6-1ebb7adfee9d`
- Dynamic policy id: `7737ec4e-040c-4471-a8b0-50fb960bcadf`
- JWKS URL: `https://app.dynamicauth.com/api/v0/sdk/85c876cb-0f8c-46d1-81f6-1ebb7adfee9d/.well-known/jwks`
- Reclaim app metadata confirmed from developer API:
  - `RECLAIM_APP_ID=0x6Eab35016641042044f4071787B4f9dE4935A3AD`
  - `RECLAIM_APP_SECRET=0x4c9a2baf88b147d616366cd79beaae42dd48a50cf0473c4ed4f6453ac0c57e1b`
  - `providerId=[]` currently for `waistminimaldemo2`
- Dashboard client token labels observed:
  - `0-wAIst-fullp0` (ending `...4G7vE7`)
  - `token-codex-auto` (ending `...3pTQ3J`)
  - `codex-auto-full-2` (full value captured and written to `.env`)

Next action:

1. full `DYNAMIC_CLIENT_ID` value already captured and pasted into `.env` as `codex-auto-full-2`.

Browser steps:

1. Open https://app.dynamic.xyz/ and log in.
2. Create or select the `0-wAIst` project.
3. Use the **Sandbox** environment for hackathon/demo work.
4. Go to developer dashboard settings for SDK/API keys.
5. Copy the Sandbox **Environment ID**.
6. Copy or create the server/API client credential shown for the project. If the dashboard label differs, keep the exact label in a note.
7. Enable embedded wallet support.
8. Enable delegated access in the dashboard.
9. Create a bounded policy/rule for demo spending:
   - max per order: `0.50 INF`
   - daily max: `5.00 INF`
   - allowed contracts only: `ProxyRegistry`, `ProofEscrow`, `VerifierRegistry`
   - sellers from registry only
10. Copy the policy/rule ID.

Put these into `.env`:

```bash
# Dynamic org metadata
DYNAMIC_ORGANIZATION_ID=7988d9db-1812-4586-8e44-044fe7327346
DYNAMIC_ENVIRONMENT_ID=85c876cb-0f8c-46d1-81f6-1ebb7adfee9d
DYNAMIC_CLIENT_ID=dyn_zay34vHTbaTGreWcvfVjckyryhRMDviJkH4EMOmqbeDpXqYRH52LWem9
DYNAMIC_WALLET_POLICY_ID=7737ec4e-040c-4471-a8b0-50fb960bcadf
DYNAMIC_JWKS_URL=https://app.dynamicauth.com/api/v0/sdk/85c876cb-0f8c-46d1-81f6-1ebb7adfee9d/.well-known/jwks
```

If Dynamic does not expose something literally named `CLIENT_ID`, paste the closest server/API client identifier into `.env` and add a comment with its dashboard label.

## 2. Cloudflare Pages Deployment

Official docs:

- Create API token: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- Account-owned tokens: https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/
- Find account ID: https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/
- Pages API token requirements: https://developers.cloudflare.com/pages/configuration/api/

Browser steps:

1. Open https://dash.cloudflare.com/ and log in.
2. Select the account to use for the demo.
3. Copy the **Account ID** from the account overview/right sidebar.
4. Open **My Profile > API Tokens**, or **Manage Account > Account API Tokens** if using an account-owned token.
5. Create a token with Cloudflare Pages edit access.
6. If using a custom token, include at least:
   - Account scope for the selected account.
   - Cloudflare Pages `Edit` permission.
   - Workers Scripts `Edit` only if Pages deployment tooling asks for it.
7. Copy the token once.

Put these into `.env`:

```bash
CLOUDFLARE_API_TOKEN= (set in `.env`)
# confirmed in dashboard/account session
CLOUDFLARE_ACCOUNT_ID=9925b5ec778ea3954dddc4cbe28ba127
CLOUDFLARE_PAGES_PROJECT=0-waist
```

## 3. x402 Facilitator For Hedera

Official docs:

- Hedera x402 overview: https://docs.hedera.com/hedera/open-source-solutions/ai-studio-on-hedera/x402
- Hedera x402 background/facilitator explanation: https://hedera.com/blog/hedera-and-the-x402-payment-standard/
- npm package reference: https://www.npmjs.com/package/@x402/hedera

Browser/session steps:

1. Check whether the Hedera hackathon/bounty resources provide a hosted Hedera x402 facilitator URL.
2. If yes, copy the facilitator base URL.
3. If no hosted facilitator is available, mark this as self-host required; we will run a local facilitator and use its URL.
4. Confirm that the facilitator supports Hedera Testnet and HTS `INF`.

Put these into `.env`:

```bash
X402_FACILITATOR_URL=https://api.testnet.blocky402.com
X402_NETWORK=hedera-testnet
X402_PAYMENT_ASSET=INF
```

## 4. zkTLS Provider Credentials

Preferred quick path: Reclaim Protocol, because it provides app credentials and provider IDs.

Official docs:

- Reclaim API key/app setup: https://docs.reclaimprotocol.org/api-key
- Reclaim browser-extension setup: https://docs.reclaimprotocol.org/browser-extension/web-integration/setup
- Reclaim developer portal: https://dev.reclaimprotocol.org/
- TLSNotary browser extension docs: https://tlsnotary.org/docs/extension/

Browser steps for Reclaim:

1. Open https://dev.reclaimprotocol.org/ and log in.
2. Create a new application named `0-wAIst`.
3. Copy `APP_ID`.
4. Copy `APP_SECRET`.
5. Go to providers.
6. Choose an existing provider or create a custom provider that can prove the LLM provider response facts we need:
   - provider host
   - endpoint
   - requested model
   - returned model
   - HTTP success status
   - token usage fields if available
   - response hash or enough response bytes for hashing
7. Copy the `PROVIDER_ID`.

Put these into `.env`:

```bash
ZKTLS_VERIFIER_URL=
ZKTLS_PROVIDER_POLICY_ID=
RECLAIM_APP_ID=0x6Eab35016641042044f4071787B4f9dE4935A3AD
RECLAIM_APP_SECRET=0x4c9a2baf88b147d616366cd79beaae42dd48a50cf0473c4ed4f6453ac0c57e1b
# providerId is currently empty in Reclaim for this app
RECLAIM_PROVIDER_ID=
```

If using TLSNotary instead of Reclaim, put the verifier/notary server URL into `ZKTLS_VERIFIER_URL` and add a comment in `.env` saying `# zkTLS provider: TLSNotary`.

## 5. Verifier Signer

Status: completed locally in the implementation session.

Completed path:

1. Codex generated a local verifier ECDSA keypair.
2. The private key was stored only in ignored `.env`.
3. The public address was stored in `.env`.
4. The public address was approved in `VerifierRegistry`.

Keep these in `.env`:

```bash
VERIFIER_SIGNER_ADDRESS=
VERIFIER_SIGNER_PRIVATE_KEY=
```

## 6. Contract And INF Values

These were produced by `pnpm demo:deploy` and written into `.env` in the continuation session. Future sessions can rerun `pnpm demo:deploy`; it should load the existing values instead of redeploying when the env keys are present.

## Credential-Run Status (2026-06-14)

Latest in-session evidence:

- `RECLAIM_PROVIDER_ID`, `ZKTLS_VERIFIER_URL`, `ZKTLS_PROVIDER_POLICY_ID` still missing; Reclaim app/provider state is still `providerId: []`, `httpProviderId: []` and user provider list is empty.
- CRE dashboard session is now available at `https://app.chain.link/cre/discover`.
- Captured Chainlink CRE metadata:
  - organization id: `org_nrrLxzUpfXMi7kRe`
  - derived workflow owner: `b94422f7538773a7c1ca21ea231ef0eef38ec29a`
  - default DON family / configured `CRE_DON_ID`: `zone-a`
  - gateway URL / configured `CRE_GATEWAY_URL`: `https://01.gateway.zone-a.cre.chain.link`
- User completed `cre login`; `cre whoami` confirms the same organization, but deploy access is still `Not enabled`.
- `cre account access` request was submitted successfully for the 0-wAIst CRE/zkTLS use case.
- `cre account list-key` reports no linked workflow owners.
- `cre workflow list --output json` returns `[]`.
- `cre registry list` reports `private` and `onchain:ethereum-mainnet` (`0x4Ac54353FA4Fa961AfcC5ec4B118596d3305E7e5`).
- `cre workflow supported-chains` does not include Hedera; it includes `ethereum-testnet-sepolia` selector `16015286601757825753` and mock forwarder `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`.
- CRE workflow deployment remains gated:
  - dashboard GraphQL `workflows` returns `data: []`, `count: 0`
  - organization `restrictionStatus` is `GATED`
  - deploy access is pending review after `cre account access`
- `CRE_WORKFLOW_ID`, `CRE_TARGET`, `CRE_CHAIN_SELECTOR`, `CRE_REPORT_RECEIVER`, and `CRE_SETTLEMENT_SHELL` remain pending until MFA/access/deployment completes.

After deployment, Codex should write these into `.env`:

```bash
PROXY_REGISTRY_ADDRESS=
PROXY_REGISTRY_CONTRACT_ID=
PROOF_ESCROW_ADDRESS=
PROOF_ESCROW_CONTRACT_ID=
VERIFIER_REGISTRY_ADDRESS=
VERIFIER_REGISTRY_CONTRACT_ID=
HTS_INF_TOKEN_ID=
HTS_INF_TOKEN_EVM_ADDRESS=
```

## Final `.env` Checklist

Before returning to the implementation session, make sure `.env` contains:

```bash
MOCK_LLM_MODEL=mock-llm-v1
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=
HEDERA_OPERATOR_KEY=
HCS_AUDIT_TOPIC_ID=
HFS_MARKET_MANIFEST_FILE_ID=

PROXY_REGISTRY_ADDRESS=
PROOF_ESCROW_ADDRESS=
VERIFIER_REGISTRY_ADDRESS=
HTS_INF_TOKEN_ID=

DYNAMIC_ENVIRONMENT_ID=85c876cb-0f8c-46d1-81f6-1ebb7adfee9d
DYNAMIC_CLIENT_ID=dyn_zay34vHTbaTGreWcvfVjckyryhRMDviJkH4EMOmqbeDpXqYRH52LWem9
DYNAMIC_WALLET_POLICY_ID=7737ec4e-040c-4471-a8b0-50fb960bcadf
DYNAMIC_ORGANIZATION_ID=7988d9db-1812-4586-8e44-044fe7327346
DYNAMIC_JWKS_URL=https://app.dynamicauth.com/api/v0/sdk/85c876cb-0f8c-46d1-81f6-1ebb7adfee9d/.well-known/jwks

X402_FACILITATOR_URL=https://api.testnet.blocky402.com
X402_NETWORK=hedera-testnet
X402_PAYMENT_ASSET=INF

ZKTLS_VERIFIER_URL=
ZKTLS_PROVIDER_POLICY_ID=
RECLAIM_APP_ID=0x6Eab35016641042044f4071787B4f9dE4935A3AD
RECLAIM_APP_SECRET=0x4c9a2baf88b147d616366cd79beaae42dd48a50cf0473c4ed4f6453ac0c57e1b
RECLAIM_PROVIDER_ID=

VERIFIER_SIGNER_ADDRESS=
VERIFIER_SIGNER_PRIVATE_KEY=

CLOUDFLARE_API_TOKEN=(set in `.env`)
CLOUDFLARE_ACCOUNT_ID=9925b5ec778ea3954dddc4cbe28ba127
CLOUDFLARE_PAGES_PROJECT=0-waist
```

## Return-To-Codex Prompt

After filling `.env`, tell Codex:

```text
I added the remaining credentials to .env. Continue full P0 from plans/credential-acquisition-plan.md.
```

Codex should then run:

```bash
pnpm demo:health
pnpm build
pnpm test
```
