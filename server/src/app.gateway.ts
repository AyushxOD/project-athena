// Location: server/src/app.gateway.ts

import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Node, Edge } from './types';
import { AppService } from './app.service'; 

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly httpService: HttpService,
    private readonly appService: AppService,
  ) {}

  // --- NEW: Handle client connections and disconnections ---
  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client Disconnected: ${client.id}`);
  }

  // --- NEW: Handlers for joining and leaving canvas rooms ---
  @SubscribeMessage('joinCanvas')
  handleJoinCanvas(
    @ConnectedSocket() client: Socket,
    @MessageBody() canvasId: string,
  ): void {
    if (canvasId) {
      client.join(canvasId);
      console.log(`Client ${client.id} joined room: ${canvasId}`);
    }
  }

  @SubscribeMessage('leaveCanvas')
  handleLeaveCanvas(
    @ConnectedSocket() client: Socket,
    @MessageBody() canvasId: string,
  ): void {
    if (canvasId) {
      client.leave(canvasId);
      console.log(`Client ${client.id} left room: ${canvasId}`);
    }
  }

  // --- All handlers below are MODIFIED to be "room-aware" ---

  @SubscribeMessage('createNode')
  async handleCreateNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { node: Node; canvasId: string },
  ): Promise<void> {
    try {
      const { node, canvasId } = payload;
      const savedNode = await this.appService.createNode(node, canvasId);
      // Broadcast to other clients in the same room
      client.to(canvasId).emit('newNodeFromServer', savedNode);
    } catch (err) {
      console.error('Error creating node:', err.message);
    }
  }

  @SubscribeMessage('nodeUpdated')
  async handleNodeUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { id: string; position: { x: number; y: number }; canvasId: string },
  ): Promise<void> {
    try {
      const { id, position, canvasId } = payload;
      await this.appService.updateNodePosition(id, position);
      // Broadcast to others in the same room
      client.to(canvasId).emit('nodeUpdateFromServer', { id, position });
    } catch (err) {
      console.error('Error updating node:', err.message);
    }
  }

  @SubscribeMessage('deleteNode')
  async handleDeleteNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { nodeId: string; canvasId: string },
  ): Promise<void> {
    try {
      const { nodeId, canvasId } = payload;
      await this.appService.deleteNode(nodeId);
      // Broadcast to everyone in the room (including sender, to confirm deletion)
      this.server.to(canvasId).emit('nodeDeleted', nodeId);
    } catch (err) {
      console.error('Error deleting node:', err.message);
    }
  }

  @SubscribeMessage('requestAiQuestion')
  async handleRequestAiQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { node: Node; canvasId: string },
  ): Promise<void> {
    try {
      const { node, canvasId } = payload;
      const claimText = node.data.label;
      if (!claimText) return;

     // And change it to this:
const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const aiResp = await firstValueFrom(
    this.httpService.post(`${aiServiceUrl}/generate-question`,
          { timeout: 15000 },
        ),
      );
      const aiQuestion = aiResp.data?.question;
      if (!aiQuestion) {
        client.emit('aiError', 'AI returned no question.');
        return;
      }

      const aiNodeData: Node = {
        id: crypto.randomUUID(),
        position: { x: node.position.x, y: node.position.y + 250 },
        data: { label: `AI Question: ${aiQuestion}`, type: 'ai_question' },
      };
      const savedAiNode = await this.appService.createNode(aiNodeData, canvasId);

      const savedEdge = await this.appService.createEdge(
        {
          id: `edge-${node.id}-${savedAiNode.id}`,
          source: node.id,
          target: savedAiNode.id,
          animated: true,
        },
        canvasId,
      );

      this.server.to(canvasId).emit('aiNodeCreated', {
        aiNode: savedAiNode,
        edge: savedEdge,
      });
    } catch (err) {
      console.error('Error in AI question handler:', err);
      client.emit('aiError', 'Failed to generate AI question.');
    }
  }

  @SubscribeMessage('requestEvidence')
  async handleRequestEvidence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { node: Node; canvasId: string },
  ): Promise<void> {
    try {
      const { node, canvasId } = payload;
      const claimText = node.data.label;
      if (!claimText) return;
      // And change it to this:
const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const aiResp = await firstValueFrom(
    this.httpService.post(`${aiServiceUrl}/generate-question`,
          { text: claimText },
          { timeout: 30000 },
        ),
      );
      const evidenceList = aiResp.data?.evidence;
      if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
        client.emit('aiError', 'No evidence found.');
        return;
      }

      const createdNodes: Node[] = [];
      const createdEdges: Edge[] = [];

      for (const item of evidenceList) {
        const n: Node = {
          id: crypto.randomUUID(),
          position: { x: node.position.x, y: node.position.y + 250 },
          data: { label: item.summary, url: item.url, type: 'evidence' },
        };
        const savedNode = await this.appService.createNode(n, canvasId);
        createdNodes.push(savedNode);

        const savedEdge = await this.appService.createEdge(
          {
            id: `edge-${node.id}-${savedNode.id}`,
            source: node.id,
            target: savedNode.id,
            animated: true,
          },
          canvasId,
        );
        createdEdges.push(savedEdge);
      }

      this.server.to(canvasId).emit('evidenceNodesCreated', {
        evidenceNodes: createdNodes,
        edges: createdEdges,
      });
    } catch (err) {
      console.error('Error in evidence handler:', err.message);
      client.emit('aiError', 'The AI evidence engine failed or timed out.');
    }
  }

  @SubscribeMessage('requestSummary')
  async handleRequestSummary(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      nodes: { id: string; label: string }[];
      edges: { source: string; target: string }[];
    },
  ): Promise<void> {
    try {
      const transcript = payload.nodes
        .map((n) => `[${n.id}]: ${n.label}`)
        .join('\n');
      const aiResp = await firstValueFrom(
        this.httpService.post(
          'http://127.0.0.1:8000/summarize',
          { text: transcript },
          { timeout: 15000 },
        ),
      );
      const summary = aiResp.data?.summary;
      if (!summary) {
        client.emit('aiError', 'AI returned empty summary.');
        return;
      }
      client.emit('aiSummaryCreated', summary);
    } catch (err) {
      console.error('Error in summarize handler:', err);
      client.emit('aiError', 'Summarization failed.');
    }
  }
}