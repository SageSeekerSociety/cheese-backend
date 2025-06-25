/*
 * Description: OAuth 类型定义和接口
 *
 * Author(s):
 *      HuanCheng65
 */

export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  preferredUsername?: string;
}

export interface OAuthProviderConfig {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUrl: string;
  scope: string[];
}

export interface OAuthProvider {
  getConfig(): OAuthProviderConfig;
  getAuthorizationUrl(state?: string, accessType?: string): string;
  handleCallback(code: string, state?: string): Promise<string>;
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

export abstract class BaseOAuthProvider implements OAuthProvider {
  protected config: OAuthProviderConfig;

  constructor(config: OAuthProviderConfig) {
    this.config = config;
  }

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

    if (state) {
      params.append('state', state);
    }

    if (accessType) {
      params.append('access_type', accessType);
    }

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  abstract handleCallback(code: string, state?: string): Promise<string>;
  abstract getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

export class OAuthError extends Error {
  constructor(
    message: string,
    public provider: string,
    public type:
      | 'authorization'
      | 'token_exchange'
      | 'user_info'
      | 'validation',
    public originalError?: any,
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}
