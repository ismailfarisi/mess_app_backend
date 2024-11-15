import { Test, TestingModule } from '@nestjs/testing';
import { VendorMenuService } from './vendor-menu.service';

describe('VendorMenuService', () => {
  let service: VendorMenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorMenuService],
    }).compile();

    service = module.get<VendorMenuService>(VendorMenuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
