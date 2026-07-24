import { OllamaClient } from './ollama_client.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * AI Manager — Ollama installation, startup, and model pulling.
 * Supports Cloudflare Workers AI (free, cloud) or local Ollama.
 * Auto-installs Ollama if not available on supported platforms.
 */
export class OllamaManager {
  private static ollamaProcess: any = null;

  static async bootstrap(): Promise<void> {
    const backendName = OllamaClient.getBackendName();
    console.log(`[Ollama] Bootstrapping... Backend: ${backendName}`);

    const detectBackend = OllamaClient.isAvailable();
    
    if (detectBackend) {
      console.log('[Ollama] Backend is reachable — AI features are available.');
      return;
    }

    // Try to install and start local Ollama if no remote backend configured
    if (!process.env.OLLAMA_URL && !process.env.CF_AI_TOKEN) {
      console.log('[Ollama] No remote backend configured, attempting local installation...');
      await this.installAndStartLocal();
    } else {
      console.warn('[Ollama] Backend is not reachable — AI features will be unavailable.');
      console.warn('[Ollama] To enable AI, set one of:');
      console.warn('[Ollama]   Cloudflare Workers AI (free): CF_AI_TOKEN + CF_ACCOUNT_ID');
      console.warn('[Ollama]   Remote Ollama: OLLAMA_URL=http://your-server:11434');
    }
  }

  private static async installAndStartLocal(): Promise<void> {
    try {
      const platform = process.platform;
      
      if (platform === 'linux') {
        await this.installOllamaLinux();
      } else if (platform === 'darwin') {
        await this.installOllamaMac();
      } else if (platform === 'win32') {
        await this.installOllamaWindows();
      } else {
        console.warn(`[Ollama] Unsupported platform: ${platform}`);
        return;
      }

      // Start Ollama server
      console.log('[Ollama] Starting Ollama server...');
      this.ollamaProcess = exec('ollama serve', (error) => {
        if (error) {
          console.error('[Ollama] Server error:', error);
        }
      });

      // Wait for server to be ready
      await this.waitForOllama();

      // Pull default model
      console.log('[Ollama] Pulling default model (llama3.2)...');
      await execAsync('ollama pull llama3.2', { timeout: 300000 });
      console.log('[Ollama] Bootstrap complete');
    } catch (err: any) {
      console.error('[Ollama] Installation failed — AI features will be unavailable.', err.message);
    }
  }

  private static async installOllamaLinux(): Promise<void> {
    console.log('[Ollama] Installing Ollama on Linux...');
    try {
      await execAsync('which ollama', { timeout: 5000 });
      console.log('[Ollama] Already installed');
    } catch {
      const installCmd = 'curl -fsSL https://ollama.com/install.sh | sh';
      await execAsync(installCmd, { timeout: 120000 });
      console.log('[Ollama] Installation complete');
    }
  }

  private static async installOllamaMac(): Promise<void> {
    console.log('[Ollama] Installing Ollama on macOS...');
    try {
      await execAsync('which ollama', { timeout: 5000 });
      console.log('[Ollama] Already installed');
    } catch {
      await execAsync('brew install ollama', { timeout: 120000 });
      console.log('[Ollama] Installation complete');
    }
  }

  private static async installOllamaWindows(): Promise<void> {
    console.log('[Ollama] Checking Ollama on Windows...');
    try {
      await execAsync('ollama --version', { timeout: 5000 });
      console.log('[Ollama] Already installed');
    } catch {
      console.warn('[Ollama] Windows requires manual installation from https://ollama.com/download');
      console.warn('[Ollama] Please install and add to PATH, then restart the app');
    }
  }

  private static async waitForOllama(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get('http://localhost:11434/api/tags', { timeout: 2000 });
        console.log('[Ollama] Server is ready');
        return;
      } catch {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw new Error('Ollama server failed to start');
  }

  static shutdown(): void {
    if (this.ollamaProcess) {
      console.log('[Ollama] Shutting down...');
      this.ollamaProcess.kill();
      this.ollamaProcess = null;
    }
  }
}
