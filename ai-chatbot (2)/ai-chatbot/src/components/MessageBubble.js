import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './MessageBubble.css';

export default function MessageBubble({ message, time, playAudio, stopAudio, isPlaying }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopySql = (e, sqlText) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayVoice = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio(message.audio_url);
    }
  };

  return (
    <div className={`bubble-wrapper ${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="bubble-avatar">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="2" y="7" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 7V5a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="9" cy="14" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="14" r="1.5" fill="currentColor"/>
            <path d="M9 17.5s1 1.5 3 1.5 3-1.5 3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div className="bubble-content">
        <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
          {/* Main Text Content */}
          <div className="message-text">
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            )}
          </div>

          {/* SQL Query Accordion (If applicable) */}
          {message.sql && (
            <details className="sql-details-accordion" onClick={(e) => e.stopPropagation()}>
              <summary className="sql-summary-header">
                <div className="sql-title-group">
                  <svg className="sql-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                  </svg>
                  <span>SQL Query Inspection</span>
                </div>
                <span className="sql-badge green">✓ Safe SELECT</span>
              </summary>
              <div className="sql-details-content">
                <div className="sql-code-wrapper">
                  <pre className="sql-code-block">
                    <code>{message.sql}</code>
                  </pre>
                  <button 
                    className={`copy-sql-btn ${copied ? 'copied' : ''}`}
                    onClick={(e) => handleCopySql(e, message.sql)}
                  >
                    {copied ? 'Copied!' : 'Copy SQL'}
                  </button>
                </div>
              </div>
            </details>
          )}

          {/* Charts Preview Card (If applicable) */}
          {message.chart && (
            <div className="chart-preview-card" onClick={(e) => e.stopPropagation()}>
              <div className="chart-card-header">
                <span className="chart-title">{message.chart.title || 'Data Analytics Visual'}</span>
                <span className="chart-badge">{message.chart.type?.toUpperCase() || 'CHART'}</span>
              </div>
              <div className="chart-card-body">
                {message.chart.base64_image ? (
                  <img 
                    src={message.chart.base64_image} 
                    alt={message.chart.title || 'Generated Chart'} 
                    className="chart-img-rendered" 
                  />
                ) : (
                  <div className="chart-placeholder">
                    <p>Analytical details generated: {JSON.stringify(message.chart.datasets)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice Speech Control Panel (Only for AI responses with synthesized audio) */}
          {!isUser && message.audio_url && (
            <div className="bubble-voice-row">
              <button 
                className={`bubble-voice-btn ${isPlaying ? 'playing' : ''}`}
                onClick={handlePlayVoice}
                title={isPlaying ? "Pause speaking" : "Listen to response"}
              >
                {isPlaying ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    <span>Mute</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                    <span>Speak</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        <span className="bubble-time">{time}</span>
      </div>
    </div>
  );
}
