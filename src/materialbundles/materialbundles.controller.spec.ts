import { Test, TestingModule } from '@nestjs/testing';
import { MaterialbundlesController } from './materialbundles.controller';
import { MaterialbundlesService } from './materialbundles.service';

describe('MaterialbundlesController', () => {
  let controller: MaterialbundlesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialbundlesController],
      providers: [MaterialbundlesService],
    }).compile();

    controller = module.get<MaterialbundlesController>(
      MaterialbundlesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
