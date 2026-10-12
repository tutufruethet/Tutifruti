import type { NextConfig } from 'next';

/**
 * NEXUS_STATIC_EXPORT=1 gera um build estático em `out/` (usado no CI para
 * testes E2E e pré-visualização). Sem a variável, o build é o normal do Next,
 * que as fases com API (IA, Supabase) vão exigir.
 */
const staticExport = process.env.NEXUS_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(staticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        basePath: process.env.NEXUS_BASE_PATH ?? '',
      }
    : {}),
};

export default nextConfig;
