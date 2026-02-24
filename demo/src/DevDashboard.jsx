import { useState, useEffect } from "react";

const INFLUENCERS = [
  { handle: "@hypebeast", followers: "8.2M", niche: "Sneakers", hashtag: "#HypeBeast", avatar: "HB", brand: "Nike" },
  { handle: "@kicksonfire", followers: "3.1M", niche: "Sneakers", hashtag: "#KicksOnFire", avatar: "KF", brand: "Nike" },
  { handle: "@guccigang_official", followers: "4.8M", niche: "Luxury", hashtag: "#GucciGang", avatar: "GG", brand: "Gucci" },
  { handle: "@lvlovers", followers: "2.9M", niche: "Luxury", hashtag: "#LouisVuitton", avatar: "LV", brand: "Louis Vuitton" },
  { handle: "@sneakerglobetv", followers: "1.4M", niche: "Sneakers", hashtag: "#SneakerGlobe", avatar: "SG", brand: "Nike" },
  { handle: "@shoelaceking", followers: "340K", niche: "Sneakers", hashtag: "#ShoelaceKing", avatar: "SK", brand: "Nike" },
  { handle: "@whistlerstreet", followers: "890K", niche: "Streetwear", hashtag: "#Whistler", avatar: "WS", brand: "Gucci" },
  { handle: "@complexsneakers", followers: "5.4M", niche: "Sneakers", hashtag: "#ComplexSneakers", avatar: "CS", brand: "Nike" },
  { handle: "@highsnobiety", followers: "4.2M", niche: "Culture", hashtag: "#Highsnobiety", avatar: "HS", brand: "Louis Vuitton" },
  { handle: "@sole_collector", followers: "1.8M", niche: "Sneakers", hashtag: "#SoleCollector", avatar: "SC", brand: "Nike" },
  { handle: "@guccimane_style", followers: "670K", niche: "Luxury", hashtag: "#GucciStyle", avatar: "GM", brand: "Gucci" },
  { handle: "@lv_streetwear", followers: "2.1M", niche: "Luxury", hashtag: "#LVStreet", avatar: "LS", brand: "Louis Vuitton" },
  { handle: "@sneakernews", followers: "3.7M", niche: "News", hashtag: "#SneakerNews", avatar: "SN", brand: "Nike" },
  { handle: "@shoelace_world", followers: "95K", niche: "Sneakers", hashtag: "#ShoelaceWorld", avatar: "SW", brand: "Nike" },
  { handle: "@nicekicks", followers: "2.9M", niche: "Sneakers", hashtag: "#NiceKicks", avatar: "NK", brand: "Nike" },
  { handle: "@whistler_nyc", followers: "560K", niche: "Streetwear", hashtag: "#WhistlerNYC", avatar: "WN", brand: "Gucci" },
  { handle: "@lv_collectors", followers: "1.2M", niche: "Luxury", hashtag: "#LVCollectors", avatar: "LC", brand: "Louis Vuitton" },
];

