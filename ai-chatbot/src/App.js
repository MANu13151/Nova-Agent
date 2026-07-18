import React from 'react';
import './App.css';
import ChatWindow from './components/ChatWindow';

function App() {
  return (
    <div className="app">
      <div className="grid-bg" aria-hidden="true" />
      <ChatWindow />
    </div>
  );
}

export default App;
