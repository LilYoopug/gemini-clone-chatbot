import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI with new SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = 'gemini-2.5-flash';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to convert base64 to Gemini format
function createContentParts(message) {
  const parts = [];

  // Add text if present
  if (message.text && message.text.trim()) {
    parts.push({ text: message.text });
  }

  // Add files if present
  if (message.files && message.files.length > 0) {
    for (const file of message.files) {
      // Extract mime type and base64 data from data URL
      if (file.data) {
        const matches = file.data.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        }
      }
    }
  }

  // Handle single file (backward compatibility)
  if (message.file && message.file.data) {
    const matches = message.file.data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      parts.push({
        inlineData: {
          mimeType: matches[1],
          data: matches[2]
        }
      });
    }
  }

  return parts;
}

// POST /api/chat - Multi-turn conversation endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { conversation, model } = req.body;

    // Validate input
    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'Conversation must be a non-empty array' });
    }

    // Use provided model or default
    const selectedModel = model || GEMINI_MODEL;

    // Build conversation history for Gemini
    const contents = [];

    for (const msg of conversation) {
      if (msg.role === 'user') {
        const parts = createContentParts(msg);
        // Only add user message if it has content (text or files)
        if (parts.length > 0) {
          contents.push({
            role: 'user',
            parts: parts
          });
        } else if (msg.text) {
          // Fallback: if createContentParts returned empty but text exists
          contents.push({
            role: 'user',
            parts: [{ text: msg.text }]
          });
        }
      } else if (msg.role === 'model' || msg.role === 'bot') {
        if (msg.text) {
          contents.push({
            role: 'model',
            parts: [{ text: msg.text }]
          });
        }
      }
    }

    // Validate that we have at least one content
    if (contents.length === 0) {
      return res.status(400).json({ error: 'No valid content to send' });
    }

    // Call Gemini API with the conversation
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents,
      config: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        systemInstruction: `Kamu adalah asisten AI yang ramah dan membantu.
Kamu menjawab pertanyaan dengan jelas, informatif, dan dalam Bahasa Indonesia.
Berikan respons yang singkat namun bermakna.
Jika user mengirim gambar atau file, analisis dan bahas kontennya.`
      }
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      message: error.message
    });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
