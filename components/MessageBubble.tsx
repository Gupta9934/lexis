'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/types';
import SourceCitation from './SourceCitation';

const PHASE_CONFIG = {
  thinking:   { color: '#3d8ef0', label: 'Analyzing',        ring: 'rgba(61,142,240,0.6)',  core: 'rgba(61,142,240,0.8)' },
  retrieving: { color: '#f5a623', label: 'Searching docs',   ring: 'rgba(245,166,35,0.6)', core: 'rgba(245,166,35,0.9)' },
  generating: { color: '#30d988', label: 'Composing answer', ring: 'rgba(48,217,136,0.6)', core: 'rgba(48,217,136,0.8)' },
};

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser  = message.role === 'user';
  const isError = message.status === 'error';
  const isLoading = message.status && !['done','error'].includes(message.status);
  const phase = isLoading ? (message.status as keyof typeof PHASE_CONFIG) : null;

  if (isUser) {
    return (
      <div className="msg-user">
        <div className="msg-user-bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="msg-ai">
      {/* Avatar */}
      <div className="ai-avatar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4"/><path d="M12 17v4"/>
        </svg>
      </div>

      <div className="ai-content">
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
          <span className="ai-name">LEXIS</span>
          {message.usedWebSearch && (
            <span className="badge badge-web">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Web search
            </span>
          )}
          {message.subQuestions && message.subQuestions.length > 0 && (
            <span className="badge badge-decomp">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              Decomposed
            </span>
          )}
        </div>

        {/* Sub-questions */}
        {message.subQuestions && message.subQuestions.length > 0 && message.status === 'done' && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(61,142,240,0.05)', border: '1px solid rgba(61,142,240,0.14)' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#93c5fd', marginBottom: '6px' }}>
              Query broken into:
            </div>
            {message.subQuestions.map((sq, i) => (
              <div key={i} style={{ fontSize: '12px', color: 'var(--t2)', padding: '2px 0' }}>
                {i + 1}. {sq}
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && phase && (
          <div className="loading-wrap">
            <div className="loading-orb">
              <div className="loading-orb-ring" style={{ borderTopColor: PHASE_CONFIG[phase].ring, borderRightColor: `${PHASE_CONFIG[phase].ring}40` }} />
              <div className="loading-orb-core" style={{ background: PHASE_CONFIG[phase].core }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '11px', fontWeight: 600, color: PHASE_CONFIG[phase].color, marginBottom: '5px' }}>
                {PHASE_CONFIG[phase].label}
              </div>
              <div className="typing-dots">
                <div className="typing-dot" style={{ background: PHASE_CONFIG[phase].core }} />
                <div className="typing-dot" style={{ background: PHASE_CONFIG[phase].core }} />
                <div className="typing-dot" style={{ background: PHASE_CONFIG[phase].core }} />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {message.status === 'done' && (
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {isError && (
          <div className="error-box">{message.content}</div>
        )}

        {/* Citations */}
        {message.status === 'done' && (
          <SourceCitation
            citations={message.citations || []}
            usedWebSearch={message.usedWebSearch}
            webSearchQuery={message.webSearchQuery}
          />
        )}

        {/* Timestamp */}
        <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '8px' }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}