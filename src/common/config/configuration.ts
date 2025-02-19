import { ConfigService } from '@nestjs/config';
import { ElasticsearchModuleOptions } from '@nestjs/elasticsearch';

export default () => {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    elasticsearch: {
      node: process.env.ELASTICSEARCH_NODE,
      maxRetries: parseInt(process.env.ELASTICSEARCH_MAX_RETRIES || '3', 10),
      requestTimeout: parseInt(
        process.env.ELASTICSEARCH_REQUEST_TIMEOUT || '30000',
        10,
      ),
      pingTimeout: parseInt(
        process.env.ELASTICSEARCH_PING_TIMEOUT || '30000',
        10,
      ),
      sniffOnStart: process.env.ELASTICSEARCH_SNIFF_ON_START === 'true',
      auth: {
        username: process.env.ELASTICSEARCH_AUTH_USERNAME,
        password: process.env.ELASTICSEARCH_AUTH_PASSWORD,
      },
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      // expiresIn: process.env.JWT_EXPIRES_IN,
    },
    cookieBasePath: process.env.COOKIE_BASE_PATH || '/',
    frontendBaseUrl: process.env.FRONTEND_BASE_URL || '',
    passwordResetPath:
      process.env.PASSWORD_RESET_PREFIX ||
      '/account/recover/password/verify?token=',
    webauthn: {
      rpName: process.env.WEB_AUTHN_RP_NAME || 'Cheese Community',
      rpID: process.env.WEB_AUTHN_RP_ID || 'localhost',
      origin: process.env.WEB_AUTHN_ORIGIN || 'http://localhost:7777',
    },
    totp: {
      appName: process.env.APP_NAME || 'Cheese Community',
      encryptionKey: process.env.TOTP_ENCRYPTION_KEY || process.env.APP_KEY,
      backupCodesCount: parseInt(
        process.env.TOTP_BACKUP_CODES_COUNT || '10',
        10,
      ),
      window: parseInt(process.env.TOTP_WINDOW || '1', 10), // 验证窗口，默认前后1个时间窗口
    },
  };
};

export function elasticsearchConfigFactory(
  configService: ConfigService,
): ElasticsearchModuleOptions {
  const config = configService.get<ElasticsearchModuleOptions>('elasticsearch');
  if (config == undefined)
    throw new Error('Elasticsearch configuration not found');
  return config;
}
