const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.warn('WARNING: OPENAI_API_KEY is not set. The /api/ask endpoint will fail until you set it.');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Very small CORS handling so the frontend served from a different port (e.g., Live Server :5500)
// can still reach the API during local development. For production, tighten this to allowed origins.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname)));

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
});
app.use('/api/', limiter);

// Simple server-side blocklist to immediately refuse unsafe or non-science queries
const blocklist = [
  'politics','vote','election','religion','porn','sex','attack','kill','murder','drugs','illegal','password','bank','credit card','hack','terror'
];
function isBlocked(text) {
  const lower = (text || '').toLowerCase();
  return blocklist.some(b => new RegExp(`\\b${b}\\b`, 'i').test(lower));
}

// Health endpoint for quick diagnostics
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', openaiKeySet: !!OPENAI_KEY });
});

app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.toString().trim()) return res.status(400).json({ error: 'Missing question' });

    if (isBlocked(question)) {
      return res.json({ reply: "I only answer science and math-related questions. I can't help with that topic." });
    }

    if (!OPENAI_KEY) {
      console.error('OpenAI API key is not configured on server.');
      return res.status(500).json({ error: 'server', details: 'OpenAI API key not configured on the server. Copy .env.example to .env and set OPENAI_API_KEY.' });
    }

    // Build a small system prompt that constrains the model to science/math only
    const systemPrompt = `You are Wonder AI, a concise science and math assistant. Answer only questions strictly about physics, chemistry, biology, astronomy, math, or lab experiments. If the user asks about anything outside those domains (politics, illegal activity, personal data, medical diagnosis, financial advice, or other), politely refuse and tell them you only answer science and math questions. Keep answers brief and in clear, simple language appropriate for students.`;

    // Call OpenAI Chat Completions API
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 500,
      temperature: 0.2
    };

    // Use global fetch when available (Node 18+). If not available, try to require('node-fetch').
    let fetchFn = globalThis.fetch;
    if (!fetchFn) {
      try {
        // node-fetch v2/v3 exports
        fetchFn = require('node-fetch');
      } catch (e) {
        console.error('Fetch API not available on server. Upgrade Node to >=18 or install node-fetch.');
        return res.status(500).json({ error: 'server', details: 'Fetch API not available on the server. Upgrade Node to >=18 or install node-fetch.' });
      }
    }

    const r = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('OpenAI error:', errText);
      return res.status(502).json({ error: 'Upstream model error', details: errText });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate an answer.";

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
