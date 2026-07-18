import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import RobotAvatar from './RobotAvatar';
import './MessageBubble.css';

export default function MessageBubble({ message, onPlayAudio, isPlaying }) {
  const isUser = message.role === 'user';
  const [showSql, setShowSql] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isHoveringExplain, setIsHoveringExplain] = useState(false);

  const handleExplain = async () => {
    if (explanation) {
      setShowExplanation(!showExplanation);
      return;
    }
    
    setIsExplaining(true);
    setShowExplanation(true);
    try {
      const res = await fetch('http://localhost:8000/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: message.sql })
      });
      const data = await res.json();
      setExplanation(data.explanation || 'Failed to explain.');
    } catch (err) {
      setExplanation('Error contacting server.');
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'ai-row'}`}>
      
      {!isUser && (
        <div className="message-avatar mascot-avatar">
          <RobotAvatar 
            isTalking={isPlaying} 
            isThinking={isExplaining || isHoveringExplain} 
          />
        </div>
      )}

      <div className={`message-card ${isUser ? 'user-card' : 'ai-card glass-panel'}`}>
        <div className="message-content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* AI Action Bar / Details */}
        {!isUser && message.sql && (
          <div className="ai-card-footer">
            <div className="safe-badge">
              <span className="safe-dot"></span>
              Safe Query
            </div>
            
            <button className="text-btn" onClick={() => setShowSql(!showSql)}>
              {showSql ? 'Hide SQL' : 'Preview SQL'}
            </button>
            
            <button 
              className="text-btn explain-btn" 
              onClick={handleExplain}
              onMouseEnter={() => setIsHoveringExplain(true)}
              onMouseLeave={() => setIsHoveringExplain(false)}
            >
              {isExplaining ? 'Explaining...' : (showExplanation ? 'Hide Explanation' : 'Explain')}
            </button>
          </div>
        )}

        {/* Expanded SQL Preview */}
        {!isUser && message.sql && showSql && (
          <div className="sql-preview-block">
            <code>{message.sql}</code>
          </div>
        )}

        {/* Expanded Explanation */}
        {!isUser && message.sql && showExplanation && (
          <div className="explanation-block" style={{ padding: '12px 16px', background: 'rgba(0, 240, 255, 0.05)', borderTop: '1px solid var(--glass-border)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isExplaining ? (
              <span style={{ opacity: 0.7, animation: 'pulse 1.5s infinite' }}>Analyzing query logic...</span>
            ) : (
              <div>
                <strong>SQL Explanation:</strong>
                <p style={{ marginTop: '8px', marginBottom: 0, lineHeight: 1.5 }}>{explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="message-avatar user-avatar-small">
          U
        </div>
      )}
    </div>
  );
}
