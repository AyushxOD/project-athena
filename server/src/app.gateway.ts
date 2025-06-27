/* File #2: server/src/app.gateway.ts
    We will add a new handler for the 'deleteNode' event.
*/
import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { HttpService } from '@nestjs/axios';
  import { firstValueFrom } from 'rxjs';
  import { AppService } from './app.service';
  import { Node } from './app.service';
  
  @WebSocketGateway({ cors: true })
  export class AppGateway {
    @WebSocketServer()
    server: Server;
  
    constructor(
      private readonly httpService: HttpService,
      private readonly appService: AppService, 
    ) {}
  
    @SubscribeMessage('createNode')
    async handleCreateNode(client: Socket, payload: Node): Promise<void> {
      try {
        const savedNode = await this.appService.createNode(payload);
        client.broadcast.emit('newNodeFromServer', savedNode);
      } catch (error) {
        console.error('Error in handleCreateNode:', error.message);
        client.emit('error', 'Failed to create node.');
      }
    }
  
    // --- NEW HANDLER FOR DELETING NODES ---
    @SubscribeMessage('deleteNode')
    async handleDeleteNode(client: Socket, nodeId: string): Promise<void> {
      try {
        await this.appService.deleteNode(nodeId);
        // Broadcast to all clients that the node was deleted
        this.server.emit('nodeDeleted', nodeId);
      } catch(error) {
        console.error(`Error deleting node ${nodeId}:`, error.message);
        client.emit('error', `Failed to delete node ${nodeId}.`);
      }
    }
  
    @SubscribeMessage('nodeUpdated')
    async handleNodeUpdate(client: Socket, payload: { id: string, position: {x: number, y: number} }): Promise<void> {
      try {
          await this.appService.updateNodePosition(payload.id, payload.position);
          client.broadcast.emit('nodeUpdateFromServer', payload);
      } catch (error) {
          console.error('Error updating node position:', error.message);
      }
    }
  
    @SubscribeMessage('requestAiQuestion')
    async handleRequestAiQuestion(client: Socket, payload: Node): Promise<void> {
      try {
          const claimText = payload?.data?.label;
          if (!claimText) return;
          
          const aiResponse = await firstValueFrom(
              this.httpService.post('http://127.0.0.1:8000/generate-question', { text: claimText })
          );
          
          if (aiResponse.data.error) {
               if (aiResponse.data.error === "RATE_LIMIT") {
                  client.emit('aiError', 'AI rate limit reached. Please try again in a minute.');
              }
              return;
          }
  
          const aiQuestion = aiResponse.data.question;
          if (aiQuestion) {
              const aiNodeData: Node = {
                  id: crypto.randomUUID(), 
                  position: { x: payload.position.x, y: payload.position.y + 250 },
                  data: { label: `AI Question: ${aiQuestion}` },
              };
              
              const savedAiNode = await this.appService.createNode(aiNodeData);
              this.server.emit('aiNodeCreated', { aiNode: savedAiNode, parentId: payload.id });
          }
      } catch (error) {
          console.error('Error in AI question process:', error.message);
          client.emit('aiError', 'Could not process AI question.');
      }
    }
  }