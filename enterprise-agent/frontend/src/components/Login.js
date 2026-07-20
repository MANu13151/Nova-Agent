import React, { useState, useRef } from 'react';
import './Login.css';
import SaturnRings from './SaturnRings';

export default function Login({ onLogin }) {
  const [showModal, setShowModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [showVoicePrompt, setShowVoicePrompt] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isEntering, setIsEntering] = useState(false);

  const handlePlanetClick = () => {
    if (userData) {
      setIsEntering(true);
      setTimeout(() => {
        onLogin(userData);
      }, 1500); // Wait for animation to finish before entering
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isSignUp ? '/auth/register' : '/auth/login';
      const body = isSignUp 
        ? { username, password, display_name: displayName }
        : { username, password };

      const response = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:8000/api') + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Authentication failed');
      }

      const data = await response.json();
      setUserData(data.user);
      
      if (isSignUp) {
        // Registration successful
        setShowVoicePrompt(true); // Prompt them to set up voice
      } else {
        setIsAuthenticated(true);
        setShowModal(false);
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceLogin = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.webm');

        setIsLoading(true);
        try {
          const response = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:8000/api') + '/auth/voice/login', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) throw new Error('Voice not recognized');
          
          const data = await response.json();
          setUserData(data.user);
          setIsAuthenticated(true);
          setShowModal(false);
        } catch (err) {
          setError('Voice authentication failed. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Record for 3 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        }
      }, 3000);

    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const skipVoiceSetup = () => {
    setIsAuthenticated(true);
    setShowModal(false);
    setShowVoicePrompt(false);
  };

  const registerVoice = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.webm');
        formData.append('username', userData.username);

        setIsLoading(true);
        try {
          const response = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:8000/api') + '/auth/voice/register', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) throw new Error('Failed to register voice');
          
          setIsAuthenticated(true);
          setShowModal(false);
          setShowVoicePrompt(false);
        } catch (err) {
          setError('Voice registration failed. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Record for 3 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        }
      }, 3000);

    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const handleOpenModal = (signup = false) => {
    setIsSignUp(signup);
    setShowModal(true);
    setError('');
    setShowVoicePrompt(false);
  };

  return (
    <div className="landing-page" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'var(--bg-primary)', overflowY: 'auto' }}>
      {/* Background Animation */}
      <div className="landing-bg">
        <SaturnRings />
        <div className="landing-gradient-overlay" />
      </div>

      {/* Top Navigation */}
      <nav className="landing-nav" style={{ opacity: isAuthenticated ? 0 : 1, transition: 'opacity 1s' }}>
        <div className="landing-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <polyline points="4 20 4 4 14 20 20 20 20 4" />
          </svg>
          Nova
        </div>
        <div className="landing-links">
          <span>Home</span>
          <span>Features</span>
          <span>Pricing</span>
          <span>Docs</span>
        </div>
        <div className="landing-actions">
          <button className="btn-text" onClick={() => handleOpenModal(false)}>Sign In</button>
          <button className="btn-primary" onClick={() => handleOpenModal(true)}>Sign Up</button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="landing-hero" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {!isAuthenticated ? (
          <div style={{ opacity: showModal ? 0 : 1, transition: 'opacity 0.3s' }}>
            <h1 className="hero-title">Start Using AI<br/>Chatbot Now</h1>
            <p className="hero-desc">
              Start your digital transformation journey with an adaptive and<br/>efficient AI chatbot.
            </p>
          </div>
        ) : (
          <div className={`planet-container ${isEntering ? 'entering' : ''}`} onClick={handlePlanetClick}>
            <div className="dark-planet"></div>
            <div className="planet-hint" style={{ opacity: isEntering ? 0 : 1, transition: 'opacity 0.3s' }}>Tap to Enter</div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="landing-footer" style={{ opacity: isAuthenticated ? 0 : 1, transition: 'opacity 1s', pointerEvents: isAuthenticated ? 'none' : 'auto' }}>
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
          <span>Key Features</span>
          <span>Pricing</span>
          <span>Integrations</span>
          <span>Documentation</span>
        </div>
        <div className="footer-col">
          <h4>Resources</h4>
          <span>Help Center</span>
          <span>Blog & Articles</span>
          <span>Developer Guide</span>
        </div>
        <div className="footer-col newsletter-col">
          <h4>Join Newsletter</h4>
          <p>Get the latest AI updates and product updates straight to your email.</p>
          <form className="newsletter-input" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email..." required />
            <button type="submit">→</button>
          </form>
        </div>
      </footer>

      {/* Sign In / Sign Up Modal */}
      {showModal && !isAuthenticated && (
        <div className="login-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            
            {showVoicePrompt ? (
              <div className="voice-prompt-container">
                <h2>Set up Voice 2FA</h2>
                <p style={{ color: '#00E5FF', marginBottom: '16px', fontSize: '0.9rem' }}>
                  It is highly recommended to add Voice 2FA for smoother and faster operations.
                </p>
                <p style={{ marginBottom: '24px', fontSize: '0.85rem', color: '#8A9BAE' }}>
                  Click below and say "My voice is my password" to enroll your voice print.
                </p>
                
                {error && <div className="modal-error">{error}</div>}
                
                <button 
                  className={`btn-primary modal-submit ${isRecording ? 'recording' : ''}`} 
                  onClick={registerVoice} 
                  disabled={isLoading || isRecording}
                  style={{ background: isRecording ? '#FF3B30' : '' }}
                >
                  {isRecording ? 'Recording (3s)...' : 'Record Voice'}
                </button>
                <button className="btn-text" onClick={skipVoiceSetup} style={{ marginTop: '16px', display: 'block', width: '100%' }}>
                  Skip for now
                </button>
              </div>
            ) : (
              <>
                <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
                <p>{isSignUp ? 'Join Nova Agent today' : 'Welcome back to Nova'}</p>
                
                <form onSubmit={handleSubmit} className="modal-form">
                  {error && <div className="modal-error">{error}</div>}
                  
                  {isSignUp && (
                    <input 
                      type="text" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      placeholder="Display Name (e.g. John Doe)" 
                      required 
                    />
                  )}
                  
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="Username (e.g. admin)" 
                    required 
                  />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Password" 
                    required 
                  />
                  
                  <button type="submit" className="btn-primary modal-submit" disabled={isLoading || isRecording}>
                    {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Enter Nova')}
                  </button>
                </form>

                {!isSignUp && (
                  <div className="voice-login-section" style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#8A9BAE', marginBottom: '12px' }}>Or log in securely with your voice:</p>
                    <button 
                      className={`btn-secondary modal-submit ${isRecording ? 'recording' : ''}`} 
                      onClick={startVoiceLogin} 
                      disabled={isLoading || isRecording}
                      style={{ 
                        background: isRecording ? '#FF3B30' : 'rgba(0, 229, 255, 0.1)', 
                        border: '1px solid #00E5FF', 
                        color: isRecording ? '#fff' : '#00E5FF',
                        width: '100%'
                      }}
                    >
                      {isRecording ? 'Listening (3s)...' : 'Login with Voice'}
                    </button>
                  </div>
                )}

                <div className="login-footer" style={{ marginTop: '20px' }}>
                  {isSignUp ? (
                    <span>Already have an account? <strong style={{cursor:'pointer'}} onClick={() => { setIsSignUp(false); setError(''); }}>Sign In</strong></span>
                  ) : (
                    <span>New to Nova? <strong style={{cursor:'pointer'}} onClick={() => { setIsSignUp(true); setError(''); }}>Create an Account</strong></span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
