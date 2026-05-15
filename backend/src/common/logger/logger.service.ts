import { LoggerService, Injectable, LogLevel } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: isProd
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `${timestamp} [${level.toUpperCase()}]: ${message}`;
            }),
          ),
      transports: [new winston.transports.Console()],
    });
  }

  private formatMessage(message: any, optionalParams: any[]) {
    const base =
      typeof message === 'string' ? message : JSON.stringify(message);
    if (optionalParams.length === 0) return base;
    return `${base} ${optionalParams
      .map((p) => (typeof p === 'string' ? p : JSON.stringify(p)))
      .join(' ')}`;
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(this.formatMessage(message, optionalParams));
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error(this.formatMessage(message, optionalParams));
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(this.formatMessage(message, optionalParams));
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(this.formatMessage(message, optionalParams));
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(this.formatMessage(message, optionalParams));
  }

  setLogLevels(levels: LogLevel[]) {
    if (levels && levels.length > 0) {
      const level = levels.includes('debug') ? 'debug' : levels[0];
      this.logger.level = level;
    }
  }
}
