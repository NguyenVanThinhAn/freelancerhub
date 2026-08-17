import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { createServer } from "./server";

// Port config — đọc từ env để đồng bộ với scripts/dev.sh và server/index.ts.
// Dev:   PORT_API=8000 PORT_WEB=8080 (mặc định)
// Prod:  set trên hosting platform (Netlify / Lovable) — build output đi qua Express ở server/index.ts
const PORT_API = process.env.PORT_API ?? "8000";
const PORT_WEB = process.env.PORT_WEB ?? "8080";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: Number(PORT_WEB),
    allowedHosts: true,
    proxy: {
      "/api/v1": {
        target: `http://localhost:${PORT_API}`,
        changeOrigin: true,
      },
    },
    fs: {
      allow: ["./client", "./shared", "index.html"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
