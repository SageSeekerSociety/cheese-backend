/*
 * Description: Unit tests for OAuth Types
 *
 * Author(s):
 *      HuanCheng65
 */

import {
  BaseOAuthProvider,
  OAuthError,
  OAuthProviderConfig,
  OAuthUserInfo,
} from './oauth.types';

// Mock implementation for testing BaseOAuthProvider
class TestOAuthProvider extends BaseOAuthProvider {
  constructor(config: OAuthProviderConfig) {
    super(config);
  }

  async handleCallback(code: string, state?: string): Promise<string> {
    if (code === 'valid_code') {
      return 'mock_access_token';
    }
    throw new Error('Invalid authorization code');
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    if (accessToken === 'mock_access_token') {
      return {
        id: '12345',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        preferredUsername: 'testuser',
      };
    }
    throw new Error('Invalid access token');
  }
}

describe('OAuth Types', () => {
  describe('BaseOAuthProvider', () => {
    let provider: TestOAuthProvider;
    let config: OAuthProviderConfig;

    beforeEach(() => {
      config = {
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user', 'read:email'],
      };
      provider = new TestOAuthProvider(config);
    });

    describe('constructor', () => {
      it('should initialize with config', () => {
        expect(provider.getConfig()).toBe(config);
      });
    });

    describe('getConfig', () => {
      it('should return the configuration', () => {
        const result = provider.getConfig();
        expect(result).toEqual(config);
        expect(result.id).toBe('test');
        expect(result.name).toBe('Test Provider');
        expect(result.clientId).toBe('test-client-id');
      });
    });

    describe('getAuthorizationUrl', () => {
      it('should generate authorization URL without optional parameters', () => {
        const url = provider.getAuthorizationUrl();

        expect(url).toContain('https://test.com/oauth/authorize');
        expect(url).toContain('client_id=test-client-id');
        expect(url).toContain(
          'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback',
        );
        expect(url).toContain('scope=read%3Auser+read%3Aemail');
        expect(url).toContain('response_type=code');
        expect(url).not.toContain('state=');
        expect(url).not.toContain('access_type=');
      });

      it('should generate authorization URL with state parameter', () => {
        const url = provider.getAuthorizationUrl('state123');

        expect(url).toContain('https://test.com/oauth/authorize');
        expect(url).toContain('client_id=test-client-id');
        expect(url).toContain('state=state123');
      });

      it('should generate authorization URL with access_type parameter', () => {
        const url = provider.getAuthorizationUrl(undefined, 'offline');

        expect(url).toContain('https://test.com/oauth/authorize');
        expect(url).toContain('access_type=offline');
      });

      it('should generate authorization URL with both state and access_type parameters', () => {
        const url = provider.getAuthorizationUrl('state456', 'online');

        expect(url).toContain('state=state456');
        expect(url).toContain('access_type=online');
      });

      it('should handle empty scope array', () => {
        const configWithEmptyScope = { ...config, scope: [] };
        const providerWithEmptyScope = new TestOAuthProvider(
          configWithEmptyScope,
        );

        const url = providerWithEmptyScope.getAuthorizationUrl();
        expect(url).toContain('scope=');
      });

      it('should handle single scope', () => {
        const configWithSingleScope = { ...config, scope: ['read:user'] };
        const providerWithSingleScope = new TestOAuthProvider(
          configWithSingleScope,
        );

        const url = providerWithSingleScope.getAuthorizationUrl();
        expect(url).toContain('scope=read%3Auser');
      });

      it('should properly encode special characters in URLs', () => {
        const configWithSpecialChars = {
          ...config,
          redirectUrl: 'http://localhost:3000/callback?test=value&other=data',
        };
        const providerWithSpecialChars = new TestOAuthProvider(
          configWithSpecialChars,
        );

        const url = providerWithSpecialChars.getAuthorizationUrl();
        expect(url).toContain(
          'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback%3Ftest%3Dvalue%26other%3Ddata',
        );
      });
    });

    describe('handleCallback', () => {
      it('should handle valid authorization code', async () => {
        const token = await provider.handleCallback('valid_code');
        expect(token).toBe('mock_access_token');
      });

      it('should handle invalid authorization code', async () => {
        await expect(provider.handleCallback('invalid_code')).rejects.toThrow(
          'Invalid authorization code',
        );
      });

      it('should handle callback with state parameter', async () => {
        const token = await provider.handleCallback('valid_code', 'state123');
        expect(token).toBe('mock_access_token');
      });
    });

    describe('getUserInfo', () => {
      it('should return user info with valid token', async () => {
        const userInfo = await provider.getUserInfo('mock_access_token');

        expect(userInfo).toEqual({
          id: '12345',
          email: 'test@example.com',
          name: 'Test User',
          username: 'testuser',
          preferredUsername: 'testuser',
        });
      });

      it('should throw error with invalid token', async () => {
        await expect(provider.getUserInfo('invalid_token')).rejects.toThrow(
          'Invalid access token',
        );
      });
    });
  });

  describe('OAuthError', () => {
    it('should create error with basic information', () => {
      const error = new OAuthError(
        'Test error message',
        'github',
        'authorization',
      );

      expect(error.message).toBe('Test error message');
      expect(error.provider).toBe('github');
      expect(error.type).toBe('authorization');
      expect(error.name).toBe('OAuthError');
      expect(error.originalError).toBeUndefined();
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original error');
      const error = new OAuthError(
        'OAuth error occurred',
        'google',
        'token_exchange',
        originalError,
      );

      expect(error.message).toBe('OAuth error occurred');
      expect(error.provider).toBe('google');
      expect(error.type).toBe('token_exchange');
      expect(error.originalError).toBe(originalError);
    });

    it('should support all error types', () => {
      const types = [
        'authorization',
        'token_exchange',
        'user_info',
        'validation',
      ] as const;

      types.forEach((type) => {
        const error = new OAuthError('Test message', 'provider', type);
        expect(error.type).toBe(type);
      });
    });

    it('should be instanceof Error', () => {
      const error = new OAuthError('Test message', 'provider', 'validation');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof OAuthError).toBe(true);
    });

    it('should have correct stack trace', () => {
      const error = new OAuthError('Test message', 'provider', 'validation');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('OAuthError');
    });
  });
});
