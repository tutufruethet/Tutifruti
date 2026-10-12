/**
 * Contrato da camada de persistência (Fase 3). Dados locais em IndexedDB;
 * com sessão ativa, sincronização com Supabase. Os domínios (settings, notes,
 * calendar, VFS) dependem desta interface, não do driver.
 */
export type StorageDriver = 'memory' | 'indexeddb' | 'supabase';

export interface KeyValueStore<T> {
  readonly driver: StorageDriver;
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix?: string): Promise<readonly string[]>;
}

/** Valor salvo com versão de schema, para migrações seguras. */
export interface Versioned<T> {
  readonly version: number;
  readonly data: T;
  readonly updatedAt: number;
}
