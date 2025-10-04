#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envCandidates = [
  resolve(__dirname, '../.vscode/.env.local'),
  resolve(__dirname, '../.vscode/.env'),
];

let envLoadedFrom = null;
const parseEnvFile = (filePath) => {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    parseEnvFile(candidate);
    envLoadedFrom = candidate;
    break;
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  const locationHint = envLoadedFrom ? `Loaded ${envLoadedFrom}, but values were missing.` : 'No .env file found.';
  console.error('[run-supabase-mcp] Missing SUPABASE_URL or SUPABASE_KEY.');
  console.error('[run-supabase-mcp] Set them in .vscode/.env.local (not committed).');
  console.error(`[run-supabase-mcp] ${locationHint}`);
  process.exit(1);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(command, ['@modelcontextprotocol/server-supabase'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
  },
});

child.on('exit', (code, signal) => {
  if (typeof code === 'number') {
    process.exit(code);
  }
  if (signal) {
    process.kill(process.pid, signal);
  }
});

child.on('error', (err) => {
  console.error('[run-supabase-mcp] Failed to start MCP server:', err);
  process.exit(1);
});
