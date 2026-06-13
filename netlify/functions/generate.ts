import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { payload, activeKey, isImage } = body;

    const keyToUse = activeKey || process.env.GEMINI_API_KEY;

    if (!payload || (!keyToUse && !isImage)) {
      return { statusCode: 400, body: JSON.stringify({ error: { message: 'Missing payload or API key' } }) };
    }

    if (isImage) {
      try {
        const ai = new GoogleGenAI({
          apiKey: keyToUse,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const prompt = payload?.instances?.[0]?.prompt || "corporate background";

        const response = await ai.models.generateImages({
          model: "imagen-4.0-generate-001",
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "1:1",
          },
        });

        const base64 = response.generatedImages[0].image.imageBytes;
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            predictions: [
              {
                bytesBase64Encoded: base64,
                mimeType: "image/jpeg",
              },
            ],
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      } catch (e: any) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: { message: `Image generation failed: ${e.message}` } }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
    }

    const textModels = ['gemini-3.5-flash', 'gemini-3.1-pro-preview'];
    const models = textModels;
    
    let lastError = null;

    for (const model of models) {
      try {
        const endpoint = isImage ? 'predict' : 'generateContent';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${keyToUse}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
          };
        } else {
          lastError = await response.json();
          console.warn(`Attempt with ${model} failed, looking for alternative...`, lastError);
        }
      } catch (err) {
        lastError = err;
        console.warn(`Network error with ${model}:`, err);
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify(lastError || { error: { message: 'No viable AI model configuration found.' } }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: 'Internal server error' } }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
