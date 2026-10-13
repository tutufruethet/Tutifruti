// Dados da Brasa 47 (marca fictícia). Preços em centavos.
// "camadas" vai de baixo para cima e serve ao 3D e às fotos do cardápio.

export const BURGERS = [
  {
    id: "original", nome: "47 Original", preco: 3290,
    desc: "Pão brioche levemente tostado, blend bovino artesanal de 160 g, queijo cheddar derretido, bacon crocante e molho especial da casa.",
    camadas: ["brioche-base", "molho-especial", "blend-160", "cheddar", "bacon", "brioche-topo"],
    tiraveis: ["bacon", "molho-especial"],
    nota: "Onde tudo começou."
  },
  {
    id: "inferno", nome: "Inferno Burger", preco: 3890,
    desc: "Pão artesanal, blend bovino de 180 g, queijo pepper jack, jalapeños, cebola crispy e maionese picante exclusiva.",
    camadas: ["artesanal-base", "maionese-picante", "blend-180", "pepperjack", "jalapeno", "cebola-crispy", "artesanal-topo"],
    tiraveis: ["jalapeno", "cebola-crispy", "maionese-picante"],
    nota: "Arde. Avisamos."
  },
  {
    id: "supreme", nome: "Brasa Supreme", preco: 4490,
    desc: "Pão de batata, dois blends bovinos de 150 g, cheddar duplo, bacon crocante, cebola caramelizada e molho barbecue artesanal.",
    camadas: ["batata-base", "barbecue", "blend-150", "cheddar", "blend-150", "cheddar", "bacon", "cebola-caramelizada", "batata-topo"],
    tiraveis: ["bacon", "cebola-caramelizada", "barbecue"],
    nota: "O mais pedido de sexta."
  },
  {
    id: "classico", nome: "Clássico da Casa", preco: 2990,
    desc: "Pão brioche, hambúrguer de 150 g, queijo muçarela, alface fresca, tomate e maionese especial.",
    camadas: ["brioche-base", "maionese", "blend-150", "mucarela", "tomate", "alface", "brioche-topo"],
    tiraveis: ["alface", "tomate", "maionese"],
    nota: "Para quem gosta do básico bem feito."
  },
  {
    id: "monster", nome: "Monster 47", preco: 4990,
    desc: "Três hambúrgueres de 120 g, cheddar triplo, bacon, cebola crispy e molho secreto Brasa 47.",
    camadas: ["brioche-base", "molho-secreto", "blend-120", "cheddar", "blend-120", "cheddar", "blend-120", "cheddar", "bacon", "cebola-crispy", "brioche-topo"],
    tiraveis: ["bacon", "cebola-crispy"],
    nota: "Para dividir. Ou não."
  }
];

export const ACOMPANHAMENTOS = [
  { id: "batata", nome: "Batata frita tradicional", preco: 1290 },
  { id: "batata-cb", nome: "Batata com cheddar e bacon", preco: 1990 },
  { id: "onion", nome: "Onion rings", preco: 1690 },
  { id: "nuggets", nome: "Nuggets artesanais", preco: 1790 }
];

export const BEBIDAS = [
  { id: "refri-lata", nome: "Refrigerante lata", preco: 690 },
  { id: "refri-600", nome: "Refrigerante 600 ml", preco: 990 },
  { id: "agua", nome: "Água mineral", preco: 490 },
  { id: "shake-choc", nome: "Milk-shake de chocolate", preco: 1890 },
  { id: "shake-mor", nome: "Milk-shake de morango", preco: 1890 },
  { id: "shake-oreo", nome: "Milk-shake de Oreo", preco: 2190 }
];

// adicionais do "monte o seu": entram no topo, antes do pão
export const ADICIONAIS = [
  { id: "blend-extra", nome: "Blend extra de 150 g", preco: 1200, camada: "blend-150" },
  { id: "bacon-extra", nome: "Bacon extra", preco: 500, camada: "bacon" },
  { id: "cheddar-extra", nome: "Cheddar extra", preco: 400, camada: "cheddar" },
  { id: "caramelizada", nome: "Cebola caramelizada", preco: 400, camada: "cebola-caramelizada" },
  { id: "jalapeno-extra", nome: "Jalapeños", preco: 300, camada: "jalapeno" },
  { id: "ovo", nome: "Ovo na chapa", preco: 400, camada: "ovo" }
];

export const PONTOS = ["Mal passado", "Ao ponto", "Bem passado"];

export const NOMES_CAMADA = {
  "bacon": "bacon", "molho-especial": "molho especial", "jalapeno": "jalapeños",
  "cebola-crispy": "cebola crispy", "maionese-picante": "maionese picante",
  "cebola-caramelizada": "cebola caramelizada", "barbecue": "molho barbecue",
  "alface": "alface", "tomate": "tomate", "maionese": "maionese especial"
};

export const CUPONS_PADRAO = [
  { codigo: "BRASA10", tipo: "pct", valor: 10, minimo: 0, ativo: true, desc: "10% no pedido" },
  { codigo: "FOGO47", tipo: "fixo", valor: 470, minimo: 4700, ativo: true, desc: "R$ 4,70 em pedidos acima de R$ 47" }
];

export const CONFIG_PADRAO = {
  whatsapp: "",          // vazio: o WhatsApp abre para escolher o contato
  taxaEntrega: 790,
  aberto: true,
  horario: "Terça a domingo, das 18h às 23h30"
};

export const AVALIACOES_PADRAO = [
  { nome: "Marina A.", nota: 5, texto: "O Inferno é exatamente o que promete. A maionese picante vale o pedido sozinha.", data: "2026-09-21" },
  { nome: "Rafael e Bia", nota: 5, texto: "Viemos pelo Monster, voltamos pelo atendimento. A batata com cheddar chega crocante mesmo no delivery.", data: "2026-09-14" },
  { nome: "Tiago L.", nota: 4, texto: "Clássico da Casa simples e certeiro. Só queria que abrisse na segunda.", data: "2026-08-30" },
  { nome: "Dona Célia", nota: 5, texto: "Conheci o Gabriel ainda na garagem. O gosto continua o mesmo, e isso é raro.", data: "2026-08-02" }
];

export const CARIMBOS_PARA_PREMIO = 10;
