import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const ENV_PATH = process.env.HABEROKUYORUZ_ENV_PATH || path.join(ROOT_DIR, '.env');

loadEnvFile(ENV_PATH);

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const contents = fs.readFileSync(filePath, 'utf-8');
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const [rawKey, ...rest] = line.split('=');
        if (!rawKey || !rest.length) return;

        const key = rawKey.trim();
        if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
          return;
        }

        const rawValue = rest.join('=').trim();
        const value = stripSurroundingQuotes(rawValue);
        process.env[key] = value;
      });
  } catch (error) {
    console.warn('.env yüklenemedi:', error.message);
  }
}

function stripSurroundingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
