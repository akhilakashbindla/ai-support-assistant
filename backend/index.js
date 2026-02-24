require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cosineSimilarity = require('compute-cosine-similarity');
const { setupDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// 🚀 Initialize Gemini (100% Free Tier)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Load Docs
const docs = JSON.parse(fs.readFileSync('./docs.json', 'utf8'));
let db;

setupDB().then(database => {
  db = database;
  app.listen(PORT, () => console.log(`🚀 Secure Server running on port ${PORT}`));
}).catch(err => console.error(err));

// Health Check
app.get('/', (req, res) => {
  res.send('🤖 AI Support Assistant Backend is up and running!');
});

// ==========================================
// 🛡️ SECURITY: Prompt Injection Filter
// ==========================================
const promptInjectionFilter = (req, res, next) => {
  const { message } = req.body;
  if (!message) return next();

  const suspiciousKeywords = ['ignore all previous', 'system prompt', 'override', 'disregard', 'bypass'];
  const isSuspicious = suspiciousKeywords.some(keyword => message.toLowerCase().includes(keyword));

  if (isSuspicious) {
    return res.status(403).json({ 
      reply: "Security Alert: Prompt injection attempt detected and blocked.",
      tokensUsed: 0
    });
  }
  next();
};

// ==========================================
// 🧠 RAG: Vector Embeddings Search
// ==========================================
async function getRelevantDocs(userQuery) {
  const queryEmbeddingRes = await embeddingModel.embedContent(userQuery);
  const queryVector = queryEmbeddingRes.embedding.values;

  const scoredDocs = await Promise.all(docs.map(async (doc) => {
    const docText = `${doc.title} ${doc.content}`;
    const docEmbeddingRes = await embeddingModel.embedContent(docText);
    const docVector = docEmbeddingRes.embedding.values;
    
    const score = cosineSimilarity(queryVector, docVector);
    return { ...doc, score };
  }));

  scoredDocs.sort((a, b) => b.score - a.score);
  return scoredDocs.slice(0, 2).map(d => `Title: ${d.title}\nContent: ${d.content}`).join('\n\n');
}

// ==========================================
// API ENDPOINTS
// ==========================================

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.all(`SELECT id as sessionId, updated_at as lastUpdated FROM sessions ORDER BY updated_at DESC`);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Database failure while fetching sessions' });
  }
});

app.get('/api/conversations/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await db.all(`SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC`, [sessionId]);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Database failure while fetching conversation' });
  }
});

app.post('/api/chat', promptInjectionFilter, async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Missing sessionId or message' });

    await db.run(`INSERT OR IGNORE INTO sessions (id) VALUES (?)`, [sessionId]);
    await db.run(`UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sessionId]);
    await db.run(`INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)`, [sessionId, message]);

    const relevantContext = await getRelevantDocs(message);

    const rawHistory = await db.all(`SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 10`, [sessionId]);
    const history = rawHistory.reverse().map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    history.pop(); 

    const systemInstruction = `You are a helpful support assistant. 
You MUST answer the user's question using ONLY the provided Product Documentation Context below.
If the answer cannot be explicitly found in the context, you MUST reply exactly with: "Sorry, I don't have information about that."
Do not guess or hallucinate.

PRODUCT DOCUMENTATION CONTEXT:
${relevantContext}`;

    const chat = model.startChat({ 
      history,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    });

    const result = await chat.sendMessage(message);
    const replyText = result.response.text();
    const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

    await db.run(`INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)`, [sessionId, replyText]);

    res.json({ reply: replyText, tokensUsed });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});