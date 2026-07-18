import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChatWindow.css';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import {
  getOrCreateSessionId,
  sendChatMessage,
  clearSession,
  getDatabaseSchema,
  createDatabaseTables
} from '../services/api';

const INITIAL_MESSAGE = {
  id: 'init',
  role: 'assistant',
  content: `Welcome to the **Enterprise Voice AI Agent**! 

I can understand your natural language queries, automatically generate secure SQL, execute it against our database, and return voice-synthesized summaries alongside interactive charts and tabular data.

**Try asking me:**
* *"Show total sales by product category in a bar chart"*
* *"Which employee has the highest salary?"*
* *"List all customers signed up in 2024"*`,
  timestamp: new Date(),
};

export default function ChatWindow() {
  const [userName, setUserName] = useState(localStorage.getItem('enterprise_user_name') || '');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [schemaText, setSchemaText] = useState('');
  const [schemaTab, setSchemaTab] = useState('inspect'); // 'inspect' | 'add'
  const [newTables, setNewTables] = useState([
    {
      name: '',
      columns: [{ name: '', type: 'TEXT' }],
      sampleData: ''
    }
  ]);
  const [schemaActionError, setSchemaActionError] = useState(null);
  const [schemaActionSuccess, setSchemaActionSuccess] = useState(null);
  const [isSubmittingSchema, setIsSubmittingSchema] = useState(false);

  // Add a new empty table structure
  const handleAddTableForm = () => {
    setNewTables((prev) => [
      ...prev,
      {
        name: '',
        columns: [{ name: '', type: 'TEXT' }],
        sampleData: ''
      }
    ]);
  };

  // Remove a table from form by index
  const handleRemoveTableForm = (tableIdx) => {
    setNewTables((prev) => prev.filter((_, idx) => idx !== tableIdx));
  };

  // Update table name
  const handleTableChange = (tableIdx, field, value) => {
    setNewTables((prev) =>
      prev.map((t, idx) => (idx === tableIdx ? { ...t, [field]: value } : t))
    );
  };

  // Add column to a specific table
  const handleAddColumn = (tableIdx) => {
    setNewTables((prev) =>
      prev.map((t, idx) =>
        idx === tableIdx
          ? { ...t, columns: [...t.columns, { name: '', type: 'TEXT' }] }
          : t
      )
    );
  };

  // Remove column from a specific table
  const handleRemoveColumn = (tableIdx, colIdx) => {
    setNewTables((prev) =>
      prev.map((t, idx) =>
        idx === tableIdx
          ? { ...t, columns: t.columns.filter((_, cIdx) => cIdx !== colIdx) }
          : t
      )
    );
  };

  // Update column field (name or type)
  const handleColumnChange = (tableIdx, colIdx, field, value) => {
    setNewTables((prev) =>
      prev.map((t, idx) => {
        if (idx !== tableIdx) return t;
        const updatedCols = t.columns.map((c, cIdx) =>
          cIdx === colIdx ? { ...c, [field]: value } : c
        );
        return { ...t, columns: updatedCols };
      })
    );
  };

  // Submit multiple tables
  const handleCreateTables = async (e) => {
    e.preventDefault();
    setSchemaActionError(null);
    setSchemaActionSuccess(null);

    if (newTables.length === 0) {
      setSchemaActionError("Please add at least one table definition.");
      return;
    }

    const formattedTables = [];

    for (let t of newTables) {
      const tableName = t.name.trim();
      if (!tableName) {
        setSchemaActionError("Table name cannot be empty.");
        return;
      }
      
      const cols = [];
      for (let c of t.columns) {
        const colName = c.name.trim();
        if (!colName) {
          setSchemaActionError(`Column name in table '${tableName}' cannot be empty.`);
          return;
        }
        cols.push({ name: colName, type: c.type });
      }

      const rows = [];
      if (t.sampleData && t.sampleData.trim()) {
        const lines = t.sampleData.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cells = line.split(',').map(cell => cell.trim());
          if (cells.length !== cols.length) {
            setSchemaActionError(
              `Row ${i + 1} in table '${tableName}' has ${cells.length} value(s), but the table has ${cols.length} column(s).`
            );
            return;
          }
          rows.push(cells);
        }
      }

      formattedTables.push({
        name: tableName,
        columns: cols,
        rows: rows
      });
    }

    setIsSubmittingSchema(true);
    try {
      const result = await createDatabaseTables(formattedTables);
      setSchemaActionSuccess(result.message || "Tables successfully created!");
      
      setNewTables([
        {
          name: '',
          columns: [{ name: '', type: 'TEXT' }],
          sampleData: ''
        }
      ]);

      const schemaData = await getDatabaseSchema();
      if (schemaData && schemaData.schema) {
        setSchemaText(schemaData.schema);
      }
      
      setTimeout(() => {
        setSchemaTab('inspect');
        setSchemaActionSuccess(null);
      }, 2000);

    } catch (err) {
      setSchemaActionError(err.message || "Failed to create database tables.");
    } finally {
      setIsSubmittingSchema(false);
    }
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBodyRef = useRef(null);
  
  const recognitionRef = useRef(null);
  const startInputTextRef = useRef('');
  const currentAudioRef = useRef(null);
  const sessionIdRef = useRef(getOrCreateSessionId());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (userName) {
      inputRef.current?.focus();
    }
  }, [userName]);

  useEffect(() => {
    getDatabaseSchema()
      .then((data) => {
        if (data && data.schema) {
          setSchemaText(data.schema);
        }
      })
      .catch((err) => {
        console.error('Failed to load database schema:', err);
      });
  }, []);

  const playAudio = useCallback((url) => {
    stopAudio();

    if (!url) return;

    const audio = new Audio(url);
    currentAudioRef.current = audio;
    setIsPlayingAudio(true);

    audio.play().catch((err) => {
      console.warn('Audio play failed or interrupted:', err);
      setIsPlayingAudio(false);
    });

    audio.onended = () => {
      setIsPlayingAudio(false);
      currentAudioRef.current = null;
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsPlayingAudio(false);
    }
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Immediately interrupt TTS playback when typing
    if (isPlayingAudio) {
      stopAudio();
    }
  };

  // Initialize Speech Recognition (browser-side STT)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        stopAudio();
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const baseText = startInputTextRef.current;
        if (finalTranscript) {
          const fullQuery = (baseText + (baseText && finalTranscript ? ' ' : '') + finalTranscript).trim();
          setInput(fullQuery);
          // Auto-submit the voice query once speech ends and returns final text
          handleSend(fullQuery);
        } else {
          setInput(baseText + (baseText && interimTranscript ? ' ' : '') + interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please enable microphone permissions in your browser settings.');
        } else {
          setError(`Speech recognition issue: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [userName]); // Reinitialize recognition ref when userName changes

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      stopAudio();
      startInputTextRef.current = input;
      recognitionRef.current.start();
    }
  };

  const handleClear = async () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopAudio();
    setError(null);
    setIsLoading(true);

    try {
      await clearSession(sessionIdRef.current);
      setMessages([INITIAL_MESSAGE]);
    } catch (err) {
      setError(`Failed to clear session: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSend = async (textOverride) => {
    const textToSend = textOverride !== undefined ? textOverride : input;
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopAudio();

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendChatMessage(trimmed, sessionIdRef.current, userName);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || "No text response generated.",
        sql: result.sql,
        chart: result.chart,
        error: result.error,
        audio_url: result.audio_url,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (autoPlayVoice && result.audio_url) {
        playAudio(result.audio_url);
      }
    } catch (err) {
      setError(`Backend Communication Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('enterprise_user_name');
    setUserName('');
    setMessages([INITIAL_MESSAGE]);
    stopAudio();
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Render User Name prompt screen if name is not set
  if (!userName) {
    return (
      <div className="name-prompt-container">
        <div className="name-prompt-card">
          <div className="name-prompt-avatar">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="2" y="7" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7V5a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9" cy="14" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="14" r="1.5" fill="currentColor"/>
              <path d="M9 17.5s1 1.5 3 1.5 3-1.5 3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="prompt-title">NovaAgent Enterprise</h2>
          <p className="prompt-subtitle">Enter your name to initialize a personalized analytics session</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const name = e.target.elements.nameInput.value.trim();
            if (name) {
              localStorage.setItem('enterprise_user_name', name);
              setUserName(name);
            }
          }} className="prompt-form">
            <input
              name="nameInput"
              type="text"
              className="name-input"
              placeholder="Your Name (e.g., Manu)"
              autoFocus
              required
            />
            <button type="submit" className="name-submit-btn">Initialize Session</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="avatar">
            <svg viewBox="0 0 24 24" fill="none" className="avatar-icon">
              <rect x="2" y="7" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7V5a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9" cy="14" r="1.5" fill="currentColor"/>
              <circle cx="15" cy="14" r="1.5" fill="currentColor"/>
              <path d="M9 17.5s1 1.5 3 1.5 3-1.5 3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="header-info">
            <h1 className="header-title">Enterprise Voice AI</h1>
            <div className="status-row">
              <span className="status-dot" />
              <span className="status-text">Active: {userName}</span>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          {/* Schema Viewer Toggle */}
          <button 
            className={`header-btn ${showSchema ? 'active' : ''}`} 
            onClick={() => setShowSchema(!showSchema)} 
            title="Inspect DB Schema"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 01-2.5-2.5z" />
              <path d="M6 6h10M6 10h10" />
            </svg>
            <span className="btn-label">Database Schema</span>
          </button>

          {/* Voice AutoPlay Toggle */}
          <button 
            className={`header-btn ${autoPlayVoice ? 'active' : 'dimmed'}`} 
            onClick={() => {
              if (autoPlayVoice) stopAudio();
              setAutoPlayVoice(!autoPlayVoice);
            }} 
            title={autoPlayVoice ? "Voice Auto-play Enabled" : "Voice Auto-play Disabled"}
          >
            {autoPlayVoice ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
            <span className="btn-label">{autoPlayVoice ? "Voice On" : "Muted"}</span>
          </button>

          {/* Stop Audio Button (only visible when playing) */}
          {isPlayingAudio && (
            <button className="header-btn interrupt-btn" onClick={stopAudio} title="Interrupt speaking">
              <span className="pulse-dot-red" /> Stop Voice
            </button>
          )}

          {/* Logout Button */}
          <button className="header-btn logout-btn" onClick={handleLogout} title="Change User Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="btn-label">Logout</span>
          </button>

          {/* Clear Session Button */}
          <button className="clear-btn" onClick={handleClear} title="Reset Conversation Session">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Panel Layout (Content + Optional Schema side-by-side on desktop) */}
      <div className="main-viewport">
        {/* Messages */}
        <div className="chat-body" ref={chatBodyRef}>
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              time={formatTime(msg.timestamp)} 
              playAudio={playAudio} 
              stopAudio={stopAudio} 
              isPlaying={currentAudioRef.current && currentAudioRef.current.src === msg.audio_url && isPlayingAudio}
            />
          ))}
          {isLoading && <TypingIndicator />}
          {error && (
            <div className="error-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Database Schema Panel */}
        {showSchema && (
          <div className="schema-panel">
            <div className="schema-panel-header">
              <div className="schema-tabs">
                <button 
                  className={`schema-tab-btn ${schemaTab === 'inspect' ? 'active' : ''}`}
                  onClick={() => { setSchemaTab('inspect'); setSchemaActionError(null); setSchemaActionSuccess(null); }}
                >
                  Inspect Schema
                </button>
                <button 
                  className={`schema-tab-btn ${schemaTab === 'add' ? 'active' : ''}`}
                  onClick={() => { setSchemaTab('add'); setSchemaActionError(null); setSchemaActionSuccess(null); }}
                >
                  + Add Tables
                </button>
              </div>
              <button className="close-schema-btn" onClick={() => setShowSchema(false)}>×</button>
            </div>
            
            <div className="schema-panel-body">
              {schemaTab === 'inspect' ? (
                <>
                  <p className="schema-info-text">
                    This schema is loaded dynamically from the SQLite database. The AI validates all generated queries against these definitions to prevent injections and enforce read-only execution.
                  </p>
                  <pre className="schema-code">{schemaText || 'Loading schema structure...'}</pre>
                </>
              ) : (
                <form className="table-creator-form" onSubmit={handleCreateTables}>
                  <p className="schema-info-text">
                    Define and create multiple new database tables. They will be added to the SQLite database and be immediately queryable by the AI chatbot.
                  </p>

                  {schemaActionError && (
                    <div className="schema-alert schema-alert-error">
                      <span>{schemaActionError}</span>
                    </div>
                  )}

                  {schemaActionSuccess && (
                    <div className="schema-alert schema-alert-success">
                      <span>{schemaActionSuccess}</span>
                    </div>
                  )}

                  <div className="tables-list">
                    {newTables.map((table, tIdx) => (
                      <div key={tIdx} className="table-creator-card">
                        <div className="card-header">
                          <h4>Table #{tIdx + 1}</h4>
                          {newTables.length > 1 && (
                            <button 
                              type="button" 
                              className="remove-table-btn" 
                              onClick={() => handleRemoveTableForm(tIdx)}
                              title="Remove table definition"
                            >
                              Remove Table
                            </button>
                          )}
                        </div>

                        <div className="form-group">
                          <label>Table Name</label>
                          <input 
                            type="text" 
                            className="form-control table-name-input"
                            placeholder="e.g. products, suppliers"
                            value={table.name}
                            onChange={(e) => handleTableChange(tIdx, 'name', e.target.value)}
                            required
                          />
                        </div>

                        <div className="columns-section">
                          <div className="section-header">
                            <h5>Columns</h5>
                            <button 
                              type="button" 
                              className="add-col-btn" 
                              onClick={() => handleAddColumn(tIdx)}
                            >
                              + Add Column
                            </button>
                          </div>

                          {table.columns.map((col, cIdx) => (
                            <div key={cIdx} className="column-row">
                              <input 
                                type="text" 
                                className="form-control col-name-input"
                                placeholder="column_name"
                                value={col.name}
                                onChange={(e) => handleColumnChange(tIdx, cIdx, 'name', e.target.value)}
                                required
                              />
                              <select 
                                className="form-control col-type-select"
                                value={col.type}
                                onChange={(e) => handleColumnChange(tIdx, cIdx, 'type', e.target.value)}
                              >
                                <option value="TEXT">TEXT</option>
                                <option value="INTEGER">INTEGER</option>
                                <option value="REAL">REAL</option>
                              </select>
                              {table.columns.length > 1 && (
                                <button 
                                  type="button" 
                                  className="remove-col-btn" 
                                  onClick={() => handleRemoveColumn(tIdx, cIdx)}
                                  title="Remove Column"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="form-group">
                          <label>Sample Data (Optional CSV format, e.g. 1, Item Name, 9.99)</label>
                          <textarea 
                            className="form-control sample-data-input"
                            rows={3}
                            placeholder="row_1_val1, row_1_val2, row_1_val3&#10;row_2_val1, row_2_val2, row_2_val3"
                            value={table.sampleData}
                            onChange={(e) => handleTableChange(tIdx, 'sampleData', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="add-table-btn" 
                      onClick={handleAddTableForm}
                    >
                      + Add Another Table
                    </button>
                    <button 
                      type="submit" 
                      className="submit-schema-btn"
                      disabled={isSubmittingSchema}
                    >
                      {isSubmittingSchema ? 'Creating...' : 'Create & Register Tables'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="chat-footer">
        <div className="input-row">
          <textarea
            ref={inputRef}
            className="message-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening... Speak now.' : 'Type a query... (e.g. total sales by region)'}
            rows={1}
            disabled={isLoading}
          />
          
          {/* Microphone STT Button */}
          {isSpeechSupported && (
            <button
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? 'Stop listening' : 'Talk to AI'}
              type="button"
            >
              {isListening ? (
                <div className="listening-container">
                  <span className="wave-bar bar-1"></span>
                  <span className="wave-bar bar-2"></span>
                  <span className="wave-bar bar-3"></span>
                </div>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </button>
          )}

          <button
            className={`send-btn ${isLoading ? 'loading' : ''} ${input.trim() ? 'active' : ''}`}
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            title="Send message"
          >
            {isLoading ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <p className="footer-hint">Safe read-only execution · Click microphone to dictate query</p>
      </div>
    </div>
  );
}
