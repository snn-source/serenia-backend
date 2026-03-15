const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Route principale — envoie les messages à Gemini (GRATUIT)
app.post('/chat', async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages manquants' });
  }

  try {
    // Convertit le format Anthropic → format Gemini
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Injecte le system prompt comme premier échange
    const systemMessage = {
      role: 'user',
      parts: [{ text: `[Instructions système - suis ces règles pour toute la conversation]: ${system}` }]
    };
    const systemAck = {
      role: 'model',
      parts: [{ text: 'Compris, je vais suivre ces instructions.' }]
    };

    const allMessages = system
      ? [systemMessage, systemAck, ...geminiMessages]
      : geminiMessages;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: allMessages,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.85
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Erreur Gemini:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Je suis là...';
    res.json({ reply });

  } catch (err) {
    console.error('Erreur serveur:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Test
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Sérénia backend (Gemini) opérationnel 🌿' });
});

app.listen(PORT, () => {
  console.log(`Serveur Sérénia démarré sur le port ${PORT}`);
});
