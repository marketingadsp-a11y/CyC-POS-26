import express from "express";
import cors from "cors";
import path from "path";
import axios from "axios";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Loyverse Proxy Route
  app.get("/api/loyverse/*", async (req, res) => {
    const authHeader = req.headers.authorization;
    const pathPart = req.params[0] || "";
    const cursor = req.query.cursor;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Loyverse Access Token" });
    }

    try {
      const params: any = { limit: 250 };
      if (cursor && cursor !== 'undefined' && cursor !== '') {
        params.cursor = cursor;
      }

      const loverseUrl = `https://api.loyverse.com/v2/${pathPart}`;
      console.log(`Proxying request to Loyverse: ${loverseUrl} with params:`, JSON.stringify(params));

      const response = await axios.get(loverseUrl, {
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json"
        },
        params: params,
        timeout: 15000
      });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data || { message: error.message };
      console.error(`Loyverse API Error (${status}) at ${error.config?.url}:`, JSON.stringify(errorData, null, 2));
      res.status(status).json({
        ...errorData,
        _debug: { url: error.config?.url, status: status }
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
