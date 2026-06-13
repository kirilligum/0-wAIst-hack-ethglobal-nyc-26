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
import { createOrder, fetchOffers } from "./api.js";

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
