# 0-wAIst

0-wAIst routes an AI prompt to a verified subscription proxy seller, records hash-only Hedera Testnet audit activity, and keeps prompt content out of public chain artifacts.

## Demo Slice

Implemented now:

- Vite React frontend for Quick Buy and Router Agent.
- ProofRouter service with one shared execution workflow.
- Real OpenAI Responses API calls from the server.
- Hedera Testnet HCS audit transaction submission when operator credentials and an audit topic are configured.
- HashScan links for submitted Hedera transactions.
- Local redacted traces and encrypted prompt-history summaries.
- Health checks that block full P0 claims until Hedera, Dynamic, x402, contracts, and zkTLS credentials are present.

The minimal scanner demo requires:

```bash
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.x
HEDERA_OPERATOR_KEY=...
OPENAI_API_KEY=...
```

Then run:

```bash
pnpm install
pnpm demo:seed
pnpm dev
```

Open the frontend at `http://localhost:5173`, submit a prompt, and open the HashScan link shown in the Hedera audit section.

## One Shared Product Path

```text
select seller -> hash request -> record hash-only Hedera audit -> call provider LLM -> write redacted trace -> update encrypted prompt history
```

The full PRD path still requires live Dynamic wallet delegation, Hedera x402 INF escrow, deployed EVM contracts, scheduled refunds, native batch settlement, and real zkTLS verification before it can be marked complete.

## Architecture

```mermaid
flowchart LR
    UI["0-wAIst UI"] --> API["ProofRouter service"]
    API --> SEL["Shared seller selection"]
    SEL --> LLM["OpenAI Responses API"]
    API --> HCS["Hedera HCS audit topic"]
    API --> TRACE["Redacted local trace"]
    API --> HIST["Encrypted prompt history"]
    HCS --> HASHSCAN["HashScan testnet"]
```

## Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Router as ProofRouter
    participant OpenAI
    participant Hedera
    participant HashScan

    User->>UI: Enter prompt, budget, mode
    UI->>Router: POST /api/orders
    Router->>Router: Select seller using shared workflow
    Router->>OpenAI: Real model call
    OpenAI-->>Router: Answer
    Router->>Hedera: Submit hash-only HCS audit message
    Hedera-->>Router: Transaction ID
    Router-->>UI: Answer, route, proof/payment status, HashScan link
    UI->>HashScan: Open external proof
```

## Commands

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm demo:health
```

`pnpm demo:health` reports two levels:

- `minimalDemo`: OpenAI plus Hedera HCS scanner demo readiness.
- `fullP0`: every locked PRD integration.

## Out Of Scope For This Slice

This slice does not claim completed Dynamic login, x402 INF funding, ProofEscrow settlement, scheduled refund execution, native Hedera batch settlement, or real zkTLS verification. Those remain blocked by credentials and integration work and are explicitly reported by health checks.
