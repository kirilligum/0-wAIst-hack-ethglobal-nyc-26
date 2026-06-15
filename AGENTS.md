# Repository Guidelines

## Product
0-wAIst is an AI subscription de-re-seller router. The frontend is a demo UI and the core services are `proofrouter-mcp` and `seller-node`.

## Project Invariants (Current + Targeted)
- Intended invariant: Quick Buy and Router Agent differ only in seller selection policy; execution otherwise follows the same shared order workflow.
- Targeted flow: `seller selection -> x402-funded ProofEscrow lock -> scheduled refund window -> seller proxy call -> zkTLS/CRE settlement path -> HCS audit`.
- Current repo status: minimal hash-only Hedera audit demo path is implemented and runnable; full live payment/scheduling/settlement behaviors are tracked as full-P0 scope and not yet claimed complete.

### Avoided Alternatives
- Do not add: fallback verifier/demo verifier/fake proof, HBAR payment fallback, formula router, alternate refund function, duplicate MCP HTTP tool paths, sequential settlement path, generic payment adapters for one-off integrations, duplicate/extra HCS topics, or per-seller HFS manifests.
- Required canonical names (do not rename): `refundExpired(uint256 orderId)`, `HCS_AUDIT_TOPIC_ID`, `HFS_MARKET_MANIFEST_FILE_ID`.

## Project Structure & Module Organization
This is a `pnpm` workspace monorepo (`pnpm-workspace.yaml`) with four main areas:

- `apps/web`: Vite + React frontend (`src/`, `index.html`).
- `services/`: runtime services.
  - `proofrouter-mcp`: router API, MCP server, and seller-selection workflow.
  - `seller-node`: seller service endpoint (`/x402` path usage, local test flow).
- `packages/`: reusable TS packages.
  - `schemas`: shared request/response domain schemas.
  - `crypto`: redaction, hashing, encryption helpers.
  - `hedera`: Hedera client, HCS/HFS/HTS/x402 helpers.
- `contracts/`: Solidity contracts + `test/`.
- `demo/`: executable scripts for end-to-end/manual smoke checks.

## Build, Test, and Development Commands
- `pnpm install`  
  Install workspace dependencies.
- `pnpm build`  
  Builds all workspace packages/services in order using `tsc`/Vite.
- `pnpm dev`  
  Runs ProofRouter MCP and web app side-by-side.
- `pnpm dev:seller`  
  Runs seller-node in watch mode.
- `pnpm mcp`  
  Starts MCP entrypoint (`services/proofrouter-mcp`).
- `pnpm test`  
  Runs Vitest suite plus `static-check` demo validation.
- `pnpm test:e2e`, `pnpm demo:*`  
  Execute curated demo workflows (`seed`, `deploy`, `health`, `seller`, `verifier`, etc.).
- `pnpm --filter <package-name> build|dev|start`  
  Work on a single workspace package directly.

## Coding Style & Naming Conventions
- Language: TypeScript (ES2022, strict mode), with JavaScript/TS modules.
- Indentation is 2 spaces; existing code uses semicolons and double-quoted imports.
- Use descriptive PascalCase for types/interfaces (`OrderResult`, `HederaConfig`) and camelCase for functions/variables.
- Keep package names under `@0waist/*`; keep file names action-oriented and localized (`workflow.ts`, `sellerRegistration.ts`).
- Keep test filenames next to implementation scope as `*.test.ts`.

## Testing Guidelines
- Test framework: `vitest`.
- Test files: `packages/**/*.test.ts`, `services/**/*.test.ts`, `contracts/**/*.test.ts`.
- Naming style: scenario-driven `it("...")` assertions and explicit happy-path + error-path cases.
- No explicit coverage threshold is defined in repo config; keep PRs focused and add/update tests for behavior changes.
- Keep security-sensitive expectations tested (for example, redacted/public-only payload tests) when touching schemas, traces, or Hedera audit payload paths.

## Commit & Pull Request Guidelines
- Commit history is mostly Conventional Commit–style (`feat:`, `docs:`), with short imperative subjects.
- PRs should include:
  - what changed,
  - which package/service was touched,
  - commands run (example: `pnpm build`, `pnpm test`, `pnpm dev` smoke path),
  - any environment assumptions (`.env` values, Hedera/mock LLM mode).
- Align on ownership boundaries:
  - `packages/*` contain reusable primitives/schemas; services/apps own route and app-policy behavior.
  - If a shared interface must change (`packages/schemas` usage), coordinate before merging.

## Security & Configuration Tips
- Use `.env.example` as the source of truth for keys and local config.
- Never commit secrets; `.env` is ignored by git but still keep this rule strict.
- Never put plaintext prompts, API keys, auth headers, or private prompts in public artifacts:
  - HCS/HFS payloads and contract events,
  - public traces/README examples,
  - app/server logs.
- Prefer masking sensitive values in logs/demos and avoid hardcoding live credentials or private keys.
