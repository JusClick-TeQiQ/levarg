import axios from 'axios';

// AI Backend Configuration:
// Priority 1: Cloudflare Workers AI (set CF_AI_TOKEN + CF_ACCOUNT_ID)
//   - Free tier: 10,000 neurons/day
//   - No local install, no RAM usage
// Priority 2: Remote Ollama (set OLLAMA_URL)
//   - Run on a separate machine/cloud instance
// Priority 3: Disabled — AI features unavailable

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const CF_AI_TOKEN = process.env.CF_AI_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
const CF_AI_MODEL = process.env.CF_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';

type AiBackend = 'cloudflare' | 'ollama' | 'none';

function detectBackend(): AiBackend {
  if (CF_AI_TOKEN && CF_ACCOUNT_ID) return 'cloudflare';
  if (OLLAMA_URL) return 'ollama';
  return 'none';
}

export class OllamaClient {
  private backend: AiBackend;
  private ollamaUrl: string;
  private ollamaModel: string;

  constructor(model?: string) {
    this.backend = detectBackend();
    this.ollamaUrl = OLLAMA_URL;
    this.ollamaModel = model || OLLAMA_MODEL;
  }

  async generate(prompt: string, jsonMode = false): Promise<string | null> {
    if (this.backend === 'cloudflare') return this.generateCloudflare(prompt, jsonMode);
    if (this.backend === 'ollama') return this.generateOllama(prompt, jsonMode);
    console.warn('[AI] No backend configured. Set CF_AI_TOKEN+CF_ACCOUNT_ID or OLLAMA_URL.');
    return null;
  }

  private async generateCloudflare(prompt: string, jsonMode: boolean): Promise<string | null> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_AI_MODEL}`;
      const res = await axios.post(url, {
        messages: [{ role: 'user', content: prompt }],
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }, {
        headers: { Authorization: `Bearer ${CF_AI_TOKEN}`, 'Content-Type': 'application/json' },
        timeout: 120_000,
      });
      return res.data?.result?.response?.trim() || null;
    } catch (err: any) {
      console.error('[AI/Cloudflare] Generation failed:', err.message);
      return null;
    }
  }

  private async generateOllama(prompt: string, jsonMode: boolean): Promise<string | null> {
    try {
      const res = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt,
        stream: false,
        ...(jsonMode ? { format: 'json' } : {}),
      }, { timeout: 120_000 });
      return res.data?.response?.trim() || null;
    } catch (err: any) {
      console.error('[AI/Ollama] Generation failed:', err.message);
      return null;
    }
  }

  static async isAvailable(): Promise<boolean> {
    const backend = detectBackend();
    if (backend === 'cloudflare') {
      try {
        // Lightweight check — just verify the token works
        const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/models`;
        await axios.get(url, {
          headers: { Authorization: `Bearer ${CF_AI_TOKEN}` },
          timeout: 5000,
        });
        return true;
      } catch { return false; }
    }
    if (backend === 'ollama') {
      try {
        await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
        return true;
      } catch { return false; }
    }
    return false;
  }

  static getBackendName(): string {
    const b = detectBackend();
    if (b === 'cloudflare') return `Cloudflare Workers AI (${CF_AI_MODEL})`;
    if (b === 'ollama') return `Ollama (${OLLAMA_MODEL} @ ${OLLAMA_URL})`;
    return 'None — set CF_AI_TOKEN+CF_ACCOUNT_ID or OLLAMA_URL';
  }
}
