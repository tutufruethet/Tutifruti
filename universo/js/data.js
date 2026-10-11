// Catálogo do atlas: 1 galáxia, 5 sistemas, 22 planetas. Tudo inventado.
// type: 0 rochoso · 1 gasoso · 2 gelado · 3 oceânico · 4 vulcânico
// colors: [baixo, meio, alto] da paleta do planeta · atmo: cor do céu · clouds: 0–1 · lights: cidades no lado da noite
export const TYPES = ['Rochoso', 'Gasoso', 'Gelado', 'Oceânico', 'Vulcânico'];

export const GALAXY = {
  name: 'Via Tutifruti',
  kind: 'Espiral barrada',
  scale: '≈ 100 mil anos-luz',
};

export const SYSTEMS = [
  {
    name: 'Kora', star: 'Anã amarela', color: '#ffcf7a', starSize: 2.6, scale: '≈ 40 UA',
    arm: 0, r: 0.42, belt: null, sky: ['#3a1d5c', '#0f3a5c', '#5c1d3a'],
    text: 'O sistema mais calmo da galáxia. Cinco mundos em órbitas quase circulares, como se alguém tivesse desenhado com compasso.',
    planets: [
      { name: 'Aru', type: 0, size: 0.7, orbit: 8, temp: 64, moons: 0, g: 0.6, colors: ['#4a2216', '#c8703a', '#ffd08a'], atmo: '#ffb070', clouds: 0, text: 'Pedra exposta ao sol, sem ar para segurar o calor. As crateras guardam sombra o dia inteiro.' },
      { name: 'Tessa', type: 3, size: 1.0, orbit: 12.5, temp: 18, moons: 1, g: 1.0, colors: ['#08294d', '#4f7a3a', '#e8e2d0'], atmo: '#5fa8ff', clouds: 0.65, lights: true, text: 'Um oceano quase inteiro, com três continentes que acendem à noite. O único mundo habitado do atlas.' },
      { name: 'Môr', type: 1, size: 2.1, orbit: 19, temp: -140, moons: 14, g: 2.3, rings: true, colors: ['#c99b6a', '#8a4f30', '#f4e4c6'], atmo: '#f0c896', text: 'Gigante de faixas lentas e uma tempestade vermelha mais velha que a estrela. Os anéis são gelo moído pelas luas que caíram.' },
      { name: 'Ilo', type: 2, size: 0.8, orbit: 26, temp: -210, moons: 2, g: 0.4, colors: ['#d4f4ff', '#4fb4ee', '#163f86'], atmo: '#7fd4ff', clouds: 0, text: 'Casca de gelo rachada por marés. Por baixo, talvez água em movimento.' },
      { name: 'Lírio', type: 2, size: 0.95, orbit: 31.5, temp: -195, moons: 1, g: 0.6, colors: ['#efe2ff', '#a884f0', '#4e2e96'], atmo: '#c8a8ff', clouds: 0.2, text: 'Neve de metano tingida de lilás. Ao amanhecer, o planeta inteiro parece uma flor fechada.' },
    ],
  },
  {
    name: 'Vesper', star: 'Anã laranja', color: '#ff8a3c', starSize: 2.0, scale: '≈ 25 UA',
    arm: 1, r: 0.6, belt: null, sky: ['#5c1d1d', '#5c3a1d', '#2a1d5c'],
    text: 'Uma estrela velha e quente demais para os vizinhos. Tudo aqui parece ter sido queimado devagar, menos o mar de Coral.',
    planets: [
      { name: 'Cinza', type: 4, size: 0.9, orbit: 7, temp: 820, moons: 0, g: 0.9, colors: ['#2e0c06', '#7a2a14', '#ff5a1f'], atmo: '#ff7a3c', text: 'A crosta se parte em placas finas. Entre elas, rios de rocha líquida acendem o lado da noite.' },
      { name: 'Duna', type: 0, size: 1.1, orbit: 11, temp: 210, moons: 1, g: 1.2, colors: ['#6e3418', '#c9773c', '#f3c88e'], atmo: '#ffb070', clouds: 0.15, text: 'Desertos de pó cor de ferrugem e ventos que nunca param. Ninguém viu o chão firme.' },
      { name: 'Coral', type: 3, size: 1.0, orbit: 14.5, temp: 34, moons: 2, g: 0.95, colors: ['#05424f', '#ff7a6b', '#fff1dc'], atmo: '#7fd8ff', clouds: 0.45, text: 'Mar turquesa e ilhas cor de coral, feitas de organismos que vivem e morrem há milhões de anos.' },
      { name: 'Halo', type: 1, size: 1.8, orbit: 18.5, temp: -60, moons: 6, g: 1.9, colors: ['#3f9a92', '#1d4d5a', '#d4f0e0'], atmo: '#7fe0d0', text: 'Tempestades do tamanho de planetas giram em sentido contrário às faixas verde-água.' },
    ],
  },
  {
    name: 'Lumen', star: 'Gigante branca', color: '#cfe0ff', starSize: 3.4, scale: '≈ 80 UA',
    arm: 0, r: 0.78, belt: 21, sky: ['#1d2a5c', '#1d5c55', '#3a1d5c'],
    text: 'O maior sistema do atlas. Um cinturão de rochas divide os mundos de dentro e os de fora.',
    planets: [
      { name: 'Ferro', type: 0, size: 0.8, orbit: 9, temp: 340, moons: 0, g: 1.4, colors: ['#12283e', '#3f86b0', '#a8f0ff'], atmo: '#70c8ff', clouds: 0, text: 'Denso e escuro, quase todo metal. A superfície reflete a estrela como um espelho sujo.' },
      { name: 'Âmbar', type: 4, size: 1.0, orbit: 13.5, temp: 610, moons: 1, g: 1.1, colors: ['#3a1a06', '#8a4a10', '#ffb020'], atmo: '#ffaa40', text: 'Vulcões em fila, como costuras douradas. A única lua orbita dentro da fumaça.' },
      { name: 'Brisa', type: 1, size: 2.4, orbit: 28, temp: -120, moons: 21, g: 2.6, rings: true, colors: ['#ead7b2', '#b07a4a', '#fff4e0'], atmo: '#ffe0b0', text: 'O maior planeta do atlas. As faixas claras são nuvens de amônia; as escuras, buracos nelas.' },
      { name: 'Pétala', type: 2, size: 0.9, orbit: 35, temp: -190, moons: 3, g: 0.5, colors: ['#ffd8e8', '#f07ab0', '#8a2a5e'], atmo: '#ff9ccc', clouds: 0, text: 'Gelo rosado em camadas finas que se abrem como uma flor a cada verão longo.' },
      { name: 'Nix', type: 2, size: 0.6, orbit: 41, temp: -228, moons: 0, g: 0.2, colors: ['#e6dcff', '#7a62e6', '#24166e'], atmo: '#a890ff', clouds: 0, text: 'O ponto mais frio e mais longe. A estrela daqui parece só mais uma.' },
      { name: 'Safira', type: 1, size: 1.9, orbit: 48, temp: -214, moons: 5, g: 1.4, colors: ['#3a7ae0', '#173a8f', '#a8d8ff'], atmo: '#6aa8ff', text: 'Gigante de gelo azul-profundo. Os ventos mais rápidos do atlas sopram aqui, sem nada para pará-los.' },
    ],
  },
  {
    name: 'Orla', star: 'Estrela jovem', color: '#a8c8ff', starSize: 2.3, scale: '≈ 35 UA',
    arm: 1, r: 0.3, belt: null, sky: ['#1d3a5c', '#5c1d55', '#1d5c3a'],
    text: 'Ainda se formando. Os planetas são recentes, as órbitas ainda não se acertaram e um deles já tem florestas.',
    planets: [
      { name: 'Sal', type: 3, size: 1.2, orbit: 9.5, temp: 32, moons: 2, g: 1.1, colors: ['#0d4f6b', '#d9cfae', '#ffffff'], atmo: '#9fe0ff', clouds: 0.4, text: 'Mares salgados e rasos. Quando secam, deixam desenhos brancos que se veem do espaço.' },
      { name: 'Vale', type: 0, size: 0.9, orbit: 13.5, temp: -20, moons: 0, g: 0.8, colors: ['#5a1410', '#d0482c', '#ffb48a'], atmo: '#ff8a6a', clouds: 0, text: 'Cânions vermelhos mais fundos que montanhas são altas. O eco demora minutos para voltar.' },
      { name: 'Musgo', type: 3, size: 1.1, orbit: 17.5, temp: 24, moons: 1, g: 1.05, colors: ['#073a3a', '#2f7a34', '#cfe0a0'], atmo: '#9affd0', clouds: 0.7, text: 'Florestas que cobrem os continentes de polo a polo. O ar é tão úmido que as nuvens nunca vão embora.' },
      { name: 'Tufão', type: 1, size: 2.0, orbit: 23, temp: -150, moons: 9, g: 2.0, rings: true, colors: ['#e3a06c', '#a0402e', '#ffe8c8'], atmo: '#ffb090', text: 'Um gigante ainda morno, de faixas cor de brasa. Os anéis são jovens e vão se desfazer em poucos milhões de anos.' },
    ],
  },
  {
    name: 'Nadir', star: 'Anã branca', color: '#e8f0ff', starSize: 1.4, scale: '≈ 25 UA',
    arm: 0, r: 0.64, belt: 9, sky: ['#3a1d5c', '#1d1d5c', '#5c1d4a'],
    text: 'O que sobrou de uma estrela que morreu. Pequena, muito brilhante e cercada de destroços.',
    planets: [
      { name: 'Brasa', type: 4, size: 0.7, orbit: 5.5, temp: 1100, moons: 0, g: 0.7, colors: ['#2a0818', '#6a1a3e', '#ff3a6a'], atmo: '#ff5a90', text: 'Perto demais. O lado virado para a estrela derrete; o outro congela.' },
      { name: 'Eco', type: 2, size: 1.0, orbit: 14, temp: -170, moons: 4, g: 0.9, colors: ['#c8fff0', '#3fd0b8', '#145a5a'], atmo: '#7fffe0', clouds: 0.15, text: 'Sobreviveu à morte da estrela. Guarda no gelo verde-água o registro de tudo o que aconteceu.' },
      { name: 'Ametista', type: 1, size: 1.6, orbit: 21, temp: -180, moons: 3, g: 1.6, rings: true, colors: ['#9a6ae0', '#4a2a8a', '#ecd8ff'], atmo: '#c0a0ff', text: 'Faixas violeta de nuvens de fósforo. Os anéis são feitos do que sobrou de um planeta vizinho.' },
    ],
  },
];

// período em dias, proporcional à 3ª lei de Kepler (só para dar números coerentes)
for (const s of SYSTEMS) for (const p of s.planets) p.days = Math.round(28 * Math.pow(p.orbit / 3, 1.5));
export const PLANET_COUNT = SYSTEMS.reduce((n, s) => n + s.planets.length, 0);
