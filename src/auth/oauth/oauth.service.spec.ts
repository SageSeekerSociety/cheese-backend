/*
 * Description: Unit tests for OAuth Service
 *
 * Author(s):
 *     Claude Assistant
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import {
  OAuthProvider,
  OAuthProviderConfig,
  OAuthUserInfo,
} from './oauth.types';
import * as fs from 'fs';
import * as path from 'path';

// Mock provider for testing
class MockOAuthProvider implements OAuthProvider {
  constructor(private config: OAuthProviderConfig) {}

  getConfig(): OAuthProviderConfig {
    return this.config;
  }

  getAuthorizationUrl(state?: string, accessType?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUrl,
      scope: this.config.scope.join(' '),
      response_type: 'code',
    });

    if (state) params.append('state', state);
    if (accessType) params.append('access_type', accessType);

    return `${this.config.authorizationUrl}?${params.toString()}`;
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

describe('OAuthService', () => {
  let service: OAuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'oauth.enabledProviders':
                  return ['test'];
                case 'oauth.pluginPaths':
                  return ['./test-plugins'];
                case 'oauth.allowNpmLoading':
                  return false;
                case 'oauth.test.clientId':
                  return 'test-client-id';
                case 'oauth.test.clientSecret':
                  return 'test-client-secret';
                case 'oauth.test.redirectUrl':
                  return 'http://localhost:3000/callback';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize without providers when none are enabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.enabledProviders') return [];
        return undefined;
      });

      await service.initialize();
      expect(service.getAvailableProviders()).toEqual([]);
    });

    it('should skip provider loading when config is missing', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.enabledProviders') return ['test'];
        if (key === 'oauth.test.clientId') return undefined;
        return undefined;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'OAuth provider test configuration is incomplete',
        ),
      );
      expect(service.getAvailableProviders()).toEqual([]);
    });

    it('should load provider from plugin file', async () => {
      // Mock fs.existsSync and require
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const mockCreateProvider = jest.fn().mockReturnValue(
        new MockOAuthProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUrl: 'http://localhost:3000/callback',
          authorizationUrl: 'https://test.com/oauth/authorize',
          tokenUrl: 'https://test.com/oauth/token',
          scope: ['read:user'],
        }),
      );

      jest.doMock(
        path.resolve('./test-plugins/test.js'),
        () => ({
          createProvider: mockCreateProvider,
        }),
        { virtual: true },
      );

      await service.initialize();

      expect(service.getAvailableProviders()).toContain('test');
      expect(mockCreateProvider).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
      });
    });

    it('should handle provider loading errors gracefully', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      // Mock require to throw an error
      jest.doMock(
        path.resolve('./test-plugins/test.js'),
        () => {
          throw new Error('Module loading failed');
        },
        { virtual: true },
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load OAuth provider test'),
      );
      expect(service.getAvailableProviders()).toEqual([]);
    });

    it('should validate provider ID format', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.enabledProviders') return ['invalid-provider!'];
        return undefined;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid provider ID: invalid-provider!'),
      );
      expect(service.getAvailableProviders()).toEqual([]);
    });
  });

  describe('getProvider', () => {
    beforeEach(async () => {
      // Setup a mock provider
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const mockCreateProvider = jest.fn().mockReturnValue(
        new MockOAuthProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUrl: 'http://localhost:3000/callback',
          authorizationUrl: 'https://test.com/oauth/authorize',
          tokenUrl: 'https://test.com/oauth/token',
          scope: ['read:user'],
        }),
      );

      jest.doMock(
        path.resolve('./test-plugins/test.js'),
        () => ({
          createProvider: mockCreateProvider,
        }),
        { virtual: true },
      );

      await service.initialize();
    });

    it('should return provider when it exists', () => {
      const provider = service.getProvider('test');
      expect(provider).toBeInstanceOf(MockOAuthProvider);
    });

    it('should throw error when provider does not exist', () => {
      expect(() => service.getProvider('nonexistent')).toThrow(
        'OAuth provider not found: nonexistent',
      );
    });
  });

  describe('generateAuthorizationUrl', () => {
    beforeEach(async () => {
      // Setup a mock provider
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const mockCreateProvider = jest.fn().mockReturnValue(
        new MockOAuthProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUrl: 'http://localhost:3000/callback',
          authorizationUrl: 'https://test.com/oauth/authorize',
          tokenUrl: 'https://test.com/oauth/token',
          scope: ['read:user'],
        }),
      );

      jest.doMock(
        path.resolve('./test-plugins/test.js'),
        () => ({
          createProvider: mockCreateProvider,
        }),
        { virtual: true },
      );

      await service.initialize();
    });

    it('should generate authorization URL', () => {
      const url = service.generateAuthorizationUrl('test', 'state123');
      expect(url).toContain('https://test.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=state123');
    });

    it('should throw error for nonexistent provider', () => {
      expect(() => service.generateAuthorizationUrl('nonexistent')).toThrow(
        'OAuth provider not found: nonexistent',
      );
    });
  });

  describe('handleCallback', () => {
    beforeEach(async () => {
      // Setup a mock provider
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const mockCreateProvider = jest.fn().mockReturnValue(
        new MockOAuthProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUrl: 'http://localhost:3000/callback',
          authorizationUrl: 'https://test.com/oauth/authorize',
          tokenUrl: 'https://test.com/oauth/token',
          scope: ['read:user'],
        }),
      );

      jest.doMock(
        path.resolve('./test-plugins/test.js'),
        () => ({
          createProvider: mockCreateProvider,
        }),
        { virtual: true },
      );

      await service.initialize();
    });

    it('should handle callback successfully', async () => {
      const userInfo = await service.handleCallback('test', 'valid_code');
      expect(userInfo).toEqual({
        id: '12345',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        preferredUsername: 'testuser',
      });
    });

    it('should throw error for invalid code', async () => {
      await expect(
        service.handleCallback('test', 'invalid_code'),
      ).rejects.toThrow('Invalid authorization code');
    });

    it('should throw error for nonexistent provider', async () => {
      await expect(
        service.handleCallback('nonexistent', 'code'),
      ).rejects.toThrow('OAuth provider not found: nonexistent');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return empty array when no providers are loaded', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.enabledProviders') return [];
        return undefined;
      });

      await service.initialize();
      expect(service.getAvailableProviders()).toEqual([]);
    });

    it('should return provider IDs when providers are loaded', async () => {
      // Setup mock providers
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const mockCreateProvider = jest.fn().mockReturnValue(
        new MockOAuthProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUrl: 'http://localhost:3000/callback',
          authorizationUrl: 'https://test.com/oauth/authorize',
          tokenUrl: 'https://test.com/oauth/token',
          scope: ['read:user'],
        }),
      );

      jest.doMock(
        path.resolve('./test-plugins/test.js'),
        () => ({
          createProvider: mockCreateProvider,
        }),
        { virtual: true },
      );

      await service.initialize();
      expect(service.getAvailableProviders()).toEqual(['test']);
    });
  });

  describe('security validations', () => {
    it('should prevent path traversal in plugin loading', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.enabledProviders') return ['../../../malicious'];
        if (key === 'oauth.pluginPaths') return ['./plugins'];
        return undefined;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid provider ID: ../../../malicious'),
      );
    });

    it('should validate provider ID contains only safe characters', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'oauth.enabledProviders') return ['test<script>'];
        return undefined;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid provider ID: test<script>'),
      );
    });
  });
});
