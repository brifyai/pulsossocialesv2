import type { TopicKey, OpinionResponseValue } from '../../types/opinion';

/**
 * Tipos del módulo memory para CADEM Opinion Engine v1.
 */

/** Tipo de memoria persistida */
export type MemoryKind =
  | 'response'
  | 'preference'
  | 'derived';

/** Memoria persistente del agente */
export interface AgentMemory {
  id: string;
  agentId: string;
  memoryKind: MemoryKind;
  topic: TopicKey;
  questionFingerprint?: string;
  value: OpinionResponseValue | Record<string, unknown>;
  confidence: number;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Entrada resumida de historial de respuestas */
export interface ResponseHistoryEntry {
  questionId: string;
  questionFingerprint?: string;
  topic?: TopicKey;
  value: OpinionResponseValue;
  confidence?: number;
  answeredAt: Date;
}

/** Peso temporal aplicado a una memoria */
export interface TemporalWeight {
  ageDays: number;
  recencyWeight: number;
  strength: number;
}

/** Query de búsqueda de memorias */
export interface MemoryQuery {
  agentId: string;
  topic?: TopicKey;
  questionFingerprint?: string;
  memoryKinds?: MemoryKind[];
  minConfidence?: number;
  limit?: number;
}
