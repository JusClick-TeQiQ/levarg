/**
 * payload_oven — managed test payload generation library.
 *
 * Provides categorized test payloads for validation and
 * compatibility testing. Used by the automation engine for
 * systematic endpoint analysis.
 */

import { OllamaClient } from './ollama_client.js';

export class PayloadOven {
  private static categories = [
    'authentication',
    'authorization',
    'data_handling',
    'input_validation',
    'session_management',
    'configuration',
    'network',
    'storage',
    'api',
    'content'
  ];

  static getAllCategories(): string[] {
    return [...this.categories];
  }

  static getPayloads(category: string, layer: 1 | 2 | 3, count: number): string[] {
    const categoryMap: Record<string, string[]> = {
      authentication: this.getAuthenticationPayloads(layer),
      authorization: this.getAuthorizationPayloads(layer),
      data_handling: this.getDataHandlingPayloads(layer),
      input_validation: this.getInputValidationPayloads(layer),
      session_management: this.getSessionManagementPayloads(layer),
      configuration: this.getConfigurationPayloads(layer),
      network: this.getNetworkPayloads(layer),
      storage: this.getStoragePayloads(layer),
      api: this.getApiPayloads(layer),
      content: this.getContentPayloads(layer)
    };

    const payloads = categoryMap[category] || [];
    return payloads.slice(0, count);
  }

  static async generateCustomPayload(ai: OllamaClient | null, type: string, context: string): Promise<string> {
    if (!ai) {
      return this.getFallbackPayload(type);
    }

    const prompt = `Generate a test payload for ${type} validation. Context: ${context}. Return only the payload string.`;
    try {
      const result = await ai.generate(prompt, false);
      return result.trim().substring(0, 500);
    } catch {
      return this.getFallbackPayload(type);
    }
  }

  private static getFallbackPayload(type: string): string {
    const fallbacks: Record<string, string> = {
      'SQLi': "test' OR '1'='1",
      'XSS': '<script>alert(1)</script>',
      'Path Traversal': '../../../etc/passwd',
      'SSRF': 'http://169.254.169.254/latest/meta-data/',
      'RCE': '; id',
      'SSTI': '{{7*7}}',
      'NoSQLi': "{'$ne': null}"
    };
    return fallbacks[type] || 'test';
  }

  private static getAuthenticationPayloads(layer: number): string[] {
    const base = [
      'admin',
      'test@example.com',
      'password123',
      'user123'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, 'admin@company.com', 'P@ssw0rd!', 'root'];
    return [...base, 'admin@company.com', 'P@ssw0rd!', 'root', 'administrator', 'superuser'];
  }

  private static getAuthorizationPayloads(layer: number): string[] {
    const base = [
      'Bearer token123',
      'Basic dXNlcjpwYXNz',
      'ApiKey key123'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, 'Bearer eyJhbGciOiJIUzI1NiIs', 'Bearer test_token_xyz'];
    return [...base, 'Bearer eyJhbGciOiJIUzI1NiIs', 'Bearer test_token_xyz', 'Bearer expired_token'];
  }

  private static getDataHandlingPayloads(layer: number): string[] {
    const base = [
      '{"data": "test"}',
      '<data>test</data>',
      'data=test'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, '{"data": "<script>alert(1)</script>"', '<data><![CDATA[test]]></data>'];
    return [...base, '{"data": "<script>alert(1)</script>"', '<data><![CDATA[test]]></data>', 'data=<script>alert(1)</script>'];
  }

  private static getInputValidationPayloads(layer: number): string[] {
    const base = [
      'normal_text',
      '12345',
      'test@example.com'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, "<script>alert(1)</script>", "\" OR '1'='1\"", '../../../etc/passwd'];
    return [...base, "<script>alert(1)</script>", "\" OR '1'='1\"", '../../../etc/passwd', '${7*7}', 'SELECT * FROM users'];
  }

  private static getSessionManagementPayloads(layer: number): string[] {
    const base = [
      'sessionid=abc123',
      'JSESSIONID=xyz789',
      'PHPSESSID=test456'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, 'sessionid=abc123; path=/; HttpOnly', 'sessionid=; Secure'];
    return [...base, 'sessionid=abc123; path=/; HttpOnly', 'sessionid=; Secure', 'sessionid=weak_token'];
  }

  private static getConfigurationPayloads(layer: number): string[] {
    const base = [
      '/config',
      '/api/config',
      '/settings'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, '/.env', '/config.json', '/web.config'];
    return [...base, '/.env', '/config.json', '/web.config', '/config.php', '/config.yml'];
  }

  private static getNetworkPayloads(layer: number): string[] {
    const base = [
      'http://example.com',
      'https://example.com',
      '//example.com'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, 'http://169.254.169.254/latest', 'http://localhost:8080'];
    return [...base, 'http://169.254.169.254/latest', 'http://localhost:8080', 'http://127.0.0.1:6379'];
  }

  private static getStoragePayloads(layer: number): string[] {
    const base = [
      '/uploads',
      '/files',
      '/static'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, '/uploads/test', '/backup.zip', '/database.sql'];
    return [...base, '/uploads/test', '/backup.zip', '/database.sql', '/.git/config', '/storage/test'];
  }

  private static getApiPayloads(layer: number): string[] {
    const base = [
      '/api/users',
      '/api/admin',
      '/graphql'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, '/api/users/1', '/api/config', '/api/debug'];
    return [...base, '/api/users/1', '/api/config', '/api/debug', '/api/admin/users', '/graphql?query={__schema}'];
  }

  private static getContentPayloads(layer: number): string[] {
    const base = [
      '/index.html',
      '/about',
      '/contact'
    ];

    if (layer === 1) return base;
    if (layer === 2) return [...base, '/admin', '/login', '/dashboard'];
    return [...base, '/admin', '/login', '/dashboard', '/user/profile', '/api/documentation'];
  }
}
