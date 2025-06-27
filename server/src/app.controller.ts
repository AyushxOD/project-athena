/* ======================================================================
    File #2: server/src/app.controller.ts
    This file is updated to include the missing /edges endpoint.
   ====================================================================== */
   import { Controller, Get } from '@nestjs/common';
   import { AppService, Node, Edge } from './app.service';
   
   @Controller()
   export class AppController {
     constructor(private readonly appService: AppService) {}
   
     @Get('nodes')
     async getNodes(): Promise<Node[]> {
       return this.appService.getNodes();
     }
     
     // --- THIS FIXES THE 404 ERROR ---
     @Get('edges')
     async getEdges(): Promise<Edge[]> {
       return this.appService.getEdges();
     }
   }