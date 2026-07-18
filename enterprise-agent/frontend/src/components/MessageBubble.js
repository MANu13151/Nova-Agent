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

  const downloadCSV = () => {
    if (!message.data_columns || !message.data_rows) return;
    
    // Build CSV string
    const headers = message.data_columns.join(',');
    const rows = message.data_rows.map(row => 
      row.map(cell => {
        // Handle commas/quotes in data
        if (cell === null || cell === undefined) return '';
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\\n');
    
    const csvContent = headers + '\\n' + rows;
    
    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nova_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            
            {message.data_columns && message.data_rows && (
              <button className="text-btn export-btn" onClick={downloadCSV}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export CSV
              </button>
            )}
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
