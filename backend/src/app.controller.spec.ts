import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Welcome to spandavidya!"', () => {
      expect(appController.getRoot()).toBe('Welcome to spandavidya!');
    });
  });

  describe('favicon', () => {
    it('should return an empty string', () => {
      expect(appController.handleFavicon()).toBe('');
    });
  });
});
