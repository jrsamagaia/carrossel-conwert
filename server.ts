import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API route for generating content via Google Gemini
  app.post("/api/generate", async (req, res) => {
    const { payload, activeKey, isImage } = req.body;

    const keyToUse = activeKey || process.env.GEMINI_API_KEY;

    if (!payload || !keyToUse) {
      return res
        .status(400)
        .json({ error: { message: "Missing payload or API key" } });
    }

    const ai = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    try {
      let finalData;

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

          // Use the recommended model for high-impact generated images
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
          const mimeType = "image/jpeg";

          return res.json({
            predictions: [
              {
                bytesBase64Encoded: base64,
                mimeType: mimeType,
              },
            ],
          });
        } catch (e: any) {
          return res.status(500).json({ error: { message: `Image generation failed: ${e.message}` } });
        }
      }

      // We rely on gemini-1.5-flash as the fallback, but the user is formatting payload as REST.
      // So we can still use REST proxy but use models we are SURE work!
      const textModels = [
        "gemini-3.5-flash",
        "gemini-3.1-pro-preview"
      ];
      let lastError = null;

      for (const model of textModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data = await response.json();
            return res.json(data);
          } else {
            lastError = await response.json();
            console.warn(`Attempt with ${model} failed, looking for alternative...`, lastError);
          }
        } catch (err) {
          lastError = err;
          console.warn(`Network error with ${model}:`, err);
        }
      }

      res
        .status(500)
        .json(
          lastError || {
            error: { message: "No viable AI model configuration found." },
          }
        );
    } catch (e: any) {
      res.status(500).json({ error: { message: e.message } });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
