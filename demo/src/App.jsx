import { useState } from "react";
import "./App.css";

const CREATORS = [
  { handle: "@jordanfan92", category: "apparel", followers: "480K", engagement: "3.42%", floor: "$500", wallet: "0xCreator...abc" },
  { handle: "@techreview99", category: "electronics", followers: "1.2M", engagement: "2.1%", floor: "$800", wallet: "0xCreator...def" },
  { handle: "@fitnessguru", category: "wellness", followers: "320K", engagement: "5.8%", floor: "$350", wallet: "0xCreator...ghi" },
];

const STEPS = [
  { id: 1, label: "Agent Discovers Creators", icon: "🔍" },
  { id: 2, label: "Campaign Created & Escrow Locked", icon: "🔒" },
  { id: 3, label: "Campaign Runs On-Chain", icon: "📡" },
  { id: 4, label: "Outcome Reported", icon: "📊" },
  { id: 5, label: "Atomic Settlement", icon: "✅" },
];

const SETTLEMENT = {
  escrow: 1000,
  creator: 700,
  manager: 100,
  affiliate: 50,
  protocol: 30,
  brandRefund: 120,
};

export default function App() {
  const [step, setStep] = useState(0);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [running, setRunning] = useState(false);
  const [settled, setSettled] = useState(false);

  const runStep = async () => {
    if (running) return;
    setRunning(true);
    await new Promise(r => setTimeout(r, 800));
    const next = step + 1;
    setStep(next);
    if (next === 1) setSelectedCreator(CREATORS[0]);
    if (next === 5) setSettled(true);
    setRunning(false);
  };

  const reset = () => { setStep(0); setSelectedCreator(null); setSettled(false); };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">⬡ Prmission Protocol</div>
        <div className="badge">Base Mainnet · USDC · ERC-8004</div>
      </header>

      <div className="hero">
        <h1>AI Agent Creator Economy</h1>
        <p>Nike's AI agent discovers creators, locks USDC escrow, and settles atomically — no humans required.</p>
      </div>

      <div className="stepper">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`step ${i < step ? "done" : i === step - 1 ? "active" : ""}`}>
            <div className="step-icon">{i < step ? "✔" : s.icon}</div>
            <div className="step-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="panels">
        <div className="panel">
          <h2>🤖 Nike AI Agent</h2>
          <div className="agent-box">
            <div className="agent-line">Budget: <strong>$1,000 USDC</strong></div>
            <div className="agent-line">Category: <strong>Apparel</strong></div>
            <div className="agent-line">Format: <strong>Instagram Post</strong></div>
            <div className="agent-line">Creator Split: <strong>70%</strong></div>
            <div className="agent-line">Manager Split: <strong>10%</strong></div>
            {selectedCreator && (
              <div className="selected-creator">
                <div className="agent-line">Selected: <strong>{selectedCreator.handle}</strong></div>
                <div className="agent-line">Followers: <strong>{selectedCreator.followers}</strong></div>
                <div className="agent-line">Engagement: <strong>{selectedCreator.engagement}</strong></div>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <h2>📋 Creator Registry</h2>
          <div className="creator-list">
            {CREATORS.map((c, i) => (
              <div key={i} className={`creator-card ${selectedCreator?.handle === c.handle ? "highlighted" : ""}`}>
                <div className="creator-handle">{c.handle}</div>
                <div className="creator-meta">{c.category} · {c.followers} · {c.engagement} eng · {c.floor} floor</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {step >= 2 && (
        <div className="escrow-bar">
          <h2>🔒 Escrow Locked: $1,000 USDC</h2>
          <div className="tx-hash">tx: 0x4a3f...d91c → PrmissionRegistry on Base</div>
        </div>
      )}

      {step >= 4 && (
        <div className="outcome-bar">
          <h2>📊 Campaign Outcome Reported</h2>
          <div className="outcome-stats">
            <div className="stat"><span>480K</span>Impressions</div>
            <div className="stat"><span>3,400</span>Clicks</div>
            <div className="stat"><span>92</span>Conversions</div>
          </div>
        </div>
      )}

      {settled && (
        <div className="settlement">
          <h2>✅ Atomic Settlement Complete</h2>
          <div className="settlement-grid">
            <div className="split-row creator"><span>Creator (@jordanfan92)</span><strong>${SETTLEMENT.creator}</strong></div>
            <div className="split-row manager"><span>Manager</span><strong>${SETTLEMENT.manager}</strong></div>
            <div className="split-row affiliate"><span>Affiliate</span><strong>${SETTLEMENT.affiliate}</strong></div>
            <div className="split-row protocol"><span>Protocol Fee (3%)</span><strong>${SETTLEMENT.protocol}</strong></div>
            <div className="split-row refund"><span>Brand Refund</span><strong>${SETTLEMENT.brandRefund}</strong></div>
          </div>
          <div className="tx-hash">Settlement tx: 0x9b2e...f34a · Base Mainnet</div>
        </div>
      )}

      <div className="controls">
        {step < 5 ? (
          <button className="btn-primary" onClick={runStep} disabled={running}>
            {running ? "Processing..." : step === 0 ? "▶ Start Demo" : `Step ${step + 1}: ${STEPS[step].label}`}
          </button>
        ) : (
          <button className="btn-secondary" onClick={reset}>↺ Reset Demo</button>
        )}
      </div>

      <footer className="footer">
        <a href="https://github.com/marcosbenaim-hub/Prmission-Protocol" target="_blank">GitHub</a>
        <span>·</span>
        <a href="https://prmission.xyz" target="_blank">prmission.xyz</a>
        <span>·</span>
        <span>Base Mainnet · 96 Tests Passing</span>
      </footer>
    </div>
  );
}
