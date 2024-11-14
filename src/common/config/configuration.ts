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
