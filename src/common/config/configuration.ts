import { ConfigService } from '@nestjs/config';
import { ElasticsearchModuleOptions } from '@nestjs/elasticsearch';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { isMySQL } from '../helper/db.helper';

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    type: process.env.TYPEORM_DB_TYPE,
    host: process.env.TYPEORM_DB_HOST,
    port: parseInt(process.env.TYPEORM_DB_PORT || '3306', 10),
    username: process.env.TYPEORM_DB_USERNAME,
    password: process.env.TYPEORM_DB_PASSWORD,
    database: process.env.TYPEORM_DB_NAME,
    synchronize: process.env.TYPEORM_DB_SYNCHRONIZE === 'true',
    logging: process.env.TYPEORM_DB_LOGGING === 'true',
    autoLoadEntities: process.env.TYPEORM_DB_AUTO_LOAD_ENTITIES === 'true',
    ...(isMySQL()
      ? {
          connectTimeout: parseInt(
            process.env.TYPEORM_DB_CONNECT_TIMEOUT || '60000',
            10,
          ),
        }
      : {
          ConnectTimeoutMS: parseInt(
            process.env.TYPEORM_DB_CONNECT_TIMEOUT || '60000',
            10,
          ),
        }),
  },
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
});

export function databaseConfigFactory(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const config = configService.get<TypeOrmModuleOptions>('database');
  if (config == undefined) throw new Error('Database configuration not found');
  return config;
}

export function elasticsearchConfigFactory(
  configService: ConfigService,
): ElasticsearchModuleOptions {
  const config = configService.get<ElasticsearchModuleOptions>('elasticsearch');
  if (config == undefined)
    throw new Error('Elasticsearch configuration not found');
  return config;
}
