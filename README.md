# Densmore Insurance Chatbot

An Express.js chatbot powered by OpenAI GPT-4 with the full Densmore Insurance Strategies knowledge base.

## Features
- GPT-4 powered responses grounded in Densmore Insurance content
- Multi-turn conversation with session memory
- Quick-prompt chips for common questions
- Clean chat UI with typing indicators
- Mobile-friendly responsive design

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure your API key
Copy the example env file and add your OpenAI API key:
```bash
cp .env.example .env
```

Then open `.env` and replace the placeholder:
```
OPENAI_API_KEY=sk-your-actual-key-here
PORT=3000
```

### 3. Start the server
```bash
node server.js
```

Open your browser at: **http://localhost:3000**

## Project Structure
```
densmore-chatbot/
├── server.js          # Express server + OpenAI API calls
├── knowledgeBase.js   # Full Densmore Insurance knowledge base
├── public/
│   └── index.html     # Chat frontend UI
├── .env               # Your API key (create from .env.example)
├── .env.example       # Template
└── package.json
```

## API Endpoints
| Method | Endpoint      | Description                    |
|--------|---------------|--------------------------------|
| POST   | /api/chat     | Send a message, get a reply    |
| POST   | /api/clear    | Clear a session's chat history |
| GET    | /api/health   | Health check                   |

### POST /api/chat
**Request:**
```json
{
  "message": "What does renters insurance cover?",
  "sessionId": "session_abc123"
}
```
**Response:**
```json
{
  "reply": "Renters insurance covers..."
}
```

## Notes
- Sessions are stored in memory and reset on server restart
- Conversation history is capped at 20 messages per session to control token usage
- Model used: `gpt-4`
