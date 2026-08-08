#!/usr/bin/env node
// scripts/run-all.mjs — chạy CẢ backend (FastAPI) + frontend (Vite) trong 1 tiến trình.
// Sử dụng: node scripts/run-all.mjs   (hoặc: cd frontend && npm run dev:all)
//
// Wrapper quanh `concurrently` (npm package, đã khai báo trong frontend/package.json).
// Đọc config từ env:
//   PORT_API   port FastAPI       (default 8000)
//   PORT_WEB   port Vite          (default 8080)
//   API_DEBUG  1 để bật log backend
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const BACKEND_DIR = path.join(ROOT, "backend");

const PORT_API = process.env.PORT_API ?? "8000";
const PORT_WEB = process.env.PORT_WEB ?? "8080";
const API_DEBUG = process.env.API_DEBUG ?? "0";

const uvicornBin = path.join(BACKEND_DIR, ".venv", "bin", "uvicorn");
const uvicorn = existsSync(uvicornBin) ? uvicornBin : "uvicorn";
const concurrentlyBin = path.join(FRONTEND_DIR, "node_modules", ".bin", "concurrently");

const args = [
  "--kill-others-on-fail",
  "--names", "api,web",
  "--prefix-colors", "cyan,magenta",
  "--prefix-length", "8",
  "--success", "first",
  "--",
  `bash -c 'cd ${BACKEND_DIR} && exec ${uvicornBin} main:app --reload --host 0.0.0.0 --port ${PORT_API}'`,
  `bash -c 'cd ${FRONTEND_DIR} && exec npm run dev -- --host 0.0.0.0 --port ${PORT_WEB} --strictPort'`,
];

console.log(`\x1b[1;36m[run-all]\x1b[0m API=http://localhost:${PORT_API}  WEB=http://localhost:${PORT_WEB}`);
console.log("\x1b[1;36m[run-all]\x1b[0m nhấn Ctrl+C để dừng cả 2.");

const env = { ...process.env, API_DEBUG };

const proc = spawn(concurrentlyBin, args, { stdio: "inherit", env });
proc.on("exit", (code, signal) => process.exit(code ?? 1));
process.on("SIGINT", () => proc.kill("SIGINT"));
process.on("SIGTERM", () => proc.kill("SIGTERM"));

