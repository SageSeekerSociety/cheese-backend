/*
 *  Description: Unit tests for cookie helper utilities.
 *
 *  Author(s):
 *      HuanCheng65
 *
 */

import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CookieHelper } from './cookie.helper';

// Mock Express Response
const mockResponse = () => {
  const res = {} as Response;
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Mock ConfigService
const mockConfigService = (cookieBasePath?: string) => {
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  (configService.get as jest.Mock).mockImplementation((key: string) => {
    if (key === 'cookieBasePath') {
      return cookieBasePath;
    }
    return undefined;
  });

  return configService;
};

describe('CookieHelper', () => {
  let cookieHelper: CookieHelper;
  let configService: ConfigService;
  let response: Response;

  // Store original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    configService = mockConfigService();
    cookieHelper = new CookieHelper(configService);
    response = mockResponse();
  });

  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with ConfigService', () => {
      expect(cookieHelper).toBeDefined();
      expect(cookieHelper['configService']).toBe(configService);
    });
  });

  describe('setRefreshTokenCookie', () => {
    const refreshToken = 'test-refresh-token';
    const expires = new Date('2024-12-31T23:59:59Z');

    it('should set refresh token cookie in development environment', () => {
      process.env.NODE_ENV = 'development';

      cookieHelper.setRefreshTokenCookie(response, refreshToken, expires);

      expect(response.cookie).toHaveBeenCalledWith(
        'REFRESH_TOKEN',
        refreshToken,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: 'users/auth',
          expires,
        },
      );
    });

    it('should set refresh token cookie in production environment', () => {
      process.env.NODE_ENV = 'production';

      cookieHelper.setRefreshTokenCookie(response, refreshToken, expires);

      expect(response.cookie).toHaveBeenCalledWith(
        'REFRESH_TOKEN',
        refreshToken,
        {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: 'users/auth',
          expires,
        },
      );
    });

    it('should use cookieBasePath when configured', () => {
      const basePath = '/api/v1';
      configService = mockConfigService(basePath);
      cookieHelper = new CookieHelper(configService);

      cookieHelper.setRefreshTokenCookie(response, refreshToken, expires);

      expect(response.cookie).toHaveBeenCalledWith(
        'REFRESH_TOKEN',
        refreshToken,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/api/v1/users/auth',
          expires,
        },
      );
    });

    it('should handle empty cookieBasePath', () => {
      configService = mockConfigService('');
      cookieHelper = new CookieHelper(configService);

      cookieHelper.setRefreshTokenCookie(response, refreshToken, expires);

      expect(response.cookie).toHaveBeenCalledWith(
        'REFRESH_TOKEN',
        refreshToken,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: 'users/auth',
          expires,
        },
      );
    });

    it('should handle undefined cookieBasePath', () => {
      configService = mockConfigService(undefined);
      cookieHelper = new CookieHelper(configService);

      cookieHelper.setRefreshTokenCookie(response, refreshToken, expires);

      expect(response.cookie).toHaveBeenCalledWith(
        'REFRESH_TOKEN',
        refreshToken,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: 'users/auth',
          expires,
        },
      );
    });

    it('should return the response object', () => {
      const result = cookieHelper.setRefreshTokenCookie(
        response,
        refreshToken,
        expires,
      );
      expect(result).toBe(response);
    });

    it('should handle empty refresh token', () => {
      cookieHelper.setRefreshTokenCookie(response, '', expires);

      expect(response.cookie).toHaveBeenCalledWith('REFRESH_TOKEN', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: 'users/auth',
        expires,
      });
    });
  });

  describe('clearRefreshTokenCookie', () => {
    it('should clear refresh token cookie with default path', () => {
      cookieHelper.clearRefreshTokenCookie(response);

      expect(response.clearCookie).toHaveBeenCalledWith('REFRESH_TOKEN', {
        path: 'users/auth',
      });
    });

    it('should clear refresh token cookie with cookieBasePath', () => {
      const basePath = '/api/v1';
      configService = mockConfigService(basePath);
      cookieHelper = new CookieHelper(configService);

      cookieHelper.clearRefreshTokenCookie(response);

      expect(response.clearCookie).toHaveBeenCalledWith('REFRESH_TOKEN', {
        path: '/api/v1/users/auth',
      });
    });

    it('should handle empty cookieBasePath', () => {
      configService = mockConfigService('');
      cookieHelper = new CookieHelper(configService);

      cookieHelper.clearRefreshTokenCookie(response);

      expect(response.clearCookie).toHaveBeenCalledWith('REFRESH_TOKEN', {
        path: 'users/auth',
      });
    });

    it('should return the response object', () => {
      const result = cookieHelper.clearRefreshTokenCookie(response);
      expect(result).toBe(response);
    });
  });

  describe('getRefreshToken (static method)', () => {
    it('should return refresh token from cookies', () => {
      const mockRequest = {
        cookies: {
          REFRESH_TOKEN: 'test-token',
        },
      };

      const result = CookieHelper.getRefreshToken(mockRequest);
      expect(result).toBe('test-token');
    });

    it('should return undefined when no cookies', () => {
      const mockRequest = {};

      const result = CookieHelper.getRefreshToken(mockRequest);
      expect(result).toBeUndefined();
    });

    it('should return undefined when cookies object is null', () => {
      const mockRequest = {
        cookies: null,
      };

      const result = CookieHelper.getRefreshToken(mockRequest);
      expect(result).toBeUndefined();
    });

    it('should return undefined when REFRESH_TOKEN is not present', () => {
      const mockRequest = {
        cookies: {
          OTHER_COOKIE: 'value',
        },
      };

      const result = CookieHelper.getRefreshToken(mockRequest);
      expect(result).toBeUndefined();
    });

    it('should return empty string when REFRESH_TOKEN is empty', () => {
      const mockRequest = {
        cookies: {
          REFRESH_TOKEN: '',
        },
      };

      const result = CookieHelper.getRefreshToken(mockRequest);
      expect(result).toBe('');
    });

    it('should handle request with undefined cookies property', () => {
      const mockRequest = {
        cookies: undefined,
      };

      const result = CookieHelper.getRefreshToken(mockRequest);
      expect(result).toBeUndefined();
    });
  });

  describe('setOAuthRedirectCookie', () => {
    const redirectUrl = 'https://example.com/callback';

    it('should set OAuth redirect cookie in development environment', () => {
      process.env.NODE_ENV = 'development';

      cookieHelper.setOAuthRedirectCookie(response, redirectUrl);

      expect(response.cookie).toHaveBeenCalledWith(
        'OAUTH_REDIRECT',
        redirectUrl,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: 'auth/oauth',
          expires: expect.any(Date),
        },
      );
    });

    it('should set OAuth redirect cookie in production environment', () => {
      process.env.NODE_ENV = 'production';

      cookieHelper.setOAuthRedirectCookie(response, redirectUrl);

      expect(response.cookie).toHaveBeenCalledWith(
        'OAUTH_REDIRECT',
        redirectUrl,
        {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: 'auth/oauth',
          expires: expect.any(Date),
        },
      );
    });

    it('should set OAuth redirect cookie with custom expires', () => {
      const customExpires = new Date('2024-12-31T23:59:59Z');

      cookieHelper.setOAuthRedirectCookie(response, redirectUrl, customExpires);

      expect(response.cookie).toHaveBeenCalledWith(
        'OAUTH_REDIRECT',
        redirectUrl,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: 'auth/oauth',
          expires: customExpires,
        },
      );
    });

    it('should use cookieBasePath when configured', () => {
      const basePath = '/api/v1';
      configService = mockConfigService(basePath);
      cookieHelper = new CookieHelper(configService);

      cookieHelper.setOAuthRedirectCookie(response, redirectUrl);

      expect(response.cookie).toHaveBeenCalledWith(
        'OAUTH_REDIRECT',
        redirectUrl,
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/api/v1/auth/oauth',
          expires: expect.any(Date),
        },
      );
    });

    it('should set default expires to 10 minutes from now', () => {
      const beforeCall = Date.now();

      cookieHelper.setOAuthRedirectCookie(response, redirectUrl);

      const afterCall = Date.now();
      const cookieCall = (response.cookie as jest.Mock).mock.calls[0];
      const expiresDate = cookieCall[2].expires;

      // Check that expires is approximately 10 minutes (600,000ms) from now
      const expectedMin = beforeCall + 10 * 60 * 1000;
      const expectedMax = afterCall + 10 * 60 * 1000;

      expect(expiresDate.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresDate.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('should return the response object', () => {
      const result = cookieHelper.setOAuthRedirectCookie(response, redirectUrl);
      expect(result).toBe(response);
    });

    it('should handle empty redirect URL', () => {
      cookieHelper.setOAuthRedirectCookie(response, '');

      expect(response.cookie).toHaveBeenCalledWith('OAUTH_REDIRECT', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: 'auth/oauth',
        expires: expect.any(Date),
      });
    });
  });

  describe('clearOAuthRedirectCookie', () => {
    it('should clear OAuth redirect cookie with default path', () => {
      cookieHelper.clearOAuthRedirectCookie(response);

      expect(response.clearCookie).toHaveBeenCalledWith('OAUTH_REDIRECT', {
        path: 'auth/oauth',
      });
    });

    it('should clear OAuth redirect cookie with cookieBasePath', () => {
      const basePath = '/api/v1';
      configService = mockConfigService(basePath);
      cookieHelper = new CookieHelper(configService);

      cookieHelper.clearOAuthRedirectCookie(response);

      expect(response.clearCookie).toHaveBeenCalledWith('OAUTH_REDIRECT', {
        path: '/api/v1/auth/oauth',
      });
    });

    it('should handle empty cookieBasePath', () => {
      configService = mockConfigService('');
      cookieHelper = new CookieHelper(configService);

      cookieHelper.clearOAuthRedirectCookie(response);

      expect(response.clearCookie).toHaveBeenCalledWith('OAUTH_REDIRECT', {
        path: 'auth/oauth',
      });
    });

    it('should return the response object', () => {
      const result = cookieHelper.clearOAuthRedirectCookie(response);
      expect(result).toBe(response);
    });
  });

  describe('Environment-specific behavior', () => {
    it('should handle undefined NODE_ENV as development', () => {
      delete process.env.NODE_ENV;

      cookieHelper.setRefreshTokenCookie(response, 'token', new Date());

      expect(response.cookie).toHaveBeenCalledWith('REFRESH_TOKEN', 'token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: 'users/auth',
        expires: expect.any(Date),
      });
    });

    it('should handle empty NODE_ENV as development', () => {
      process.env.NODE_ENV = '';

      cookieHelper.setRefreshTokenCookie(response, 'token', new Date());

      expect(response.cookie).toHaveBeenCalledWith('REFRESH_TOKEN', 'token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: 'users/auth',
        expires: expect.any(Date),
      });
    });

    it('should handle test environment as development', () => {
      process.env.NODE_ENV = 'test';

      cookieHelper.setRefreshTokenCookie(response, 'token', new Date());

      expect(response.cookie).toHaveBeenCalledWith('REFRESH_TOKEN', 'token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: 'users/auth',
        expires: expect.any(Date),
      });
    });
  });

  describe('Path handling edge cases', () => {
    it('should handle cookieBasePath with leading slash', () => {
      configService = mockConfigService('/api');
      cookieHelper = new CookieHelper(configService);

      cookieHelper.setRefreshTokenCookie(response, 'token', new Date());

      expect(response.cookie).toHaveBeenCalledWith('REFRESH_TOKEN', 'token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/users/auth',
        expires: expect.any(Date),
      });
    });

    it('should handle cookieBasePath with trailing slash', () => {
      configService = mockConfigService('api/');
      cookieHelper = new CookieHelper(configService);

      cookieHelper.setRefreshTokenCookie(response, 'token', new Date());

      expect(response.cookie).toHaveBeenCalledWith('REFRESH_TOKEN', 'token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: 'api/users/auth',
        expires: expect.any(Date),
      });
    });

    it('should handle cookieBasePath with both leading and trailing slashes', () => {
      configService = mockConfigService('/api/');
      cookieHelper = new CookieHelper(configService);

      cookieHelper.setRefreshTokenCookie(response, 'token', new Date());

      expect(response.cookie).toHaveBeenCalledWith('REFRESH_TOKEN', 'token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/users/auth',
        expires: expect.any(Date),
      });
    });
  });
});
