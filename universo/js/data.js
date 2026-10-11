// Catálogo do atlas: 1 galáxia, 5 sistemas, 17 planetas. Tudo inventado.
// type: 0 rochoso · 1 gasoso · 2 gelado · 3 oceânico · 4 vulcânico
export const TYPES = ['Rochoso', 'Gasoso', 'Gelado', 'Oceânico', 'Vulcânico'];

export const GALAXY = {
  name: 'Via Tutifruti',
  kind: 'Espiral barrada',
  scale: '≈ 100 mil anos-luz',
};

export const SYSTEMS = [
  {
    name: 'Kora', star: 'Anã amarela', hot: false, starSize: 2.6, scale: '≈ 40 UA',
    arm: 0, r: 0.42, belt: null,
    text: 'O sistema mais calmo da galáxia. Quatro mundos em órbitas quase circulares, como se alguém tivesse desenhado com compasso.',
    planets: [
      { name: 'Aru', type: 0, size: 0.7, orbit: 8, temp: 64, moons: 0, g: 0.6, text: 'Pedra exposta ao sol, sem ar para segurar o calor. As crateras guardam sombra o dia inteiro.' },
      { name: 'Tessa', type: 3, size: 1.0, orbit: 12.5, temp: 18, moons: 1, g: 1.0, text: 'Um oceano só, raso e escuro, com três ilhas que mudam de lugar a cada século.' },
      { name: 'Môr', type: 1, size: 2.1, orbit: 19, temp: -140, moons: 14, g: 2.3, rings: true, text: 'Gigante de faixas lentas. Os anéis são gelo moído pelas luas que caíram.' },
      { name: 'Ilo', type: 2, size: 0.8, orbit: 26, temp: -210, moons: 2, g: 0.4, text: 'Casca de gelo rachada por marés. Por baixo, talvez água em movimento.' },
    ],
  },
  {
    name: 'Vesper', star: 'Anã laranja', hot: true, starSize: 2.0, scale: '≈ 25 UA',
    arm: 1, r: 0.6, belt: null,
    text: 'Uma estrela velha e quente demais para os vizinhos. Tudo aqui parece ter sido queimado devagar.',
    planets: [
      { name: 'Cinza', type: 4, size: 0.9, orbit: 7, temp: 820, moons: 0, g: 0.9, text: 'A crosta se parte em placas finas. Entre elas, rios de rocha líquida acendem o lado da noite.' },
      { name: 'Duna', type: 0, size: 1.1, orbit: 11.5, temp: 210, moons: 1, g: 1.2, text: 'Desertos de pó fino e ventos que nunca param. Ninguém viu o chão firme.' },
      { name: 'Halo', type: 1, size: 1.8, orbit: 18, temp: -60, moons: 6, g: 1.9, text: 'Tempestades do tamanho de planetas giram em sentido contrário às faixas.' },
    ],
  },
  {
    name: 'Lumen', star: 'Gigante branca', hot: false, starSize: 3.4, scale: '≈ 70 UA',
    arm: 0, r: 0.78, belt: 21,
    text: 'O maior sistema do atlas. Um cinturão de rochas divide os mundos de dentro e os de fora.',
    planets: [
      { name: 'Ferro', type: 0, size: 0.8, orbit: 9, temp: 340, moons: 0, g: 1.4, text: 'Denso e escuro, quase todo metal. A superfície reflete a estrela como um espelho sujo.' },
      { name: 'Âmbar', type: 4, size: 1.0, orbit: 13.5, temp: 610, moons: 1, g: 1.1, text: 'Vulcões em fila, como costuras. A única lua orbita dentro da fumaça.' },
      { name: 'Brisa', type: 1, size: 2.4, orbit: 28, temp: -120, moons: 21, g: 2.6, rings: true, text: 'O maior planeta do atlas. As faixas claras são nuvens de amônia; as escuras, buracos nelas.' },
      { name: 'Pétala', type: 2, size: 0.9, orbit: 35, temp: -190, moons: 3, g: 0.5, text: 'Gelo em camadas finas que se abrem como uma flor a cada verão longo.' },
      { name: 'Nix', type: 2, size: 0.6, orbit: 41, temp: -228, moons: 0, g: 0.2, text: 'O ponto mais frio e mais longe. A estrela daqui parece só mais uma.' },
    ],
  },
  {
    name: 'Orla', star: 'Estrela jovem', hot: false, starSize: 2.3, scale: '≈ 35 UA',
    arm: 1, r: 0.3, belt: null,
    text: 'Ainda se formando. Os planetas são recentes e as órbitas ainda não se acertaram.',
    planets: [
      { name: 'Sal', type: 3, size: 1.2, orbit: 9.5, temp: 32, moons: 2, g: 1.1, text: 'Mares salgados e rasos. Quando secam, deixam desenhos brancos que se veem do espaço.' },
      { name: 'Vale', type: 0, size: 0.9, orbit: 14, temp: -20, moons: 0, g: 0.8, text: 'Cânions mais fundos que montanhas são altas. O eco demora minutos para voltar.' },
      { name: 'Tufão', type: 1, size: 2.0, orbit: 22, temp: -150, moons: 9, g: 2.0, rings: true, text: 'Um gigante ainda morno. Os anéis são jovens e vão se desfazer em poucos milhões de anos.' },
    ],
  },
  {
    name: 'Nadir', star: 'Anã branca', hot: false, starSize: 1.4, scale: '≈ 20 UA',
    arm: 0, r: 0.64, belt: 9,
    text: 'O que sobrou de uma estrela que morreu. Pequena, muito brilhante e cercada de destroços.',
    planets: [
      { name: 'Brasa', type: 4, size: 0.7, orbit: 5.5, temp: 1100, moons: 0, g: 0.7, text: 'Perto demais. O lado virado para a estrela derrete; o outro congela.' },
      { name: 'Eco', type: 2, size: 1.0, orbit: 14, temp: -170, moons: 4, g: 0.9, text: 'Sobreviveu à morte da estrela. Guarda no gelo o registro de tudo o que aconteceu.' },
    ],
  },
];

// período em dias, proporcional à 3ª lei de Kepler (só para dar números coerentes)
for (const s of SYSTEMS) for (const p of s.planets) p.days = Math.round(28 * Math.pow(p.orbit / 3, 1.5));