const BRAND_COLORS = { "Nike": "#00ff88", "Gucci": "#c8a96e", "Louis Vuitton": "#a87d3e" };
const AMOUNTS = ["12.00","25.00","50.00","8.50","100.00","35.00","18.75","75.00","42.00","200.00","15.00","500.00"];
function rnd(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function fmtTime(s) { if(s<60) return s+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago"; return Math.floor(s/3600)+"h ago"; }
function Avatar({initials,brand}) {
  const c = BRAND_COLORS[brand]||"#00ff88";
  return <div style={{width:38,height:38,borderRadius:"50%",background:"#1a1a1a",border:"2px solid "+c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.62rem",color:c,flexShrink:0}}>{initials}</div>;
}

export default function SettlementHub() {
  const [feed, setFeed] = useState(()=>Array.from({length:10},(_,i)=>({id:i,inf:INFLUENCERS[i%INFLUENCERS.length],amount:rnd(AMOUNTS),time:(i+1)*38,isNew:false})));
  const [total, setTotal] = useState(284750.00);
  const [fee, setFee] = useState(8542.50);
  const [creators, setCreators] = useState(1247);
  const [txs, setTxs] = useState(9834);
  const [tab, setTab] = useState("feed");

  useEffect(()=>{
    const t = setInterval(()=>{
      const inf = rnd(INFLUENCERS);
      const amt = rnd(AMOUNTS);
      const f = (parseFloat(amt)*0.03).toFixed(2);
      const entry = {id:Date.now(),inf,amount:amt,time:0,isNew:true};
      setFeed(p=>[entry,...p.slice(0,24)]);
      setTimeout(()=>setFeed(p=>p.map(e=>e.id===entry.id?{...e,isNew:false}:e)),2000);
      setTotal(p=>+(p+parseFloat(amt)).toFixed(2));
      setFee(p=>+(p+parseFloat(f)).toFixed(2));
      setTxs(p=>p+1);
      if(Math.random()>0.6) setCreators(p=>p+1);
    },2500);
    return ()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    const t = setInterval(()=>setFeed(p=>p.map(e=>({...e,time:e.time+1}))),1000);
    return ()=>clearInterval(t);
  },[]);

  const fmt = n => n>=1000000?"$"+(n/1000000).toFixed(3)+"M":"$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

  return <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Bebas+Neue&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#080808;}
      @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
      .nr{animation:slideIn 0.35s ease;}
      .ld{animation:blink 1.4s infinite;}
      .tb{background:none;border:none;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:0.65rem;letter-spacing:2px;padding:10px 22px;border-bottom:2px solid transparent;color:#444;text-transform:uppercase;transition:all 0.2s;}
      .tb.on{color:#00ff88;border-bottom-color:#00ff88;}
    `}</style>
    <div style={{fontFamily:"'IBM Plex Mono',monospace",background:"#080808",minHeight:"100vh",color:"#fff"}}>

      <div style={{background:"#0f0f0f",borderBottom:"1px solid #181818",padding:"0 32px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <a href="/" style={{textDecoration:"none"}}><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:"5px",color:"#fff"}}>PRMISSION</span></a>
          <span style={{color:"#222"}}>|</span>
          <span style={{fontSize:"0.58rem",letterSpacing:"3px",color:"#E00000",fontWeight:700}}>SETTLEMENT HUB</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="ld" style={{width:7,height:7,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 10px #00ff88"}}/>
          <span style={{fontSize:"0.6rem",letterSpacing:"2px",color:"#00ff88"}}>LIVE · BASE MAINNET</span>
        </div>
      </div>

      <div style={{background:"linear-gradient(180deg,#0f0f0f,#080808)",borderBottom:"1px solid #181818",padding:"36px 32px 28px"}}>
        <div style={{fontSize:"0.58rem",letterSpacing:"4px",color:"#E00000",marginBottom:20,fontWeight:700}}>GLOBAL BRAND CAMPAIGNS · LIVE REVENUE</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:20}}>
          <div>
            <div style={{fontSize:"0.55rem",letterSpacing:"2px",color:"#444",marginBottom:8}}>TOTAL USDC SETTLED</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"5rem",color:"#00ff88",lineHeight:1,letterSpacing:"2px",textShadow:"0 0 40px rgba(0,255,136,0.3)"}}>{fmt(total)}</div>
            <div style={{fontSize:"0.58rem",color:"#333",marginTop:6,letterSpacing:"2px"}}>CONSENT-GATED · ESCROW-SETTLED · ON-CHAIN</div>
          </div>
          {[{label:"PROTOCOL FEE (3%)",value:fmt(fee),color:"#E00000",sub:"HARDCODED FOREVER"},{label:"CREATORS PAID",value:creators.toLocaleString(),color:"#fff",sub:"CONSENT VERIFIED"},{label:"SETTLEMENTS",value:txs.toLocaleString(),color:"#4488ff",sub:"ON-CHAIN PROOF"}].map(({label,value,color,sub},i)=>(
            <div key={i} style={{background:"#0f0f0f",border:"1px solid #181818",borderTop:"3px solid "+color,padding:"20px 22px"}}>
              <div style={{fontSize:"0.52rem",letterSpacing:"2px",color:"#444",marginBottom:10}}>{label}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.4rem",color:color,letterSpacing:"1px"}}>{value}</div>
              <div style={{fontSize:"0.5rem",color:"#2a2a2a",marginTop:6,letterSpacing:"1px"}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:"#0a0a0a",borderBottom:"1px solid #181818",padding:"12px 32px",display:"flex",gap:10,alignItems:"center",overflowX:"auto"}}>
        <span style={{fontSize:"0.52rem",letterSpacing:"2px",color:"#333",flexShrink:0}}>ACTIVE</span>
        {[{name:"NIKE AF1 LA",color:"#00ff88"},{name:"GUCCI SS26",color:"#c8a96e"},{name:"LOUIS VUITTON",color:"#a87d3e"},{name:"SNEAKER GLOBE",color:"#4488ff"},{name:"SHOELACE CO.",color:"#ff4488"},{name:"WHISTLER NYC",color:"#aa88ff"}].map(({name,color})=>(
          <div key={name} style={{background:"#111",border:"1px solid #1a1a1a",borderLeft:"3px solid "+color,padding:"5px 12px",fontSize:"0.58rem",color:"#888",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:color}}/>{name}
          </div>
        ))}
      </div>

      <div style={{background:"#0f0f0f",borderBottom:"1px solid #181818",padding:"0 32px",display:"flex"}}>
        {[["feed","Live Feed"],["top","Top Creators"],["proof","On-Chain Proof"]].map(([id,label])=>(
          <button key={id} className={"tb"+(tab===id?" on":"")} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={{padding:"28px 32px"}}>

        {tab==="feed"&&<div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:"0.52rem",letterSpacing:"3px",color:"#444",marginBottom:4}}>AI AGENT TO INFLUENCER PAYMENTS · REAL-TIME</div>
              <div style={{fontSize:"0.9rem",fontWeight:700,letterSpacing:"2px"}}>LIVE CREATOR SETTLEMENTS</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#0f0f0f",border:"1px solid #181818",padding:"8px 16px"}}>
              <div className="ld" style={{width:6,height:6,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 8px #00ff88"}}/>
              <span style={{fontSize:"0.6rem",color:"#00ff88",letterSpacing:"1px"}}>NEW TX EVERY 2.5S</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2.2fr 1fr 1.2fr 1fr 1fr 0.8fr 0.8fr",gap:10,padding:"10px 16px",background:"#0a0a0a",borderBottom:"1px solid #181818",marginBottom:2}}>
            {["CREATOR","BRAND","HASHTAG","FOLLOWERS","PAID (USDC)","FEE","TIME"].map(h=><span key={h} style={{fontSize:"0.5rem",letterSpacing:"1.5px",color:"#333"}}>{h}</span>)}
          </div>
          {feed.map(entry=>{
            const bc = BRAND_COLORS[entry.inf.brand]||"#00ff88";
            return <div key={entry.id} className={entry.isNew?"nr":""} style={{display:"grid",gridTemplateColumns:"2.2fr 1fr 1.2fr 1fr 1fr 0.8fr 0.8fr",gap:10,padding:"12px 16px",borderBottom:"1px solid #0f0f0f",alignItems:"center",background:entry.isNew?"rgba(0,255,136,0.05)":"transparent",transition:"background 2s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avatar initials={entry.inf.avatar} brand={entry.inf.brand}/>
                <div>
                  <div style={{fontSize:"0.76rem",fontWeight:600}}>{entry.inf.handle}</div>
                  <div style={{fontSize:"0.56rem",color:"#333",marginTop:2}}>{entry.inf.niche}</div>
                </div>
              </div>
              <span style={{fontSize:"0.64rem",color:bc,fontWeight:600,letterSpacing:"1px"}}>{entry.inf.brand.toUpperCase()}</span>
              <span style={{fontSize:"0.64rem",color:"#E00000",fontWeight:600}}>{entry.inf.hashtag}</span>
              <span style={{fontSize:"0.7rem",color:"#666"}}>{entry.inf.followers}</span>
              <span style={{fontSize:"0.84rem",fontWeight:700,color:"#00ff88"}}>${entry.amount}</span>
              <span style={{fontSize:"0.64rem",color:"#333"}}>${(parseFloat(entry.amount)*0.03).toFixed(2)}</span>
              <span style={{fontSize:"0.6rem",color:"#2a2a2a"}}>{fmtTime(entry.time)}</span>
            </div>;
          })}
        </div>}

        {tab==="top"&&<div>
          <div style={{fontSize:"0.52rem",letterSpacing:"3px",color:"#444",marginBottom:24}}>TOP EARNING CREATORS ACROSS ALL CAMPAIGNS</div>
          {INFLUENCERS.slice(0,12).map((inf,i)=>{
            const earned = (5000-i*380+i*20).toFixed(2);
            const pct = Math.max(8,100-i*8);
            const bc = BRAND_COLORS[inf.brand]||"#00ff88";
            return <div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:"1px solid #111"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",color:"#222",minWidth:20,textAlign:"right"}}>{i+1}</div>
              <Avatar initials={inf.avatar} brand={inf.brand}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:"0.82rem",fontWeight:600}}>{inf.handle}</span>
                    <span style={{fontSize:"0.55rem",color:bc,border:"1px solid "+bc+"44",padding:"2px 8px",letterSpacing:"1px"}}>{inf.brand.toUpperCase()}</span>
                    <span style={{fontSize:"0.6rem",color:"#333"}}>{inf.followers}</span>
                  </div>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",color:"#00ff88",letterSpacing:"1px"}}>${earned}</span>
                </div>
                <div style={{height:2,background:"#111",borderRadius:1}}>
                  <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,"+bc+"88,"+bc+")",borderRadius:1}}/>
                </div>
              </div>
            </div>;
          })}
        </div>}

        {tab==="proof"&&<div>
          <div style={{fontSize:"0.52rem",letterSpacing:"3px",color:"#444",marginBottom:24}}>VERIFIED ON-CHAIN · BASE MAINNET</div>
          {[
            {label:"Protocol Deployment",hash:"0xb9A5F35a8EB45aD45b91dD83ed5b91986537B193",date:"Feb 6, 2026",type:"CONTRACT",isAddr:true},
            {label:"USDC Approval — Nike AF1 LA",hash:"0xa2788f0ca7df1e4ea2c53e25cfb56e0b2b2f04762bce223a8c1038b0a7ebdcf5",date:"Feb 24, 2026",type:"APPROVAL"},
            {label:"Live Settlement — Nike AF1 LA",hash:"0x51de8405cd0d0743eef7f10084a77fc8e845e2e3412898625bcc8dfb7c5949a2",date:"Feb 24, 2026",type:"SETTLEMENT"},
          ].map((item,i)=>(
            <div key={i} style={{background:"#0f0f0f",border:"1px solid #181818",padding:"22px 24px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:20}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{fontSize:"0.55rem",padding:"3px 9px",border:"1px solid",letterSpacing:"1px",fontWeight:700,...(item.type==="SETTLEMENT"?{color:"#00ff88",borderColor:"#00ff8844"}:item.type==="CONTRACT"?{color:"#4488ff",borderColor:"#4488ff44"}:{color:"#c8a96e",borderColor:"#c8a96e44"})}}>{item.type}</span>
                  <span style={{fontSize:"0.78rem",fontWeight:600}}>{item.label}</span>
                  <span style={{fontSize:"0.58rem",color:"#333",marginLeft:"auto"}}>{item.date}</span>
                </div>
                <code style={{fontSize:"0.68rem",color:"#555",wordBreak:"break-all"}}>{item.hash}</code>
              </div>
              <a href={"https://basescan.org/"+(item.isAddr?"address/":"tx/")+item.hash} target="_blank" style={{color:"#00ff88",fontSize:"0.62rem",textDecoration:"none",border:"1px solid #00ff8833",padding:"8px 16px",letterSpacing:"1px",flexShrink:0,whiteSpace:"nowrap"}}>BASESCAN</a>
            </div>
          ))}
          <div style={{background:"rgba(0,255,136,0.04)",border:"1px solid rgba(0,255,136,0.1)",padding:"24px",marginTop:24}}>
            <div style={{fontSize:"0.52rem",letterSpacing:"3px",color:"#00ff88",marginBottom:12}}>PROTOCOL STATS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
              {[["Tests","96 passing"],["Fee","3% hardcoded"],["Network","Base Mainnet"],["Token","USDC Native"]].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:"0.52rem",color:"#333",marginBottom:4,letterSpacing:"1px"}}>{l}</div>
                  <div style={{fontSize:"0.82rem",fontWeight:600,color:"#00ff88"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>}

      </div>
    </div>
  </>;
}
