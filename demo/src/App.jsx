import { useMemo, useState } from "react";
import "./App.css";

const STATUS = {
  DRAFT: "Draft",
  FUNDED: "Funded",
  ACTIVE: "Active",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
};

const STARTING_CREATORS = [
  { id: "c1", handle: "@la.sole.story", wallet: "0x91e7...22c1", consented: false },
  { id: "c2", handle: "@sneakerpulse.la", wallet: "0x4ab3...11fe", consented: false },
  { id: "c3", handle: "@courtvision.creator", wallet: "0xb812...77aa", consented: false },
];

function isInstagramUrl(url) {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace("www.", "").toLowerCase();
    const p = u.pathname;
    return host === "instagram.com" && (p.includes("/p/") || p.includes("/reel/") || p.includes("/tv/"));
  } catch {
    return false;
  }
}

function fakeTx(prefix = "0x") {
  const chars = "abcdef0123456789";
  let out = prefix;
  for (let i = 0; i < 64; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function App() {
  const [campaign, setCampaign] = useState({
    name: "Nike AF1 Los Angeles Creator Campaign",
    brand: "Nike",
    budgetUSDC: 15000,
    payoutPerPost: 3500,
    protocolFeeBps: 300,
    hashtag: "#AirForce1 #LosAngeles #Nike",
    deadline: "2026-03-15",
    status: STATUS.DRAFT,
    escrowTx: "",
  });

  const [creators, setCreators] = useState(STARTING_CREATORS);
  const [selectedCreatorId, setSelectedCreatorId] = useState(STARTING_CREATORS[0].id);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [activity, setActivity] = useState(["Campaign initialized"]);

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);

  const approvedCount = submissions.filter((s) => s.status === STATUS.APPROVED || s.status === STATUS.PAID).length;
  const paidCount = submissions.filter((s) => s.status === STATUS.PAID).length;

  const totals = useMemo(() => {
    const payout = paidCount * campaign.payoutPerPost;
    const fee = Math.round((payout * campaign.protocolFeeBps) / 10000);
    return {
      payout,
      fee,
      escrowRemaining: Math.max(0, campaign.budgetUSDC - payout - fee),
    };
  }, [paidCount, campaign.payoutPerPost, campaign.protocolFeeBps, campaign.budgetUSDC]);

  const addActivity = (line) => setActivity((prev) => [line, ...prev].slice(0, 12));

  const fundEscrow = () => {
    if (campaign.status !== STATUS.DRAFT) return;
    const tx = fakeTx();
    setCampaign((c) => ({ ...c, status: STATUS.FUNDED, escrowTx: tx }));
    addActivity(`Escrow funded: ${campaign.budgetUSDC} USDC (tx ${tx.slice(0, 10)}...)`);
  };

  const activateCampaign = () => {
    if (campaign.status !== STATUS.FUNDED) return;
    setCampaign((c) => ({ ...c, status: STATUS.ACTIVE }));
    addActivity("Campaign is active and accepting creator submissions");
  };

  const toggleConsent = (id) => {
    setCreators((list) =>
      list.map((c) => (c.id === id ? { ...c, consented: !c.consented } : c))
    );
    const creator = creators.find((c) => c.id === id);
    if (creator) addActivity(`${creator.handle} ${creator.consented ? "revoked" : "granted"} consent`);
  };

  const submitProof = () => {
    if (campaign.status !== STATUS.ACTIVE) return;
    if (!selectedCreator) return;
    if (!selectedCreator.consented) {
      addActivity(`${selectedCreator.handle} cannot submit: consent missing`);
      return;
    }
    if (!isInstagramUrl(submissionUrl)) {
      addActivity("Submission rejected: invalid Instagram URL");
      return;
    }
    const newItem = {
      id: `s${Date.now()}`,
      creatorId: selectedCreator.id,
      handle: selectedCreator.handle,
      url: submissionUrl.trim(),
      submittedAt: new Date().toLocaleString(),
      status: STATUS.SUBMITTED,
      payoutTx: "",
    };
    setSubmissions((prev) => [newItem, ...prev]);
    setSubmissionUrl("");
    setCampaign((c) => ({ ...c, status: STATUS.SUBMITTED }));
    addActivity(`${selectedCreator.handle} submitted Instagram post proof`);
  };

  const updateSubmission = (id, nextStatus) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (nextStatus === STATUS.PAID) {
          return { ...s, status: STATUS.PAID, payoutTx: fakeTx() };
        }
        return { ...s, status: nextStatus };
      })
    );

    if (nextStatus === STATUS.APPROVED) {
      setCampaign((c) => ({ ...c, status: STATUS.APPROVED }));
      addActivity(`Submission approved (${id})`);
    }
    if (nextStatus === STATUS.REJECTED) addActivity(`Submission rejected (${id})`);
    if (nextStatus === STATUS.PAID) {
      setCampaign((c) => ({ ...c, status: STATUS.PAID }));
      addActivity(`USDC settled for submission ${id}`);
    }
  };

  return (
    <div className="real-app">
      <header className="top">
        <div>
          <p className="eyebrow">PRMISSION PROTOCOL</p>
          <h1>Instagram Creator Escrow Settlement</h1>
          <p className="sub">
            Real flow: brand escrow, creator consent, Instagram proof URL, approval, and on-chain payout.
          </p>
        </div>
        <div className="status-chip">{campaign.status}</div>
      </header>

      <section className="grid">
        <article className="card">
          <h2>Campaign Setup</h2>
          <label>Campaign Name</label>
          <input value={campaign.name} onChange={(e) => setCampaign((c) => ({ ...c, name: e.target.value }))} />
          <label>Hashtag Requirements</label>
          <input value={campaign.hashtag} onChange={(e) => setCampaign((c) => ({ ...c, hashtag: e.target.value }))} />
          <div className="row3">
            <div>
              <label>Budget (USDC)</label>
              <input
                type="number"
                value={campaign.budgetUSDC}
                onChange={(e) => setCampaign((c) => ({ ...c, budgetUSDC: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label>Payout / Post</label>
              <input
                type="number"
                value={campaign.payoutPerPost}
                onChange={(e) => setCampaign((c) => ({ ...c, payoutPerPost: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label>Fee %</label>
              <input value={(campaign.protocolFeeBps / 100).toFixed(2)} disabled />
            </div>
          </div>
          <div className="actions">
            <button onClick={fundEscrow} disabled={campaign.status !== STATUS.DRAFT}>Fund Escrow</button>
            <button onClick={activateCampaign} disabled={campaign.status !== STATUS.FUNDED}>Activate</button>
          </div>
          {campaign.escrowTx && <p className="mono">Escrow tx: {campaign.escrowTx}</p>}
        </article>

        <article className="card">
          <h2>Creator Consent</h2>
          {creators.map((c) => (
            <div key={c.id} className="creator-row">
              <div>
                <strong>{c.handle}</strong>
                <p className="mono">{c.wallet}</p>
              </div>
              <button className={c.consented ? "ok" : ""} onClick={() => toggleConsent(c.id)}>
                {c.consented ? "Consented" : "Grant Consent"}
              </button>
            </div>
          ))}
        </article>

        <article className="card full">
          <h2>Instagram Submission</h2>
          <div className="submit-row">
            <select value={selectedCreatorId} onChange={(e) => setSelectedCreatorId(e.target.value)}>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>{c.handle}</option>
              ))}
            </select>
            <input
              placeholder="https://www.instagram.com/p/... or /reel/..."
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
            />
            <button onClick={submitProof}>Submit Proof</button>
          </div>
          <p className="note">
            Validation in MVP checks Instagram URL format. Production should verify media ownership via Meta Graph API.
          </p>

          <div className="table">
            <div className="thead">
              <span>Creator</span><span>Instagram URL</span><span>Submitted</span><span>Status</span><span>Actions</span>
            </div>
            {submissions.length === 0 && <div className="empty">No submissions yet.</div>}
            {submissions.map((s) => (
              <div className="trow" key={s.id}>
                <span>{s.handle}</span>
                <a href={s.url} target="_blank" rel="noreferrer">Open post</a>
                <span>{s.submittedAt}</span>
                <span className="badge">{s.status}</span>
                <span className="btns">
                  <button disabled={s.status !== STATUS.SUBMITTED} onClick={() => updateSubmission(s.id, STATUS.APPROVED)}>Approve</button>
                  <button disabled={s.status !== STATUS.SUBMITTED} onClick={() => updateSubmission(s.id, STATUS.REJECTED)}>Reject</button>
                  <button disabled={s.status !== STATUS.APPROVED} onClick={() => updateSubmission(s.id, STATUS.PAID)}>Settle</button>
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Settlement Summary</h2>
          <p><strong>Approved Posts:</strong> {approvedCount}</p>
          <p><strong>Paid Posts:</strong> {paidCount}</p>
          <p><strong>Creator Payout:</strong> {totals.payout.toLocaleString()} USDC</p>
          <p><strong>Protocol Fee (3%):</strong> {totals.fee.toLocaleString()} USDC</p>
          <p><strong>Escrow Remaining:</strong> {totals.escrowRemaining.toLocaleString()} USDC</p>
        </article>

        <article className="card">
          <h2>Activity Log</h2>
          <ul className="log">
            {activity.map((line, i) => <li key={`${line}-${i}`}>{line}</li>)}
          </ul>
        </article>
      </section>
    </div>
  );
}
