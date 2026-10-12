/**
 * Contrato de autenticação. Implementação com Supabase Auth na Fase 3.
 * O navegador só usa a chave pública (anon); autorização real fica no backend
 * e nas políticas de Row Level Security do Postgres.
 */
export interface Session {
  readonly userId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly expiresAt: number;
}

export type SignInMethod =
  | { readonly kind: 'magic-link'; readonly email: string }
  | { readonly kind: 'oauth'; readonly provider: 'github' | 'google' }
  | { readonly kind: 'guest' };

export interface AuthService {
  getSession(): Promise<Session | null>;
  signIn(method: SignInMethod): Promise<void>;
  signOut(): Promise<void>;
  /** Retorna a função para cancelar a inscrição. */
  onChange(listener: (session: Session | null) => void): () => void;
}
