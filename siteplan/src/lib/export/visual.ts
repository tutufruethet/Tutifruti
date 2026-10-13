import type { Briefing } from "@/lib/schema";
import type { MotionKey, StyleKey } from "@/lib/schema/catalog";

/** Traduz o estilo escolhido em decisões concretas de composição, tipografia, cor e espaço. */
const STYLE_RULES: Record<StyleKey, string[]> = {
  sobrio: [
    "Tipografia: uma sans humanista legível (ex.: Source Sans 3, IBM Plex Sans) em 2 pesos; corpo 17–18px, entrelinha 1,6; títulos em 600, sem caixa alta.",
    "Cor: fundo branco ou cinza muito claro, texto quase preto, uma cor de marca usada só em botões e links.",
    "Composição: grid de 12 colunas, conteúdo alinhado à esquerda, largura máxima de 1200px, seções com 96–128px de respiro vertical no desktop.",
    "Elementos: bordas de 1px em cinza claro em vez de sombras; cantos de 6–8px só em botões e campos.",
  ],
  acolhedor: [
    "Tipografia: sans arredondada ou humanista (ex.: Nunito Sans, Figtree) para corpo 17–18px; títulos em 600–700 com tracking levemente negativo.",
    "Cor: fundo claro levemente quente, cor de marca em superfícies de destaque (faixa de CTA, seção de processo) e texto em cinza-escuro, nunca preto puro.",
    "Composição: blocos com imagens reais de pessoas e do espaço, cantos de 12–16px nas imagens, texto alinhado à esquerda.",
    "Espaço: generoso, 80–112px entre seções; parágrafos curtos de até 3 linhas no celular.",
  ],
  sofisticado: [
    "Tipografia: serifa de display para títulos (ex.: Fraunces, Cormorant) contra uma sans neutra no corpo; títulos grandes (48–72px no desktop) com entrelinha 1,05.",
    "Cor: paleta contida de 3 neutros e um acento escuro; muito branco; nada de gradientes.",
    "Composição: grid assimétrico, imagens grandes de largura total alternando com texto em coluna estreita (até 60 caracteres por linha).",
    "Detalhes: linhas finas como divisores, botões com texto e sublinhado em vez de blocos coloridos fortes.",
  ],
  tecnico: [
    "Tipografia: grotesca neutra (ex.: Inter, IBM Plex Sans) com números tabulares em dados; corpo 16–17px.",
    "Cor: fundo branco, cinzas frios, um azul ou verde de marca para ações e estados.",
    "Composição: grid rígido, tabelas e listas comparativas, capturas de tela reais do produto com legenda.",
    "Elementos: diagramas simples em SVG em vez de ilustrações decorativas.",
  ],
  vibrante: [
    "Tipografia: sans geométrica com personalidade (ex.: Space Grotesk, Bricolage Grotesque) em títulos grandes; corpo neutro.",
    "Cor: uma cor de marca saturada aplicada em blocos inteiros (fundo de seção), com texto em contraste AA; no máximo 2 cores fortes.",
    "Composição: ritmo alternado entre seções claras e uma seção colorida; imagens recortadas com formas simples.",
    "Interação: estados de hover visíveis (mudança de cor e leve deslocamento), sem animações contínuas.",
  ],
  editorial: [
    "Tipografia: par serifa × grotesca; títulos grandes com tracking negativo e uma coluna de leitura de até 65 caracteres.",
    "Cor: papel claro, tinta escura, um acento usado com parcimônia.",
    "Composição: grid de 12 colunas com textos ancorados em colunas internas, legendas e metadados pequenos, imagens grandes.",
    "Detalhes: divisores finos, numeração apenas onde há sequência real.",
  ],
  minimalista: [
    "Tipografia: uma única família sans em 2 pesos; hierarquia por tamanho e espaço, não por cor.",
    "Cor: preto, branco e um cinza; a cor de marca aparece só no botão principal.",
    "Composição: poucos elementos por tela, muito espaço vazio (120px+ entre seções no desktop), alinhamento à esquerda.",
    "Elementos: sem sombras, sem ícones decorativos, sem cards; listas com divisores finos.",
  ],
};

const MOTION_RULES: Record<MotionKey, string> = {
  nenhuma: "Sem animações de entrada. Apenas transições de 150ms em hover e foco.",
  sutil: "Transições de 150–250ms em hover e foco; uma entrada discreta no topo da página (opacidade e 8px de deslocamento, curva ease-out). Nada contínuo.",
  moderada:
    "Uma sequência de entrada coordenada no topo (até 600ms no total) e revelações curtas ao rolar em blocos importantes; mesma curva ease-out em tudo.",
  expressiva:
    "Movimento faz parte da marca: entradas coordenadas, transições entre páginas e detalhes que reagem ao cursor, sempre com fallback estático.",
};

export function visualDirection(b: Briefing): string[] {
  const v = b.visual;
  const out: string[] = [];
  out.push(...(v.style ? STYLE_RULES[v.style] : STYLE_RULES.sobrio));
  if (!v.style) out.push("(Estilo não informado: usada direção sóbria como ponto de partida — confirmar.)");
  if (v.colors.trim()) out.push(`Cores informadas pelo cliente: ${v.colors.trim()}. Conferir contraste mínimo de 4,5:1 para texto.`);
  else out.push("Cores não informadas: usar neutros e uma cor de marca a definir com o cliente.");
  out.push(
    v.theme === "escuro"
      ? "Tema escuro: fundo cinza muito escuro (não preto puro), texto claro com contraste AA, imagens sem bordas brancas."
      : v.theme === "claro"
        ? "Tema claro."
        : "Tema: sem preferência; começar pelo claro.",
  );
  out.push(`Animação: ${MOTION_RULES[v.motion]} Respeitar prefers-reduced-motion.`);
  if (v.styleNotes.trim()) out.push(`Observações de estilo: ${v.styleNotes.trim()}`);
  if (v.avoid.trim()) out.push(`Evitar: ${v.avoid.trim()}`);
  return out;
}
