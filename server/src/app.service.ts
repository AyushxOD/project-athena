/* File #1: server/src/app.service.ts
    We will add a new `deleteNode` method.
*/
import { Inject, Injectable } from '@nestjs/common';
import * as postgres from 'postgres';

export type Node = {
  id: string;
  position: { x: number; y: number };
  data: { label: string };
};

@Injectable()
export class AppService {
  constructor(@Inject('PG_CONNECTION') private sql: postgres.Sql) {}

  async getNodes(): Promise<Node[]> {
    const rawNodes = await this.sql<any[]>`SELECT id, "position", "data" FROM nodes`;
    const nodes = rawNodes.map(node => ({
      ...node,
      position: typeof node.position === 'string' ? JSON.parse(node.position) : node.position,
      data: typeof node.data === 'string' ? JSON.parse(node.data) : node.data,
    }));
    return nodes;
  }
  
  async createNode(newNode: Node): Promise<Node> {
    const { id, data, position } = newNode;
    if (!id) {
        throw new Error("Cannot create a node without a valid ID.");
    }
    const positionJson = JSON.stringify(position);
    const dataJson = JSON.stringify(data);

    const result = await this.sql<any[]>`
      INSERT INTO nodes (id, "position", "data")
      VALUES (${id}, ${positionJson}, ${dataJson})
      RETURNING *
    `;
    const savedNode = result[0];
    const parsedNode: Node = {
        ...savedNode,
        position: typeof savedNode.position === 'string' ? JSON.parse(savedNode.position) : savedNode.position,
        data: typeof savedNode.data === 'string' ? JSON.parse(savedNode.data) : savedNode.data,
    };
    return parsedNode;
  }
  
  async updateNodePosition(nodeId: string, position: { x: number; y: number }): Promise<void> {
    const positionJson = JSON.stringify(position);
    await this.sql`
      UPDATE nodes
      SET "position" = ${positionJson}
      WHERE id = ${nodeId}
    `;
  }

  // --- THIS IS THE NEW DELETE METHOD ---
  async deleteNode(nodeId: string): Promise<{ id: string }> {
    // We also delete any edges connected to this node when we add edge persistence later.
    const result = await this.sql<{ id: string }[]>`
      DELETE FROM nodes WHERE id = ${nodeId} RETURNING id
    `;
    if (result.length === 0) {
      throw new Error(`Could not find node with id ${nodeId} to delete.`);
    }
    return result[0];
  }
}

