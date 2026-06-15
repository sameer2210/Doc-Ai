import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class MockGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true; // allow all
  }
}
