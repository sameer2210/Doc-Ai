import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from './logger.service';

describe('AppLogger', () => {
  let logger: AppLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppLogger],
    }).compile();

    logger = module.get<AppLogger>(AppLogger);
  });

  it('should log info messages and format optional params', () => {
    const infoSpy = jest.spyOn(logger['logger'], 'info').mockImplementation(() => ({} as any));
    logger.log('Hello', { details: 'test' });
    expect(infoSpy).toHaveBeenCalledWith('Hello {"details":"test"}');
  });

  it('should log error messages', () => {
    const errorSpy = jest.spyOn(logger['logger'], 'error').mockImplementation(() => ({} as any));
    logger.error('Failure', 'stacktrace');
    expect(errorSpy).toHaveBeenCalledWith('Failure stacktrace');
  });

  it('should log warn messages', () => {
    const warnSpy = jest.spyOn(logger['logger'], 'warn').mockImplementation(() => ({} as any));
    logger.warn('Warning');
    expect(warnSpy).toHaveBeenCalledWith('Warning');
  });

  it('should log debug messages', () => {
    const debugSpy = jest.spyOn(logger['logger'], 'debug').mockImplementation(() => ({} as any));
    logger.debug('Debug info');
    expect(debugSpy).toHaveBeenCalledWith('Debug info');
  });

  it('should log verbose messages', () => {
    const verboseSpy = jest.spyOn(logger['logger'], 'verbose').mockImplementation(() => ({} as any));
    logger.verbose('Verbose detail');
    expect(verboseSpy).toHaveBeenCalledWith('Verbose detail');
  });

  it('should support changing log level', () => {
    logger.setLogLevels(['debug']);
    expect(logger['logger'].level).toBe('debug');

    logger.setLogLevels(['error']);
    expect(logger['logger'].level).toBe('error');
  });
});
