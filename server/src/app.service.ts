// Location: server/src/app.service.ts

import { Injectable, Inject } from '@nestjs/common';
import * as postgres from 'postgres';
import { Node, Edge, Canvas } from './types';

@Injectable()
export class AppService {
  constructor(@Inject('PG_CONNECTION') private sql: postgres.Sql) {}

  // --- CANVAS METHODS ---
  async getCanvases(): Promise<Canvas[]> {
    const canvases = await this.sql<Canvas[]>`
      SELECT id, title FROM canvases ORDER BY created_at DESC
    `;
    return canvases;
  }

  async createCanvas(title: string, userId: string): Promise<Canvas> {
    const result = await this.sql<Canvas[]>`
      INSERT INTO canvases (title, user_id) VALUES (${title}, ${userId}) RETURNING id, title
    `;
    return result[0];
  }

  // --- NODE & EDGE METHODS (NOW CANVAS-AWARE) ---
  async getNodes(canvasId: string): Promise<Node[]> {
    const rawNodes = await this.sql<any[]>`
      SELECT id, "position", "data" FROM nodes WHERE canvas_id = ${canvasId}
    `;
    return rawNodes.map(node => ({
      ...node,
      position: typeof node.position === 'string' ? JSON.parse(node.position) : node.position,
      data: typeof node.data === 'string' ? JSON.parse(node.data) : node.data,
    }));
  }

  async getEdges(canvasId: string): Promise<Edge[]> {
    return this.sql<Edge[]>`
      SELECT id, source, target, animated FROM edges WHERE canvas_id = ${canvasId}
    `;
  }

  async createNode(newNode: Node, canvasId: string): Promise<Node> {
    const { id, data, position } = newNode;
    const positionJson = JSON.stringify(position);
    const dataJson = JSON.stringify(data);
    const result = await this.sql<any[]>`
      INSERT INTO nodes (id, "position", "data", canvas_id)
      VALUES (${id}, ${positionJson}, ${dataJson}, ${canvasId}) RETURNING *
    `;
    const savedNode = result[0];
    return {
      ...savedNode,
      position: typeof savedNode.position === 'string' ? JSON.parse(savedNode.position) : savedNode.position,
      data: typeof savedNode.data === 'string' ? JSON.parse(savedNode.data) : savedNode.data,
    };
  }

  async createEdge(newEdge: Edge, canvasId: string): Promise<Edge> {
    const { id, source, target, animated } = newEdge;
    const result = await this.sql<Edge[]>`
      INSERT INTO edges (id, source, target, animated, canvas_id)
      VALUES (${id}, ${source}, ${target}, ${animated ?? true}, ${canvasId}) RETURNING *
    `;
    return result[0];
  }

  async deleteNode(nodeId: string): Promise<{ id: string }> {
    const result = await this.sql<{ id: string }[]>`DELETE FROM nodes WHERE id = ${nodeId} RETURNING id`;
    if (result.length === 0)
      throw new Error(`Could not find node with id ${nodeId} to delete.`);
    return result[0];
  }

  async updateNodePosition(
    nodeId: string,
    position: { x: number; y: number },
  ): Promise<void> {
    const positionJson = JSON.stringify(position);
    await this.sql`
      UPDATE nodes
      SET "position" = ${positionJson}
      WHERE id = ${nodeId}
    `;
  }
}