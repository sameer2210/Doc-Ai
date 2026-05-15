import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService {
  private readonly saltRounds = 12;

  async hashData(data: string): Promise<string> {
    return await bcrypt.hash(data, this.saltRounds);
  }

  async compareData(data: string, encrypted: string): Promise<boolean> {
    return await bcrypt.compare(data, encrypted);
  }
}
