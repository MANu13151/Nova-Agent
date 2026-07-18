import React from 'react';
import './TypingIndicator.css';

export default function TypingIndicator() {
  return (
    <div className="typing-wrapper">
      <div className="typing-avatar">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 7V5a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="9" cy="14" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="14" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div className="typing-bubble">
        <span className="dot" style={{ animationDelay: '0ms' }} />
        <span className="dot" style={{ animationDelay: '180ms' }} />
        <span className="dot" style={{ animationDelay: '360ms' }} />
      </div>
    </div>
  );
}
