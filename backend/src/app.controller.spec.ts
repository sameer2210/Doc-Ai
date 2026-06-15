import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
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
