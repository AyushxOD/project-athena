import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
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

  @SubscribeMessage('requestAiQuestion')
  async handleRequestAiQuestion(client: Socket, payload: Node): Promise<void> {
    try {
        const claimText = payload?.data?.label;
        if (!claimText) return;
        const aiResponse = await firstValueFrom(this.httpService.post('http://127.0.0.1:8000/generate-question', { text: claimText }));
        if (aiResponse.data.error) { return; }
        const aiQuestion = aiResponse.data.question;
        if (aiQuestion) {
            const aiNodeData: Node = {
                id: crypto.randomUUID(), 
                position: { x: payload.position.x, y: payload.position.y + 250 },
                data: { label: `AI Question: ${aiQuestion}` },
            };
            const savedAiNode = await this.appService.createNode(aiNodeData);

            const newEdge: Edge = {
                id: `edge-${payload.id}-${savedAiNode.id}`,
                source: payload.id,
                target: savedAiNode.id,
                animated: true
            };
            const savedEdge = await this.appService.createEdge(newEdge);

            this.server.emit('aiNodeCreated', { aiNode: savedAiNode, edge: savedEdge });
        }
    } catch (error) { console.error(error); }
  }

  @SubscribeMessage('requestEvidence')
  async handleRequestEvidence(client: Socket, payload: Node): Promise<void> {
    try {
      const claimText = payload?.data?.label;
      if (!claimText) return;
      // --- FIX FOR "SOCKET HANG UP" ---
      // We give the AI a longer timeout (30 seconds) because searching the web can be slow.
      const aiResponse = await firstValueFrom(this.httpService.post('http://127.0.0.1:8000/find-evidence', { text: claimText }, { timeout: 30000 }));
      const evidenceList = aiResponse.data.evidence;
      if (!evidenceList) return;

      const newEvidenceNodes: Node[] = [];
      const newEdges: Edge[] = [];
      for (const item of evidenceList) {
        const evidenceNodeData: Node = {
            id: crypto.randomUUID(),
            position: { x: payload.position.x, y: payload.position.y + 250 },
            data: { label: item.summary, url: item.url, type: 'evidence' },
        };
        const savedEvidenceNode = await this.appService.createNode(evidenceNodeData);
        newEvidenceNodes.push(savedEvidenceNode);
        
        const newEdge: Edge = {
            id: `edge-${payload.id}-${savedEvidenceNode.id}`,
            source: payload.id,
            target: savedEvidenceNode.id,
            animated: true
        };
        const savedEdge = await this.appService.createEdge(newEdge);
        newEdges.push(savedEdge);
      }

      this.server.emit('evidenceNodesCreated', {
        evidenceNodes: newEvidenceNodes,
        edges: newEdges,
      });

    } catch (error) { 
        console.error('Error in evidence engine process:', error.message);
        client.emit('aiError', 'The AI evidence engine failed or timed out.');
    }
  }
  
  @SubscribeMessage('deleteNode')
  async handleDeleteNode(client: Socket, nodeId: string): Promise<void> {
    await this.appService.deleteNode(nodeId);
    this.server.emit('nodeDeleted', nodeId);
  }
}