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
  Sparkles
} from "lucide-react";
import { Offer, OrderMode, OrderResult } from "@0waist/schemas";
import { createOrder, fetchOffers, HederaSetupResult, setupHedera } from "./api.js";

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

  useEffect(() => {
    fetchOffers()
      .then(setOffers)
      .catch((err: Error) => setError(err.message));
  }, []);

  const selectedSeller = useMemo(() => {
    if (!result) return null;
    return offers.find((offer) => offer.offerId === result.selectedOffer.offerId) ?? result.selectedOffer;
  }, [offers, result]);

  async function runOrder() {
    setLoading(true);
    setError(null);
    try {
      const next = await createOrder({ prompt, budgetInf, mode });
      setResult(next);
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
