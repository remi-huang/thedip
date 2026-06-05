import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environmental parameters
dotenv.config();

const app = express();
const PORT = 3001;

app.use(express.json());

// Initialize Gemini client on the server side safely
// Keep x-goog-api-key telemetry header as required in design guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Server-side POST endpoint to custom map "The Dip" curve parameters
app.post('/api/generate-dip', async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ error: 'Goal string parameters required.' });
    }

    const systemInstruction = `You are a cognitive psychology and goals optimization assistant using the strict model of Seth Godin's "The Dip". Your task is to analyze details about a user's ambition and compile a physical, interactive visual curve preset representing the emotional stages, key hurdles, friction levels, and milestones they will face.`;

    const prompt = `Deconstruct the ambitious goal: "${goal}".
    Synthesize physical and psychological parameters of "The Dip" for this goal.
    Return a compliant CurvePreset object exactly according to the strict JSON schema. 
    Ensure that:
    1. The curve has exactly 5 control points from x=0.0 to x=1.0. For the y coordinate, smaller values represent higher results/triumphs (Y=0 is top/elite, Y=1 is bottom/absolute failure). The milestones' coordinates must precisely correspond to these 5 points.
    2. Difficulty should be Easy, Medium, or Hard. Let gravity, friction, and mass represent realistic hurdles (e.g., Hard goals have high mass and gravity).
    3. Custom milestone names, keys, actions, and hex colors should map to typical milestones (e.g., red for the bottom valley, green/purple for breakthroughs).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'The analyzed name of the custom goal or path' },
            description: { type: Type.STRING, description: 'A tailored overview describing the unique mechanics of this custom struggle.' },
            difficulty: { type: Type.STRING, description: 'Easy, Medium, or Hard depending on overall complexity of mastering it.' },
            baseGravity: { type: Type.NUMBER, description: 'The level of gravity resistance from 0.1 to 0.3. Higher values make details sliding down steeper.' },
            baseFriction: { type: Type.NUMBER, description: 'Cognitive drag or habit friction from 0.02 to 0.12.' },
            ballMass: { type: Type.NUMBER, description: 'Task inertia weight from 0.5 to 2.5 representing overall start-up torque.' },
            curvePoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER, description: 'Value strictly sorted, must be exactly [0.0, 0.15, 0.50, 0.80, 1.0] representing start, initial peak, low valley, climb, breakthrough.' },
                  y: { type: Type.NUMBER, description: 'Y position mapping curve. Let peak be around 0.35 to 0.45. Let bottom valley/low point be 0.65 to 0.85. Let Breakthrough end at 0.10 to 0.15.' }
                },
                required: ['x', 'y']
              }
            },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING, description: 'Name of the milestone, e.g., Honeymoon, Reality Crash, Despair, Mastery, Summit.' },
                  x: { type: Type.NUMBER, description: 'Coordinate matching the corresponding index inside curvePoints x.' },
                  y: { type: Type.NUMBER, description: 'Coordinate matching the corresponding index inside curvePoints y.' },
                  description: { type: Type.STRING, description: 'A specific explanation describing why this stage occurs for this specific goal.' },
                  keyAction: { type: Type.STRING, description: 'Active task matching this stage' },
                  color: { type: Type.STRING, description: 'A bright high contrast HEX color matching the mood, e.g., #22c55e, #f59e0b, #ef4444, #3b82f6, #a855f7.' }
                },
                required: ['id', 'name', 'x', 'y', 'description', 'keyAction', 'color']
              }
            },
            tips: {
              type: Type.OBJECT,
              properties: {
                start: { type: Type.STRING, description: 'Advice for the initial exciting honeymoon phase.' },
                bottom: { type: Type.STRING, description: 'Advice for surviving the lowest point of despair.' },
                climb: { type: Type.STRING, description: 'Advice for scaling intermediate mastery.' },
                summit: { type: Type.STRING, description: 'Advice for capturing elite-level returns.' }
              },
              required: ['start', 'bottom', 'climb', 'summit']
            }
          },
          required: ['name', 'description', 'difficulty', 'baseGravity', 'baseFriction', 'ballMass', 'curvePoints', 'milestones', 'tips']
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Gemini API returned an empty output stream');
    }

    const compiledPreset = JSON.parse(jsonText.trim());

    // Inject temporary custom IDs so the client tracking knows how to distinguish it
    const id = 'custom-' + Date.now();
    const finalPreset = {
      ...compiledPreset,
      id,
      icon: 'Brain', // Default Brain design icon
    };

    res.json(finalPreset);
  } catch (error: any) {
    console.error('Error generating custom Dip with Gemini API:', error);
    res.status(500).json({ error: error.message || 'Failed to complete curve analysis via Gemini server-side SDK.' });
  }
});

// Setup Vite Development middleware or serve static built files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[The Dip Engine] Full-stack server active on port ${PORT}`);
  });
}

startServer();
