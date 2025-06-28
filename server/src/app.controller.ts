// server/src/app.controller.ts

import { Controller, Get } from '@nestjs/common';
import { AppService, Node, Edge } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('nodes')
  getNodes(): Promise<Node[]> {
    return this.appService.getNodes();
  }

  @Get('edges')
  getEdges(): Promise<Edge[]> {
    return this.appService.getEdges();
  }
}
