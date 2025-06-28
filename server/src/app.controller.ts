import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { Node, Edge, Canvas } from './types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('canvases')
  async getCanvases(): Promise<Canvas[]> {
    return this.appService.getCanvases();
  }

  @Post('canvases')
  async createCanvas(@Body() body: { title: string; userId: string }): Promise<Canvas> {
    return this.appService.createCanvas(body.title, body.userId);
  }

  @Get('canvas/:id/nodes')
  async getNodes(@Param('id') canvasId: string): Promise<Node[]> {
    return this.appService.getNodes(canvasId);
  }

  @Get('canvas/:id/edges')
  async getEdges(@Param('id') canvasId: string): Promise<Edge[]> {
    return this.appService.getEdges(canvasId);
  }
}
