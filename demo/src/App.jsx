import { useState, useEffect, useRef } from "react";
import "./App.css";

const SETTLEMENT = { escrow: 5000, creator: 3500, manager: 500, affiliate: 250, protocol: 150, refund: 600 };

const MARKETS = [
  { flag: "🇺🇸", city: "New York", handle: "@jordanfan92", followers: "480K" },
  { flag: "🇬🇧", city: "London", handle: "@uksnkrhead", followers: "1.2M" },
  { flag: "🇯🇵", city: "Tokyo", handle: "@tokyokicks", followers: "2.1M" },
  { flag: "🇫🇷", city: "Paris", handle: "@parisdrops", followers: "890K" },
  { flag: "🇧🇷", city: "São Paulo", handle: "@spkickz", followers: "640K" },
  { flag: "🇦🇪", city: "Dubai", handle: "@dubaisneaks", followers: "1.5M" },
];

export default function App() {
  const [status, setStatus] = useState("idle");
  const [flowStep, setFlowStep] = useState(0);
  const [activeMarket, setActiveMarket] = useState(null);
  const [earned, setEarned] = useState(0);
  const [protocolFee, setProtocolFee] = useState(0);
  const [settlements, setSettlements] = useState(0);
  const [totalReach, setTotalReach] = useState(0);
  const [log, setLog] = useState([]);
  const intervalRef = useRef(null);
  const mktIdx = useRef(0);

  const addLog = (msg) => setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 6));

  const runCycle = () => {
    const mkt = MARKETS[mktIdx.current % MARKETS.length];
    mktIdx.current++;
    setActiveMarket(mkt);
    setFlowStep(1);
    addLog(`${mkt.flag} ${mkt.city} — Nike AI locked $5,000 USDC escrow`);
    setTimeout(() => { setFlowStep(2); addLog(`3% protocol fee → Prmission treasury`); }, 1000);
    setTimeout(() => {
      setFlowStep(3);
      addLog(`✓ $3,500 settled to ${mkt.handle} · ${mkt.city}`);
      setEarned(p => p + SETTLEMENT.creator);
      setProtocolFee(p => p + SETTLEMENT.protocol);
      setSettlements(p => p + 1);
      setTotalReach(p => p + Math.floor(Math.random() * 900000 + 400000));
    }, 2200);
    setTimeout(() => { setFlowStep(0); }, 3400);
  };

  const start = () => {
    if (status === "running") return;
    setStatus("running");
    addLog("🌍 Nike Global Campaign activated — Air Force 1 LA Drop");
    intervalRef.current = setInterval(runCycle, 4000);
  };

  const pause = () => { setStatus("paused"); clearInterval(intervalRef.current); addLog("Campaign paused"); };
  const stop = () => { setStatus("idle"); clearInterval(intervalRef.current); setFlowStep(0); setActiveMarket(null); addLog("Campaign stopped"); };
  const reset = () => { stop(); setEarned(0); setProtocolFee(0); setSettlements(0); setTotalReach(0); setLog([]); mktIdx.current = 0; };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(2)}M` : n >= 1000 ? `$${(n/1000).toFixed(1)}K` : `$${n}`;
  const fmtReach = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;

  return (
    <div className="app">

      {/* Hero */}
      <div className="hero">
        <div className="hero-left">
          <svg className="nike-logo" viewBox="0 0 148 56" fill="#E00000"><path d="M18.4 56L148 7.2C136.5 2.5 123.2 0 109.2 0 75.4 0 46.3 16.3 28.4 40.9L0 49.2 18.4 56Z"/></svg>
          <div>
            <div className="hero-title">AIR FORCE 1 — LOS ANGELES</div>
            <div className="hero-sub">Global AI Agent Campaign · Instagram · 6 Markets · Base Mainnet</div>
          </div>
        </div>
        <div className="hero-right">
          <div className="prmission-pill">⬡ PRMISSION PROTOCOL</div>
          <div className="hero-badge-sub">96 Tests Passing · ERC-8004 · Hardcoded 3%</div>
        </div>
      </div>

      {/* Shoe Banner */}
      <div className="shoe-banner">
        <div className="shoe-banner-left">
          <div className="shoe-img-container">
            <div className="shoe-img">
              <div className="shoe-gradient" />
              <div className="shoe-af1">AF1</div>
              <div className="shoe-la">LOS ANGELES</div>
              <div className="shoe-details">
                <span>Iridescent Copper</span>
                <span>·</span>
                <span>Ostrich Emboss</span>
                <span>·</span>
                <span>Gold Hardware</span>
              </div>
            </div>
          </div>
        </div>
        <div className="shoe-banner-right">
          <div className="drop-label">GLOBAL DROP</div>
          <div className="drop-title">JUST DO IT.</div>
          <div className="drop-price">$185 USD</div>
          <div className="drop-markets">
            {MARKETS.map((m, i) => (
              <div key={i} className={`market-pill ${activeMarket?.city === m.city ? "active" : ""}`}>
                {m.flag} {m.city}
              </div>
            ))}
          </div>
          <div className="drop-escrow">Campaign Escrow: <strong>$5,000 USDC per market</strong></div>
        </div>
      </div>

      <div className="main-layout">

        {/* LEFT: Phone */}
        <div className="phone-wrap">
          <div className="phone">
            <div className="phone-notch" />
            <div className="phone-status-bar"><span>9:41</span><span>🔋</span></div>

            <div className="ig-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig1)" strokeWidth="2"/>
                <circle cx="12" cy="12" r="4" stroke="url(#ig1)" strokeWidth="2"/>
                <circle cx="17.5" cy="6.5" r="1" fill="url(#ig1)"/>
                <defs><linearGradient id="ig1" x1="2" y1="22" x2="22" y2="2"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
              </svg>
              <span className="ig-wordmark">Instagram</span>
              <span>🔔</span>
            </div>

            <div className="post-card">
              <div className="post-header">
                <div className="post-avatar">
                  {activeMarket ? activeMarket.flag : "🇺🇸"}
                </div>
                <div className="post-meta">
                  <div className="post-handle">{activeMarket ? activeMarket.handle.replace("@","") : "jordanfan92"}</div>
                  <div className="post-sponsored">Sponsored · <span className="red">Nike ✓</span></div>
                </div>
                <div className="post-more">···</div>
              </div>

              <div className="post-image">
                <div className="shoe-post-bg">
                  <div className="shoe-post-glow" />
                  <div className="shoe-post-inner">
                    <div className="shoe-post-af1">AIR FORCE 1</div>
                    <div className="shoe-post-emoji">👟✨</div>
                    <div className="shoe-post-la">LOS ANGELES</div>
                    <div className="shoe-post-color">Iridescent Copper · Black</div>
                  </div>
                  <svg className="shoe-post-swoosh" viewBox="0 0 148 56" fill="white" opacity="0.08"><path d="M18.4 56L148 7.2C136.5 2.5 123.2 0 109.2 0 75.4 0 46.3 16.3 28.4 40.9L0 49.2 18.4 56Z"/></svg>
                  <div className={`live-pill ${status === "running" ? "on" : ""}`}>{status === "running" ? "● LIVE GLOBALLY" : "● READY"}</div>
                  {activeMarket && <div className="market-overlay">{activeMarket.flag} {activeMarket.city}</div>}
                </div>
              </div>

              <div className="post-actions">
                <div className="post-al"><span>🤍</span><span>💬</span><span>📤</span></div>
                <span>🔖</span>
              </div>
              <div className="post-likes"><strong>{settlements > 0 ? fmtReach(totalReach * 0.08) : "38.4K"} likes</strong></div>
              <div className="post-caption">
                <strong>{activeMarket ? activeMarket.handle.replace("@","") : "jordanfan92"}</strong> The new Air Force 1 Los Angeles just dropped and I'm obsessed 🔥🔥 Iridescent copper with ostrich emboss — this is insane. Link in bio. <span className="hashtag">#Nike #AirForce1 #LosAngeles #JustDoIt #Sponsored</span>
              </div>
            </div>

            <div className="ig-stats-row">
              <div className="ig-stat"><div className="ig-val">{totalReach > 0 ? fmtReach(totalReach) : "480K"}</div><div className="ig-lbl">Global Reach</div></div>
              <div className="ig-divider"/>
              <div className="ig-stat"><div className="ig-val">{settlements > 0 ? settlements : "0"}</div><div className="ig-lbl">Markets Live</div></div>
              <div className="ig-divider"/>
              <div className="ig-stat"><div className="ig-val">3.42%</div><div className="ig-lbl">Avg Engagement</div></div>
            </div>
          </div>
        </div>

        {/* RIGHT: Flow */}
        <div className="flow-panel">

          <div className="flow-header">
            <div className="flow-title">SETTLEMENT FLOW</div>
            <div className="flow-sub">Nike AI Agent pays creators directly on-chain · No middlemen · No delays · 6 global markets simultaneously</div>
          </div>

          <div className={`flow-box ${flowStep >= 1 ? "active" : ""}`}>
            <div className="flow-icon nike-bg">
              <svg width="40" height="15" viewBox="0 0 148 56" fill="white"><path d="M18.4 56L148 7.2C136.5 2.5 123.2 0 109.2 0 75.4 0 46.3 16.3 28.4 40.9L0 49.2 18.4 56Z"/></svg>
            </div>
            <div className="flow-body">
              <div className="flow-title-sm">Nike AI Agent</div>
              <div className="flow-addr">0x4a3f...d91c · Base Mainnet</div>
              <div className={`flow-amount ${flowStep >= 1 ? "red" : "muted"}`}>
                {flowStep >= 1 ? `$5,000 USDC locked — ${activeMarket?.city || ""} ${activeMarket?.flag || ""}` : "Scanning global Instagram creators..."}
              </div>
            </div>
            {status === "running" && <div className="pulse" />}
          </div>

          <div className={`connector ${flowStep >= 2 ? "lit" : ""}`}>
            <div className="conn-line"/>
            <div className="conn-badge">3% protocol fee · hardcoded · immutable</div>
            <div className="conn-line"/>
            <div className="conn-arrow">▼</div>
          </div>

          <div className={`flow-box ${flowStep >= 2 ? "active" : ""}`}>
            <div className="flow-icon protocol-bg">⬡</div>
            <div className="flow-body">
              <div className="flow-title-sm">Prmission Treasury</div>
              <div className="flow-addr">0x0c8B...223d · Base · Cannot be changed</div>
              <div className={`flow-amount ${flowStep >= 2 ? "red" : "muted"}`}>{fmtMoney(protocolFee)} USDC collected</div>
              <div className="flow-sub-text">3% of every settlement · on-chain · forever</div>
            </div>
            {flowStep >= 2 && <div className="recv-badge">● Receiving</div>}
          </div>

          <div className={`connector ${flowStep >= 3 ? "lit" : ""}`}>
            <div className="conn-line"/>
            <div className="conn-line"/>
            <div className="conn-arrow">▼</div>
          </div>

          <div className={`flow-box creator-box ${flowStep >= 3 ? "active" : ""}`}>
            <div className="flow-icon ig-bg">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig2)" strokeWidth="2"/>
                <circle cx="12" cy="12" r="4" stroke="url(#ig2)" strokeWidth="2"/>
                <circle cx="17.5" cy="6.5" r="1" fill="url(#ig2)"/>
                <defs><linearGradient id="ig2" x1="2" y1="22" x2="22" y2="2"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
              </svg>
            </div>
            <div className="flow-body">
              <div className="flow-title-sm">{activeMarket ? `${activeMarket.handle} · ${activeMarket.city} ${activeMarket.flag}` : "Global Creators · Instagram"}</div>
              <div className="flow-addr">{activeMarket ? `${activeMarket.followers} followers · Air Force 1 LA Post` : "480K–2.1M followers per market"}</div>
              <div className={`flow-amount big ${flowStep >= 3 ? "green-amt" : "muted"}`}>{fmtMoney(earned)} USDC</div>
              <div className="flow-sub-text">70% of escrow · settled atomically · Base mainnet</div>
            </div>
            {flowStep >= 3 && <div className="settled-badge">✓ Settled!</div>}
          </div>

          {/* Breakdown */}
          <div className="breakdown">
            <div className="breakdown-title">$5,000 USDC BREAKDOWN PER MARKET</div>
            <div className="brow"><span>Creator (Instagram Post)</span><span className="bval green-amt">$3,500 <em>70%</em></span></div>
            <div className="brow"><span>Campaign Manager</span><span className="bval">$500 <em>10%</em></span></div>
            <div className="brow"><span>Affiliate</span><span className="bval">$250 <em>5%</em></span></div>
            <div className="brow red-row"><span>Prmission Protocol Fee</span><span className="bval red">$150 <em>3% hardcoded</em></span></div>
            <div className="brow"><span>Nike Refund</span><span className="bval">$600 <em>12%</em></span></div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-val green-amt">{settlements}</div><div className="stat-lbl">Markets Settled</div></div>
            <div className="stat-card"><div className="stat-val green-amt">{fmtMoney(earned)}</div><div className="stat-lbl">Creator Earnings</div></div>
            <div className="stat-card"><div className="stat-val red">{fmtMoney(protocolFee)}</div><div className="stat-lbl">Protocol Revenue</div></div>
            <div className="stat-card"><div className="stat-val">{totalReach > 0 ? fmtReach(totalReach) : "0"}</div><div className="stat-lbl">Global Reach</div></div>
          </div>

          {log.length > 0 && (
            <div className="log-box">
              {log.map((l, i) => <div key={i} className={`log-line ${i === 0 ? "latest" : ""}`}>{l}</div>)}
            </div>
          )}
        </div>
      </div>

      <div className="controls">
        <button className="btn-pause" onClick={pause} disabled={status !== "running"}>⏸ Pause</button>
        <div className={`btn-status ${status}`}>{status === "running" ? "● LIVE GLOBALLY" : status === "paused" ? "⏸ PAUSED" : "○ READY"}</div>
        <button className="btn-stop" onClick={stop} disabled={status === "idle"}>⏹ Stop</button>
      </div>
      <div className="controls-row2">
        <button className="btn-start" onClick={start} disabled={status === "running"}>▶ Launch Global Nike Campaign</button>
        <button className="btn-reset" onClick={reset}>↺ Reset</button>
        <a href="/dev" style={{marginLeft:8,background:"#00ff88",color:"#111",padding:"8px 18px",borderRadius:6,fontWeight:700,fontSize:"0.78rem",letterSpacing:"1px",textDecoration:"none",display:"inline-block"}}>⚡ Settlement Hub</a>
        <a href="/dev" style={{marginLeft:8,background:"#00ff88",color:"#111",padding:"8px 18px",borderRadius:6,fontWeight:700,fontSize:"0.78rem",letterSpacing:"1px",textDecoration:"none",display:"inline-block"}}>⚡ Settlement Hub</a>
      </div>

      <div className="footer-bar">
        <span>prmission.xyz</span><span>·</span><span>Base Mainnet</span><span>·</span><span>ERC-8004</span><span>·</span><span>96 Tests Passing ✓</span>
      </div>
    </div>
  );
}
