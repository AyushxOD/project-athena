// server/src/app.gateway.ts

import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppService, Node, Edge } from './app.service';

@WebSocketGateway({ cors: true })
export class AppGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly httpService: HttpService,
    private readonly appService: AppService,
  ) {}

  // ————— Create a brand–new node —————
  @SubscribeMessage('createNode')
  async handleCreateNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Node
  ): Promise<void> {
    const savedNode = await this.appService.createNode(payload);
    // emit to everyone (including creator)
    this.server.emit('newNodeFromServer', savedNode);
  }

  // ————— Persist position updates —————
  @SubscribeMessage('nodeUpdated')
  async handleNodeUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string; position: { x: number; y: number } }
  ): Promise<void> {
    await this.appService.updateNodePosition(payload.id, payload.position);
    // broadcast to others
    client.broadcast.emit('nodeUpdateFromServer', payload);
  }

  // ————— Delete a node (and its edges via FK cascade) —————
  @SubscribeMessage('deleteNode')
  async handleDeleteNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() nodeId: string
  ): Promise<void> {
    await this.appService.deleteNode(nodeId);
    this.server.emit('nodeDeleted', nodeId);
  }

  // ————— AI: generate a probing question —————
  @SubscribeMessage('requestAiQuestion')
  async handleRequestAiQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Node
  ): Promise<void> {
    try {
      const claimText = payload.data.label;
      if (!claimText) return;

      const aiResp = await firstValueFrom(
        this.httpService.post(
          'http://127.0.0.1:8000/generate-question',
          { text: claimText },
          { timeout: 15000 }
        )
      );
      const aiQuestion = aiResp.data?.question;
      if (!aiQuestion) {
        client.emit('aiError', 'AI returned no question.');
        return;
      }

      // 1) Persist new AI-question node
      const aiNodeData: Node = {
        id: crypto.randomUUID(),
        position: { x: payload.position.x, y: payload.position.y + 250 },
        data: { label: `AI Question: ${aiQuestion}`, type: 'ai_question' },
      };
      const savedAiNode = await this.appService.createNode(aiNodeData);

      // 2) Persist linking edge
      const edgeId = `edge-${payload.id}-${savedAiNode.id}`;
      const savedEdge = await this.appService.createEdge({
        id: edgeId,
        source: payload.id,
        target: savedAiNode.id,
        animated: true,
      });

      // 3) Emit both node + edge
      this.server.emit('aiNodeCreated', {
        aiNode: savedAiNode,
        edge: savedEdge,
      });
    } catch (err) {
      console.error('Error in AI question handler:', err);
      client.emit('aiError', 'Failed to generate AI question.');
    }
  }

  // ————— AI: fetch and create evidence nodes —————
  @SubscribeMessage('requestEvidence')
  async handleRequestEvidence(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Node
  ): Promise<void> {
    try {
      const claimText = payload.data.label;
      if (!claimText) return;

      const aiResp = await firstValueFrom(
        this.httpService.post(
          'http://127.0.0.1:8000/find-evidence',
          { text: claimText },
          { timeout: 30000 }
        )
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
          position: { x: payload.position.x, y: payload.position.y + 250 },
          data: { label: item.summary, url: item.url, type: 'evidence' },
        };
        const savedNode = await this.appService.createNode(n);
        createdNodes.push(savedNode);

        const edgeId = `edge-${payload.id}-${savedNode.id}`;
        const savedEdge = await this.appService.createEdge({
          id: edgeId,
          source: payload.id,
          target: savedNode.id,
          animated: true,
        });
        createdEdges.push(savedEdge);
      }

      this.server.emit('evidenceNodesCreated', {
        evidenceNodes: createdNodes,
        edges: createdEdges,
      });
    } catch (err) {
      console.error('Error in evidence handler:', err.message);
      client.emit('aiError', 'The AI evidence engine failed or timed out.');
    }
  }

  // ————— AI: summarize the entire debate graph —————
  @SubscribeMessage('requestSummary')
  async handleRequestSummary(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { nodes: { id: string; label: string }[]; edges: { source: string; target: string }[] }
  ): Promise<void> {
    try {
      const transcript = payload.nodes.map((n) => `[${n.id}]: ${n.label}`).join('\n');
      const aiResp = await firstValueFrom(
        this.httpService.post(
          'http://127.0.0.1:8000/summarize',
          { text: transcript },
          { timeout: 15000 }
        )
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
