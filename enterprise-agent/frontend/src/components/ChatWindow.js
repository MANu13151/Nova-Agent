import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChatWindow.css';
import MessageBubble from './MessageBubble';
import RobotAvatar from './RobotAvatar';
import ParticleSphere from './ParticleSphere';
import SaturnRings from './SaturnRings';
import useWakeWord from '../hooks/useWakeWord';
import {
  getOrCreateSessionId,
  sendChatMessage,
  clearSession
} from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const INITIAL_MESSAGE = {
  id: 'init',
  role: 'assistant',
  content: `I'm ready to analyze your enterprise data. You can ask me to generate reports, visualize trends, or query specific records.`,
  timestamp: new Date(),
};

export default function ChatWindow({ user, onLogout }) {
  const [userName, setUserName] = useState(user?.display_name || 'Admin');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  
  // Right Panel State
  const [activeSql, setActiveSql] = useState(null);
  const [activeChart, setActiveChart] = useState(null);
  const [queryMetrics, setQueryMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('Chat');
  
  // Chart Modal State
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [modalChartType, setModalChartType] = useState('bar');

  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Database tab state
  const [dbTables, setDbTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Analytics & History state
  const [queryHistory, setQueryHistory] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  
  useEffect(() => {
    const fetchSavedQueries = async () => {
      try {
        const response = await fetch(`${API_BASE}/saved-queries`);
        const data = await response.json();
        setSavedReports(data.map(q => ({
          id: q.id,
          query: q.query,
          sql: q.sql,
          timestamp: new Date(q.timestamp),
          status: 'success'
        })));
      } catch (err) { console.error('Failed to fetch saved queries', err); }
    };
    const fetchQueryLog = async () => {
      try {
        const response = await fetch(`${API_BASE}/query-log`);
        const data = await response.json();
        setQueryHistory(data.map(q => ({
          id: q.id,
          query: q.query,
          sql: q.generated_sql,
          intent: q.intent,
          status: q.status,
          executionTime: q.execution_time,
          timestamp: new Date(q.timestamp)
        })));
      } catch (err) { console.error('Failed to fetch query log', err); }
    };
    fetchSavedQueries();
    fetchQueryLog();
  }, []);
  // UI State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('Acme Corp Workspace');

  const currentAudioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(getOrCreateSessionId());
  const handleSendRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const stopAudio = useCallback(() => {
    window.speechSynthesis.cancel();
    currentAudioRef.current = null;
    setIsPlayingAudio(false);
  }, []);

  const openChartModal = (chart) => {
    if (!chart) return;
    setActiveChart(chart);
    setModalChartType(chart.type || 'bar');
    setIsChartModalOpen(true);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (isPlayingAudio) stopAudio();
  };

  // handleSend - the main send function
  const handleSend = useCallback(async (textOverride) => {
    const text = typeof textOverride === 'string' ? textOverride : '';
    const trimmed = text.trim();
    if (!trimmed) return;

    stopAudio();
    setError(null);
    setInput('');
    setIsLoading(true);

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const queryRecord = {
      id: Date.now(),
      query: trimmed,
      timestamp: new Date(),
      status: 'pending',
      executionTime: null,
    };

    try {
      const startTime = performance.now();
      const result = await sendChatMessage(trimmed, sessionIdRef.current, userName);
      const executionTime = ((performance.now() - startTime) / 1000).toFixed(2);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || "Task completed.",
        sql: result.sql,
        chart: result.chart,
        audio_url: result.audio_url,
        data_columns: result.data_columns,
        data_rows: result.data_rows,
        timestamp: new Date(),
        isSafe: result.sql ? true : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setActiveSql(result.sql || null);
      setActiveChart(result.chart || null);
      
      setQueryMetrics({
        time: `${executionTime}s`,
        rows: result.chart?.labels?.length || (result.response?.match(/\|/g) ? "Multiple" : "N/A"),
        confidence: "98%",
        tokens: "~450"
      });

      queryRecord.status = result.error ? 'error' : 'success';
      queryRecord.executionTime = `${executionTime}s`;
      queryRecord.sql = result.sql;
      queryRecord.intent = result.intent;
      setQueryHistory(prev => [queryRecord, ...prev]);

      // Auto-play audio response natively
      if (result.verbal_text) {
        setIsPlayingAudio(true);
        const utterance = new SpeechSynthesisUtterance(result.verbal_text);
        
        // Find a good voice (optional, try to use a premium built-in voice)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English'));
        if (preferredVoice) utterance.voice = preferredVoice;
        
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        
        // Cancel any currently playing speech before starting new one
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        
        // Store utterance in a ref if we need to stop it later
        currentAudioRef.current = utterance;
      }
    } catch (err) {
      setError(err.message);
      queryRecord.status = 'error';
      setQueryHistory(prev => [queryRecord, ...prev]);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message}`,
        isError: true,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [userName, stopAudio]);

  // Keep ref current for the wake word hook
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Wake word hook — handles all speech recognition
  const { isReady, isListening, isNovaActive, transcript, startManual, stopManual } = useWakeWord({
    onCommand: useCallback((query) => {
      handleSendRef.current(query);
    }, []),
  });

  // Sync transcript into input
  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      stopManual();
    } else {
      stopAudio();
      setInput('');
      startManual();
    }
  };

  // handleSend from input box
  const handleSendFromInput = () => {
    if (input.trim()) {
      handleSend(input.trim());
    }
  };

  const toggleSaveReport = async (queryRecord) => {
    const isSaved = savedReports.some(r => r.id === queryRecord.id);
    if (isSaved) {
      setSavedReports(prev => prev.filter(r => r.id !== queryRecord.id));
      try {
        await fetch(`${API_BASE}/saved-queries/${queryRecord.id}`, { method: 'DELETE' });
      } catch (err) { console.error(err); }
    } else {
      setSavedReports(prev => [queryRecord, ...prev]);
      try {
        await fetch(`${API_BASE}/saved-queries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: queryRecord.id, query: queryRecord.query, sql: queryRecord.sql || '' })
        });
      } catch (err) { console.error(err); }
    }
  };

  const handleLogoutClick = () => {
    clearSession(sessionIdRef.current);
    if (onLogout) onLogout();
  };

  // Load database tables when Database tab is selected
  useEffect(() => {
    if (activeTab === 'Database' && dbTables.length === 0) {
      setDbLoading(true);
      fetch(`${API_BASE}/tables/list`)
        .then(res => res.json())
        .then(data => {
          setDbTables(data.tables || []);
          if (data.tables?.length > 0) setSelectedTable(data.tables[0].name);
        })
        .catch(err => console.error('Failed to load tables:', err))
        .finally(() => setDbLoading(false));
    }
  }, [activeTab, dbTables.length]);

  // Toast state for landing page links
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!userName) {
    return (
      <div className="landing-page">
        {toastMessage && (
          <div style={{
            position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)',
            color: '#fff', padding: '12px 24px', borderRadius: '30px', zIndex: 100,
            backdropFilter: 'blur(8px)', animation: 'slide-in-top 0.3s ease-out'
          }}>
            {toastMessage}
          </div>
        )}
        {/* Background Animation */}
        <div className="landing-bg">
          <SaturnRings />
          <div className="landing-gradient-overlay" />
        </div>

        {/* Top Navigation */}
        <nav className="landing-nav">
          <div className="landing-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <polyline points="4 20 4 4 14 20 20 20 20 4" />
            </svg>
            Nova
          </div>
          <div className="landing-links">
            <span onClick={() => showToast("Home page is currently active.")}>Home</span>
            <span onClick={() => showToast("Features page is coming soon!")}>Features</span>
            <span onClick={() => showToast("Pricing page is coming soon!")}>Pricing</span>
            <span onClick={() => showToast("Documentation is coming soon!")}>Docs</span>
          </div>
          <div className="landing-actions">
            <button className="btn-text" onClick={() => showToast("Please enter your name below to sign in.")}>Sign In</button>
            <button className="btn-primary" onClick={() => showToast("Account creation is currently disabled for this demo.")}>Sign Up</button>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="landing-hero">
          <h1 className="hero-title">Start Using AI<br/>Chatbot Now</h1>
          <p className="hero-desc">
            Start your digital transformation journey with an adaptive and<br/>efficient AI chatbot.
          </p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const name = e.target.elements.nameInput.value.trim();
            if (name) {
              localStorage.setItem('enterprise_user_name', name);
              setUserName(name);
            }
          }} className="landing-form">
            <input name="nameInput" type="text" placeholder="Enter your name to Get Started" required />
            <button type="submit">→</button>
          </form>
        </main>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-col brand-col">
            <div className="landing-logo" style={{ marginBottom: '16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <polyline points="4 20 4 4 14 20 20 20 20 4" />
              </svg>
              Nova
            </div>
            <p>We help businesses build intelligent conversational experiences through AI-based chatbot technology.</p>
          </div>
          <div className="footer-col">
            <h4>Products</h4>
            <span onClick={() => showToast("Feature tour coming soon.")}>Key Features</span>
            <span onClick={() => showToast("Pricing tiers coming soon.")}>Pricing</span>
            <span onClick={() => showToast("Integrations catalog coming soon.")}>Integrations</span>
            <span onClick={() => showToast("API Documentation coming soon.")}>Documentation</span>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <span onClick={() => showToast("Help Center is under construction.")}>Help Center</span>
            <span onClick={() => showToast("Blog coming soon.")}>Blog & Articles</span>
            <span onClick={() => showToast("Developer guide coming soon.")}>Developer Guide</span>
          </div>
          <div className="footer-col newsletter-col">
            <h4>Join Newsletter</h4>
            <p>Get the latest AI updates and product updates straight to your email.</p>
            <form className="newsletter-input" onSubmit={(e) => {
              e.preventDefault();
              showToast("Thanks for subscribing!");
              e.target.reset();
            }}>
              <input type="email" placeholder="Enter your email..." required />
              <button type="submit">→</button>
            </form>
          </div>
        </footer>
      </div>
    );
  }

  // Render the content for different tabs
  const renderTabContent = () => {
    switch(activeTab) {
      case 'Database':
        return renderDatabaseTab();
      case 'Analytics':
        return renderAnalyticsTab();
      case 'Recent Queries':
        return renderRecentQueriesTab();
      default:
        return renderChatTab();
    }
  };

  const renderDatabaseTab = () => {
    const currentTable = dbTables.find(t => t.name === selectedTable);
    return (
      <div className="tab-content database-tab">
        <h2 className="tab-title">Database Explorer</h2>
        <p className="tab-subtitle">Browse the enterprise database tables and preview data.</p>
        
        {dbLoading ? (
          <div className="tab-loading">Loading tables...</div>
        ) : (
          <>
            {/* Table selector pills */}
            <div className="table-pills">
              {dbTables.map(t => (
                <button 
                  key={t.name} 
                  className={`table-pill ${selectedTable === t.name ? 'active' : ''}`}
                  onClick={() => setSelectedTable(t.name)}
                >
                  {t.name}
                  <span className="pill-count">{t.row_count}</span>
                </button>
              ))}
            </div>

            {/* Table preview */}
            {currentTable && (
              <div className="db-table-container glass-panel">
                <div className="db-table-header">
                  <span className="db-table-name">{currentTable.name}</span>
                  <span className="db-table-info">{currentTable.row_count} rows · {currentTable.columns.length} columns</span>
                </div>
                <div className="db-table-scroll">
                  <table className="db-table">
                    <thead>
                      <tr>
                        {currentTable.column_names.map((col, i) => (
                          <th key={i}>
                            {col}
                            <span className="col-type">{currentTable.columns[i]?.type}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTable.preview_rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((val, ci) => (
                            <td key={ci}>{val != null ? String(val) : <span className="null-val">NULL</span>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    const allQueries = [...queryHistory];
    const totalQueries = allQueries.length;
    const successQueries = allQueries.filter(q => q.status === 'success').length;
    const errorQueries = allQueries.filter(q => q.status === 'error').length;
    const successRate = totalQueries > 0 ? ((successQueries / totalQueries) * 100).toFixed(1) : '0.0';
    const avgTime = totalQueries > 0 
      ? (allQueries.reduce((sum, q) => sum + parseFloat(q.executionTime || '0'), 0) / totalQueries).toFixed(2)
      : '0.00';
    const dbQueries = allQueries.filter(q => q.intent === 'db_query').length;
    
    // Build timeline data (last 10 queries)
    const timelineLabels = allQueries.slice(-10).map((q, i) => `Q${i + 1}`);
    const timelineData = allQueries.slice(-10).map(q => parseFloat(q.executionTime || '0'));

    return (
      <div className="tab-content analytics-tab">
        <h2 className="tab-title">Usage Analytics</h2>
        <p className="tab-subtitle">Cross-session performance insights for Nova AI.</p>
        
        {/* KPI Strip */}
        <div className="analytics-kpi-strip">
          <div className="kpi-card glass-panel" style={{ borderLeft: '3px solid #00E5FF' }}>
            <span className="kpi-label">Total Queries</span>
            <span className="kpi-value">{totalQueries}</span>
            <span className="kpi-trend" style={{ color: '#00E5FF' }}>↑ all time</span>
          </div>
          <div className="kpi-card glass-panel" style={{ borderLeft: '3px solid #00FFAA' }}>
            <span className="kpi-label">Success Rate</span>
            <span className="kpi-value" style={{ color: '#00FFAA' }}>{successRate}%</span>
            <span className="kpi-trend" style={{ color: '#00FFAA' }}>✓ {successQueries} passed</span>
          </div>
          <div className="kpi-card glass-panel" style={{ borderLeft: '3px solid #B055FF' }}>
            <span className="kpi-label">Avg Response</span>
            <span className="kpi-value">{avgTime}s</span>
            <span className="kpi-trend" style={{ color: '#B055FF' }}>⚡ fast</span>
          </div>
          <div className="kpi-card glass-panel" style={{ borderLeft: '3px solid #FFB800' }}>
            <span className="kpi-label">DB Queries</span>
            <span className="kpi-value">{dbQueries}</span>
            <span className="kpi-trend" style={{ color: '#FFB800' }}>📊 cached</span>
          </div>
        </div>

        {/* Timeline Chart + Floating Success Card */}
        <div className="analytics-chart-section">
          <div className="analytics-chart-container glass-panel">
            <div className="analytics-chart-header">
              <span>Query Performance Timeline</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Last {Math.min(10, totalQueries)} queries</span>
            </div>
            {totalQueries > 0 ? (
              <div style={{ padding: '16px', height: '220px' }}>
                <Line
                  data={{
                    labels: timelineLabels,
                    datasets: [{
                      label: 'Response Time (s)',
                      data: timelineData,
                      borderColor: '#00E5FF',
                      backgroundColor: (ctx) => {
                        const chart = ctx.chart;
                        const {ctx: c, chartArea} = chart;
                        if (!chartArea) return 'rgba(0, 229, 255, 0.1)';
                        const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(0, 229, 255, 0)');
                        gradient.addColorStop(1, 'rgba(0, 229, 255, 0.25)');
                        return gradient;
                      },
                      tension: 0.4,
                      fill: true,
                      pointRadius: 5,
                      pointBackgroundColor: '#00E5FF',
                      pointBorderColor: '#0A0F1A',
                      pointBorderWidth: 3,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { ticks: { color: '#8A9BAE' }, grid: { color: 'rgba(255,255,255,0.03)' } },
                      x: { ticks: { color: '#8A9BAE' }, grid: { display: false } }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No data yet. Start querying to see the timeline.
              </div>
            )}
          </div>

          {/* Floating Success Rate Card */}
          <div className="floating-stat-card glass-panel">
            <span className="floating-stat-value" style={{ color: '#00FFAA' }}>{successRate}%</span>
            <span className="floating-stat-label">Success Rate</span>
          </div>
        </div>

        {/* Query History Table */}
        {totalQueries > 0 && (
          <div className="analytics-table-section glass-panel">
            <div className="analytics-chart-header">
              <span>Query History</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{totalQueries} total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="analytics-history-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allQueries.slice().reverse().slice(0, 20).map((q, i) => (
                    <tr key={i}>
                      <td className="query-cell">{q.query}</td>
                      <td>
                        <span className={`type-pill ${q.intent === 'db_query' ? 'type-db' : 'type-chat'}`}>
                          {q.intent === 'db_query' ? 'Database' : 'Chat'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${q.status === 'success' ? 'status-success' : 'status-error'}`}>
                          {q.status === 'success' ? '✓ Success' : '✗ Error'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{q.executionTime || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalQueries === 0 && (
          <div className="empty-state">
            <p>No queries yet. Start chatting with Nova to see analytics here.</p>
          </div>
        )}
      </div>
    );
  };

  const renderSavedReportsTab = () => {
    return (
      <div className="tab-content recent-queries-tab">
        <h2 className="tab-title">Saved Reports</h2>
        <p className="tab-subtitle">Your favorited queries and reports for quick access.</p>
        
        {savedReports.length === 0 ? (
          <div className="empty-state">
            <p>No saved reports yet. Star a query from Recent Queries to save it here.</p>
          </div>
        ) : (
          <div className="recent-list">
            {savedReports.map((q) => (
              <div key={q.id} className="recent-item glass-panel" style={{ cursor: 'pointer' }}>
                <div className="recent-item-header">
                  <span className={`recent-status success`}>⭐</span>
                  <span className="recent-query" onClick={() => { setActiveTab('Chat'); handleSend(q.query); }}>{q.query}</span>
                  <button className="save-btn" onClick={(e) => { e.stopPropagation(); toggleSaveReport(q); }} title="Remove from saved">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
                {q.sql && <code className="recent-sql" onClick={() => { setActiveTab('Chat'); handleSend(q.query); }}>{q.sql}</code>}
                <span className="recent-timestamp">{new Date(q.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRecentQueriesTab = () => {
    return (
      <div className="tab-content recent-queries-tab">
        <h2 className="tab-title">Recent Queries</h2>
        <p className="tab-subtitle">History of operations from your current session.</p>
        
        {queryHistory.length === 0 ? (
          <div className="empty-state">
            <p>No queries yet. Ask Nova something to see your history here.</p>
          </div>
        ) : (
          <div className="recent-list">
            {queryHistory.map((q) => {
              const isSaved = savedReports.some(r => r.id === q.id);
              return (
                <div key={q.id} className="recent-item glass-panel" style={{ cursor: 'pointer' }}>
                  <div className="recent-item-header">
                    <span className={`recent-status ${q.status}`}>
                      {q.status === 'success' ? '✓' : '✕'}
                    </span>
                    <span className="recent-query" onClick={() => { setActiveTab('Chat'); handleSend(q.query); }}>{q.query}</span>
                    <span className="recent-time" style={{ marginRight: '8px' }}>{q.executionTime}</span>
                    <button className="save-btn" onClick={(e) => { e.stopPropagation(); toggleSaveReport(q); }} title={isSaved ? "Remove from saved" : "Save report"}>
                      <svg viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: isSaved ? 'var(--accent-gold)' : 'var(--text-secondary)' }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
                  {q.sql && <code className="recent-sql" onClick={() => { setActiveTab('Chat'); handleSend(q.query); }}>{q.sql}</code>}
                  <span className="recent-timestamp">{new Date(q.timestamp).toLocaleTimeString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderChatTab = () => {
    if (messages.length === 0) {
      return (
        <div className="hero-section">
          <h1 className="hero-greeting">Good Morning, {userName} <span role="img" aria-label="wave">👋</span></h1>
          <p className="hero-subtitle">What would you like to analyze today?</p>
          
          <div className="suggestion-grid">
            {[
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>, text: "Sales Report", colorClass: 'suggestion-blue' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, text: "Revenue Trends", colorClass: 'suggestion-green' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, text: "Employee Salary", colorClass: 'suggestion-purple' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>, text: "Customer Analytics", colorClass: 'suggestion-orange' }
            ].map((s, i) => (
              <div key={i} className={`suggestion-card ${s.colorClass}`} onClick={() => handleSend(`Show me a ${s.text.toLowerCase()}`)}>
                <div className="suggestion-icon">{s.icon}</div>
                <span className="suggestion-text">{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="messages-container">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onPlayAudio={() => {}} />
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: 0.9 }}>
            <div className="message-avatar mascot-avatar" style={{ transform: 'scale(0.8)', marginLeft: '-10px' }}>
              <RobotAvatar isTalking={false} isThinking={true} />
            </div>
            <span style={{ marginLeft: '10px' }}>Nova is thinking...</span>
          </div>
        )}
        {error && <div style={{ color: '#ff4d4d', marginTop: '8px' }}>{error}</div>}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  return (
    <div className="app-layout">
      {/* GLOBAL SCREEN-WANDERING MASCOT */}
      {/* GLOBAL SCREEN-WANDERING MASCOT REMOVED */}
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="4 20 4 4 14 20 20 20 20 4" />
            </svg>
          </div>
          <span className="sidebar-title">Nova AI</span>
        </div>
        
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'Chat' ? 'active' : ''}`} onClick={() => setActiveTab('Chat')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat
          </div>
          <div className={`nav-item ${activeTab === 'Database' ? 'active' : ''}`} onClick={() => setActiveTab('Database')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3v-14"/></svg>
            Database
          </div>
          <div className={`nav-item ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-4"/></svg>
            Analytics
          </div>

          <div className="nav-section-title">History</div>
          <div className={`nav-item ${activeTab === 'Recent Queries' ? 'active' : ''}`} onClick={() => setActiveTab('Recent Queries')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Recent Queries
          </div>
          <div className={`nav-item ${activeTab === 'Saved Reports' ? 'active' : ''}`} onClick={() => setActiveTab('Saved Reports')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Saved Reports
          </div>
        </nav>

        <div className="user-profile-container" style={{ position: 'relative' }}>
          <div className="user-profile-card" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
              <div className="online-indicator" />
            </div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-role">Enterprise Admin</span>
            </div>
          </div>
          
          {showProfileMenu && (
            <div className="profile-menu glass-panel" style={{
              position: 'absolute',
              bottom: '100%',
              left: '0',
              width: '100%',
              marginBottom: '8px',
              padding: '8px 0',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div className="menu-item" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleLogoutClick}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="main-content">
        <div className="neurovia-orb-container">
          <ParticleSphere isListening={isListening || isNovaActive} />
        </div>

        <header className="top-navigation">
          <div className="workspace-dropdown-container" style={{ position: 'relative' }}>
            <div className="workspace-selector glass-panel glass-panel-hover" onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)} style={{ cursor: 'pointer' }}>
              {activeWorkspace}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ transform: showWorkspaceMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            
            {showWorkspaceMenu && (
              <div className="profile-menu glass-panel" style={{
                position: 'absolute',
                top: '110%',
                left: '0',
                width: '100%',
                minWidth: '200px',
                padding: '8px 0',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ padding: '8px 16px', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Switch Data Source</div>
                <div className="menu-item" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setActiveWorkspace('Acme Corp Workspace'); setShowWorkspaceMenu(false); }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeWorkspace === 'Acme Corp Workspace' ? 'var(--accent-green)' : 'transparent' }}></div>
                  Acme Corp (Production)
                </div>
                <div className="menu-item" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setActiveWorkspace('Global Tech Workspace'); setShowWorkspaceMenu(false); }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeWorkspace === 'Global Tech Workspace' ? 'var(--accent-green)' : 'transparent' }}></div>
                  Global Tech (Staging)
                </div>
                <div className="menu-item" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setActiveWorkspace('Personal Demo'); setShowWorkspaceMenu(false); }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeWorkspace === 'Personal Demo' ? 'var(--accent-green)' : 'transparent' }}></div>
                  Personal Demo
                </div>
              </div>
            )}
          </div>
          <div className="top-actions">
            <button className="icon-btn" title="View Schema"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></button>
            <button className="icon-btn" onClick={async () => {
              await clearSession(sessionIdRef.current);
              setMessages([]);
              setActiveSql(null);
              setActiveChart(null);
              setQueryMetrics(null);
            }} title="Clear Session"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            <button className="icon-btn danger-hover" onClick={() => {
              localStorage.removeItem('enterprise_user_name');
              setUserName('');
              setMessages([]);
              setActiveSql(null);
              setActiveChart(null);
              setQueryMetrics(null);
            }} title="Logout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
          </div>
        </header>

        <div className="chat-scroll-area">
          {renderTabContent()}
        </div>

        {/* Floating Input Dock */}
        <div className="input-dock">
          <div className={`input-container ${isNovaActive ? 'nova-active' : ''}`}>
            <button 
              className={`orb-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              title={isListening ? "Listening... (click to stop)" : "Click to speak"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <input
              type="text"
              className="text-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendFromInput();
                }
              }}
              placeholder={isListening ? "Listening... speak your question" : isReady ? "Say 'Hey Nova' or type a question..." : "Ask Nova anything..."}
            />
            <button className="send-btn" onClick={handleSendFromInput} disabled={!input.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* 3. RIGHT INSIGHTS PANEL */}
      <aside className="insights-panel">
        {!activeSql && !activeChart ? (
          <div className="empty-insights">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            <p>Live Dashboard<br/>Execute a query to see insights.</p>
          </div>
        ) : (
          <>
            {/* Chart Visualization — Bigger & Premium */}
            {activeChart && activeChart.type && (
              <div 
                className="insight-card glass-panel chart-card-main" 
                onClick={() => openChartModal(activeChart)}
                title="Click to expand details"
              >
                <div className="panel-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  Visualization
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Click to expand ↗</span>
                </div>
                <div style={{ padding: '16px', minHeight: '220px' }}>
                  {activeChart.type === 'bar' && (
                    <Bar 
                      data={{
                        labels: activeChart.labels,
                        datasets: [{
                          label: activeChart.datasets[0].label,
                          data: activeChart.datasets[0].data,
                          backgroundColor: (ctx) => {
                            const chart = ctx.chart;
                            const {ctx: c, chartArea} = chart;
                            if (!chartArea) return 'rgba(0, 229, 255, 0.6)';
                            const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            gradient.addColorStop(0, 'rgba(0, 229, 255, 0.3)');
                            gradient.addColorStop(1, 'rgba(176, 85, 255, 0.8)');
                            return gradient;
                          },
                          borderColor: '#B055FF',
                          borderWidth: 1,
                          borderRadius: 6,
                        }]
                      }} 
                      options={{ responsive: true, plugins: { legend: { display: false }, title: { display: true, text: activeChart.title, color: '#fff', font: { size: 13 } } }, scales: { y: { ticks: { color: '#8A9BAE' }, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { ticks: { color: '#8A9BAE', maxRotation: 45 }, grid: { display: false } } } }}
                    />
                  )}
                  {activeChart.type === 'line' && (
                    <Line 
                      data={{
                        labels: activeChart.labels,
                        datasets: [{
                          label: activeChart.datasets[0].label,
                          data: activeChart.datasets[0].data,
                          borderColor: '#00E5FF',
                          backgroundColor: (ctx) => {
                            const chart = ctx.chart;
                            const {ctx: c, chartArea} = chart;
                            if (!chartArea) return 'rgba(0, 229, 255, 0.2)';
                            const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            gradient.addColorStop(0, 'rgba(0, 229, 255, 0)');
                            gradient.addColorStop(1, 'rgba(0, 229, 255, 0.3)');
                            return gradient;
                          },
                          tension: 0.4,
                          fill: true,
                          pointRadius: 4,
                          pointBackgroundColor: '#00E5FF',
                          pointBorderColor: '#060A0F',
                          pointBorderWidth: 2,
                        }]
                      }} 
                      options={{ responsive: true, plugins: { legend: { display: false }, title: { display: true, text: activeChart.title, color: '#fff', font: { size: 13 } } }, scales: { y: { ticks: { color: '#8A9BAE' }, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { ticks: { color: '#8A9BAE' }, grid: { display: false } } } }}
                    />
                  )}
                  {activeChart.type === 'pie' && (
                    <Pie 
                      data={{
                        labels: activeChart.labels,
                        datasets: [{
                          data: activeChart.datasets[0].data,
                          backgroundColor: ['#00E5FF', '#B055FF', '#FF007F', '#00FFAA', '#FFB800', '#0080FF'],
                          borderWidth: 2,
                          borderColor: '#0A0F1A',
                        }]
                      }} 
                      options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#8A9BAE', padding: 12 } }, title: { display: true, text: activeChart.title, color: '#fff', font: { size: 13 } } } }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Compact Metrics Row */}
            {queryMetrics && (
              <div className="insight-card glass-panel compact-metrics">
                <div className="compact-metric">
                  <span className="compact-metric-value">{queryMetrics.rows}</span>
                  <span className="compact-metric-label">Rows</span>
                </div>
                <div className="compact-metric-divider" />
                <div className="compact-metric">
                  <span className="compact-metric-value">{queryMetrics.time}</span>
                  <span className="compact-metric-label">Time</span>
                </div>
                <div className="compact-metric-divider" />
                <div className="compact-metric">
                  <span className="compact-metric-value" style={{ color: 'var(--accent-green)' }}>{queryMetrics.confidence}</span>
                  <span className="compact-metric-label">Confidence</span>
                </div>
              </div>
            )}

            {/* Collapsed SQL Accordion */}
            {activeSql && (
              <details className="sql-accordion glass-panel">
                <summary className="sql-accordion-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  View Generated SQL
                </summary>
                <div className="sql-accordion-body">
                  {activeSql}
                </div>
              </details>
            )}
          </>
        )}
      </aside>

      {/* ===== CHART DETAIL MODAL ===== */}
      {isChartModalOpen && activeChart && (
        <div className="chart-modal-overlay" onClick={() => setIsChartModalOpen(false)}>
          <div className="chart-modal-content" onClick={e => e.stopPropagation()}>
            <div className="chart-modal-header">
              <div className="chart-modal-title">{activeChart.title}</div>
              <button className="modal-close-btn" onClick={() => setIsChartModalOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="chart-modal-body">
              <div className="chart-type-toggles">
                <button 
                  className={`chart-toggle-btn ${modalChartType === 'bar' ? 'active' : ''}`}
                  onClick={() => setModalChartType('bar')}
                >Bar Chart</button>
                <button 
                  className={`chart-toggle-btn ${modalChartType === 'line' ? 'active' : ''}`}
                  onClick={() => setModalChartType('line')}
                >Line Chart</button>
                <button 
                  className={`chart-toggle-btn ${modalChartType === 'pie' ? 'active' : ''}`}
                  onClick={() => setModalChartType('pie')}
                >Pie Chart</button>
              </div>
              
              <div style={{ height: '350px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                {modalChartType === 'bar' && (
                  <Bar data={{ labels: activeChart.labels, datasets: [{ label: activeChart.datasets[0].label, data: activeChart.datasets[0].data, backgroundColor: 'rgba(0, 229, 255, 0.6)', borderColor: '#00E5FF', borderWidth: 1 }]}} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#8A9BAE' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#8A9BAE' }, grid: { display: false } } } }} />
                )}
                {modalChartType === 'line' && (
                  <Line data={{ labels: activeChart.labels, datasets: [{ label: activeChart.datasets[0].label, data: activeChart.datasets[0].data, borderColor: '#00E5FF', backgroundColor: 'rgba(0, 229, 255, 0.2)', tension: 0.4, fill: true }]}} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#8A9BAE' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#8A9BAE' }, grid: { display: false } } } }} />
                )}
                {modalChartType === 'pie' && (
                  <Pie data={{ labels: activeChart.labels, datasets: [{ data: activeChart.datasets[0].data, backgroundColor: ['#00E5FF', '#00FFAA', '#00FFCC', '#00BFFF', '#0080FF'], borderWidth: 0 }]}} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'right', labels: { color: '#8A9BAE' } } } }} />
                )}
              </div>

              {/* Data Table */}
              <div style={{ marginTop: '20px' }}>
                <div className="panel-title">Raw Data</div>
                <table className="chart-data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>{activeChart.datasets[0].label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeChart.labels.map((label, idx) => (
                      <tr key={idx}>
                        <td>{label}</td>
                        <td>{activeChart.datasets[0].data[idx].toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
