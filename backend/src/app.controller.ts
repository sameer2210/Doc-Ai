import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '@common/decorators/public.decorator';
import { ApiAcceptedResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getRoot(): string {
    return this.appService.getHello();
  }

  @Get('favicon.ico')
  handleFavicon() {
    return '';
  }
}
