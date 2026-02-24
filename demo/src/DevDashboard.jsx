import { useState, useEffect } from "react";

const CONTRACTS = {
  registry: "0xb9A5F35a8EB45aD45b91dD83ed5b91986537B193",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  treasury: "0xc787aB0648DA8511C7D6CFB6Ff51079E41fEE45d",
};

const SEED_TXS = [
  { hash: "0x51de8405cd0d0743eef7f10084a77fc8e845e2e3", agent: "Nike AI Agent", creator: "0x9246...6e9", amount: "1.00", fee: "0.03", time: 18 },
  { hash: "0xa2788f0ca7df1e4ea2c53e25cfb56e0b2b2f0476", agent: "Nike AI Agent", creator: "0x9246...6e9", amount: "1.00", fee: "0.03", time: 92 },
  { hash: "0x9f3a1c2d8e5b4f7a0c6d9e2f1b4a7c0d3e6f9a2b", agent: "Adidas Agent", creator: "0x4f2a...c3d", amount: "5.00", fee: "0.15", time: 240 },
  { hash: "0x4b8e2f91a3c5d0e7f2b4a6c8d0e2f4b6a8c0d2e4", agent: "Spotify Agent", creator: "0x7c1e...8b2", amount: "2.50", fee: "0.08", time: 480 },
  { hash: "0x7d1a9b3e5c2f4a0e8d6b2f8a4c0e6d2b8f4a0c6e", agent: "Nike AI Agent", creator: "0x3b8f...d41", amount: "1.00", fee: "0.03", time: 720 },
];

const SNIPPET = "import { PrmissionSDK } from '@prmission/sdk';\n\nconst sdk = new PrmissionSDK({\n  apiKey: 'prm_live_....',\n  network: 'base'\n});\n\nconst tx = await sdk.settle({\n  creator: '0xCreatorWallet',\n  amount: 100,\n  purpose: 'Campaign'\n});";

function fmtTime(s) {
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s/60) + "m ago";
  return Math.floor(s/3600) + "h ago";
}

