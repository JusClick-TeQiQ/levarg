import { OllamaClient } from './ollama_client.js';

/**
 * AI Manager — remote-only connectivity check.
 * Supports Cloudflare Workers AI (free, cloud) or remote Ollama.
 * Does NOT install, start, or pull anything locally.
 */
export class OllamaManager {
  static async bootstrap(): Promise<void> {
    const backendName = OllamaClient.getBackendName();
    console.log(`[AI] Backend: ${backendName}`);

    const available = await OllamaClient.isAvailable();
    if (available) {
      console.log('[AI] Backend is reachable — AI features are available.');
    } else {
      console.warn('[AI] Backend is not reachable — AI features will be unavailable.');
      console.warn('[AI] To enable AI, set one of:');
      console.warn('[AI]   Cloudflare Workers AI (free): CF_AI_TOKEN + CF_ACCOUNT_ID');
      console.warn('[AI]   Remote Ollama: OLLAMA_URL=http://your-server:11434');
    }
  }

  static shutdown(): void {
    // Remote-only: nothing to clean up
  }
}
