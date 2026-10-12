/**
 * Wrapper mínimo de IndexedDB em promessas. Sem dependências: o suficiente
 * para os stores do NEXUS (chave-valor, nós e conteúdos do VFS).
 */
export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Falha no IndexedDB'));
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Transação abortada'));
    tx.onerror = () => reject(tx.error ?? new Error('Falha na transação'));
  });
}

export function openDatabase(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase, oldVersion: number) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB indisponível neste navegador'));
      return;
    }
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (event) => upgrade(req.result, event.oldVersion);
    req.onsuccess = () => {
      const db = req.result;
      // Outra aba atualizou o banco: fecha esta conexão para não travar a atualização.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error(`Não foi possível abrir ${name}`));
    req.onblocked = () => reject(new Error(`${name} está em uso por outra aba`));
  });
}

export function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error(`Não foi possível apagar ${name}`));
    req.onblocked = () => resolve();
  });
}

/** Executa operações num store e espera a transação terminar. */
export async function withStore<T>(
  db: IDBDatabase,
  storeName: string | readonly string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const tx = db.transaction(storeName as string | string[], mode);
  const done = transactionDone(tx);
  const result = await run(tx);
  await done;
  return result;
}
