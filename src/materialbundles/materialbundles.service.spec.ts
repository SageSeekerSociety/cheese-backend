import { Test, TestingModule } from '@nestjs/testing';
import { MaterialbundlesService } from './materialbundles.service';

describe('MaterialbundlesService', () => {
  let service: MaterialbundlesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterialbundlesService],
    }).compile();

    service = module.get<MaterialbundlesService>(MaterialbundlesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
