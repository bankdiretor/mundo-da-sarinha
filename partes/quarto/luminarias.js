/* luminarias - as DUAS LUZES do quarto da Sarinha, no mesmo arquivo:

     QUARTO_MOVEIS.luminariaEstrela  (item 16) - luminaria de PISO: poste
       fino branco-creme/lilas com uma ESTRELA amarela acesa no topo.
     QUARTO_MOVEIS.luminariaBolha    (item 34) - luminaria de MESA: bolha
       tipo cogumelo, base amarelo-clara e cupula rosa->branco-quente acesa.

   Elas nao acendem o quarto: acendem a si mesmas. O mundo tem duas luzes e
   ponto final (CONTRATO), entao a parte "acesa" de cada peca e uma segunda
   malha em MeshBasicMaterial - material que ignora a luz da cena e devolve
   a cor por vertice crua. E por isso que a estrela e a cupula parecem ligadas
   ao lado de qualquer superficie Lambert, sem nenhuma luz nova e sem sombra
   de engine. Cada peca = 2 malhas = 2 draw calls, o teto do orcamento.

   MEDIDO em three r147 rodando em node (nao chutado, nao olhado no
   navegador) - ver o cabecalho de cada funcao para os numeros. As tres
   auditorias que rodaram nas duas pecas, com resultado:
     - merge devolveu geometria (nenhum null) e as 4 malhas tem `color`;
     - faces coplanares SOBREPOSTAS: 0 pares nas duas (o teste projeta o
       triangulo no plano, encolhe 12% e usa eixo separador, entao vizinho
       de aresta nao conta como par);
     - vedacao da bolha por raio: 481 pontos dentro da cupula x 240 direcoes
       = 115.440 raios, e ZERO deles chega ao ponto sem atravessar uma face
       da frente. Ou seja: nao existe angulo em que a cavidade vira buraco.

   ARMADILHAS RESPEITADAS
   - `pinta`/`acende` normalizam indice e apagam `uv` em TODA peca: sem isso
     mergeBufferGeometries devolve null calado (Icosahedron nasce sem indice,
     Cylinder/Sphere/Circle nascem com). O medidor falha se algum merge voltar
     null, entao isso esta conferido e nao suposto.
   - NENHUM par de faces coplanares: todo encaixe se SOBREPOE ~0.01 em Y
     (disco->degrau->haste, base->cupula). Faces que so se encostam brigam de
     profundidade (z-fighting) e piscam quando a camera anda.
   - O quarto e CLARO. O pigmento do CORPO nao sobe: a base sai com o hex da
     ficha e o volume vem do `fBase` (a base do degrade puxa para o
     cinza-azulado). Subir tom em ambiente claro lava a cor - ja custou uma
     versao da poltrona.
   - A cupula e uma meia-esfera ABERTA embaixo. Sem tampa, olhando de baixo
     do beiral se enxerga o vazio (a face de dentro e descartada pelo culling
     e vira buraco na silhueta). Por isso existe o disco-tampa rosa. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};

/* ==========================================================================
   ITEM 16 - LUMINARIA ESTRELA DE PISO

   ANATOMIA (de baixo para cima):
     disco largo branco-creme -> degrauzinho -> haste fina lilas afunilada
     -> ESTRELA de 5 pontas acesa, empalada na haste.

   MEDIDO: 1.150 de altura, 0.381 de largura, menor Y = 0.00000.
   PIVO: centro da base, Y=0 e o chao. A estrela olha para +Z.
   CUSTO MEDIDO: 2 draw calls, 188 triangulos (112 corpo + 76 estrela).

   Decisoes que valem o comentario:
   - a haste sobe ate 0.918 e a fenda de baixo da estrela esta em 0.843
     (medido no vertice, nao no projeto): a haste entra 7.5cm DENTRO da
     estrela. Estrela pousada em cima do tubo abre fresta na primeira
     rotacao da camera. A haste tem 0.021 de raio no topo e a estrela 0.043
     de meia-espessura, entao o tubo some inteiro atras dela.
   - o brilho da estrela e RADIAL, nao por altura: o nucleo (os 5 vertices
     internos) sai quente e as pontas ficam no amarelo da ficha. E o que faz
     ela ler como "luz saindo de dentro" em vez de adesivo amarelo - de graca,
     porque usa os vertices que a estrela ja tem.
   - fBase da haste e baixo (0.09): coluna alta com degrade forte vira preta
     embaixo (licao ja paga na luminaria da praca). Quem faz o contato com o
     chao e o disco, com fBase 0.22.
   ========================================================================== */
