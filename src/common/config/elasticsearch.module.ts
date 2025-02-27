import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { elasticsearchConfigFactory } from './configuration';

export const ConfiguredElasticsearchModule = ElasticsearchModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: elasticsearchConfigFactory,
});
