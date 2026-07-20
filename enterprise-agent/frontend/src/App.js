import React, { useState, useEffect } from 'react';
import './App.css';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('nova_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('nova_user', JSON.stringify(userData));
    setUser(userData);
    
    // Play voice greeting
    try {
      const greeting = `Welcome, ${userData.display_name || userData.username}`;
      const audioUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/tts?text=${encodeURIComponent(greeting)}`;
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.log('Audio playback prevented by browser policy:', e));
    } catch (err) {
      console.log('Failed to play greeting:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <div className="grid-bg" aria-hidden="true" />
      <ChatWindow user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App;
