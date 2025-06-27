// Location: server/src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService, Node } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // When a GET request comes to "/nodes", this method will run
  @Get('nodes')
  async getNodes(): Promise<Node[]> {
    return this.appService.getNodes();
  }
}