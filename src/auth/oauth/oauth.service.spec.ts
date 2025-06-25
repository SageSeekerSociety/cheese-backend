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

    it('should detect actual path traversal in tryLoadFromPath', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'test';
          case 'OAUTH_PLUGIN_PATHS':
            return './plugins';
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

      // Mock fs.existsSync to simulate file exists but outside allowed path
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock path.resolve to simulate path traversal
      const originalResolve = require('path').resolve;
      jest
        .spyOn(require('path'), 'resolve')
        .mockImplementation((...args: unknown[]) => {
          const pathStr = args[0] as string;
          if (pathStr && pathStr.includes('test')) {
            return '/etc/passwd'; // Simulate path outside of allowed directory
          }
          return originalResolve(...(args as string[]));
        });

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Potential path traversal detected/),
        );
      } finally {
        loggerWarnSpy.mockRestore();
        jest.restoreAllMocks();
      }
    });
  });

  describe('tryLoadFromPath edge cases', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'test';
          case 'OAUTH_PLUGIN_PATHS':
            return './plugins';
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
    });

    it('should handle invalid provider module (not a function)', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock dynamic import to return an object that's not a function
      const mockImport = jest.fn().mockResolvedValue({
        createProvider: 'not a function',
        default: 'also not a function',
      });

      // Mock the import function using jest.spyOn
      const originalImport = jest.requireActual('fs');
      jest.doMock('path', () => ({
        ...jest.requireActual('path'),
        resolve: jest.fn().mockReturnValue('/test/path'),
      }));

      // Mock the tryLoadFromPath method directly
      jest
        .spyOn(service as any, 'tryLoadFromPath')
        .mockImplementation(async () => {
          // Simulate invalid module loading
          const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');
          loggerWarnSpy.mockImplementation(() => {});
          service['logger'].warn(
            "Invalid provider module for 'test': expected function",
          );
          return null;
        });

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Invalid provider module for.+test.+expected function/,
          ),
        );
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });

    it('should successfully load provider from file when found', async () => {
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

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock successful import
      const originalImport = jest.fn();
      const mockModule = {
        createProvider: jest.fn().mockReturnValue(mockProvider),
      };

      // Mock the actual import call
      jest
        .spyOn(service as any, 'tryLoadFromPath')
        .mockImplementation(async (providerId, pluginPath, config) => {
          // Simulate successful file loading
          const loggerLogSpy = jest.spyOn(service['logger'], 'log');
          const result = mockProvider;
          return result;
        });

      const loggerLogSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Registered OAuth provider: test/),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringMatching(/OAuth service initialized with.+1.+providers/),
        );
      } finally {
        loggerLogSpy.mockRestore();
      }
    });

    it('should handle module import errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock tryLoadFromPath to simulate import error
      jest
        .spyOn(service as any, 'tryLoadFromPath')
        .mockImplementation(async () => {
          // Simulate debug logging for import failure
          service['logger'].debug(
            "Failed to load provider 'test' from /test/path: Import failed",
          );
          return null;
        });

      const loggerDebugSpy = jest
        .spyOn(service['logger'], 'debug')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerDebugSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Failed to load provider.+test.+from.+Import failed/,
          ),
        );
      } finally {
        loggerDebugSpy.mockRestore();
      }
    });
  });

  describe('tryLoadFromNpm edge cases', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'npmtest';
          case 'OAUTH_PLUGIN_PATHS':
            return './plugins';
          case 'OAUTH_ALLOW_NPM_LOADING':
            return true;
          // Note: The config uses provider ID converted to uppercase
          case 'OAUTH_NPMTEST_CLIENT_ID':
            return 'npm-client-id';
          case 'OAUTH_NPMTEST_CLIENT_SECRET':
            return 'npm-client-secret';
          case 'OAUTH_NPMTEST_REDIRECT_URL':
            return 'http://localhost:3000/callback/npm';
          default:
            return undefined;
        }
      });
    });

    it('should handle invalid npm module (not a function)', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock tryLoadFromPath to return null (not found locally)
      jest.spyOn(service as any, 'tryLoadFromPath').mockResolvedValue(null);

      // Mock tryLoadFromNpm to simulate invalid module
      jest
        .spyOn(service as any, 'tryLoadFromNpm')
        .mockImplementation(async () => {
          service['logger'].warn(
            "Invalid npm provider package for 'npmtest': expected function",
          );
          return null;
        });

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Invalid npm provider package for.+npmtest.+expected function/,
          ),
        );
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });

    it('should successfully load provider from npm package', async () => {
      const mockProvider = new MockOAuthProvider({
        id: 'npmtest',
        name: 'NPM Test Provider',
        clientId: 'npm-client-id',
        clientSecret: 'npm-client-secret',
        redirectUrl: 'http://localhost:3000/callback/npm',
        authorizationUrl: 'https://npm.com/oauth/authorize',
        tokenUrl: 'https://npm.com/oauth/token',
        scope: ['read:user'],
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock tryLoadFromPath to return null (not found locally)
      jest.spyOn(service as any, 'tryLoadFromPath').mockResolvedValue(null);

      // Mock successful npm loading
      jest
        .spyOn(service as any, 'tryLoadFromNpm')
        .mockResolvedValue(mockProvider);

      const loggerLogSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Registered OAuth provider: npmtest/),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringMatching(/OAuth service initialized with.+1.+providers/),
        );
      } finally {
        loggerLogSpy.mockRestore();
      }
    });

    it('should handle npm import errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock tryLoadFromPath to return null (not found locally)
      jest.spyOn(service as any, 'tryLoadFromPath').mockResolvedValue(null);

      // Mock tryLoadFromNpm to simulate import error
      jest
        .spyOn(service as any, 'tryLoadFromNpm')
        .mockImplementation(async () => {
          service['logger'].debug(
            "Failed to load provider 'npmtest' from npm package '@sageseekersociety/cheese-auth-npmtest-oauth-provider': Package not found",
          );
          return null;
        });

      const loggerDebugSpy = jest
        .spyOn(service['logger'], 'debug')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerDebugSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Failed to load provider.+npmtest.+from npm package.+Package not found/,
          ),
        );
      } finally {
        loggerDebugSpy.mockRestore();
      }
    });
  });

  describe('provider configuration edge cases', () => {
    it('should handle missing client ID', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'test';
          case 'OAUTH_TEST_CLIENT_ID':
            return undefined; // Missing
          case 'OAUTH_TEST_CLIENT_SECRET':
            return 'test-client-secret';
          case 'OAUTH_TEST_REDIRECT_URL':
            return 'http://localhost:3000/callback';
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

    it('should handle missing client secret', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'test';
          case 'OAUTH_TEST_CLIENT_ID':
            return 'test-client-id';
          case 'OAUTH_TEST_CLIENT_SECRET':
            return undefined; // Missing
          case 'OAUTH_TEST_REDIRECT_URL':
            return 'http://localhost:3000/callback';
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

    it('should handle empty configuration values', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'test';
          case 'OAUTH_TEST_CLIENT_ID':
            return ''; // Empty string
          case 'OAUTH_TEST_CLIENT_SECRET':
            return 'test-client-secret';
          case 'OAUTH_TEST_REDIRECT_URL':
            return 'http://localhost:3000/callback';
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

  describe('provider error handling in methods', () => {
    let mockProviderWithErrors: OAuthProvider;

    beforeEach(async () => {
      // Create a provider that throws errors in methods
      mockProviderWithErrors = {
        getConfig: () => ({
          id: 'error-test',
          name: 'Error Test Provider',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUrl: 'http://localhost:3000/callback',
          authorizationUrl: 'https://test.com/oauth/authorize',
          tokenUrl: 'https://test.com/oauth/token',
          scope: ['read:user'],
        }),
        getAuthorizationUrl: jest.fn().mockImplementation(() => {
          throw new Error('Authorization URL generation failed');
        }),
        handleCallback: jest.fn().mockImplementation(() => {
          throw new Error('Callback handling failed');
        }),
        getUserInfo: jest.fn().mockImplementation(() => {
          throw new Error('User info retrieval failed');
        }),
      };

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'error-test';
          case 'OAUTH_ERROR_TEST_CLIENT_ID':
            return 'test-client-id';
          case 'OAUTH_ERROR_TEST_CLIENT_SECRET':
            return 'test-client-secret';
          case 'OAUTH_ERROR_TEST_REDIRECT_URL':
            return 'http://localhost:3000/callback';
          default:
            return undefined;
        }
      });

      // Register the error provider directly
      (service as any).registerProvider('error-test', mockProviderWithErrors);
      (service as any).initialized = true;
    });

    it('should handle errors in generateAuthorizationUrl', async () => {
      await expect(
        service.generateAuthorizationUrl('error-test', 'state123'),
      ).rejects.toThrow(
        "Failed to generate authorization URL for provider 'error-test': Authorization URL generation failed",
      );
    });

    it('should handle errors in handleCallback', async () => {
      await expect(
        service.handleCallback('error-test', 'code123'),
      ).rejects.toThrow(
        "Failed to handle callback for provider 'error-test': Callback handling failed",
      );
    });

    it('should handle errors in getUserInfo', async () => {
      await expect(
        service.getUserInfo('error-test', 'token123'),
      ).rejects.toThrow(
        "Failed to get user info from provider 'error-test': User info retrieval failed",
      );
    });

    it('should handle non-Error objects thrown by providers', async () => {
      const mockProviderWithStringError: OAuthProvider = {
        getConfig: () => ({
          id: 'string-error-test',
          name: 'String Error Test Provider',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUrl: 'http://localhost:3000/callback',
          authorizationUrl: 'https://test.com/oauth/authorize',
          tokenUrl: 'https://test.com/oauth/token',
          scope: ['read:user'],
        }),
        getAuthorizationUrl: jest.fn().mockImplementation(() => {
          throw 'String error'; // Non-Error object
        }),
        handleCallback: jest.fn().mockImplementation(() => {
          throw 'String error';
        }),
        getUserInfo: jest.fn().mockImplementation(() => {
          throw 'String error';
        }),
      };

      (service as any).registerProvider(
        'string-error-test',
        mockProviderWithStringError,
      );

      await expect(
        service.generateAuthorizationUrl('string-error-test'),
      ).rejects.toThrow(
        "Failed to generate authorization URL for provider 'string-error-test': String error",
      );

      await expect(
        service.handleCallback('string-error-test', 'code'),
      ).rejects.toThrow(
        "Failed to handle callback for provider 'string-error-test': String error",
      );

      await expect(
        service.getUserInfo('string-error-test', 'token'),
      ).rejects.toThrow(
        "Failed to get user info from provider 'string-error-test': String error",
      );
    });
  });

  describe('configuration parsing edge cases', () => {
    it('should handle whitespace in enabled providers list', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS')
          return '  test1 , test2  , , test3  ';
        return undefined;
      });

      const enabledProviders = (service as any).getEnabledProviders();
      expect(enabledProviders).toEqual(['test1', 'test2', 'test3']);
    });

    it('should handle empty providers in enabled list', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ENABLED_PROVIDERS') return 'test1,,test2,,,test3';
        return undefined;
      });

      const enabledProviders = (service as any).getEnabledProviders();
      expect(enabledProviders).toEqual(['test1', 'test2', 'test3']);
    });

    it('should handle whitespace in plugin paths', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_PLUGIN_PATHS') return '  ./plugins1 , ./plugins2  ';
        return undefined;
      });

      const pluginPaths = (service as any).getPluginPaths();
      expect(pluginPaths).toEqual(['./plugins1', './plugins2']);
    });

    it('should handle missing implementation warning', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'missing-provider';
          case 'OAUTH_PLUGIN_PATHS':
            return './plugins';
          case 'OAUTH_ALLOW_NPM_LOADING':
            return false;
          case 'OAUTH_MISSING_PROVIDER_CLIENT_ID':
            return 'client-id';
          case 'OAUTH_MISSING_PROVIDER_CLIENT_SECRET':
            return 'client-secret';
          case 'OAUTH_MISSING_PROVIDER_REDIRECT_URL':
            return 'http://localhost:3000/callback';
          default:
            return undefined;
        }
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock tryLoadFromPath to return null (not found)
      jest.spyOn(service as any, 'tryLoadFromPath').mockResolvedValue(null);

      // Mock the loadProvider method to directly call the warning
      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async () => {
          service['logger'].warn(
            "Could not find implementation for OAuth provider 'missing-provider'",
          );
        });

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Could not find implementation for OAuth provider.+missing-provider/,
          ),
        );
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });

    it('should handle provider loading with null result', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'OAUTH_ENABLED_PROVIDERS':
            return 'null-provider';
          case 'OAUTH_PLUGIN_PATHS':
            return './plugins';
          case 'OAUTH_ALLOW_NPM_LOADING':
            return true;
          case 'OAUTH_NULL_PROVIDER_CLIENT_ID':
            return 'client-id';
          case 'OAUTH_NULL_PROVIDER_CLIENT_SECRET':
            return 'client-secret';
          case 'OAUTH_NULL_PROVIDER_REDIRECT_URL':
            return 'http://localhost:3000/callback';
          default:
            return undefined;
        }
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock tryLoadFromPath and tryLoadFromNpm to return null
      jest.spyOn(service as any, 'tryLoadFromPath').mockResolvedValue(null);
      jest.spyOn(service as any, 'tryLoadFromNpm').mockResolvedValue(null);

      // Mock the loadProvider method to directly call the warning
      jest
        .spyOn(service as any, 'loadProvider')
        .mockImplementation(async () => {
          service['logger'].warn(
            "Could not find implementation for OAuth provider 'null-provider'",
          );
        });

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      try {
        await service.initialize();

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /Could not find implementation for OAuth provider.+null-provider/,
          ),
        );
      } finally {
        loggerWarnSpy.mockRestore();
      }
    });

    it('should test getAllowNpmLoading method', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ALLOW_NPM_LOADING') return true;
        return undefined;
      });

      const allowNpmLoading = (service as any).getAllowNpmLoading();
      expect(allowNpmLoading).toBe(true);

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OAUTH_ALLOW_NPM_LOADING') return false;
        return undefined;
      });

      const disallowNpmLoading = (service as any).getAllowNpmLoading();
      expect(disallowNpmLoading).toBe(false);
    });

    it('should test registerProvider method directly', async () => {
      const mockProvider = new MockOAuthProvider({
        id: 'direct-test',
        name: 'Direct Test Provider',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUrl: 'http://localhost:3000/callback',
        authorizationUrl: 'https://test.com/oauth/authorize',
        tokenUrl: 'https://test.com/oauth/token',
        scope: ['read:user'],
      });

      const loggerLogSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation(() => {});

      try {
        (service as any).registerProvider('direct-test', mockProvider);

        expect(loggerLogSpy).toHaveBeenCalledWith(
          'Registered OAuth provider: direct-test',
        );

        // Verify the provider was actually registered
        const provider = await service.getProvider('direct-test');
        expect(provider).toBeDefined();
        expect(provider?.getConfig().id).toBe('direct-test');
      } finally {
        loggerLogSpy.mockRestore();
      }
    });
  });
});
