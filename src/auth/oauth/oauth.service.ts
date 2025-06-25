/*
 * Description: OAuth Service - 动态加载和管理多个 OAuth 提供商
 *
 * Author(s):
 *      HuanCheng65
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'node:fs';
import path from 'node:path';
import { OAuthError, OAuthProvider, OAuthProviderConfig } from './oauth.types';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly providers = new Map<string, OAuthProvider>();
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const enabledProviders = this.getEnabledProviders();
    if (enabledProviders.length === 0) {
      this.logger.warn('No OAuth providers enabled');
      this.initialized = true;
      return;
    }

    const pluginPaths = this.getPluginPaths();
    const allowNpmLoading = this.getAllowNpmLoading();

    for (const providerId of enabledProviders) {
      try {
        await this.loadProvider(providerId, pluginPaths, allowNpmLoading);
      } catch (error) {
        this.logger.error(
          `Failed to load OAuth provider '${providerId}': ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.initialized = true;
    this.logger.log(
      `OAuth service initialized with ${this.providers.size} providers: ${Array.from(
        this.providers.keys(),
      ).join(', ')}`,
    );
  }

  private getEnabledProviders(): string[] {
    const enabled = this.configService.get<string>('OAUTH_ENABLED_PROVIDERS');
    if (!enabled) {
      return [];
    }
    return enabled
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .filter((id) => this.isValidProviderId(id));
  }

  private getPluginPaths(): string[] {
    const paths = this.configService.get<string>('OAUTH_PLUGIN_PATHS');
    if (!paths) {
      return ['plugins/oauth'];
    }
    return paths.split(',').map((p) => p.trim());
  }

  private getAllowNpmLoading(): boolean {
    return this.configService.get<boolean>('OAUTH_ALLOW_NPM_LOADING') === true;
  }

  private isValidProviderId(id: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }

  private async loadProvider(
    providerId: string,
    pluginPaths: string[],
    allowNpmLoading: boolean,
  ): Promise<void> {
    // 检查是否有必要的配置
    const config = this.getProviderConfig(providerId);
    if (!config) {
      this.logger.warn(
        `Missing configuration for OAuth provider '${providerId}', skipping`,
      );
      return;
    }

    // 尝试从插件路径加载
    let provider: OAuthProvider | null = null;
    for (const pluginPath of pluginPaths) {
      provider = await this.tryLoadFromPath(providerId, pluginPath, config);
      if (provider) {
        break;
      }
    }

    // 如果本地未找到且允许 npm 加载，尝试从 npm 包加载
    if (!provider && allowNpmLoading) {
      provider = await this.tryLoadFromNpm(providerId, config);
    }

    if (provider) {
      this.registerProvider(providerId, provider);
    } else {
      this.logger.warn(
        `Could not find implementation for OAuth provider '${providerId}'`,
      );
    }
  }

  private getProviderConfig(providerId: string): OAuthProviderConfig | null {
    const upperCaseId = providerId.toUpperCase();
    const clientId = this.configService.get<string>(
      `OAUTH_${upperCaseId}_CLIENT_ID`,
    );
    const clientSecret = this.configService.get<string>(
      `OAUTH_${upperCaseId}_CLIENT_SECRET`,
    );
    const redirectUrl = this.configService.get<string>(
      `OAUTH_${upperCaseId}_REDIRECT_URL`,
    );

    if (!clientId || !clientSecret || !redirectUrl) {
      return null;
    }

    return {
      id: providerId,
      name: providerId, // 可以通过配置覆盖显示名称
      clientId,
      clientSecret,
      authorizationUrl: '', // 由具体实现提供
      tokenUrl: '', // 由具体实现提供
      redirectUrl,
      scope: [], // 由具体实现提供
    };
  }

  private async tryLoadFromPath(
    providerId: string,
    pluginPath: string,
    config: OAuthProviderConfig,
  ): Promise<OAuthProvider | null> {
    const possiblePaths = [
      path.join(pluginPath, `${providerId}/index.js`),
      path.join(pluginPath, `${providerId}.js`),
      path.join(pluginPath, `${providerId}/index.ts`),
      path.join(pluginPath, `${providerId}.ts`),
    ];

    for (const modulePath of possiblePaths) {
      try {
        const resolvedPath = path.resolve(modulePath);

        // 安全检查：确保路径在预期的基准目录下
        const basePath = path.resolve(pluginPath);
        if (!resolvedPath.startsWith(basePath)) {
          this.logger.warn(
            `Potential path traversal detected for provider '${providerId}': ${resolvedPath}`,
          );
          continue;
        }

        if (fs.existsSync(resolvedPath)) {
          const module = await import(resolvedPath);
          const createProvider =
            module.createProvider || module.default || module;

          if (typeof createProvider === 'function') {
            return createProvider(config);
          } else {
            this.logger.warn(
              `Invalid provider module for '${providerId}': expected function`,
            );
          }
        }
      } catch (error) {
        this.logger.debug(
          `Failed to load provider '${providerId}' from ${modulePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return null;
  }

  private async tryLoadFromNpm(
    providerId: string,
    config: OAuthProviderConfig,
  ): Promise<OAuthProvider | null> {
    const packageName = `@sageseekersociety/cheese-auth-${providerId}-oauth-provider`;

    try {
      const module = await import(packageName);
      const createProvider = module.createProvider || module.default || module;

      if (typeof createProvider === 'function') {
        return createProvider(config);
      } else {
        this.logger.warn(
          `Invalid npm provider package for '${providerId}': expected function`,
        );
      }
    } catch (error) {
      this.logger.debug(
        `Failed to load provider '${providerId}' from npm package '${packageName}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return null;
  }

  private registerProvider(providerId: string, provider: OAuthProvider): void {
    this.providers.set(providerId, provider);
    this.logger.log(`Registered OAuth provider: ${providerId}`);
  }

  async getProvider(providerId: string): Promise<OAuthProvider | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.providers.get(providerId);
  }

  async getAllProviders(): Promise<OAuthProvider[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return Array.from(this.providers.values());
  }

  async getProvidersConfig(): Promise<
    Array<{ id: string; name: string; scope: string[] }>
  > {
    if (!this.initialized) {
      await this.initialize();
    }

    return Array.from(this.providers.entries()).map(([id, provider]) => {
      const config = provider.getConfig();
      return {
        id: config.id,
        name: config.name,
        scope: config.scope,
      };
    });
  }

  async generateAuthorizationUrl(
    providerId: string,
    state?: string,
    accessType?: string,
  ): Promise<string> {
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new OAuthError(
        `OAuth provider '${providerId}' not found`,
        providerId,
        'validation',
      );
    }

    try {
      return provider.getAuthorizationUrl(state, accessType);
    } catch (error) {
      throw new OAuthError(
        `Failed to generate authorization URL for provider '${providerId}': ${error instanceof Error ? error.message : String(error)}`,
        providerId,
        'authorization',
        error,
      );
    }
  }

  async handleCallback(
    providerId: string,
    code: string,
    state?: string,
  ): Promise<string> {
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new OAuthError(
        `OAuth provider '${providerId}' not found`,
        providerId,
        'validation',
      );
    }

    try {
      return await provider.handleCallback(code, state);
    } catch (error) {
      throw new OAuthError(
        `Failed to handle callback for provider '${providerId}': ${error instanceof Error ? error.message : String(error)}`,
        providerId,
        'token_exchange',
        error,
      );
    }
  }

  async getUserInfo(providerId: string, accessToken: string) {
    const provider = await this.getProvider(providerId);
    if (!provider) {
      throw new OAuthError(
        `OAuth provider '${providerId}' not found`,
        providerId,
        'validation',
      );
    }

    try {
      return await provider.getUserInfo(accessToken);
    } catch (error) {
      throw new OAuthError(
        `Failed to get user info from provider '${providerId}': ${error instanceof Error ? error.message : String(error)}`,
        providerId,
        'user_info',
        error,
      );
    }
  }
}
