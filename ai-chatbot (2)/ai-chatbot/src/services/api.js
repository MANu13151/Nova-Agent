// ===== Backend API Service =====
// Connects the React frontend to the FastAPI backend services.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Gets or creates a unique session ID for the user conversation.
 * Persists in sessionStorage to maintain state within a tab session.
 */
export function getOrCreateSessionId() {
  let sessionId = sessionStorage.getItem('enterprise_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('enterprise_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Sends a chat message to the FastAPI backend orchestrator.
 * @param {string} message - The user's query text.
 * @param {string} sessionId - The current session identifier.
 * @param {string} userName - The name of the user.
 * @returns {Promise<Object>} - Contains response, sql, chart, audio_url, and error.
 */
export async function sendChatMessage(message, sessionId, userName) {
  const url = `${API_BASE}/chat`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (userName) {
    headers['X-User-Name'] = userName;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      message,
      session_id: sessionId,
      user_name: userName
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  // Prefix audio url with backend host if it's relative
  if (data.audio_url && !data.audio_url.startsWith('http')) {
    data.audio_url = `${API_BASE.replace('/api', '')}${data.audio_url}`;
  }

  return data;
}

/**
 * Resets/clears the conversation history for a given session ID in backend memory.
 * @param {string} sessionId - The session identifier.
 * @returns {Promise<Object>} - Status response.
 */
export async function clearSession(sessionId) {
  const url = `${API_BASE}/chat/session/${sessionId}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to clear session history: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetches the raw database schema definition.
 * @returns {Promise<Object>} - Contains the schema description text.
 */
export async function getDatabaseSchema() {
  const url = `${API_BASE}/schema`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch database schema: HTTP ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Creates multiple database tables.
 * @param {Array} tables - Array of table definitions.
 * @returns {Promise<Object>} - Success status response.
 */
export async function createDatabaseTables(tables) {
  const url = `${API_BASE}/tables`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail;
    try {
      errorDetail = JSON.parse(errorText).detail;
    } catch {
      errorDetail = errorText;
    }
    throw new Error(errorDetail || `Failed to create tables: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Creates/seeds database tables using a raw SQL script.
 * @param {string} sql - Semicolon separated CREATE and INSERT statements.
 * @returns {Promise<Object>} - Success status response.
 */
export async function createDatabaseTablesRaw(sql) {
  const url = `${API_BASE}/tables/raw`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail;
    try {
      errorDetail = JSON.parse(errorText).detail;
    } catch {
      errorDetail = errorText;
    }
    throw new Error(errorDetail || `Failed to execute raw SQL script: HTTP ${response.status}`);
  }

  return await response.json();
}
