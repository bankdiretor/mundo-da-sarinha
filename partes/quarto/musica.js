/* musica - os DOIS objetos de MUSICA do quarto da Sarinha, no mesmo arquivo:

     QUARTO_MOVEIS.microfone   (item 14) - microfone de mao infantil, em pe:
       cabo rosa que afina para a base, colar rosa-escuro onde a grade
       encaixa, anel dourado na junta e a CABECA-GRADE acesa por cima.
     QUARTO_MOVEIS.caixaMusica (item 15) - cubo lilas de quinas chanfradas
       com JANELAS de luz quente em 5 faces (o chao nao ganha janela) e uma
       seminima dourada boiando dentro da janela da frente e da de tras.

   Estes sao os objetos da identidade da Sarinha - ela e cantora. Por isso os
   dois ACENDEM: o mundo tem duas luzes e ponto final (CONTRATO), entao a
   parte acesa de cada peca e uma segunda malha em MeshBasicMaterial, que
   ignora a luz da cena e devolve a cor por vertice crua. Nenhuma luz nova,
   nenhuma cor de emissao no material, nenhuma sombra de engine. Cada peca =
   2 malhas = 2 draw calls, o teto do orcamento.

   MEDIDO em three r147 rodando em node (nao chutado, nao olhado no
   navegador) - ver o cabecalho de cada funcao para os numeros. As auditorias
   que rodaram nas duas pecas, com resultado:
     - nenhum merge devolveu null e as 4 malhas tem o atributo `color`;
     - faces coplanares SOBREPOSTAS: 0 pares, contando corpo e brilho JUNTOS
       (o teste projeta o triangulo no plano do outro, encolhe 12% e usa eixo
       separador, entao vizinho de aresta nao conta como par);
     - menor Y = 0.00000 nas duas: o pivo e a base, como pedido;
     - VEDACAO por raio: 26 direcoes x grade de 41x41 raios = 43.706 raios em
       cada peca, e em NENHUM o primeiro acerto e uma face de dentro (que o
       culling apagaria, virando buraco). Esse teste pegou 45 vazamentos na
       caixa antes das paredes do poco existirem - ver o comentario la.

   ARMADILHAS RESPEITADAS
   - `pinta`/`acende*` normalizam indice e apagam `uv` em TODA peca: sem isso
     mergeBufferGeometries devolve null calado (Box/Cylinder/Sphere nascem com
     indice e com uv; a casca chanfrada e escrita na mao e nasce sem os dois).
   - NADA de face coplanar: a janela acesa fica 10mm ATRAS do plano da face e
     e maior que o vao, entao ela nunca divide plano com a moldura e nunca
     abre buraco; a nota atravessa os dois planos em vez de encostar; a haste
     da nota e 6mm mais fina que a cabeca justamente para as tampas das duas
     nao cairem no mesmo plano (essa briga de profundidade e a que pisca).
   - O quarto e CLARO: o pigmento do CORPO nao sobe acima do hex da ficha - o
     volume vem do `fBase` (a base do degrade puxa para o cinza-azulado).
     So a malha que ACENDE clareia para cima, que e o que ela existe para fazer.
   - Esfera de poucos segmentos vira bipiramide (diamante): a cabeca do
     microfone tem 12 gomos no equador, e a "grade" e feita pintando gomo sim
     gomo nao - de graca, sem custar um triangulo a mais. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};

/* ==========================================================================
   ITEM 14 - MICROFONE DE MAO

   ANATOMIA (de baixo para cima):
     cabo rosa afunilado (fino embaixo) -> colar rosa-escuro (onde a grade
     encaixa) -> anel dourado -> cabeca-grade rosa-clara ACESA, achatada.

   MEDIDO: 0.23725 de altura, 0.09000 de largura, menor Y = 0.00000.
   PIVO: base do cabo, Y=0. O microfone fica EM PE - deitar e so girar o
   grupo em Z (o pivo vira o pe do cabo, que e o que se quer ao deitar).
   CUSTO MEDIDO: 2 draw calls, 240 triangulos (120 corpo + 120 cabeca).

   Decisoes que valem o comentario:
   - a cabeca AFUNDA no anel: o polo de baixo dela para em 0.1608, dentro da
     faixa do anel (0.157 -> 0.168), e ela sai pela tampa do anel num raio de
     0.026 contra 0.033 do anel. Ou seja: sobra 7mm de aro dourado visivel em
     volta da bola e nao existe fresta em nenhum angulo. Cabeca pousada em
     cima do anel abre fresta na primeira volta de camera.
   - a grade e pintada, nao modelada: 12 gomos no equador e cor alternada por
     gomo (indice par/impar, nao cosseno - com 12 gomos um cos(12*ang) cai
     sempre na mesma fase e some). Como os vertices duplicados dividem a
     posicao, o alternado vira nervura suave: le como tela de microfone.
   - o cabo e o unico que encosta no chao, entao e ele que leva o fBase alto
     (0.20). Cabo alto com degrade forte fica preto embaixo - licao ja paga
     na luminaria de piso.
   ========================================================================== */
