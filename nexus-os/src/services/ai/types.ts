/**
 * Contrato do Nexus AI (Fase 6). O navegador fala só com a rota do próprio
 * backend (`/api/ai`); a chave do provedor de IA fica no servidor, com limite
 * de uso por usuário e validação de entrada.
 */
export type AiRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiMessage {
  readonly role: AiRole;
  readonly content: string;
  /** Arquivo do VFS anexado para análise de documentos. */
  readonly attachments?: readonly { readonly path: string; readonly mime: string }[];
}

export interface AiRequest {
  readonly conversationId: string;
  readonly messages: readonly AiMessage[];
  /** Ferramentas que o usuário autorizou para esta conversa. */
  readonly allowedTools: readonly string[];
  /** Memória entre conversas, controlada pelo usuário em Settings. */
  readonly memory: 'off' | 'on';
}

export type AiStreamChunk =
  | { readonly type: 'text'; readonly delta: string }
  | { readonly type: 'tool-call'; readonly tool: string; readonly input: unknown }
  | { readonly type: 'done'; readonly usage: { readonly inputTokens: number; readonly outputTokens: number } }
  | { readonly type: 'error'; readonly message: string; readonly retryable: boolean };

export interface AiClient {
  stream(request: AiRequest, signal?: AbortSignal): AsyncIterable<AiStreamChunk>;
}
