import { UserWithRole } from '../../common/decorators/get-user.decorator';

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserWithRole;
  }
}
