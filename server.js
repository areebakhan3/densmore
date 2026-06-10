require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');
const KNOWLEDGE_BASE = require('./knowledgeBase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve widget files at /widget/iife.js and /widget/iife.css
app.use('/widget', express.static(path.join(__dirname, 'widget')));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory session store (per session ID)
const sessions = {};

// System prompt using the knowledge base
const SYSTEM_PROMPT = `${KNOWLEDGE_BASE}

INSTRUCTIONS:
- You are a friendly, knowledgeable insurance assistant for Densmore Insurance Strategies, Inc.
- Answer questions based ONLY on the provided knowledge base about Densmore Insurance.
- If a question is outside the scope of the knowledge base, politely say you don't have that information and suggest calling (515) 967-3390.
- Keep responses concise but complete. Use bullet points where helpful.
- Always be warm, professional, and helpful.
- For quotes, always direct users to: call (515) 967-3390, email info@densmoreis.com, or use the Get a Quote form on the website.
- Never make up specific premium amounts unless they are listed in the knowledge base.
- If asked about something Densmore doesn't offer, say so politely.
`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  sessions[sessionId].push({ role: 'user', content: message });

  const recentHistory = sessions[sessionId].slice(-20);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentHistory,
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    sessions[sessionId].push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI error:', err.message);
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key. Please check your .env file.' });
    }
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Clear session endpoint
app.post('/api/clear', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
  }
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Densmore Chatbot is running.' });
});

// Serve frontend for all other routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Densmore Insurance Chatbot running at http://localhost:${PORT}`);
  console.log(`   Widget available at: http://localhost:${PORT}/widget/iife.js`);
  console.log(`   Demo page at:        http://localhost:${PORT}/demo.html`);
});
