// ===== Gemini API Service =====
// Uses the Google Gemini 2.5 Flash model
// Get your API key from: https://aistudio.google.com/app/apikey

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

/**
 * Send a message to Gemini and get a response.
 * @param {Array} conversationHistory - Array of { role, content } objects
 * @returns {Promise<string>} - AI response text
 */
export async function sendMessage(conversationHistory) {
  if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
    throw new Error(
      'API key not configured. Please add your Gemini API key to the .env file.\n' +
      'Get a free key at: https://aistudio.google.com/app/apikey'
    );
  }

  // Convert conversation history to Gemini format
  const contents = conversationHistory.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const body = {
    contents,
    systemInstruction: {
      parts: [
        {
          text: "You are Tourist AI, a specialized assistant for tourism, travel, sightseeing, destinations, itineraries, and travel-related questions. You must and should ONLY provide tourist and travel-related information. If a user asks about any other topic (such as coding, math, general science, politics, or general non-travel advice), you must politely decline to answer and remind them that you are Tourist AI, designed exclusively for tourism and travel assistance."
        }
      ]
    },
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini. The content may have been blocked by safety filters.');
  }

  return text;
}