window.QUARTO_MOVEIS.luminariaEstrela = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'luminaria_estrela';

  /* ---------- paleta (hex da ficha, sem subir tom) ---------- */
  var CREME = 0xf3e9e2,        /* disco da base */
      CREME_DEGRAU = 0xece0d6, /* degrauzinho (um passo abaixo, para separar) */
      LILAS = 0xe8dce8,        /* haste */
      ESTRELA_PONTA = 0xffd35a,/* amarelo da ficha, nas pontas */
      ESTRELA_NUCLEO = 0xfff4c9; /* miolo quente (o "aceso") */

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.12 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, i, y;
    for (i = 0; i < n; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var f = (pos.getY(i) - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.15));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  /* irma da `pinta` para a peca que ACENDE: interpola DUAS cores pela
     distancia ao eixo (raio), nao pela altura. Usar com a geometria ainda
     na origem, antes de levar para o lugar. */
  function acendeRadial(geo, corBorda, corNucleo, raio) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cB = new T.Color(corBorda), cN = new T.Color(corNucleo);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var d = Math.sqrt(pos.getX(i) * pos.getX(i) + pos.getY(i) * pos.getY(i)) / raio;
      var c = cN.clone().lerp(cB, Math.min(1, Math.pow(d, 0.75)));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var corpo = [], brilho = [];

  /* ---------- disco da base (largo e baixo; quem segura a peca no chao) ----
     10 lados: em pe, a 1.15 de altura, ninguem le a facetagem do pe. */
  var disco = new T.CylinderGeometry(0.158, 0.165, 0.052, 10);
  disco.translate(0, 0.026, 0);                       /* 0.000 -> 0.052 */
  corpo.push(pinta(disco, CREME, 0.22));

  /* ---------- degrauzinho (comeca 0.010 ANTES do topo do disco) ---------- */
  var degrau = new T.CylinderGeometry(0.104, 0.118, 0.046, 10);
  degrau.translate(0, 0.065, 0);                      /* 0.042 -> 0.088 */
  corpo.push(pinta(degrau, CREME_DEGRAU, 0.16));

  /* ---------- haste (afunila 0.034 -> 0.021; entra 0.010 no degrau) ------ */
  var haste = new T.CylinderGeometry(0.021, 0.034, 0.840, 8);
  haste.translate(0, 0.498, 0);                       /* 0.078 -> 0.918 */
  corpo.push(pinta(haste, LILAS, 0.09));

  /* ---------- ESTRELA ACESA ----------
     RI/RE = 0.49: ponta afiada de estrela de desenho, mas com carne bastante
     para o chanfro de 1 segmento nao se cruzar. Sem closePath: o
     ExtrudeGeometry fecha o contorno sozinho e fechar na mao duplicaria o
     primeiro ponto (aresta degenerada).

     ARMADILHA MEDIDA (nao esta na documentacao do three): com bevelOffset 0
     o chanfro nao INVADE o contorno, ele INFLA para fora - e numa ponta
     aguda o deslocamento e o chanfro dividido pelo seno do meio-angulo, ou
     seja MUITO maior que o chanfro. Com RE=0.200 e chanfro 0.020 a estrela
     saiu com 0.228 de raio (medido) e a peca passou de 1.15 para 1.178 de
     altura. Entao o RE da forma e 0.172 e o raio VISIVEL sai 0.200,
     conferido no medidor. Quem mexer no chanfro tem que remedir. */
  var RE = 0.172, RI = 0.084, PROF = 0.050, CHAN = 0.020;
  var RAIO_VIS = 0.200;             /* raio da estrela DEPOIS do chanfro (medido) */
  var forma = new T.Shape();
  var p, raio, ang, px, py;
  for (p = 0; p < 10; p++) {
    raio = (p % 2 === 0) ? RE : RI;
    ang = Math.PI / 2 + p * Math.PI / 5;              /* p=0 = ponta para cima */
    px = Math.cos(ang) * raio; py = Math.sin(ang) * raio;
    if (p === 0) forma.moveTo(px, py); else forma.lineTo(px, py);
  }
  var estrela = new T.ExtrudeGeometry(forma, {
    depth: PROF, bevelEnabled: true, bevelThickness: 0.018,
    bevelSize: CHAN, bevelOffset: 0, bevelSegments: 1, steps: 1, curveSegments: 1
  });
  acendeRadial(estrela, ESTRELA_PONTA, ESTRELA_NUCLEO, RAIO_VIS);
  /* o chanfro cresce igual dos dois lados, entao o meio da espessura e
     PROF/2 (medido: z de -0.018 a 0.068) - nao PROF/2 + espessura */
  estrela.translate(0, 0, -PROF / 2);                 /* centra a espessura em z=0 */
  estrela.translate(0, 0.950, 0);                     /* topo em 1.150; fenda em 0.843 */
  brilho.push(estrela);

  /* ---------- 2 draw calls ---------- */
  var geoCorpo = BGU.mergeBufferGeometries(corpo);
  var malha = new T.Mesh(geoCorpo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'luminaria_estrela_corpo';
  grupo.add(malha);

  var geoBrilho = BGU.mergeBufferGeometries(brilho);
  var malhaBrilho = new T.Mesh(geoBrilho, new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'luminaria_estrela_luz';
  grupo.add(malhaBrilho);

  return { grupo: grupo, custo: { dc: 2, tri: 188 } };
};

/* ==========================================================================
   ITEM 34 - LUMINARIA BOLHA/COGUMELO DE MESA

   ANATOMIA: cilindro amarelo-claro baixo + botaozinho de liga-desliga na
   frente + CUPULA em bolha acesa, mais larga que a base (o beiral do
   cogumelo) + tampa rosa fechando a bolha por baixo.

   MEDIDO: 0.298 de altura, 0.330 de largura, menor Y = 0.00000.
   PIVO: centro da base, Y=0 e a superficie onde ela apoia (mesa/criado-mudo).
   CUSTO MEDIDO: 2 draw calls, 156 triangulos (60 corpo + 96 cupula).

   Decisoes que valem o comentario:
   - a esfera e cortada em thetaLength = 0.58*PI, nao em PI/2: passar de 90
     graus faz a borda VIRAR PARA DENTRO. E o que separa "bolha" de "tigela
     de sopa emborcada" - a maior largura fica no meio da cupula e a saia
     recolhe, exatamente como cogumelo.
   - o degrade da cupula e por ALTURA (rosa embaixo, branco-quente em cima)
     com expoente 0.8: puxa a virada de cor para a metade de baixo, que e a
     parte que o olho ve de quem esta em pe no quarto.
   - a borda da cupula (0.092) desce ABAIXO do topo da base (0.100): 8mm de
     sobreposicao, entao nao existe fresta nem plano compartilhado.
   ========================================================================== */
window.QUARTO_MOVEIS.luminariaBolha = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'luminaria_bolha';

  /* ---------- paleta ---------- */
  var AMARELO = 0xf5d98a,      /* base cilindrica (ficha) */
      BOTAO = 0xdcb15e,        /* liga-desliga: um tom abaixo, para aparecer */
      ROSA = 0xffc2d8,         /* cupula embaixo (ficha) */
      QUENTE = 0xfff3e0;       /* cupula em cima (ficha) */

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.12 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, i, y;
    for (i = 0; i < n; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var f = (pos.getY(i) - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.15));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  /* irma da `pinta` para a peca que ACENDE: interpola DUAS cores pela ALTURA,
     numa faixa dada na mao (y0..y1) para que a tampa e a cupula usem a MESMA
     regua - se cada peca medisse a propria altura, a tampa sairia com a cor
     do topo e denunciaria a emenda. */
  function acendeY(geo, corBaixo, corTopo, y0, y1, expo) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cB = new T.Color(corBaixo), cT = new T.Color(corTopo);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var faixa = Math.max(0.001, y1 - y0);
    for (var i = 0; i < n; i++) {
      var f = Math.min(1, Math.max(0, (pos.getY(i) - y0) / faixa));
      var c = cB.clone().lerp(cT, Math.pow(f, expo === undefined ? 1 : expo));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var corpo = [], brilho = [];

  /* ---------- base cilindrica (baixa e larga; 10 lados) ---------- */
  var base = new T.CylinderGeometry(0.125, 0.132, 0.100, 10);
  base.translate(0, 0.050, 0);                        /* 0.000 -> 0.100 */
  corpo.push(pinta(base, AMARELO, 0.20));

  /* ---------- botaozinho de liga-desliga, na frente (+Z) ----------
     Icosaedro cru (20 tris) meio enterrado na parede do cilindro: e a unica
     coisa que da FRENTE para uma peca redonda. */
  var botao = new T.IcosahedronGeometry(0.024, 0);
  botao.scale(1, 1, 0.7);
  botao.translate(0, 0.050, 0.122);
  corpo.push(pinta(botao, BOTAO, 0.10));

  /* ---------- CUPULA ACESA (esfera cortada, borda virada para dentro) ---- */
  var RC = 0.165, CY = 0.133;                         /* raio e centro da bolha */
  var CORTE = Math.PI * 0.58;                         /* > 90 graus: saia recolhe */
  var cupula = new T.SphereGeometry(RC, 12, 4, 0, Math.PI * 2, 0, CORTE);
  cupula.translate(0, CY, 0);                         /* borda 0.092 -> topo 0.298 */
  var Y_BORDA = CY + RC * Math.cos(CORTE);
  brilho.push(acendeY(cupula, ROSA, QUENTE, Y_BORDA, CY + RC, 0.8));

  /* ---------- tampa da bolha (so existe para nao virar buraco) ----------
     Raio 0.162 contra 0.160 da parede nessa altura: ela CRUZA a casca em vez
     de encostar, entao nao sobra fresta; e como 0.162 < 0.165 (a maior
     largura da cupula), nao aparece nenhum labio na silhueta. */
  var tampa = new T.CircleGeometry(0.162, 12);
  tampa.rotateX(Math.PI / 2);                         /* normal para BAIXO */
  tampa.translate(0, Y_BORDA + 0.001, 0);
  brilho.push(acendeY(tampa, ROSA, QUENTE, Y_BORDA, CY + RC, 0.8));

  /* ---------- 2 draw calls ---------- */
  var geoCorpo = BGU.mergeBufferGeometries(corpo);
  var malha = new T.Mesh(geoCorpo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'luminaria_bolha_corpo';
  grupo.add(malha);

  var geoBrilho = BGU.mergeBufferGeometries(brilho);
  var malhaBrilho = new T.Mesh(geoBrilho, new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'luminaria_bolha_luz';
  grupo.add(malhaBrilho);

  return { grupo: grupo, custo: { dc: 2, tri: 156 } };
};
