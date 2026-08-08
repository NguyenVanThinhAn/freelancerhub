import "dotenv/config";
import express from "express";
import cors from "cors";
import proxy from "express-http-proxy";
import { handleDemo } from "./routes/demo.js";

// API target — đọc từ env để đồng bộ với scripts/dev.sh và vite.config.ts.
// Dev:    PORT_API=8000  → http://localhost:8000
// Prod:   set PORT_API trên hosting platform (Netlify/Lovable/Self-host)
const API_TARGET = process.env.API_TARGET ?? `http://localhost:${process.env.PORT_API ?? "8000"}`;

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());

  // Proxy all /api/v1/** requests to FastAPI backend BEFORE body parsers
  app.use("/api/v1", proxy(API_TARGET, {
    proxyReqPathResolver: (req) => {
      return `/api/v1${req.url}`;
    },
    proxyErrorHandler: (err, res) => {
      console.error("[Proxy Error]", err.message);
      res.status(502).json({
        status_code: 502,
        message: "Proxy error: " + err.message,
        data: null,
        error: { detail: err.message },
        timestamp: new Date().toISOString(),
      });
    },
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger middleware (debug)
  app.use((req, _res, next) => {
    const debug = process.env.API_DEBUG === "1";
    if (debug) {
      const ts = new Date().toISOString().slice(11, 23);
      console.log(`[API] ${ts} → ${req.method} ${req.path}`);
    }
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);


  return app;
}
