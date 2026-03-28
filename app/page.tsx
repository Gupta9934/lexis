'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, Citation, UploadedDocument } from '@/lib/types';

// ── tiny inline SVGs ──────────────────────────────────────────────────────────
const Ico = {
  cpu:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  book:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  globe:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  layers:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  sparkle: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/></svg>,
  file:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  send:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  reset:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95L1 10"/></svg>,
  chevL:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>,
  chevR:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
  alert:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  srcBook: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  chevD:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>,
  chevU:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform .2s' }}><polyline points="18 15 12 9 6 15"/></svg>,
  spin:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin .9s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
};

// ── Citation panel ────────────────────────────────────────────────────────────
function Citations({ citations, usedWebSearch, webSearchQuery }: {
  citations: Citation[]; usedWebSearch?: boolean; webSearchQuery?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!citations.length && !usedWebSearch) return null;
  return (
    <div className="cite-wrap">
      <div className="cite-hdr" onClick={() => setOpen(o => !o)}>
        <div className="cite-hdr-l">
          {Ico.srcBook} Sources
          {citations.length > 0 && <span className="cite-count">{citations.length}</span>}
          {usedWebSearch && <span className="badge badge-web">{Ico.globe} Web</span>}
        </div>
        {open ? Ico.chevU : Ico.chevD}
      </div>
      {open && (
        <div className="cite-body">
          {citations.map((c, i) => (
            <div key={i} className="cite-row">
              <div className="cite-num">{i + 1}</div>
              <div className="cite-info">
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 3 }}>
                  <span className="cite-doc">{c.documentName}</span>
                  <span className="cite-pg">· Page {c.pageNumber}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="rel-track"><div className="rel-fill" style={{ width: `${Math.round(c.relevanceScore * 100)}%` }} /></div>
                    <span className="rel-pct">{Math.round(c.relevanceScore * 100)}%</span>
                  </div>
                </div>
                {c.section && <div className="cite-sec">§ {c.section}</div>}
                <div className="cite-snip">"{c.snippet}"</div>
              </div>
            </div>
          ))}
          {usedWebSearch && webSearchQuery && (
            <div className="cite-row" style={{ borderTop: citations.length ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: citations.length ? 11 : 0 }}>
              <div className="cite-num" style={{ background: 'rgba(168,85,247,0.09)', borderColor: 'rgba(168,85,247,0.2)' }}>
                <span style={{ color: '#c084fc' }}>{Ico.globe}</span>
              </div>
              <div className="cite-info">
                <span className="cite-doc" style={{ color: '#c084fc' }}>Web search</span>
                <div className="cite-sec">Query: "{webSearchQuery}"</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────
const PHASE_CFG = {
  thinking:   { color: '#3d8ef0', label: 'Analyzing', ring: 'rgba(61,142,240,0.55)', core: '#3d8ef0' },
  retrieving: { color: '#f5a623', label: 'Searching documents', ring: 'rgba(245,166,35,0.55)', core: '#f5a623' },
  generating: { color: '#30d988', label: 'Composing answer', ring: 'rgba(48,217,136,0.55)', core: '#30d988' },
} as const;

function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') return (
    <div className="msg-user">
      <div className="msg-bubble-u">{msg.content}</div>
    </div>
  );

  const isLoading = msg.status && !['done', 'error'].includes(msg.status);
  const phaseKey  = isLoading ? msg.status as keyof typeof PHASE_CFG : null;
  const pc        = phaseKey ? PHASE_CFG[phaseKey] : null;

  return (
    <div className="msg-ai">
      <div className="ai-av">{Ico.cpu}</div>
      <div className="ai-body">
        <div className="ai-lbl">
          LEXIS
          {msg.usedWebSearch && <span className="badge badge-web">{Ico.globe} Web search</span>}
          {msg.subQuestions?.length ? <span className="badge badge-decomp">{Ico.layers} Decomposed</span> : null}
        </div>

        {msg.subQuestions?.length && msg.status === 'done' && (
          <div className="subq-box">
            <div className="subq-lbl">Query broken into:</div>
            {msg.subQuestions.map((q, i) => <div key={i} className="subq-item">{i + 1}. {q}</div>)}
          </div>
        )}

        {isLoading && pc && (
          <div className="loading-msg">
            <div className="l-ring" style={{ borderTopColor: pc.ring, borderRightColor: `${pc.ring}4d` }} />
            <div>
              <div className="l-lbl" style={{ color: pc.color }}>{pc.label}</div>
              <div className="dots">
                <div className="dot" style={{ background: pc.core }} />
                <div className="dot" style={{ background: pc.core }} />
                <div className="dot" style={{ background: pc.core }} />
              </div>
            </div>
          </div>
        )}

        {msg.status === 'done' && (
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        )}

        {msg.status === 'error' && <div className="err-box">{msg.content}</div>}

        {msg.status === 'done' && (
          <Citations citations={msg.citations || []} usedWebSearch={msg.usedWebSearch} webSearchQuery={msg.webSearchQuery} />
        )}

        <div className="ts">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
}

// ── Fluid aurora background canvas ───────────────────────────────────────────
function AuroraCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let W = 0, H = 0, raf = 0, t = 0;
    const mouse = { x: .5, y: .5, tx: .5, ty: .5 };
    const blobs = [
      { x:.15, y:.2, sx:.14, sy:.11, op:.018, r:.42, col:[245,120,20] as [number,number,number], ph:0 },
      { x:.78, y:.15, sx:.12, sy:.13, op:.016, r:.44, col:[30,95,235] as [number,number,number], ph:2.1 },
      { x:.5,  y:.68, sx:.11, sy:.12, op:.013, r:.36, col:[145,55,225] as [number,number,number], ph:4.2 },
      { x:.85, y:.7,  sx:.13, sy:.1,  op:.012, r:.33, col:[20,170,135] as [number,number,number], ph:1.1 },
      { x:.3,  y:.88, sx:.1,  sy:.11, op:.014, r:.31, col:[245,166,35] as [number,number,number], ph:3.3 },
    ];
    const resize = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
    const draw = () => {
      t += .55;
      mouse.x += (mouse.tx - mouse.x) * .035;
      mouse.y += (mouse.ty - mouse.y) * .035;
      ctx.clearRect(0, 0, W, H);
      // bg
      const bg = ctx.createRadialGradient(W*.5, H*.4, 0, W*.5, H*.4, Math.max(W,H)*.9);
      bg.addColorStop(0, '#0d1424'); bg.addColorStop(1, '#04060d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // blobs
      ctx.globalCompositeOperation = 'screen';
      blobs.forEach((b, i) => {
        const bx = (b.x + Math.sin(t*.00045*(i+1) + b.ph) * b.sx + (mouse.x-.5)*.05) * W;
        const by = (b.y + Math.cos(t*.00055*(i+1) + b.ph) * b.sy + (mouse.y-.5)*.04) * H;
        const br = b.r * Math.min(W, H) * (1 + Math.sin(t*.009 + i*1.1) * .07);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        const [r,g2,bl] = b.col;
        g.addColorStop(0,   `rgba(${r},${g2},${bl},${b.op*2})`);
        g.addColorStop(.45, `rgba(${r},${g2},${bl},${b.op})`);
        g.addColorStop(1,   `rgba(${r},${g2},${bl},0)`);
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      // vignette
      const vig = ctx.createRadialGradient(W*.5, H*.5, H*.15, W*.5, H*.5, H*.85);
      vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,.6)');
      ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);
      raf = requestAnimationFrame(draw);
    };
    const onMove = (e: MouseEvent) => { mouse.tx = e.clientX/innerWidth; mouse.ty = e.clientY/innerHeight; };
    const ro = new ResizeObserver(resize);
    ro.observe(c); window.addEventListener('mousemove', onMove);
    resize(); draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('mousemove', onMove); };
  }, []);
  return <canvas ref={ref} className="lexis-canvas" />;
}

