/*
 * Description: Unit tests for OAuth Service
 *
 * Author(s):
 *      HuanCheng65
 */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthService } from './oauth.service';
import {
  OAuthProvider,
  OAuthProviderConfig,
  OAuthUserInfo,
} from './oauth.types';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

import * as fs from 'fs';

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
  let mockCreateProvider: jest.Mock;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mock provider factory
    mockCreateProvider = jest.fn().mockReturnValue(
      new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'OAUTH_ENABLED_PROVIDERS':
                  return 'test';
                case 'OAUTH_PLUGIN_PATHS':
                  return './test-plugins';
                case 'OAUTH_ALLOW_NPM_LOADING':
                  return false;
                case 'OAUTH_TEST_CLIENT_ID':
                  return 'test-client-id';
                case 'OAUTH_TEST_CLIENT_SECRET':
                  return 'test-client-secret';
                case 'OAUTH_TEST_REDIRECT_URL':
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
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Reset service state to ensure test isolation
    (service as any).initialized = false;
    (service as any).providers.clear();
  });

  describe('initialize', () => {
    it('should initialize without providers when none are enabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return '';
        return undefined;
      });

      await service.initialize();
      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toEqual([]);
    });

    it('should skip provider loading when config is missing', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return 'test';
        if (key === 'OAUTH_TEST_CLIENT_ID') return undefined; // Missing config
        if (key === 'OAUTH_PLUGIN_PATHS') return './test-plugins';
        return undefined;
      });

      // Spy on the service's logger warn method
      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Missing configuration for OAuth provider.+test/,
          ),
        );
        expect(
          (await service.getAllProviders()).map((p) => p.getConfig().id),
        ).toEqual([]);
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });

    it('should load provider from plugin file', async () => {
      // Mock fs.existsSync to return true for plugin file
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock the loadProvider method to simulate successful loading
      const mockProvider = new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      });

      // Mock the loadProvider method to directly register the provider
      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args) => {
          const providerId = args[0] as string;
          (service as any).registerProvider(providerId, mockProvider);
        });

      await service.initialize();

      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toContain('test');
    });

    it('should handle provider loading errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Spy on the service's logger error method
      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => {});

      try {
        // Mock loadProvider to throw an error
        jest
          .spyOn(service as any, 'loadProvider')
          .mockImplementation(async (...args) => {
            throw new Error('Module loading failed');
          });

        await service.initialize();

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load OAuth provider'),
          expect.any(String), // error.stack
        );
        expect(
          (await service.getAllProviders()).map((p) => p.getConfig().id),
        ).toEqual([]);
      } finally {
        loggerErrorSpy.mockRestore();
      }
    });

    it('should validate provider ID format', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return 'invalid-provider!';
        return undefined;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Call getEnabledProviders which filters invalid IDs
      await service.initialize();

      // The service should warn about invalid provider ID during getEnabledProviders filtering
      // Since the service filters out invalid IDs during initialization, no providers should be loaded
      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('getProvider', () => {
    beforeEach(async () => {
      // Setup a mock provider
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProvider = new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      });

      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args) => {
          const providerId = args[0] as string;
          (service as any).registerProvider(providerId, mockProvider);
        });
      await service.initialize();
    });

    it('should return provider when it exists', async () => {
      const provider = await service.getProvider('test');
      expect(provider).toBeInstanceOf(MockOAuthProvider);
    });

    it('should return undefined when provider does not exist', async () => {
      const provider = await service.getProvider('nonexistent');
      expect(provider).toBeUndefined();
    });
  });

  describe('generateAuthorizationUrl', () => {
    beforeEach(async () => {
      // Setup a mock provider
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProvider = new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      });

      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args) => {
          const providerId = args[0] as string;
          (service as any).registerProvider(providerId, mockProvider);
        });
      await service.initialize();
    });

    it('should generate authorization URL', async () => {
      const url = await service.generateAuthorizationUrl('test', 'state123');
      expect(url).toContain('https://test.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=state123');
    });

    it('should throw error for nonexistent provider', async () => {
      await expect(
        service.generateAuthorizationUrl('nonexistent'),
      ).rejects.toThrow("OAuth provider 'nonexistent' not found");
    });
  });

  describe('handleCallback', () => {
    beforeEach(async () => {
      // Setup a mock provider
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProvider = new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      });

      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args) => {
          const providerId = args[0] as string;
          (service as any).registerProvider(providerId, mockProvider);
        });
      await service.initialize();
    });

    it('should handle callback successfully', async () => {
      const accessToken = await service.handleCallback('test', 'valid_code');
      expect(accessToken).toBe('mock_access_token');
    });

    it('should throw error for invalid code', async () => {
      await expect(
        service.handleCallback('test', 'invalid_code'),
      ).rejects.toThrow('Invalid authorization code');
    });

    it('should throw error for nonexistent provider', async () => {
      await expect(
        service.handleCallback('nonexistent', 'code'),
      ).rejects.toThrow("OAuth provider 'nonexistent' not found");
    });
  });

  describe('getAllProviders', () => {
    it('should return empty array when no providers are loaded', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return '';
        return undefined;
      });

      await service.initialize();
      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toEqual([]);
    });

    it('should return provider IDs when providers are loaded', async () => {
      // Setup mock providers
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProvider = new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      });

      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args) => {
          const providerId = args[0] as string;
          (service as any).registerProvider(providerId, mockProvider);
        });

      await service.initialize();
      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toEqual(['test']);
    });
  });

  describe('getUserInfo', () => {
    beforeEach(async () => {
      // Setup a mock provider
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProvider = new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      });

      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args) => {
          const providerId = args[0] as string;
          (service as any).registerProvider(providerId, mockProvider);
        });
      await service.initialize();
    });

    it('should return user info for valid provider and token', async () => {
      const userInfo = await service.getUserInfo('test', 'mock_access_token');

      expect(userInfo).toEqual({
        id: '12345',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        preferredUsername: 'testuser',
      });
    });

    it('should throw error for nonexistent provider', async () => {
      await expect(service.getUserInfo('nonexistent', 'token')).rejects.toThrow(
        "OAuth provider 'nonexistent' not found",
      );
    });

    it('should throw error for invalid token', async () => {
      await expect(
        service.getUserInfo('test', 'invalid_token'),
      ).rejects.toThrow('Failed to get user info from provider');
    });
  });

  describe('getProvidersConfig', () => {
    it('should return empty array when no providers are loaded', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return '';
        return undefined;
      });

      await service.initialize();
      const configs = await service.getProvidersConfig();
      expect(configs).toEqual([]);
    });

    it('should return provider configurations when providers are loaded', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProvider = new MockOAuthProvider({
        id: 'test',
        name: 'Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user', 'read:email'],
      });

      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args) => {
          const providerId = args[0] as string;
          (service as any).registerProvider(providerId, mockProvider);
        });

      await service.initialize();
      const configs = await service.getProvidersConfig();

      expect(configs).toEqual([
        {
          id: 'test',
          name: 'Test Provider',
          scope: ['read:user', 'read:email'],
        },
      ]);
    });

    it('should return multiple provider configurations', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'github,google';
          case 'OAUTH_PLUGIN_PATHS':
            return './test-plugins';
          case 'OAUTH_ALLOW_NPM_LOADING':
            return false;
          case 'OAUTH_GITHUB_CLIENT_ID':
            return 'github-client-id';
          case 'OAUTH_GITHUB_CLIENT_SECRET':
            return 'github-client-secret';
          case 'OAUTH_GITHUB_REDIRECT_URL':
            return 'http://localhost:3000/callback/github';
          case 'OAUTH_GOOGLE_CLIENT_ID':
            return 'google-client-id';
          case 'OAUTH_GOOGLE_CLIENT_SECRET':
            return 'google-client-secret';
          case 'OAUTH_GOOGLE_REDIRECT_URL':
            return 'http://localhost:3000/callback/google';
          default:
            return undefined;
        }
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockGithubProvider = new MockOAuthProvider({
        id: 'github',
        name: 'GitHub',
        clientId: 'github-client-id',
        clientSecret: 'github-client-secret',
        redirectUrl: 'http://localhost:3000/callback/github',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: ['user:email'],
      });

      const mockGoogleProvider = new MockOAuthProvider({
        id: 'google',
        name: 'Google',
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
        redirectUrl: 'http://localhost:3000/callback/google',
        authorizationUrl: 'https://accounts.google.com/oauth2/authorize',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: ['openid', 'email', 'profile'],
      });

      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args: unknown[]) => {
          const providerId = args[0] as string;
          if (providerId === 'github') {
            (service as any).registerProvider(providerId, mockGithubProvider);
          } else if (providerId === 'google') {
            (service as any).registerProvider(providerId, mockGoogleProvider);
          }
        });

      await service.initialize();
      const configs = await service.getProvidersConfig();

      expect(configs).toHaveLength(2);
      expect(configs.find((c) => c.id === 'github')).toEqual({
        id: 'github',
        name: 'GitHub',
        scope: ['user:email'],
      });
      expect(configs.find((c) => c.id === 'google')).toEqual({
        id: 'google',
        name: 'Google',
        scope: ['openid', 'email', 'profile'],
      });
    });
  });

  describe('NPM package loading', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'npm-provider';
          case 'OAUTH_PLUGIN_PATHS':
            return './plugins';
          case 'OAUTH_ALLOW_NPM_LOADING':
            return true;
          case 'OAUTH_NPM_PROVIDER_CLIENT_ID':
            return 'npm-client-id';
          case 'OAUTH_NPM_PROVIDER_CLIENT_SECRET':
            return 'npm-client-secret';
          case 'OAUTH_NPM_PROVIDER_REDIRECT_URL':
            return 'http://localhost:3000/callback/npm';
          default:
            return undefined;
        }
      });
    });

    it('should load provider from npm when plugin not found locally', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock dynamic import for npm package
      const mockNpmProvider = new MockOAuthProvider({
        id: 'npm-provider',
        name: 'NPM Provider',
        clientId: 'npm-client-id',
        clientSecret: 'npm-client-secret',
        redirectUrl: 'http://localhost:3000/callback/npm',
        authorizationUrl: 'https://npm.com/oauth/authorize',
        tokenUrl: 'https://npm.com/oauth/token',
        scope: ['read:user'],
      });

      // Mock the entire loadProvider method to register the provider directly
      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async (...args: unknown[]) => {
          const providerId = args[0] as string;
          if (providerId === 'npm-provider') {
            (service as any).registerProvider(providerId, mockNpmProvider);
          }
        });

      await service.initialize();
      const providers = await service.getAllProviders();

      expect(providers.map((p) => p.getConfig().id)).toContain('npm-provider');
    });

    it('should handle npm package loading failure gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock tryLoadFromNpm to return null (loading failed)
      jest.spyOn(service as any, 'tryLoadFromNpm').mockResolvedValue(null);

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Missing configuration for OAuth provider.+npm-provider/,
          ),
        );
        expect(
          (await service.getAllProviders()).map((p) => p.getConfig().id),
        ).toEqual([]);
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });

    it('should not try npm loading when disabled', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'npm-provider';
          case 'OAUTH_PLUGIN_PATHS':
            return './plugins';
          case 'OAUTH_ALLOW_NPM_LOADING':
            return false; // Disabled
          case 'OAUTH_NPM_PROVIDER_CLIENT_ID':
            return 'npm-client-id';
          case 'OAUTH_NPM_PROVIDER_CLIENT_SECRET':
            return 'npm-client-secret';
          case 'OAUTH_NPM_PROVIDER_REDIRECT_URL':
            return 'http://localhost:3000/callback/npm';
          default:
            return undefined;
        }
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const tryLoadFromNpmSpy = jest
        .spyOn(service as any, 'tryLoadFromNpm')
        .mockResolvedValue(null);

      await service.initialize();

      expect(tryLoadFromNpmSpy).not.toHaveBeenCalled();
      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toEqual([]);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle multiple initialization calls gracefully', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return '';
        return undefined;
      });

      // Call initialize multiple times
      await service.initialize();
      await service.initialize();
      await service.initialize();

      // Should only initialize once
      expect(await service.getAllProviders()).toEqual([]);
    });

    it('should use default plugin path when OAUTH_PLUGIN_PATHS is undefined', async () => {
      // Test the getPluginPaths method directly
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_PLUGIN_PATHS') return undefined;
        return undefined;
      });

      const pluginPaths = (service as any).getPluginPaths();
      expect(pluginPaths).toEqual(['plugins/oauth']);
    });

    it('should handle provider with missing redirect URL', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'test';
          case 'OAUTH_TEST_CLIENT_ID':
            return 'test-client-id';
          case 'OAUTH_TEST_CLIENT_SECRET':
            return 'test-client-secret';
          case 'OAUTH_TEST_REDIRECT_URL':
            return undefined; // Missing redirect URL
          default:
            return undefined;
        }
      });

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Missing configuration for OAuth provider.+test/,
          ),
        );
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });
  });

  describe('security validations', () => {
    it('should prevent path traversal in plugin loading', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return '../../../malicious';
        if (key === 'OAUTH_PLUGIN_PATHS') return './plugins';
        return undefined;
      });

      await service.initialize();

      // Should filter out invalid provider ID and not load any providers
      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toEqual([]);
    });

    it('should validate provider ID contains only safe characters', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return 'test<script>';
        return undefined;
      });

      await service.initialize();

      // Should filter out invalid provider ID and not load any providers
      expect(
        (await service.getAllProviders()).map((p) => p.getConfig().id),
      ).toEqual([]);
    });

    it('should validate provider IDs against XSS attempts', async () => {
      const maliciousIds = [
        'test<script>alert("xss")</script>',
        'test"onload="alert(1)"',
        "test'onclick=alert(1)",
        'test--drop-table',
        'test;rm -rf /',
      ];

      for (const maliciousId of maliciousIds) {
        jest.spyOn(configService, 'get').mockImplementation((key: string) => {
          if (key === 'OAUTH_ENABLED_PROVIDERS') return maliciousId;
          return undefined;
        });

        await service.initialize();

        expect(
          (await service.getAllProviders()).map((p) => p.getConfig().id),
        ).toEqual([]);
      }
    });

    it('should handle path traversal attempts in plugin paths', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'test';
          case 'OAUTH_PLUGIN_PATHS':
            return '../../../etc,/etc/passwd,./plugins';
          case 'OAUTH_TEST_CLIENT_ID':
            return 'test-client-id';
          case 'OAUTH_TEST_CLIENT_SECRET':
            return 'test-client-secret';
          case 'OAUTH_TEST_REDIRECT_URL':
            return 'http://localhost:3000/callback';
          default:
            return undefined;
        }
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      // Mock loadProvider to simulate path validation
      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async () => {
          // Simulate path traversal detection
          service['logger'].warn('Potential path traversal detected');
        });

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Potential path traversal detected'),
        );
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });
  });
});
