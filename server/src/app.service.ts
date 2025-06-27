import { Inject, Injectable } from '@nestjs/common';
import * as postgres from 'postgres';

export type Node = {
  id: string;
  position: { x: number; y: number };
  data: { 
    label: string;
    url?: string;
    type?: 'evidence' | 'ai_question';
  };
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
};

@Injectable()
export class AppService {
  constructor(@Inject('PG_CONNECTION') private sql: postgres.Sql) {}

  async getNodes(): Promise<Node[]> {
    const rawNodes = await this.sql<any[]>`SELECT id, "position", "data" FROM nodes`;
    return rawNodes.map(node => ({
      ...node,
      position: typeof node.position === 'string' ? JSON.parse(node.position) : node.position,
      data: typeof node.data === 'string' ? JSON.parse(node.data) : node.data,
    }));
  }
  
  async createNode(newNode: Node): Promise<Node> {
    const { id, data, position } = newNode;
    const positionJson = JSON.stringify(position);
    const dataJson = JSON.stringify(data);
    const result = await this.sql<any[]>`
      INSERT INTO nodes (id, "position", "data")
      VALUES (${id}, ${positionJson}, ${dataJson}) RETURNING *
    `;
    const savedNode = result[0];
    return {
        ...savedNode,
        position: typeof savedNode.position === 'string' ? JSON.parse(savedNode.position) : savedNode.position,
        data: typeof savedNode.data === 'string' ? JSON.parse(savedNode.data) : savedNode.data,
    };
  }
  
  async getEdges(): Promise<Edge[]> {
    const edges = await this.sql<Edge[]>`SELECT id, source, target, animated FROM edges`;
    return edges;
  }

  // --- THIS METHOD IS NOW FIXED ---
  async createEdge(newEdge: Edge): Promise<Edge> {
    const { id, source, target, animated } = newEdge;
    // We use the nullish coalescing operator '??' to provide a default value of 'true'
    // if 'animated' is undefined. This satisfies TypeScript and the database.
    const result = await this.sql<Edge[]>`
      INSERT INTO edges (id, source, target, animated)
      VALUES (${id}, ${source}, ${target}, ${animated ?? true}) RETURNING *
    `;
    return result[0];
  }

  async deleteNode(nodeId: string): Promise<{ id: string }> {
    const result = await this.sql<{ id: string }[]>`DELETE FROM nodes WHERE id = ${nodeId} RETURNING id`;
    if (result.length === 0) throw new Error(`Could not find node with id ${nodeId} to delete.`);
    return result[0];
  }
}
