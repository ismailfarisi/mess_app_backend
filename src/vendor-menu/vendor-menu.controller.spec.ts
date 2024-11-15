import { Test, TestingModule } from '@nestjs/testing';
import { VendorMenuController } from './vendor-menu.controller';
import { VendorMenuService } from './vendor-menu.service';

describe('VendorMenuController', () => {
  let controller: VendorMenuController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorMenuController],
      providers: [VendorMenuService],
    }).compile();

    controller = module.get<VendorMenuController>(VendorMenuController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
