/**
 * advanced_browser — High-performance browser manager with advanced capabilities.
 *
 * Advanced browser features beyond basic Puppeteer:
 *   1. Browser pool for concurrent crawling (multiple instances)
 *   2. Page reuse and connection pooling
 *   3. Advanced stealth beyond basic plugin (fingerprint evasion)
 *   4. Caching and session management
 *   5. Network interception and request/response modification
 *   6. Resource loading control (block unnecessary resources)
 *   7. Fast wait strategies (domcontentloaded vs networkidle)
 *   8. Proper error handling and cleanup
 *   9. Mobile emulation support
 *   10. Geolocation spoofing
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrowserPoolConfig {
  poolSize?: number;
  headless?: boolean;
  userDataDir?: string;
  proxyServer?: string;
  concurrency?: number;
  timeout?: number;
  resourceTimeout?: number;
}

export interface PageContext {
  url: string;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface CrawlResult {
  url: string;
  success: boolean;
  endpoints: { url: string; method: string }[];
  scripts: string[];
  forms: { url: string; method: string }[];
  secrets: string[];
  html: string;
  error?: string;
  statusCode?: number;
}

export interface BrowserPool {
  getBrowser(): Promise<any>;
  releaseBrowser(browser: any): void;
  closeAll(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Advanced Stealth Configuration
// ---------------------------------------------------------------------------

class AdvancedStealth {
  /**
   * Get advanced launch args for maximum stealth
   */
  static getLaunchArgs(proxyServer?: string): string[] {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
      '--disable-infobars',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-save-password-bubble',
      '--disable-translate',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--disable-default-apps',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--disable-domain-reliability',
      '--disable-hang-monitor',
      '--disable-features=VizDisplayCompositor',
      '--window-size=1920,1080',
    ];

    if (proxyServer) {
      args.push(`--proxy-server=${proxyServer}`);
    }

    return args;
  }

  /**
   * Get realistic viewport configuration
   */
  static getViewport(device: 'desktop' | 'mobile' | 'tablet' = 'desktop') {
    const viewports = {
      desktop: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
      mobile: { width: 375, height: 812, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
      tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    };
    return viewports[device];
  }

  /**
   * Get realistic user agent
   */
  static getUserAgent(device: 'desktop' | 'mobile' | 'tablet' = 'desktop'): string {
    const userAgents = {
      desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      tablet: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    };
    return userAgents[device];
  }

  /**
   * Apply advanced stealth to page
   */
  static async applyStealth(page: any): Promise<void> {
    // Override navigator.webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    // Override navigator.plugins
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });

    // Override navigator.languages
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // Override chrome object
    await page.evaluateOnNewDocument(() => {
      (window as any).chrome = {
        runtime: {},
      };
    });

    // Override permissions
    await page.evaluateOnNewDocument(() => {
      const originalQuery = window.navigator.permissions.query;
      (window.navigator.permissions as any).query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Resource Management
// ---------------------------------------------------------------------------

class ResourceManager {
  /**
   * Block unnecessary resources for faster loading
   */
  static blockUnnecessaryResources(page: any): void {
    const blockedResources = ['image', 'stylesheet', 'font', 'media'];
    page.on('request', (req: any) => {
      if (blockedResources.includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  /**
   * Set resource timeout
   */
  static setResourceTimeout(page: any, timeout: number): void {
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);
  }

  /**
   * Cache response data
   */
  private static responseCache = new Map<string, any>();

  static cacheResponse(url: string, data: any): void {
    this.responseCache.set(url, data);
  }

  static getCachedResponse(url: string): any | undefined {
    return this.responseCache.get(url);
  }

  static clearCache(): void {
    this.responseCache.clear();
  }
}

// ---------------------------------------------------------------------------
// Browser Pool Implementation
// ---------------------------------------------------------------------------

class BrowserPoolImpl implements BrowserPool {
  private browsers: any[] = [];
  private availableBrowsers: any[] = [];
  private config: BrowserPoolConfig;
  private maxPoolSize: number;

  constructor(config: BrowserPoolConfig = {}) {
    this.config = {
      poolSize: config.poolSize || 3,
      headless: config.headless !== false,
      userDataDir: config.userDataDir,
      proxyServer: config.proxyServer,
      concurrency: config.concurrency || 5,
      timeout: config.timeout || 30000,
      resourceTimeout: config.resourceTimeout || 10000,
    };
    this.maxPoolSize = this.config.poolSize;
  }

  async initialize(): Promise<void> {
    puppeteer.use(StealthPlugin());

    for (let i = 0; i < this.maxPoolSize; i++) {
      try {
        const browser = await puppeteer.launch({
          headless: this.config.headless,
          executablePath: executablePath(),
          args: AdvancedStealth.getLaunchArgs(this.config.proxyServer),
          userDataDir: this.config.userDataDir ? path.join(this.config.userDataDir, `profile-${i}`) : undefined,
        });
        this.browsers.push(browser);
        this.availableBrowsers.push(browser);
      } catch (e) {
        console.error(`Failed to launch browser ${i}:`, e);
      }
    }

    if (this.browsers.length === 0) {
      throw new Error('Failed to launch any browser instances');
    }
  }

  async getBrowser(): Promise<any> {
    if (this.availableBrowsers.length === 0) {
      if (this.browsers.length < this.maxPoolSize) {
        // Try to launch a new browser
        try {
          const browser = await puppeteer.launch({
            headless: this.config.headless,
            executablePath: executablePath(),
            args: AdvancedStealth.getLaunchArgs(this.config.proxyServer),
          });
          this.browsers.push(browser);
          this.availableBrowsers.push(browser);
          return browser;
        } catch (e) {
          console.error('Failed to launch additional browser:', e);
        }
      }
      // Wait for an available browser
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getBrowser();
    }
    return this.availableBrowsers.pop();
  }

  releaseBrowser(browser: any): void {
    if (this.browsers.includes(browser)) {
      this.availableBrowsers.push(browser);
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.browsers.map(b => b.close().catch(() => {})));
    this.browsers = [];
    this.availableBrowsers = [];
  }
}

// ---------------------------------------------------------------------------
// Advanced Browser Manager
// ---------------------------------------------------------------------------

export class AdvancedBrowserManager {
  private pool: BrowserPoolImpl;
  private config: BrowserPoolConfig;
  private pageCache = new Map<string, any>();

  constructor(config: BrowserPoolConfig = {}) {
    this.config = config;
    this.pool = new BrowserPoolImpl(config);
  }

  async initialize(): Promise<void> {
    await this.pool.initialize();
  }

  /**
   * Crawl a single URL with advanced capabilities
   */
  async crawlUrl(url: string, options: {
    device?: 'desktop' | 'mobile' | 'tablet';
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    cache?: boolean;
    interceptNetwork?: boolean;
    geolocation?: { latitude: number; longitude: number };
  } = {}): Promise<CrawlResult> {
    const device = options.device || 'desktop';
    const waitUntil = options.waitUntil || 'domcontentloaded'; // Faster than networkidle2
    const browser = await this.pool.getBrowser();
    const result: CrawlResult = {
      url,
      success: false,
      endpoints: [],
      scripts: [],
      forms: [],
      secrets: [],
      html: '',
    };

    try {
      // Check cache first
      if (options.cache) {
        const cached = ResourceManager.getCachedResponse(url);
        if (cached) {
          return cached;
        }
      }

      const page = await browser.newPage();
      
      // Apply advanced stealth
      await AdvancedStealth.applyStealth(page);
      
      // Set viewport and user agent
      const viewport = AdvancedStealth.getViewport(device);
      await page.setViewport(viewport);
      await page.setUserAgent(AdvancedStealth.getUserAgent(device));

      // Set resource timeout
      ResourceManager.setResourceTimeout(page, this.config.resourceTimeout || 10000);

      // Block unnecessary resources for speed
      ResourceManager.blockUnnecessaryResources(page);

      // Set geolocation if provided
      if (options.geolocation) {
        await page.setGeolocation(options.geolocation);
        await page.setGeolocation({ latitude: options.geolocation.latitude, longitude: options.geolocation.longitude });
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'geolocation', {
            get: () => ({
              getCurrentPosition: (success: any) => success({ coords: { latitude: 37.7749, longitude: -122.4194 } }),
              watchPosition: (success: any) => success({ coords: { latitude: 37.7749, longitude: -122.4194 } }),
              clearWatch: () => {},
            }),
          });
        });
      }

      // Network interception if requested
      if (options.interceptNetwork) {
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
          // Modify headers
          const headers = req.headers();
          headers['Accept-Language'] = 'en-US,en;q=0.9';
          headers['Accept-Encoding'] = 'gzip, deflate, br';
          headers['Sec-Fetch-Dest'] = 'document';
          headers['Sec-Fetch-Mode'] = 'navigate';
          headers['Sec-Fetch-Site'] = 'none';
          headers['Sec-Fetch-User'] = '?1';
          headers['Upgrade-Insecure-Requests'] = '1';
          req.continue({ headers });
        });
      }

      // Navigate with fast wait strategy
      const response = await page.goto(url, {
        waitUntil,
        timeout: this.config.timeout || 30000,
      });

      if (response) {
        result.statusCode = response.status();
      }

      // Extract DOM content
      const domData = await page.evaluate(() => {
        try {
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
            url: (a as HTMLAnchorElement).href,
            method: 'GET',
          }));
          const forms = Array.from(document.querySelectorAll('form')).map(f => ({
            url: new URL((f as HTMLFormElement).action || window.location.href, window.location.origin).href,
            method: ((f as HTMLFormElement).method || 'GET').toUpperCase(),
          }));
          const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);
          const meta = Array.from(document.querySelectorAll('meta')).map(m => ({
            name: (m as HTMLMetaElement).name,
            content: (m as HTMLMetaElement).content,
          }));
          return { links, forms, scripts, meta };
        } catch (e) {
          return { links: [], forms: [], scripts: [], meta: [] };
        }
      });

      result.endpoints = [...domData.links, ...domData.forms];
      result.scripts = domData.scripts.filter(s => s);

      // Extract secrets from HTML
      const html = await page.content();
      result.html = html;

      // Regex-based secret extraction
      const secretPatterns = [
        /['"](AIza[A-Za-z0-9_-]{35})['"]/g, // Google API key
        /['"](AKIA[A-Z0-9]{16})['"]/g, // AWS key
        /['"](sk-[a-zA-Z0-9]{48})['"]/g, // OpenAI key
        /['"]([a-zA-Z0-9]{32,40})['"]/g, // Generic API key
      ];

      for (const pattern of secretPatterns) {
        const matches = html.match(pattern) || [];
        result.secrets.push(...matches);
      }

      result.success = true;

      // Cache result if enabled
      if (options.cache) {
        ResourceManager.cacheResponse(url, result);
      }

      // Cache page for reuse
      this.pageCache.set(url, page);
    } catch (e: any) {
      result.error = e.message;
      result.success = false;
    } finally {
      // Don't close page immediately - cache it for reuse
      // Pages will be cleaned up periodically
      this.pool.releaseBrowser(browser);
    }

    return result;
  }

  /**
   * Crawl multiple URLs concurrently
   */
  async crawlUrls(urls: string[], options: {
    device?: 'desktop' | 'mobile' | 'tablet';
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    cache?: boolean;
    concurrency?: number;
  } = {}): Promise<CrawlResult[]> {
    const concurrency = options.concurrency || this.config.concurrency || 5;
    const results: CrawlResult[] = [];

    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(url => this.crawlUrl(url, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute JavaScript in page context
   */
  async executeScript(url: string, script: string): Promise<any> {
    const browser = await this.pool.getBrowser();
    let page = this.pageCache.get(url);

    if (!page || page.isClosed()) {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      this.pageCache.set(url, page);
    }

    try {
      const result = await page.evaluate(script);
      this.pool.releaseBrowser(browser);
      return result;
    } catch (e: any) {
      this.pool.releaseBrowser(browser);
      throw e;
    }
  }

  /**
   * Capture page context (cookies, storage)
   */
  async captureContext(url: string): Promise<PageContext> {
    const browser = await this.pool.getBrowser();
    let page = this.pageCache.get(url);

    if (!page || page.isClosed()) {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      this.pageCache.set(url, page);
    }

    try {
      const cookies = await page.cookies();
      const localStorage = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) data[key] = localStorage.getItem(key) || '';
        }
        return data;
      });
      const sessionStorage = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) data[key] = sessionStorage.getItem(key) || '';
        }
        return data;
      });

      this.pool.releaseBrowser(browser);
      return { url, cookies, localStorage, sessionStorage };
    } catch (e: any) {
      this.pool.releaseBrowser(browser);
      throw e;
    }
  }

  /**
   * Restore page context
   */
  async restoreContext(url: string, context: PageContext): Promise<void> {
    const browser = await this.pool.getBrowser();
    let page = this.pageCache.get(url);

    if (!page || page.isClosed()) {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      this.pageCache.set(url, page);
    }

    try {
      await page.setCookie(...context.cookies);
      await page.evaluate((storage: Record<string, string>) => {
        for (const [key, value] of Object.entries(storage)) {
          localStorage.setItem(key, value);
        }
      }, context.localStorage);
      await page.evaluate((storage: Record<string, string>) => {
        for (const [key, value] of Object.entries(storage)) {
          sessionStorage.setItem(key, value);
        }
      }, context.sessionStorage);

      this.pool.releaseBrowser(browser);
    } catch (e: any) {
      this.pool.releaseBrowser(browser);
      throw e;
    }
  }

  /**
   * Clear page cache
   */
  async clearPageCache(): Promise<void> {
    for (const [url, page] of this.pageCache.entries()) {
      if (!page.isClosed()) {
        await page.close().catch(() => {});
      }
    }
    this.pageCache.clear();
  }

  /**
   * Close all browsers and cleanup
   */
  async close(): Promise<void> {
    await this.clearPageCache();
    await this.pool.closeAll();
    ResourceManager.clearCache();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalBrowsers: (this.pool as any).browsers.length,
      availableBrowsers: (this.pool as any).availableBrowsers.length,
      cachedPages: this.pageCache.size,
      cachedResponses: (ResourceManager as any).responseCache.size,
    };
  }
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

export async function createBrowserManager(config?: BrowserPoolConfig): Promise<AdvancedBrowserManager> {
  const manager = new AdvancedBrowserManager(config);
  await manager.initialize();
  return manager;
}
