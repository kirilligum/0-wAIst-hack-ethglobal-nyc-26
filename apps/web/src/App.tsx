import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  ExternalLink,
  LoaderCircle,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Store
} from "lucide-react";
import { Offer, OrderMode, OrderResult, SellerRegistrationResult } from "@0waist/schemas";
import {
  createOrder,
  fetchHederaActionStatus,
  fetchInfWalletDiagnostics,
  fetchOffers,
  HederaActionStatus,
  HederaSetupResult,
  InfWalletDiagnostics,
  OpenEscrowOrderResult,
  registerSeller,
  openEscrowOrder,
  setupHedera
} from "./api.js";

function money(value: number): string {
  return `${value.toFixed(3)} INF`;
}

function modeLabel(mode: OrderMode): string {
  return mode === "quick-buy" ? "Quick Buy" : "Router Agent";
}

export default function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [prompt, setPrompt] = useState("Give me a concise launch checklist for a Hedera AI payments demo.");
  const [budgetInf, setBudgetInf] = useState(0.5);
  const [mode, setMode] = useState<OrderMode>("quick-buy");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [operatorId, setOperatorId] = useState("");
  const [operatorKey, setOperatorKey] = useState("");
  const [auditTopicId, setAuditTopicId] = useState("");
  const [marketManifestFileId, setMarketManifestFileId] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<HederaSetupResult | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [hederaActions, setHederaActions] = useState<HederaActionStatus | null>(null);
  const [infWallets, setInfWallets] = useState<InfWalletDiagnostics | null>(null);
  const [sellerOpen, setSellerOpen] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerResult, setSellerResult] = useState<SellerRegistrationResult | null>(null);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [escrowResult, setEscrowResult] = useState<OpenEscrowOrderResult | null>(null);
  const [escrowError, setEscrowError] = useState<string | null>(null);
  const [sellerForm, setSellerForm] = useState({
    sellerId: "local-seller",
    displayName: "Local Seller Proxy",
    modelId: "gpt-4.1-mini",
    provider: "openai-compatible",
    inputPricePerMTokInf: 0.05,
    outputPricePerMTokInf: 0.12,
    fixedFeeInf: 0.01,
    maxBudgetInf: 0.5,
    maxInputTokens: 32000,
    maxOutputTokens: 4000,
    x402Endpoint: "http://localhost:8790/x402",
    hederaAccount: "",
    sellerEvmAddress: "",
    summary: "Local seller proxy registered for the live Hedera demo.",
    publishOnChain: true
  });

  useEffect(() => {
    fetchOffers()
      .then(setOffers)
      .catch((err: Error) => setError(err.message));
    fetchHederaActionStatus()
      .then(setHederaActions)
      .catch(() => setHederaActions(null));
    fetchInfWalletDiagnostics()
      .then(setInfWallets)
      .catch(() => setInfWallets(null));
  }, []);

  const selectedSeller = useMemo(() => {
    if (!result) return null;
    return offers.find((offer) => offer.offerId === result.selectedOffer.offerId) ?? result.selectedOffer;
  }, [offers, result]);
  const selectedRegistryOfferId = selectedSeller?.registryOfferId && /^\d+$/.test(selectedSeller.registryOfferId)
    ? Number(selectedSeller.registryOfferId)
    : null;
  const verificationMode = hederaActions?.prerequisites.creProof.mode;
  const verifierLabel = verificationMode === "local-verifier-placeholder" ? "Local verifier" : "CRE proof";
  const reportLabel = verificationMode === "local-verifier-placeholder" ? "Receipt" : "CRE report";
  const settleLabel = verificationMode === "local-verifier-placeholder" ? "Settle" : "CRE settle";
  const auditLabel = verificationMode === "local-verifier-placeholder" ? "Proof audit" : "CRE audit";

  async function runOrder() {
    setLoading(true);
    setError(null);
    try {
      const next = await createOrder({ prompt, budgetInf, mode });
      setResult(next);
      setEscrowResult(null);
      setEscrowError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  async function runHederaSetup() {
    setSetupLoading(true);
    setSetupError(null);
    try {
      const next = await setupHedera({
        operatorId,
        operatorKey,
        auditTopicId: auditTopicId.trim() || undefined,
        marketManifestFileId: marketManifestFileId.trim() || undefined
      });
      setSetupResult(next);
      setOperatorKey("");
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Hedera setup failed");
    } finally {
      setSetupLoading(false);
    }
  }

  async function runSellerRegistration() {
    setSellerLoading(true);
    setSellerError(null);
    try {
      const next = await registerSeller({
        ...sellerForm,
        sellerEvmAddress: sellerForm.sellerEvmAddress.trim() || undefined,
        hederaAccount: sellerForm.hederaAccount.trim()
      });
      setSellerResult(next);
      if (next.status !== "blocked") {
        setOffers(await fetchOffers());
      }
    } catch (err) {
      setSellerError(err instanceof Error ? err.message : "Seller registration failed");
    } finally {
      setSellerLoading(false);
    }
  }

  async function prepareEscrowOrder() {
    if (!result || !selectedRegistryOfferId) {
      setEscrowError("Select a seller with an on-chain registry offer before preparing escrow.");
      return;
    }
    setEscrowLoading(true);
    setEscrowError(null);
    try {
      setEscrowResult(await openEscrowOrder({
        offerId: selectedRegistryOfferId,
        promptHash: result.promptHash,
        requestHash: result.requestHash
      }));
    } catch (err) {
      setEscrowError(err instanceof Error ? err.message : "Escrow order preparation failed");
    } finally {
      setEscrowLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="workbench">
        <header className="topbar">
          <div>
            <p className="eyebrow">0-wAIst</p>
            <h1>AI Subscription De-Re-Seller Router Agent</h1>
          </div>
          <div className="network-pill">
            <Activity size={16} />
            Hedera Testnet
          </div>
        </header>

        <section className="setup-strip">
          <div>
            <strong>Hedera setup</strong>
            <span>{setupResult ? `Seeded topic ${setupResult.topic.topicId}` : "Save testnet credentials and create scanner activity."}</span>
          </div>
          <button type="button" onClick={() => setSetupOpen((value) => !value)}>
            <ShieldCheck size={17} />
            {setupOpen ? "Hide" : "Configure"}
          </button>
        </section>

        {setupOpen ? (
          <section className="setup-panel">
            <div className="setup-fields">
              <label className="field">
                <span>Account ID</span>
                <input
                  placeholder="0.0.x"
                  value={operatorId}
                  onChange={(event) => setOperatorId(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Private key</span>
                <input
                  type="password"
                  placeholder="302e..."
                  value={operatorKey}
                  onChange={(event) => setOperatorKey(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Existing HCS topic</span>
                <input
                  placeholder="optional"
                  value={auditTopicId}
                  onChange={(event) => setAuditTopicId(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Existing HFS file</span>
                <input
                  placeholder="optional"
                  value={marketManifestFileId}
                  onChange={(event) => setMarketManifestFileId(event.target.value)}
                />
              </label>
            </div>
            <button
              className="primary"
              type="button"
              disabled={setupLoading || !operatorId.trim() || !operatorKey.trim()}
              onClick={() => void runHederaSetup()}
            >
              {setupLoading ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}
              Save and seed Hedera
            </button>
            {setupError ? <p className="error">{setupError}</p> : null}
            {setupResult ? (
              <div className="setup-result">
                <a href={setupResult.audit.hashScanUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Open seed audit transaction
                </a>
                {setupResult.topic.hashScanUrl ? (
                  <a href={setupResult.topic.hashScanUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    Open audit topic
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {hederaActions ? (
          <section className="action-strip">
            <div className={hederaActions.prerequisites.inf.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <ShieldCheck size={16} />
              INF
            </div>
            <div className={hederaActions.prerequisites.contracts.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <BadgeCheck size={16} />
              Contracts
            </div>
            <div className={hederaActions.actions.openOrderViaX402.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <CircleDollarSign size={16} />
              x402 escrow
            </div>
            <div className={hederaActions.actions.createRefundSchedule.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <Activity size={16} />
              Refund schedule
            </div>
            <div className={hederaActions.actions.submitProofToCre.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <ShieldCheck size={16} />
              {verifierLabel}
            </div>
            <div className={hederaActions.actions.waitForCreReport.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <BadgeCheck size={16} />
              {reportLabel}
            </div>
            <div className={hederaActions.actions.settleFromCreReport.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <Route size={16} />
              {settleLabel}
            </div>
            <div className={hederaActions.actions.logCreSettlementAudit.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <Activity size={16} />
              {auditLabel}
            </div>
            <div className={hederaActions.actions.publishSellerOffer.ready ? "action-chip ready" : "action-chip blocked-chip"}>
              <Store size={16} />
              Seller registry
            </div>
          </section>
        ) : null}

        {infWallets ? (
          <section className="wallet-strip">
            <div className={infWallets.buyer?.associated ? "wallet-metric ready" : "wallet-metric blocked-metric"}>
              <span>Buyer INF</span>
              <strong>{infWallets.buyer ? `${infWallets.buyer.balanceInf.toFixed(3)} INF` : "Missing"}</strong>
            </div>
            <div className={infWallets.seller?.associated ? "wallet-metric ready" : "wallet-metric blocked-metric"}>
              <span>Seller INF</span>
              <strong>{infWallets.seller ? (infWallets.seller.associated ? "Associated" : "Not associated") : "Missing"}</strong>
            </div>
            <div className={infWallets.proofEscrowAllowance?.amountInf ? "wallet-metric ready" : "wallet-metric blocked-metric"}>
              <span>Escrow allowance</span>
              <strong>{infWallets.proofEscrowAllowance ? `${infWallets.proofEscrowAllowance.amountInf.toFixed(3)} INF` : "Missing"}</strong>
            </div>
            {infWallets.missing.length ? (
              <div className="wallet-missing">Missing {infWallets.missing.join(", ")}</div>
            ) : null}
          </section>
        ) : null}

        <section className="setup-strip">
          <div>
            <strong>Seller onboarding</strong>
            <span>{sellerResult ? `${sellerResult.offer.displayName}: ${sellerResult.status}` : "Publish or save a seller offer with live pricing."}</span>
          </div>
          <button type="button" onClick={() => setSellerOpen((value) => !value)}>
            <Store size={17} />
            {sellerOpen ? "Hide" : "Become seller"}
          </button>
        </section>

        {sellerOpen ? (
          <section className="setup-panel seller-panel">
            <div className="setup-fields seller-fields">
              <label className="field">
                <span>Seller ID</span>
                <input
                  value={sellerForm.sellerId}
                  onChange={(event) => setSellerForm((value) => ({ ...value, sellerId: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Display name</span>
                <input
                  value={sellerForm.displayName}
                  onChange={(event) => setSellerForm((value) => ({ ...value, displayName: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Model</span>
                <input
                  value={sellerForm.modelId}
                  onChange={(event) => setSellerForm((value) => ({ ...value, modelId: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Endpoint</span>
                <input
                  value={sellerForm.x402Endpoint}
                  onChange={(event) => setSellerForm((value) => ({ ...value, x402Endpoint: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Hedera account</span>
                <input
                  placeholder="0.0.x"
                  value={sellerForm.hederaAccount}
                  onChange={(event) => setSellerForm((value) => ({ ...value, hederaAccount: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Seller EVM address</span>
                <input
                  placeholder="0x..."
                  value={sellerForm.sellerEvmAddress}
                  onChange={(event) => setSellerForm((value) => ({ ...value, sellerEvmAddress: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Fixed fee</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={sellerForm.fixedFeeInf}
                  onChange={(event) => setSellerForm((value) => ({ ...value, fixedFeeInf: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Max budget</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sellerForm.maxBudgetInf}
                  onChange={(event) => setSellerForm((value) => ({ ...value, maxBudgetInf: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Input MTok</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={sellerForm.inputPricePerMTokInf}
                  onChange={(event) => setSellerForm((value) => ({ ...value, inputPricePerMTokInf: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Output MTok</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={sellerForm.outputPricePerMTokInf}
                  onChange={(event) => setSellerForm((value) => ({ ...value, outputPricePerMTokInf: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Max input tokens</span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={sellerForm.maxInputTokens}
                  onChange={(event) => setSellerForm((value) => ({ ...value, maxInputTokens: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Max output tokens</span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={sellerForm.maxOutputTokens}
                  onChange={(event) => setSellerForm((value) => ({ ...value, maxOutputTokens: Number(event.target.value) }))}
                />
              </label>
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={sellerForm.publishOnChain}
                onChange={(event) => setSellerForm((value) => ({ ...value, publishOnChain: event.target.checked }))}
              />
              <span>Publish to Hedera ProxyRegistry</span>
            </label>
            <label className="field">
              <span>Summary</span>
              <textarea
                className="compact-textarea"
                rows={3}
                value={sellerForm.summary}
                onChange={(event) => setSellerForm((value) => ({ ...value, summary: event.target.value }))}
              />
            </label>
            <button
              className="primary"
              type="button"
              disabled={sellerLoading || !sellerForm.sellerId.trim() || !sellerForm.hederaAccount.trim()}
              onClick={() => void runSellerRegistration()}
            >
              {sellerLoading ? <LoaderCircle className="spin" size={18} /> : <Store size={18} />}
              {sellerForm.publishOnChain ? "Publish seller" : "Save seller"}
            </button>
            {sellerError ? <p className="error">{sellerError}</p> : null}
            {sellerResult ? (
              <div className={sellerResult.status === "blocked" ? "seller-result blocked-result" : "seller-result"}>
                <strong>{sellerResult.message}</strong>
                {sellerResult.missing.length ? <span>Missing {sellerResult.missing.join(", ")}</span> : null}
                {sellerResult.hashScanUrl ? (
                  <a href={sellerResult.hashScanUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    Open seller registry transaction
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="order-grid">
          <form
            className="order-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void runOrder();
            }}
          >
            <div className="segmented" aria-label="Mode">
              {(["quick-buy", "router-agent"] as OrderMode[]).map((candidate) => (
                <button
                  type="button"
                  key={candidate}
                  className={candidate === mode ? "active" : ""}
                  onClick={() => setMode(candidate)}
                >
                  {candidate === "quick-buy" ? <CircleDollarSign size={17} /> : <Route size={17} />}
                  {modeLabel(candidate)}
                </button>
              ))}
            </div>

            <label className="field">
              <span>Prompt</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={8} />
            </label>

            <label className="field">
              <span>Budget</span>
              <input
                type="number"
                min="0.01"
                max="10"
                step="0.01"
                value={budgetInf}
                onChange={(event) => setBudgetInf(Number(event.target.value))}
              />
            </label>

            <button className="primary" type="submit" disabled={loading || !prompt.trim()}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
              Run
            </button>

            {error ? <p className="error">{error}</p> : null}
          </form>

          <section className="status-panel">
            <div className="status-head">
              <div>
                <p className="eyebrow">Order</p>
                <h2>{result?.orderId ?? "Not started"}</h2>
              </div>
              <BadgeCheck size={22} />
            </div>

            <div className="status-list">
              <div>
                <span>Route</span>
                <strong>{selectedSeller?.displayName ?? "Waiting"}</strong>
              </div>
              <div>
                <span>Proof</span>
                <strong>{result?.proofStatus ?? "Pending"}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{result?.paymentStatus ?? "Pending"}</strong>
              </div>
            </div>

            {result?.hederaAudit.hashScanUrl ? (
              <a className="hashscan" href={result.hederaAudit.hashScanUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={17} />
                Open HashScan transaction
              </a>
            ) : (
              <div className="blocked">
                <ShieldCheck size={17} />
                {result?.hederaAudit.missing?.length
                  ? `Missing ${result.hederaAudit.missing.join(", ")}`
                  : "HashScan link appears after Hedera submission"}
              </div>
            )}

            <div className="escrow-status">
              <button
                className="secondary"
                type="button"
                disabled={escrowLoading || !result || !selectedRegistryOfferId}
                onClick={() => void prepareEscrowOrder()}
              >
                {escrowLoading ? <LoaderCircle className="spin" size={18} /> : <CircleDollarSign size={18} />}
                Prepare x402 escrow
              </button>
              {result && !selectedRegistryOfferId ? (
                <div className="blocked">
                  <Store size={17} />
                  Seller needs a registry offer id
                </div>
              ) : null}
              {escrowError ? <p className="error">{escrowError}</p> : null}
              {escrowResult ? (
                <div className={escrowResult.status === "blocked" ? "escrow-result blocked-text" : "escrow-result"}>
                  <strong>{escrowResult.status}</strong>
                  <span>{escrowResult.message}</span>
                  {escrowResult.preparedTransaction ? (
                    <code>{escrowResult.preparedTransaction.functionParametersHex.slice(0, 42)}...</code>
                  ) : null}
                  {escrowResult.hashScanUrl ? (
                    <a href={escrowResult.hashScanUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} />
                      Open escrow transaction
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </section>

        <section className="market">
          <div className="section-title">
            <Sparkles size={18} />
            Sellers
          </div>
          <div className="seller-grid">
            {offers.map((offer) => (
              <article
                key={offer.offerId}
                className={selectedSeller?.offerId === offer.offerId ? "seller selected" : "seller"}
              >
                <div>
                  <h3>{offer.displayName}</h3>
                  <p>{offer.summary}</p>
                  <span className={`registry-badge ${offer.registryStatus}`}>{offer.registryStatus}</span>
                </div>
                <strong>{money(offer.fixedFeeInf)}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="result-grid">
          <article className="answer">
            <div className="section-title">
              <Sparkles size={18} />
              Answer
            </div>
            <p>{result?.answer ?? "Run an order to generate the first response."}</p>
          </article>

          <article className="timeline">
            <div className="section-title">
              <Activity size={18} />
              Timeline
            </div>
            {(result?.timeline ?? []).map((item) => (
              <div key={item.label} className={`step ${item.status}`}>
                <span />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </article>
        </section>
      </section>
    </main>
  );
}