window.QUARTO_MOVEIS.microfone = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'microfone';

  /* ---------- paleta (hex da ficha, sem subir tom no corpo) ---------- */
  var ROSA_CABO = 0xf2a0c0,    /* cabo (ficha) */
      ROSA_COLAR = 0xd98baf,   /* faixa escura da juncao grade/cabo */
      DOURADO = 0xf2b94b,      /* anel da junta (ficha) */
      GRADE = 0xffc2d8,        /* cabeca (ficha) */
      GRADE_TOPO = 0xfff0f5;   /* topo da cabeca: onde a grade "acende" */

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

  /* irma da `pinta` para a peca que ACENDE. Faz duas coisas de uma vez:
     (1) clareia por ALTURA numa faixa dada na mao (y0..y1) - a bola fica
         rosa embaixo e quente em cima, como bola de luz;
     (2) escurece de leve os gomos IMPARES do equador - a grade do microfone,
         desenhada com os vertices que a esfera ja tem.
     Chamar DEPOIS de posicionar a geometria: o degrade usa Y de mundo. */
  function acendeGrade(geo, corBaixo, corTopo, y0, y1, gomos, forca) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cB = new T.Color(corBaixo), cT = new T.Color(corTopo);
    var escuro = new T.Color(corBaixo).lerp(new T.Color(0x6a5a8f), 0.30);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var faixa = Math.max(0.001, y1 - y0), passo = Math.PI * 2 / gomos;
    for (var i = 0; i < n; i++) {
      var f = Math.min(1, Math.max(0, (pos.getY(i) - y0) / faixa));
      var c = cB.clone().lerp(cT, Math.pow(f, 1.35));
      var k = Math.round((Math.atan2(pos.getZ(i), pos.getX(i)) + Math.PI) / passo);
      if (k % 2 !== 0) { c.lerp(escuro, forca); }
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var corpo = [], brilho = [];

  /* ---------- cabo (afina para a base: 0.0215 no topo, 0.0165 no pe) ------
     10 lados: com 4cm de grossura ninguem le a facetagem, e sobra orcamento
     para a cabeca ser redonda de verdade. */
  var cabo = new T.CylinderGeometry(0.0215, 0.0165, 0.165, 10);
  cabo.translate(0, 0.0825, 0);                       /* 0.000 -> 0.165 */
  corpo.push(pinta(cabo, ROSA_CABO, 0.20));

  /* ---------- colar escuro da juncao (alarga para cima) ----------
     Comeca 2.8cm abaixo do topo do cabo, entao o cabo o atravessa em vez de
     encostar. E a "marca" onde a grade encaixa que a ficha pede. */
  var colar = new T.CylinderGeometry(0.0275, 0.0245, 0.026, 10);
  colar.translate(0, 0.150, 0);                       /* 0.137 -> 0.163 */
  corpo.push(pinta(colar, ROSA_COLAR, 0.16));

  /* ---------- anel dourado (o detalhe que da qualidade) ----------
     Sobrepoe 4mm o colar por baixo e recebe a bola por cima. */
  var anel = new T.CylinderGeometry(0.0330, 0.0320, 0.011, 10);
  anel.translate(0, 0.1625, 0);                       /* 0.157 -> 0.168 */
  corpo.push(pinta(anel, DOURADO, 0.14));

  /* ---------- CABECA-GRADE ACESA (esfera achatada, 12 gomos) ----------
     12 gomos no equador e 6 aneis: menos que isso e a bola vira diamante.
     Achatada em 0.85 (bola de microfone e mais larga que alta) e afundada
     ate o polo parar DENTRO do anel. */
  var RC = 0.045, YC = 0.199, ACHATA = 0.85;
  var cabeca = new T.SphereGeometry(RC, 12, 6);
  cabeca.scale(1, ACHATA, 1);
  cabeca.translate(0, YC, 0);                         /* 0.1608 -> 0.2373 */
  brilho.push(acendeGrade(cabeca, GRADE, GRADE_TOPO, YC - RC * ACHATA, YC + RC * ACHATA, 12, 0.16));

  /* ---------- 2 draw calls ---------- */
  var geoCorpo = BGU.mergeBufferGeometries(corpo);
  var malha = new T.Mesh(geoCorpo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'microfone_corpo';
  grupo.add(malha);

  var geoBrilho = BGU.mergeBufferGeometries(brilho);
  var malhaBrilho = new T.Mesh(geoBrilho, new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'microfone_grade';
  grupo.add(malhaBrilho);

  return { grupo: grupo, custo: { dc: 2, tri: 240 } };
};

/* ==========================================================================
   ITEM 15 - CAIXA MUSICAL (cubo com nota)

   ANATOMIA: cubo lilas de 0.32 com as 12 arestas e os 8 cantos chanfrados,
   uma JANELA octogonal aberta em 5 faces (as 4 laterais e o topo; o chao
   nao ganha janela porque olharia para o piso), a luz quente 10mm atras de
   cada vao e uma SEMINIMA dourada boiando na janela da frente e na de tras.

   MEDIDO: 0.32000 de altura, 0.32000 de largura, menor Y = 0.00000.
   PIVO: centro da base, Y=0 e o chao. As notas olham para +Z e -Z.
   CUSTO MEDIDO: 2 draw calls, 304 triangulos (214 corpo + 90 janelas).

   Decisoes que valem o comentario:
   - a casca chanfrada e escrita na mao (24 vertices, 44 triangulos: 6 faces,
     12 tirinhas de aresta, 8 cantinhos) porque BoxGeometry nao chanfra e
     inflar um bevel de Extrude custa caro numa forma tao simples. Cada
     triangulo sai por uma funcao que COMPARA a normal com o lado de fora e
     inverte sozinha se preciso - winding na mao em 44 faces e bug garantido.
   - a janela e um VAO de verdade, nao um adesivo: a moldura e um anel entre
     o quadrado da face e um octogono, e a luz fica 10mm ATRAS, num poco de
     paredes acesas. Painel grande e recuado NAO basta - eu tinha escrito que
     bastava e o teste de raio provou o contrario (45 raios rasantes entravam
     pelo vao e viam o avesso do cubo, que o culling apaga = buraco). Quem
     fecha e a parede do poco. O octogono existe porque o mundo e de feltro:
     vao quadrado num cubo vira grade de ar-condicionado.
   - a luz clareia de baixo para cima ao longo do cubo INTEIRO (0.02 -> 0.32),
     nao de cada painel: assim a janela do topo sai mais quente que as
     laterais, como luz que sobe, e as 4 laterais concordam entre si.
   - a nota nao encosta na moldura: ela boia dentro do vao e atravessa o
     painel aceso, entao le como peca solida contra a luz. Ela e do CORPO
     (Lambert): dourado com sombra propria contra o amarelo chapado da luz e
     o que da leitura - nota acesa sobre luz acesa sumiria.
   ========================================================================== */
window.QUARTO_MOVEIS.caixaMusica = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'caixa_musica';

  /* ---------- paleta ---------- */
  var LILAS = 0xa78bc9,        /* cubo (ficha) */
      NOTA = 0xffd35a,         /* seminima dourada (ficha) */
      LUZ_BAIXO = 0xffd98a,    /* janela acesa (ficha) */
      LUZ_TOPO = 0xffefc2;     /* topo da janela: a luz subindo */

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

  /* irma da `pinta` para a peca que ACENDE: clareia por ALTURA numa faixa
     dada na mao (y0..y1), para os 5 paineis usarem a MESMA regua - se cada
     um medisse a propria altura, os quatro laterais sairiam identicos e o do
     topo sairia com o degrade inteiro numa face de 20cm. */
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

  /* ---------- medidas do cubo ---------- */
  var H = 0.16,                /* meia-aresta: cubo de 0.32 */
      CH = 0.030,              /* chanfro das quinas */
      IN = H - CH,             /* 0.130: meia-aresta da face chata */
      CY = H,                  /* centro do cubo: pivo na base, Y=0 no chao */
      RJ = 0.105,              /* raio do octogono da janela (0.194 de vao) */
      REC = 0.010,             /* quanto a luz fica ATRAS do plano da face */
      PM = 0.125;              /* meia-largura do painel aceso (> RJ: veda) */

  /* escritor de triangulo que NAO depende de winding na mao: compara a
     normal com o lado de fora e inverte a ordem sozinho se ela apontar para
     dentro. Com 44 faces de casca + 60 de moldura, winding manual e bug. */
  function tri(alvo, p, q, r, fora) {
    var ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
    var vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * fora[0] + ny * fora[1] + nz * fora[2] < 0) { var t = q; q = r; r = t; }
    alvo.push(p[0], p[1], p[2], q[0], q[1], q[2], r[0], r[1], r[2]);
  }
  function quad(alvo, p, q, r, s, fora) { tri(alvo, p, q, r, fora); tri(alvo, p, r, s, fora); }

  /* as 6 faces do cubo: normal + os dois eixos do plano da face.
     `janela` = leva vao aceso (o chao nao leva: olharia para o piso). */
  var FACES = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], janela: true },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], janela: true },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], janela: true },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], janela: true },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], janela: true },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], janela: false }
  ];

  /* ponto do plano da face f, deslocado `a` no eixo u, `b` no eixo v e `d`
     ao longo da normal (d = H no plano da face, d = IN na quina, d = H-REC
     no painel aceso). Ja soma CY: a peca nasce com o pivo no chao. */
  function P(f, a, b, d) {
    return [
      f.n[0] * d + f.u[0] * a + f.v[0] * b,
      CY + f.n[1] * d + f.u[1] * a + f.v[1] * b,
      f.n[2] * d + f.u[2] * a + f.v[2] * b
    ];
  }

  var casca = [], janelas = [];
  var i, j, k, m, si, sj, sk;

  /* ---------- as 6 faces: moldura com vao octogonal (ou chapa, no chao) --- */
  for (i = 0; i < 6; i++) {
    var f = FACES[i];
    var O = [P(f, IN, IN, H), P(f, -IN, IN, H), P(f, -IN, -IN, H), P(f, IN, -IN, H)];
    if (!f.janela) { quad(casca, O[0], O[1], O[2], O[3], f.n); continue; }
    var B = [], BA = [];
    for (k = 0; k < 8; k++) {
      var ang = (22.5 + 45 * k) * Math.PI / 180;
      BA.push([RJ * Math.cos(ang), RJ * Math.sin(ang)]);
      B.push(P(f, BA[k][0], BA[k][1], H));
    }
    for (m = 0; m < 4; m++) {
      /* cantinho da moldura (o octogono tem 2 vertices em volta de cada
         quina do quadrado) e o pedaco reto ate a quina seguinte */
      tri(casca, O[m], B[(2 * m + 1) % 8], B[(2 * m) % 8], f.n);
      quad(casca, O[m], O[(m + 1) % 4], B[(2 * m + 2) % 8], B[(2 * m + 1) % 8], f.n);
    }
    /* PAREDES do poco da janela, do vao ate o painel, olhando para dentro.
       Elas nao sao enfeite: sem elas, um raio rasante (>70 graus da normal)
       entra pelo vao POR CIMA do painel e ve o avesso do cubo - buraco
       piscando quando a camera anda. MEDIDO: 45 raios vazavam sem elas, 0
       com elas. E de brinde elas sao a espessura da luz: o poco aceso e o
       que faz a caixa parecer iluminada por dentro, nao adesivada. */
    for (k = 0; k < 8; k++) {
      var k2 = (k + 1) % 8;
      var ma = (BA[k][0] + BA[k2][0]) / 2, mb = (BA[k][1] + BA[k2][1]) / 2;
      var mm = Math.sqrt(ma * ma + mb * mb) || 1;
      var dentro = [
        -(f.u[0] * ma + f.v[0] * mb) / mm,
        -(f.u[1] * ma + f.v[1] * mb) / mm,
        -(f.u[2] * ma + f.v[2] * mb) / mm
      ];
      quad(janelas, B[k], B[k2],
        P(f, BA[k2][0], BA[k2][1], H - REC), P(f, BA[k][0], BA[k][1], H - REC), dentro);
    }
    /* painel ACESO no fundo do poco, maior que o vao */
    quad(janelas, P(f, PM, PM, H - REC), P(f, -PM, PM, H - REC),
      P(f, -PM, -PM, H - REC), P(f, PM, -PM, H - REC), f.n);
  }

  /* ---------- as 12 tirinhas de aresta e os 8 cantinhos do chanfro -------
     Enumerados por eixo/sinal em vez de escritos um a um: 12 arestas = 3
     pares de eixos x 4 combinacoes de sinal; 8 cantos = 2^3 sinais. */
  function pt(x, y, z) { return [x, y + CY, z]; }
  function eixo(iEixo, jEixo, vi, vj, vk) {
    var c = [0, 0, 0], kEixo = 3 - iEixo - jEixo;
    c[iEixo] = vi; c[jEixo] = vj; c[kEixo] = vk;
    return pt(c[0], c[1], c[2]);
  }
  for (i = 0; i < 3; i++) {
    for (j = i + 1; j < 3; j++) {
      for (si = -1; si <= 1; si += 2) {
        for (sj = -1; sj <= 1; sj += 2) {
          var fora = [0, 0, 0]; fora[i] = si; fora[j] = sj;
          quad(casca,
            eixo(i, j, si * H, sj * IN, IN), eixo(i, j, si * H, sj * IN, -IN),
            eixo(i, j, si * IN, sj * H, -IN), eixo(i, j, si * IN, sj * H, IN), fora);
        }
      }
    }
  }
  for (si = -1; si <= 1; si += 2) {
    for (sj = -1; sj <= 1; sj += 2) {
      for (sk = -1; sk <= 1; sk += 2) {
        tri(casca,
          pt(si * H, sj * IN, sk * IN), pt(si * IN, sj * H, sk * IN),
          pt(si * IN, sj * IN, sk * H), [si, sj, sk]);
      }
    }
  }

  var geoCasca = new T.BufferGeometry();
  geoCasca.setAttribute('position', new T.BufferAttribute(new Float32Array(casca), 3));

  var corpo = [pinta(geoCasca, LILAS, 0.16)], brilho = [];

  /* ---------- SEMINIMA dourada (bolinha + hastezinha) ----------
     Espessura 0.040 centrada NO plano da face: sai 0.020 para fora (a
     saliencia que a ficha pede) e entra 0.020, atravessando o painel aceso -
     por isso ela nunca divide plano com nada. A haste e 6mm mais fina que a
     cabeca de proposito: com a mesma espessura, as tampas das duas cairiam
     no mesmo plano e as duas se sobrepoem - briga de profundidade na certa.
     `sz` espelha a nota para a face de tras continuar lida do jeito certo. */
  function nota(sz) {
    var cabeca = new T.CylinderGeometry(0.036, 0.036, 0.040, 12);
    cabeca.rotateX(Math.PI / 2);          /* disco olhando para +Z */
    cabeca.scale(1, 0.74, 1);             /* vira elipse (bolinha de nota) */
    cabeca.rotateZ(-0.35 * sz);           /* tombada ~20 graus */
    cabeca.translate(-0.020 * sz, 0.122, H * sz);
    corpo.push(pinta(cabeca, NOTA, 0.18));

    var haste = new T.BoxGeometry(0.011, 0.115, 0.034);
    haste.translate(0.010 * sz, 0.1795, H * sz);   /* 0.122 -> 0.237 */
    corpo.push(pinta(haste, NOTA, 0.18));
  }
  nota(1);
  nota(-1);

  var geoJanelas = new T.BufferGeometry();
  geoJanelas.setAttribute('position', new T.BufferAttribute(new Float32Array(janelas), 3));
  brilho.push(acendeY(geoJanelas, LUZ_BAIXO, LUZ_TOPO, 0.02, 0.32, 0.85));

  /* ---------- 2 draw calls ---------- */
  var geoCorpo = BGU.mergeBufferGeometries(corpo);
  var malha = new T.Mesh(geoCorpo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'caixa_musica_corpo';
  grupo.add(malha);

  var geoBrilho = BGU.mergeBufferGeometries(brilho);
  var malhaBrilho = new T.Mesh(geoBrilho, new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'caixa_musica_luz';
  grupo.add(malhaBrilho);

  return { grupo: grupo, custo: { dc: 2, tri: 304 } };
};
