'use client';
import { useState } from 'react';
import { Citation } from '@/lib/types';

interface SourceCitationProps {
  citations: Citation[];
  usedWebSearch?: boolean;
  webSearchQuery?: string;
}

export default function SourceCitation({ citations, usedWebSearch, webSearchQuery }: SourceCitationProps) {
  const [open, setOpen] = useState(false);
  if (citations.length === 0 && !usedWebSearch) return null;

  return (
    <div className="citations-wrap">
      <div className="citations-header" onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--t3)' }}>
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t3)' }}>
            Sources
          </span>
          {citations.length > 0 && (
            <span style={{ background: 'rgba(245,166,35,0.12)', color: 'var(--amber)', borderRadius: '100px', padding: '1px 7px', fontSize: '10px', fontFamily: "'JetBrains Mono',monospace" }}>
              {citations.length}
            </span>
          )}
          {usedWebSearch && (
            <span className="badge badge-web">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Web
            </span>
          )}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ color: 'var(--t3)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div className="citations-body">
          {citations.map((c, i) => (
            <div key={i} className="cite-item">
              <div className="cite-num">{i + 1}</div>
              <div className="cite-text">
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '3px' }}>
                  <span className="cite-doc">{c.documentName}</span>
                  <span className="cite-page">· Page {c.pageNumber}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="rel-bar">
                      <div className="rel-fill" style={{ width: `${Math.round(c.relevanceScore * 100)}%` }} />
                    </div>
                    <span className="rel-pct">{Math.round(c.relevanceScore * 100)}%</span>
                  </div>
                </div>
                {c.section && <div className="cite-section">§ {c.section}</div>}
                <div className="cite-snippet">"{c.snippet}"</div>
              </div>
            </div>
          ))}
          {usedWebSearch && webSearchQuery && (
            <div className="cite-item" style={{ borderTop: citations.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: citations.length > 0 ? '12px' : '0' }}>
              <div className="cite-num" style={{ background: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.2)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div className="cite-text">
                <div className="cite-doc" style={{ color: '#c084fc' }}>Web Search</div>
                <div className="cite-section">Query: "{webSearchQuery}"</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}