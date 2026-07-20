import React, { useState } from 'react';
import './Login.css';
import SaturnRings from './SaturnRings';

export default function Login({ onLogin }) {
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:8000/api') + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      setUserData(data.user);
      setIsAuthenticated(true);
      setShowModal(false);
    } catch (err) {
      setError('Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const [isEntering, setIsEntering] = useState(false);

  const handlePlanetClick = () => {
    if (userData) {
      setIsEntering(true);
      setTimeout(() => {
        onLogin(userData);
      }, 1500); // Wait for animation to finish before entering
    }
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
          <button className="btn-text" onClick={() => setShowModal(true)}>Sign In</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Sign Up</button>
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

      {/* Sign In Modal */}
      {showModal && !isAuthenticated && (
        <div className="login-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <h2>Sign In</h2>
            <p>Welcome back to Nova</p>
            <form onSubmit={handleSubmit} className="modal-form">
              {error && <div className="modal-error">{error}</div>}
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
                placeholder="Password (e.g. admin123)" 
                required 
              />
              <button type="submit" className="btn-primary modal-submit" disabled={isLoading}>
                {isLoading ? 'Authenticating...' : 'Enter Nova'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
