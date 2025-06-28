// server/src/app.service.ts

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
    const raw = await this.sql<any[]>`SELECT id, "position", "data" FROM nodes`;
    return raw.map((r) => ({
      id: r.id,
      position: typeof r.position === 'string' ? JSON.parse(r.position) : r.position,
      data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
    }));
  }

  async createNode(newNode: Node): Promise<Node> {
    const res = await this.sql<any[]>`
      INSERT INTO nodes (id, "position", "data")
      VALUES (${newNode.id}, ${JSON.stringify(newNode.position)}, ${JSON.stringify(newNode.data)})
      RETURNING *
    `;
    const saved = res[0];
    return {
      id: saved.id,
      position: typeof saved.position === 'string' ? JSON.parse(saved.position) : saved.position,
      data: typeof saved.data === 'string' ? JSON.parse(saved.data) : saved.data,
    };
  }

  async updateNodePosition(id: string, position: { x: number; y: number }): Promise<void> {
    await this.sql`
      UPDATE nodes
      SET "position" = ${JSON.stringify(position)}
      WHERE id = ${id}
    `;
  }

  async getEdges(): Promise<Edge[]> {
    return this.sql<Edge[]>`SELECT id, source, target, animated FROM edges`;
  }

  async createEdge(newEdge: Edge): Promise<Edge> {
    const res = await this.sql<Edge[]>`
      INSERT INTO edges (id, source, target, animated)
      VALUES (${newEdge.id}, ${newEdge.source}, ${newEdge.target}, ${newEdge.animated ?? true})
      RETURNING *
    `;
    return res[0];
  }

  async deleteNode(nodeId: string): Promise<{ id: string }> {
    const res = await this.sql<{ id: string }[]>`
      DELETE FROM nodes WHERE id = ${nodeId} RETURNING id
    `;
    if (res.length === 0) throw new Error(`Node ${nodeId} not found.`);
    return res[0];
  }
}
