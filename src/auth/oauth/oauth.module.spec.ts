/*
 * Description: Unit tests for OAuth Module
 *
 * Author(s):
 *      HuanCheng65
 */

import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthModule } from './oauth.module';
import { OAuthService } from './oauth.service';

describe('OAuthModule', () => {
  let module: TestingModule;
  let oauthService: OAuthService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(''),
          },
        },
      ],
    }).compile();

    oauthService = module.get<OAuthService>(OAuthService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('module initialization', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide OAuthService', () => {
      expect(oauthService).toBeDefined();
      expect(oauthService).toBeInstanceOf(OAuthService);
    });

    it('should call initialize on module init', async () => {
      const initializeSpy = jest
        .spyOn(oauthService, 'initialize')
        .mockResolvedValue();

      // Test onModuleInit directly
      const moduleInstance = new OAuthModule(oauthService);
      await moduleInstance.onModuleInit();

      expect(initializeSpy).toHaveBeenCalled();

      initializeSpy.mockRestore();
    });
  });

  describe('dynamic module registration', () => {
    it('should register module with OAuth providers', async () => {
      // Create mock OAuth providers
      const mockProvider1 = {
        getConfig: jest.fn().mockReturnValue({
          id: 'mock1',
          name: 'Mock Provider 1',
          clientId: 'client1',
          clientSecret: 'secret1',
          redirectUrl: 'http://localhost:3000/callback/mock1',
          authorizationUrl: 'https://mock1.com/oauth/authorize',
          tokenUrl: 'https://mock1.com/oauth/token',
          scope: ['read:user'],
        }),
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn(),
        getUserInfo: jest.fn(),
      };

      const mockProvider2 = {
        getConfig: jest.fn().mockReturnValue({
          id: 'mock2',
          name: 'Mock Provider 2',
          clientId: 'client2',
          clientSecret: 'secret2',
          redirectUrl: 'http://localhost:3000/callback/mock2',
          authorizationUrl: 'https://mock2.com/oauth/authorize',
          tokenUrl: 'https://mock2.com/oauth/token',
          scope: ['read:profile'],
        }),
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn(),
        getUserInfo: jest.fn(),
      };

      const customProviders = [mockProvider1, mockProvider2];
      const dynamicModule = OAuthModule.register(customProviders);

      expect(dynamicModule.module).toBe(OAuthModule);
      expect(dynamicModule.providers).toEqual(
        expect.arrayContaining([
          OAuthService,
          {
            provide: 'OAUTH_PROVIDER_0',
            useValue: mockProvider1,
          },
          {
            provide: 'OAUTH_PROVIDER_1',
            useValue: mockProvider2,
          },
        ]),
      );
      expect(dynamicModule.exports).toEqual([OAuthService]);
      expect(dynamicModule.imports).toEqual([ConfigModule]);
    });

    it('should register module without custom providers', () => {
      const dynamicModule = OAuthModule.register();

      expect(dynamicModule.module).toBe(OAuthModule);
      expect(dynamicModule.providers).toEqual([OAuthService]);
      expect(dynamicModule.exports).toEqual([OAuthService]);
      expect(dynamicModule.imports).toEqual([ConfigModule]);
    });

    it('should register module with empty providers array', () => {
      const dynamicModule = OAuthModule.register([]);

      expect(dynamicModule.module).toBe(OAuthModule);
      expect(dynamicModule.providers).toEqual([OAuthService]);
      expect(dynamicModule.exports).toEqual([OAuthService]);
      expect(dynamicModule.imports).toEqual([ConfigModule]);
    });
  });

  describe('service integration', () => {
    it('should initialize service when module starts', async () => {
      const initializeSpy = jest.spyOn(oauthService, 'initialize');

      // Mock the initialize method to avoid actual initialization
      initializeSpy.mockResolvedValue();

      // Test that calling onModuleInit triggers initialize
      const moduleInstance = new OAuthModule(oauthService);
      await moduleInstance.onModuleInit();

      expect(initializeSpy).toHaveBeenCalled();

      initializeSpy.mockRestore();
    });

    it('should handle initialization errors gracefully', async () => {
      const initializeSpy = jest.spyOn(oauthService, 'initialize');

      // Mock initialize to throw an error
      initializeSpy.mockRejectedValue(new Error('Initialization failed'));

      const moduleInstance = new OAuthModule(oauthService);

      // This should propagate the error
      await expect(moduleInstance.onModuleInit()).rejects.toThrow(
        'Initialization failed',
      );

      initializeSpy.mockRestore();
    });
  });

  describe('module configuration', () => {
    it('should have OAuthModule class defined', () => {
      // Test that the module class is properly defined
      expect(OAuthModule).toBeDefined();
      expect(typeof OAuthModule).toBe('function');
      expect(OAuthModule.name).toBe('OAuthModule');
    });

    it('should register dynamic module correctly', () => {
      const dynamicModule = OAuthModule.register();

      expect(dynamicModule.module).toBe(OAuthModule);
      expect(dynamicModule.providers).toContain(OAuthService);
      expect(dynamicModule.exports).toContain(OAuthService);
      expect(dynamicModule.imports).toContain(ConfigModule);
    });

    it('should be able to get OAuthService from module', () => {
      expect(oauthService).toBeDefined();
      expect(oauthService).toBeInstanceOf(OAuthService);
    });
  });
});
