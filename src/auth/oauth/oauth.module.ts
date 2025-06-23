/*
 * Description: OAuth Module - 提供 OAuth 功能的 NestJS 模块
 *
 * Author(s):
 *     Claude Assistant
 */

import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { OAuthProvider } from './oauth.types';

@Module({})
export class OAuthModule implements OnModuleInit {
  constructor(private readonly oauthService: OAuthService) {}

  async onModuleInit() {
    await this.oauthService.initialize();
  }

  static register(providers: OAuthProvider[] = []): DynamicModule {
    return {
      module: OAuthModule,
      imports: [ConfigModule],
      providers: [
        OAuthService,
        ...providers.map((provider, index) => ({
          provide: `OAUTH_PROVIDER_${index}`,
          useValue: provider,
        })),
      ],
      exports: [OAuthService],
    };
  }
}
