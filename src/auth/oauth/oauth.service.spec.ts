/*
 * Description: Unit tests for OAuth Service
 *
 * Author(s):
 *     Claude Assistant
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
  });
});