// ── Uploader ──────────────────────────────────────────────────────────────────
const PROC = ['Parsing PDF…', 'Chunking text…', 'Embedding…', 'Storing vectors…'];
function Uploader({ sid, onDone, docs, onReset }: {
  sid: string; onDone: (d: UploadedDocument[]) => void; docs: UploadedDocument[]; onReset: () => void;
}) {
  const inpRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag]   = useState(false);
  const [proc, setProc]   = useState(false);
  const [step, setStep]   = useState(0);
  const [err,  setErr]    = useState('');

  const handle = useCallback(async (files: FileList|null) => {
    if (!files?.length) return;
    const arr = Array.from(files); setErr('');
    if (arr.length + docs.length > 5) { setErr('Max 5 documents total.'); return; }
    for (const f of arr) if (!f.name.endsWith('.pdf')) { setErr(`${f.name} — PDF only.`); return; }
    setProc(true); setStep(0);
    const iv = setInterval(() => setStep(s => Math.min(s+1, PROC.length-1)), 880);
    const fd = new FormData(); fd.append('sessionId', sid); arr.forEach(f => fd.append('files', f));
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      clearInterval(iv);
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      const d = await r.json(); setProc(false); setStep(0);
      onDone(d.documents.map((x: { id:string;name:string;pageCount:number;chunkCount:number;uploadedAt:string;size:number }) => ({ ...x, uploadedAt: new Date(x.uploadedAt) })));
    } catch(e) { clearInterval(iv); setProc(false); setErr(e instanceof Error ? e.message : 'Upload failed'); }
  }, [sid, docs.length, onDone]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {docs.length < 5 && !proc && (
        <div className={`upload-zone${drag?' dragging':''}`}
          onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files)}}
          onClick={()=>inpRef.current?.click()}>
          <input ref={inpRef} type="file" accept=".pdf" multiple style={{display:'none'}} onChange={e=>handle(e.target.files)}/>
          <div className="uz-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={drag?'#f5a623':'#2a3a54'} strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className="uz-title">{drag ? 'Drop PDFs here' : 'Upload PDFs'}</div>
          <div className="uz-hint">Up to 5 files · 10 pages each</div>
        </div>
      )}
      {proc && (
        <div className="proc-bar">
          <div className="proc-step"><div className="proc-spinner"/>{PROC[step]}</div>
          <div className="proc-dots">{PROC.map((_,i)=><div key={i} className="proc-dot" style={{background:i<=step?'#f5a623':'rgba(255,255,255,0.08)'}}/>)}</div>
        </div>
      )}
      {err && <div className="upload-err">{Ico.alert}<span>{err}</span></div>}
      {docs.length > 0 && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
            <span className="sec-lbl">Indexed ({docs.length}/5)</span>
            <button onClick={onReset} style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'#2a3a54',fontFamily:'Inter,sans-serif'}}
              onMouseEnter={e=>(e.currentTarget.style.color='#f87171')}
              onMouseLeave={e=>(e.currentTarget.style.color='#2a3a54')}>Clear all</button>
          </div>
          {docs.map(d=>(
            <div key={d.id} className="doc-item">
              <div className="doc-ico">{Ico.file}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="doc-name">{d.name}</div>
                <div className="doc-meta">{d.pageCount}p · {d.chunkCount} chunks</div>
              </div>
              <div className="doc-dot"/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status bar ────────────────────────────────────────────────────────────────
const STEPS = [
  { id:'thinking',   lbl:'Analyzed' },
  { id:'retrieving', lbl:'Retrieving' },
  { id:'generating', lbl:'Generating' },
];
function StatusBar({ phase, show }: { phase:string; show:boolean }) {
  if (!show) return null;
  const cur = STEPS.findIndex(s=>s.id===phase);
  return (
    <div className="status-row">
      <div className="status-pill">
        {STEPS.map((s,i)=>{
          const st = i<cur?'done':i===cur?'active':'pending';
          return (
            <span key={s.id} style={{display:'flex',alignItems:'center',gap:0}}>
              <span className={`s-step ${st}`}>
                <span className={`s-dot ${st}`}/>
                <span className={`s-lbl ${st}`}>{s.lbl}</span>
              </span>
              {i<STEPS.length-1 && <span className={`s-div ${st==='done'?'done':''}`}/>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
const SUGGESTS = [
  'Summarize the key findings across all documents',
  'What are the main arguments presented?',
  'Compare the approaches described in these documents',
  'What limitations or gaps are identified?',
];
function EmptyState({ hasDocs, onSuggest }: { hasDocs:boolean; onSuggest:(q:string)=>void }) {
  return (
    <div className="empty-wrap">
      <div className="empty-orb">
        <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'conic-gradient(from 0deg,transparent 0%,rgba(245,166,35,0.35) 40%,rgba(61,142,240,0.25) 70%,transparent 100%)',animation:'spin 6s linear infinite'}}/>
        <div style={{position:'absolute',inset:'5px',borderRadius:'50%',background:'conic-gradient(from 180deg,transparent 0%,rgba(168,85,247,0.2) 45%,rgba(245,166,35,0.15) 70%,transparent 100%)',animation:'spin 10s linear infinite reverse'}}/>
        <div style={{position:'absolute',inset:'14px',borderRadius:'50%',background:'rgba(245,166,35,0.08)',border:'1px solid rgba(245,166,35,0.22)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {Ico.cpu}
        </div>
      </div>
      <h2 className="empty-title">Ask LEXIS anything</h2>
      <p className="empty-sub">
        {hasDocs
          ? 'Your documents are indexed and ready. Ask anything — LEXIS answers with precise source citations.'
          : 'Upload PDFs in the sidebar. LEXIS reads your documents and answers with citations. Web search activates automatically when needed.'}
      </p>
      {hasDocs && (
        <>
          <div className="suggest-label">Try asking</div>
          <div className="suggest-grid">
            {SUGGESTS.map(q=>(
              <button key={q} className="suggest-btn" onClick={()=>onSuggest(q)}>
                <span className="suggest-arr">›</span>{q}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [sid]     = useState(()=>uuidv4());
  const [docs,     setDocs]     = useState<UploadedDocument[]>([]);
  const [msgs,     setMsgs]     = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [phase,    setPhase]    = useState('done');
  const [sidebar,  setSidebar]  = useState(true);
  const [focused,  setFocused]  = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const taRef   = useRef<HTMLTextAreaElement>(null);

  // auto-scroll
  useEffect(()=>{ chatRef.current?.scrollTo({top:chatRef.current.scrollHeight,behavior:'smooth'}); }, [msgs]);

  // auto-resize textarea
  useEffect(()=>{
    const ta=taRef.current; if(!ta)return;
    ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,130)+'px';
  },[input]);

  const reset = useCallback(async()=>{
    try{ await fetch('/api/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid})}); }catch{}
    setDocs([]); setMsgs([]); setInput('');
  },[sid]);

  const send = useCallback(async(q?:string)=>{
    const question=(q||input).trim(); if(!question||busy)return;
    setInput(''); setBusy(true); setPhase('thinking');
    const uid=uuidv4(), aid=uuidv4();
    setMsgs(p=>[...p,
      {id:uid,role:'user',      content:question, timestamp:new Date(),status:'done'},
      {id:aid,role:'assistant', content:'',        timestamp:new Date(),status:'thinking'},
    ]);
    const advance=async()=>{
      await new Promise(r=>setTimeout(r,650)); setPhase('retrieving');
      setMsgs(p=>p.map(m=>m.id===aid?{...m,status:'retrieving'}:m));
      await new Promise(r=>setTimeout(r,850)); setPhase('generating');
      setMsgs(p=>p.map(m=>m.id===aid?{...m,status:'generating'}:m));
    };
    advance();
    try{
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question,sessionId:sid,conversationHistory:msgs.filter(m=>m.status==='done'),documentNames:docs.map(d=>d.name)})});
      if(!res.ok){const e=await res.json();throw new Error(e.error);}
      const data=await res.json();
      setMsgs(p=>p.map(m=>m.id===aid?{...m,content:data.answer,citations:data.citations,usedWebSearch:data.usedWebSearch,webSearchQuery:data.webSearchQuery,subQuestions:data.subQuestions,status:'done'}:m));
    }catch(e){
      setMsgs(p=>p.map(m=>m.id===aid?{...m,content:e instanceof Error?e.message:'Error',status:'error'}:m));
    }finally{ setBusy(false); setPhase('done'); }
  },[input,busy,msgs,sid,docs]);

  const hasDocs=docs.length>0;
  const chunks=docs.reduce((s,d)=>s+d.chunkCount,0);

  return (
    <>
      <AuroraCanvas/>
      <div className="lexis-shell">

        {/* ── SIDEBAR ── */}
        <div className={`lexis-sidebar${sidebar?'':' closed'}`}>
          <div className="sidebar-inner">
            {/* Logo */}
            <div className="logo-row">
              <div className="logo-orb">{Ico.cpu}</div>
              <div><div className="logo-name">LEXIS</div><div className="logo-sub">Research Intelligence</div></div>
            </div>

            {/* Upload */}
            <div className="sec-lbl">Knowledge Base</div>
            <Uploader sid={sid} onDone={d=>setDocs(p=>[...p,...d])} docs={docs} onReset={reset}/>

            {hasDocs && (
              <>
                <div className="sidebar-divider"/>
                <div className="stat-grid">
                  <div className="stat-card"><div className="stat-lbl">Docs</div><div className="stat-n">{docs.length}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Chunks</div><div className="stat-n hi">{chunks}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Pages</div><div className="stat-n">{docs.reduce((s,d)=>s+d.pageCount,0)}</div></div>
                  <div className="stat-card"><div className="stat-lbl">Queries</div><div className="stat-n">{msgs.filter(m=>m.role==='user').length}</div></div>
                </div>
              </>
            )}

            <div className="sidebar-divider"/>
            <div className="sec-lbl">Capabilities</div>
            {[
              {ico:Ico.book,    color:'#f5a623',bg:'rgba(245,166,35,0.1)', lbl:'RAG with page citations'},
              {ico:Ico.globe,   color:'#a855f7',bg:'rgba(168,85,247,0.1)',lbl:'Web search fallback'},
              {ico:Ico.layers,  color:'#3d8ef0',bg:'rgba(61,142,240,0.1)',lbl:'Query decomposition'},
              {ico:Ico.sparkle, color:'#30d988',bg:'rgba(48,217,136,0.1)',lbl:'Conversation memory'},
            ].map(({ico,color,bg,lbl})=>(
              <div key={lbl} className="cap-row">
                <div className="cap-ico" style={{background:bg}}>
                  <span style={{color}}>{ico}</span>
                </div>
                <span className="cap-lbl">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="lexis-main">
          {/* Topbar */}
          <div className="lexis-topbar">
            <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0,flex:1}}>
              <button className="tog-btn" onClick={()=>setSidebar(o=>!o)}>
                {sidebar ? Ico.chevL : Ico.chevR}
              </button>
              <div className="topbar-sep"/>
              <div style={{minWidth:0}}>
                <div className="sess-title">
                  {hasDocs ? docs.map(d=>d.name.replace('.pdf','')).join(', ') : 'New Research Session'}
                </div>
                <div className="sess-sub">
                  {hasDocs ? `${docs.length} doc${docs.length>1?'s':''} · ${chunks} vectors indexed` : 'Upload documents to begin'}
                </div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              {busy && (
                <div className="thinking-pill">
                  <div className="thinking-dot"/>
                  <span className="thinking-lbl">Thinking</span>
                </div>
              )}
              {msgs.length>0 && (
                <button className="reset-btn" onClick={reset}>
                  {Ico.reset} New session
                </button>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="lexis-chat" ref={chatRef}>
            {!msgs.length
              ? <EmptyState hasDocs={hasDocs} onSuggest={send}/>
              : <div className="msg-list">{msgs.map(m=><Message key={m.id} msg={m}/>)}</div>
            }
          </div>

          {/* Input dock */}
          <div className="lexis-dock">
            <StatusBar phase={phase} show={busy}/>
            <div className={`input-box${focused?' focused':''}`}>
              <textarea
                ref={taRef} value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
                onFocus={()=>setFocused(true)}
                onBlur={()=>setFocused(false)}
                placeholder={hasDocs?'Ask anything about your documents…':'Upload documents or ask a general question…'}
                rows={1} disabled={busy}
              />
              <button className={`send-btn ${input.trim()&&!busy?'on':'off'}`}
                onClick={()=>send()} disabled={!input.trim()||busy}>
                <span style={{color:input.trim()&&!busy?'#0d0a00':'#2a3a54'}}>
                  {busy ? Ico.spin : Ico.send}
                </span>
              </button>
            </div>
            <div className="input-hint">Shift+Enter for new line · Web search activates automatically when needed</div>
          </div>
        </div>
      </div>
    </>
  );
}