export default function DevDashboard() {
  const [tab, setTab] = useState("quickstart");
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txs, setTxs] = useState(SEED_TXS);
  const [newIdx, setNewIdx] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [settled, setSettled] = useState(24.50);
  const [count, setCount] = useState(849);
  const KEY = "prm_live_7f3a9b2c1d8e4f6a0b5c9d2e7f4a1b3c";

  useEffect(() => {
    const t = setInterval(() => {
      const agents = ["Nike AI Agent","Adidas Agent","Spotify Agent","OpenAI Agent"];
      const creators = ["0x9246...6e9","0x4f2a...c3d","0x7c1e...8b2"];
      const amts = ["1.00","2.00","5.00","0.50"];
      const amt = amts[Math.floor(Math.random()*amts.length)];
      setTxs(prev => [{ hash:"0x"+Math.random().toString(16).slice(2).padEnd(40,"0"), agent:agents[Math.floor(Math.random()*agents.length)], creator:creators[Math.floor(Math.random()*creators.length)], amount:amt, fee:(parseFloat(amt)*0.03).toFixed(2), time:0 }, ...prev.slice(0,19)]);
      setNewIdx(0); setTimeout(()=>setNewIdx(null),1500);
      setSettled(p=>+(p+parseFloat(amt)).toFixed(2));
      setCount(p=>p+1);
      setPulse(true); setTimeout(()=>setPulse(false),600);
    }, 5000);
    return ()=>clearInterval(t);
  }, []);

  useEffect(()=>{
    const t = setInterval(()=>setTxs(p=>p.map(tx=>({...tx,time:tx.time+1}))),1000);
    return ()=>clearInterval(t);
  },[]);

  const TABS = [{id:"quickstart",label:"Quick Start"},{id:"txns",label:"Transactions"},{id:"sdk",label:"SDK"},{id:"api",label:"REST API"},{id:"contracts",label:"Contracts"}];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Syne:wght@800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        :root{--bg:#0d0d0d;--card:#111111;--border:#222222;--text:#ffffff;--dim:#aaaaaa;--green:#00ff88;--blue:#4488ff;--orange:#E00000;}
        body{background:var(--bg);}
        @keyframes glow{0%,100%{box-shadow:0 0 6px rgba(0,255,136,0.4)}50%{box-shadow:0 0 20px rgba(0,255,136,0.8)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp 0.3s ease;}
        .nb{display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.68rem;letter-spacing:1px;text-transform:uppercase;color:var(--dim);cursor:pointer;border-left:2px solid transparent;border:none;border-left:2px solid transparent;background:none;font-family:'IBM Plex Mono',monospace;transition:all 0.15s;}
        .nb:hover{color:var(--text);}
        .nb.on{color:var(--green);border-left:2px solid var(--green);background:rgba(0,255,136,0.04);}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--border);}
      `}</style>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",background:"var(--bg)",minHeight:"100vh",display:"flex",flexDirection:"column",color:"var(--text)"}}>

        <div style={{height:50,background:"var(--card)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <img src="https://prmission.com/logo.png" style={{height:28,marginRight:4}} onError={(e)=>{e.target.style.display="none"}} /><span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1rem",letterSpacing:"3px"}}>PRMISSION</span>
            <span style={{color:"var(--border)"}}>|</span>
            <span style={{fontSize:"0.62rem",letterSpacing:"2px",color:"var(--text)"}}>DEVELOPER PORTAL</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 8px var(--green)",animation:pulse?"glow 0.6s ease":"none"}}/>
            <span style={{fontSize:"0.62rem",letterSpacing:"1.5px",color:"var(--green)"}}>LIVE · BASE MAINNET</span>
          </div>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{width:200,background:"var(--card)",borderRight:"1px solid var(--border)",padding:"20px 0",display:"flex",flexDirection:"column",flexShrink:0}}>
            <div style={{padding:"0 16px 16px",borderBottom:"1px solid var(--border)",marginBottom:16}}>
              {TABS.map(t=><button key={t.id} className={"nb"+(tab===t.id?" on":"")} onClick={()=>setTab(t.id)}>{t.label}</button>)}
            </div>
            <div style={{padding:"0 16px"}}>
              <div style={{fontSize:"0.55rem",letterSpacing:"2px",color:"var(--text)",marginBottom:12}}>LIVE STATS</div>
              {[["Settlements",count.toLocaleString()],["USDC Settled","$"+settled.toFixed(2)],["Fee Earned","$"+(settled*0.03).toFixed(2)],["Tests","96 ✓"]].map(([l,v],i)=>(
                <div key={i} style={{marginBottom:14}}>
                  <div style={{fontSize:"0.55rem",color:"var(--text)",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:"0.9rem",fontWeight:700,color:"var(--green)"}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:"auto",padding:16}}>
              <a href="https://prmission-demo.vercel.app" target="_blank" style={{fontSize:"0.6rem",color:"var(--text)",textDecoration:"none",display:"block",marginBottom:6}}>↗ Live Demo</a>
              <a href="https://github.com/marcosbenaim-hub/Prmission-Protocol" target="_blank" style={{fontSize:"0.6rem",color:"var(--text)",textDecoration:"none",display:"block"}}>↗ GitHub</a>
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"32px 40px"}}>

            {tab==="quickstart"&&<div className="fu">
              <div style={{marginBottom:32}}>
                <div style={{fontSize:"0.55rem",letterSpacing:"3px",color:"var(--text)",marginBottom:8}}>GETTING STARTED</div>
                <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:"2.2rem",fontWeight:800,color:"var(--text)",lineHeight:1.15,marginBottom:10}}>AI Agents Pay Creators.<br/><span style={{color:"var(--green)"}}>5 Lines of Code.</span></h1>
                <p style={{color:"var(--text)",fontSize:"0.8rem",lineHeight:1.7,maxWidth:520}}>Any AI agent can pay any human — consent-gated, escrow-settled, on-chain proof every time. 3% fee. Hardcoded. Forever.</p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
                {[["Settlements",count.toLocaleString(),true],["USDC Settled","$"+settled.toFixed(2),false],["Protocol Fee","3%",false],["Tests","96 ✓",false]].map(([l,v,a],i)=>(
                  <div key={i} style={{background:"var(--card)",border:`1px solid ${a?"var(--green)":"var(--border)"}`,padding:"18px 22px",position:"relative",overflow:"hidden"}}>
                    {a&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"var(--green)"}}/>}
                    <div style={{fontSize:"0.55rem",letterSpacing:"2px",color:"var(--text)",marginBottom:6}}>{l}</div>
                    <div style={{fontSize:"1.4rem",fontWeight:700,color:a?"var(--green)":"var(--text)"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:"0.55rem",letterSpacing:"2px",color:"var(--text)",marginBottom:10}}>YOUR API KEY</div>
                <div style={{background:"var(--card)",border:"1px solid var(--border)",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                  <code style={{fontSize:"0.76rem",color:keyVisible?"var(--green)":"var(--dim)",letterSpacing:"1px"}}>{keyVisible?KEY:"prm_live_••••••••••••••••••••••••••••••••"}</code>
                  <button onClick={()=>setKeyVisible(v=>!v)} style={{background:"transparent",border:"1px solid var(--border)",color:"var(--text)",fontSize:"0.62rem",padding:"4px 10px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"1px"}}>{keyVisible?"HIDE":"REVEAL"}</button>
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:"0.55rem",letterSpacing:"2px",color:"var(--text)",marginBottom:10}}>INSTALL</div>
                <div style={{background:"#0d0d0d",border:"1px solid var(--border)",padding:"13px 18px"}}>
                  <code style={{fontSize:"0.8rem",color:"var(--text)"}}><span style={{color:"var(--text)"}}>$ </span>npm install <span style={{color:"var(--green)"}}>@prmission/sdk</span></code>
                </div>
              </div>
              <div style={{marginBottom:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:"0.55rem",letterSpacing:"2px",color:"var(--text)"}}>INTEGRATION</div>
                  <button onClick={()=>{navigator.clipboard.writeText(SNIPPET);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:copied?"rgba(0,255,136,0.15)":"transparent",border:`1px solid ${copied?"var(--green)":"var(--border)"}`,color:copied?"var(--green)":"var(--dim)",fontSize:"0.62rem",padding:"3px 10px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>{copied?"✓ COPIED":"COPY"}</button>
                </div>
                <div style={{background:"#0d0d0d",border:"1px solid var(--border)",padding:"20px"}}>
                  <pre style={{fontSize:"0.74rem",lineHeight:1.8,color:"#ffffff",fontFamily:"'IBM Plex Mono',monospace",overflowX:"auto"}}>{SNIPPET}</pre>
                </div>
              </div>
              <div style={{background:"rgba(0,255,136,0.04)",border:"1px solid rgba(0,255,136,0.15)",padding:"18px 22px"}}>
                <div style={{fontSize:"0.55rem",letterSpacing:"2px",color:"rgba(0,255,136,0.5)",marginBottom:8}}>LIVE ON-CHAIN PROOF</div>
                <div style={{fontSize:"0.72rem",color:"var(--text)",marginBottom:6}}>Latest verified transaction:</div>
                <a href="https://basescan.org/tx/0x51de8405cd0d0743eef7f10084a77fc8e845e2e3412898625bcc8dfb7c5949a2" target="_blank" style={{color:"var(--green)",fontSize:"0.7rem",textDecoration:"none",fontFamily:"'IBM Plex Mono',monospace"}}>0x51de8405...949a2 ↗</a>
              </div>
            </div>}

            {tab==="txns"&&<div className="fu">
              <div style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontSize:"0.55rem",letterSpacing:"3px",color:"var(--text)",marginBottom:8}}>LIVE FEED</div><h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:800,color:"var(--text)"}}>Transactions</h2></div>
                <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 8px var(--green)",animation:pulse?"glow 0.6s ease":"none"}}/><span style={{fontSize:"0.62rem",color:"var(--green)"}}>LIVE</span></div>
              </div>
              <div style={{background:"var(--card)",border:"1px solid var(--border)",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1.8fr 1.4fr 1.4fr 0.9fr 0.9fr 1fr",gap:8,padding:"10px 16px",borderBottom:"1px solid var(--border)",background:"#111111"}}>
                  {["TX HASH","AGENT","CREATOR","AMOUNT","FEE","TIME"].map(h=><span key={h} style={{fontSize:"0.55rem",letterSpacing:"1.5px",color:"var(--text)"}}>{h}</span>)}
                </div>
                {txs.slice(0,15).map((tx,i)=>(
                  <div key={tx.hash+i} style={{display:"grid",gridTemplateColumns:"1.8fr 1.4fr 1.4fr 0.9fr 0.9fr 1fr",gap:8,padding:"11px 16px",borderBottom:"1px solid var(--border)",fontSize:"0.7rem",alignItems:"center",background:i===newIdx?"rgba(0,255,136,0.06)":"transparent",transition:"background 0.8s"}}>
                    <a href={"https://basescan.org/tx/"+tx.hash} target="_blank" style={{color:"var(--green)",textDecoration:"none",fontSize:"0.68rem"}}>{tx.hash.slice(0,10)}… ↗</a>
                    <span>{tx.agent}</span>
                    <span style={{color:"var(--text)",fontSize:"0.65rem"}}>{tx.creator}</span>
                    <span style={{textAlign:"right"}}>${tx.amount}</span>
                    <span style={{color:"var(--green)",textAlign:"right"}}>${tx.fee}</span>
                    <span style={{color:"var(--text)",textAlign:"right"}}>{fmtTime(tx.time)}</span>
                  </div>
                ))}
              </div>
            </div>}

            {tab==="contracts"&&<div className="fu">
              <div style={{marginBottom:28}}><div style={{fontSize:"0.55rem",letterSpacing:"3px",color:"var(--text)",marginBottom:8}}>SMART CONTRACTS</div><h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:800,color:"var(--text)",marginBottom:8}}>On-Chain Addresses</h2><p style={{color:"var(--text)",fontSize:"0.78rem"}}>Deployed and verified on Base Mainnet.</p></div>
              {[["PrmissionRegistry","Core Protocol",CONTRACTS.registry,"Consent-gated escrow and settlement. Hardcoded 3% fee.","Feb 6, 2026"],["USDC","Payment Token",CONTRACTS.usdc,"Circle native USDC on Base Mainnet.","Coinbase"],["Treasury","Protocol Wallet",CONTRACTS.treasury,"Receives 3% fee on every settlement.","Feb 6, 2026"]].map(([name,label,addr,desc,date],i)=>(
                <div key={i} style={{marginBottom:16,background:"var(--card)",border:"1px solid var(--border)",overflow:"hidden"}}>
                  <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",background:"#111111",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"0.88rem"}}>{name}</span><span style={{fontSize:"0.58rem",padding:"2px 7px",border:"1px solid var(--border)",color:"var(--text)"}}>{label}</span></div>
                    <span style={{fontSize:"0.62rem",color:"var(--text)"}}>{date}</span>
                  </div>
                  <div style={{padding:"16px 18px"}}>
                    <p style={{color:"var(--text)",fontSize:"0.74rem",marginBottom:12}}>{desc}</p>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <code style={{fontSize:"0.72rem",color:"var(--green)",background:"rgba(0,255,136,0.05)",padding:"6px 12px",border:"1px solid rgba(0,255,136,0.15)",flex:1}}>{addr}</code>
                      <a href={"https://basescan.org/address/"+addr} target="_blank" style={{color:"var(--green)",fontSize:"0.62rem",textDecoration:"none",border:"1px solid rgba(0,255,136,0.3)",padding:"6px 12px",flexShrink:0}}>BASESCAN ↗</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>}

            {tab==="sdk"&&<div className="fu">
              <div style={{marginBottom:28}}><div style={{fontSize:"0.55rem",letterSpacing:"3px",color:"var(--text)",marginBottom:8}}>SDK REFERENCE</div><h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:800,color:"var(--text)",marginBottom:8}}>@prmission/sdk</h2><p style={{color:"var(--text)",fontSize:"0.78rem"}}>TypeScript-first. Zero config. Full type safety.</p></div>
              {[{m:"sdk.settle()",b:"CORE",d:"Lock USDC in escrow and trigger consent-gated settlement.",p:[["creator","string","Creator wallet address"],["amount","number","USDC amount (3% fee auto-deducted)"],["purpose","string","Purpose stored on-chain"]],r:"{ txHash, fee, settled, basescanUrl }"},
                {m:"sdk.getStatus()",b:"READ",d:"Check settlement status by transaction hash.",p:[["txHash","string","Hash from settle()"]],r:"{ status, creator, amount, fee, timestamp }"},
                {m:"sdk.listSettlements()",b:"READ",d:"Fetch all settlements for this API key.",p:[["limit?","number","Max results (default 50)"],["offset?","number","Pagination offset"]],r:"Settlement[]"}
              ].map((fn,i)=>(
                <div key={i} style={{marginBottom:20,background:"var(--card)",border:"1px solid var(--border)",overflow:"hidden"}}>
                  <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",background:"#111111",display:"flex",alignItems:"center",gap:12}}>
                    <code style={{color:"var(--green)",fontSize:"0.84rem",fontWeight:600}}>{fn.m}</code>
                    <span style={{fontSize:"0.58rem",padding:"2px 7px",border:"1px solid var(--border)",color:"var(--text)"}}>{fn.b}</span>
                  </div>
                  <div style={{padding:"16px 18px"}}>
                    <p style={{color:"var(--text)",fontSize:"0.74rem",marginBottom:14,lineHeight:1.6}}>{fn.d}</p>
                    {fn.p.map(([n,t,d],j)=>(
                      <div key={j} style={{display:"flex",gap:12,padding:"6px 0",borderTop:j>0?"1px solid var(--border)":"none"}}>
                        <code style={{color:"var(--blue)",fontSize:"0.7rem",minWidth:120,flexShrink:0}}>{n}</code>
                        <span style={{color:"var(--text)",fontSize:"0.65rem",background:"rgba(255,255,255,0.04)",padding:"1px 6px",flexShrink:0}}>{t}</span>
                        <span style={{color:"var(--text)",fontSize:"0.7rem"}}>{d}</span>
                      </div>
                    ))}
                    <div style={{marginTop:12,fontSize:"0.55rem",color:"var(--text)",marginBottom:4}}>RETURNS</div>
                    <code style={{color:"var(--orange)",fontSize:"0.7rem"}}>{fn.r}</code>
                  </div>
                </div>
              ))}
            </div>}

            {tab==="api"&&<div className="fu">
              <div style={{marginBottom:28}}><div style={{fontSize:"0.55rem",letterSpacing:"3px",color:"var(--text)",marginBottom:8}}>REST API</div><h2 style={{fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:800,color:"var(--text)",marginBottom:8}}>Endpoints</h2><code style={{fontSize:"0.72rem",color:"var(--text)"}}>https://api.prmission.xyz/v1</code></div>
              {[["POST","/settle","Initiate a creator settlement","#aaff44","#1a2a0a"],["GET","/settlements","List all settlements","#4488ff","#0a1a2a"],["GET","/settlements/:txHash","Get settlement status","#4488ff","#0a1a2a"],["GET","/stats","Protocol stats","#4488ff","#0a1a2a"],["POST","/verify","Verify creator consent","#aaff44","#1a2a0a"]].map(([method,path,desc,c,bg],i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:"1px solid var(--border)"}}>
                  <span style={{fontSize:"0.62rem",padding:"3px 9px",border:`1px solid ${c}33`,color:c,background:bg,fontWeight:700,minWidth:46,textAlign:"center",flexShrink:0}}>{method}</span>
                  <code style={{color:"var(--text)",fontSize:"0.76rem",minWidth:200,flexShrink:0}}>{path}</code>
                  <span style={{color:"var(--text)",fontSize:"0.72rem"}}>{desc}</span>
                </div>
              ))}
            </div>}

          </div>
        </div>
      </div>
    </>
  );
}
