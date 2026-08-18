/* QUARTO_MOVEIS.poltrona - a POLTRONA-PUFF DE PELUCIA com almofada de
   ESTRELA (itens 31 e 32 da ficha do quarto da menina).

   Puff de chao tipo "saco de feijao" (bean bag) infantil, lilas: massa
   larga amassada no chao, ENCOSTO ALTO e continuo atras, bracos moles
   descendo das costas para a frente, assento macio com depressao suave
   no meio e uma almofada-estrela dourada encostada no encosto.

   MEDIDO (three r147 em node, nao chutado): 1.102 (X) x 1.007 (Z);
   topo do encosto 0.767; fundo da cova do assento 0.350 e borda 0.439.
   O encosto da 2.19x a altura do assento, como manda a ficha.
   Pivo no centro da base, Y=0 = chao. Frente (lado aberto) em +Z.

   CONTRATO: 1 malha so (Lambert + cor por vertice + flatShading), sem
   luz, sem sombra de engine, sem textura, ASCII puro, sem import.
   Sombra = elipse escura pintada. MEDIDO: 1 draw call, 634 triangulos.

   --- v2, depois da inspecao na luz real do quarto ---
   [cor] v1 saiu branco-lavado: eu passava o tom CLARO como cor e contava
     com o degrade para descer ate o #B9A0DC. Num quarto de piso claro
     isso estoura. Agora o volume recebe o hex da ficha SEM subir
     (#B9A0DC) e o relevo vem do fBase (0.16); o #CBB4E8 fica so na
     almofada do assento, que e a face que realmente olha para cima.
     Compensar pigmento para cima so vale em ambiente ESCURO.
   [silhueta] v1 lia como boia de piscina: um anel baixo com buraco no
     meio. Tres causas, tres correcoes:
       1. o encosto era uma fatia fina -> virou massa grossa (0.46 de
          profundidade) mais um rolo de coroamento em cima ("ombro"),
          entao le como costas do movel de qualquer angulo;
       2. havia um rolo alto na FRENTE que fechava o anel -> removido;
          a frente agora e a propria barriga baixa, e a silhueta de lado
          virou um "C" cheio (alto atras, baixo na frente), nao um "U";
       3. os bracos eram salsichas horizontais soltas -> agora nascem la
          em cima nas costas (y~0.65) e desabam para a frente (y~0.16),
          costurando encosto e barriga numa peca so.
     Os 80 triangulos do rolo da frente pagaram o "ombro" do encosto.

   Como a maciez foi feita sem gastar triangulo:
   - `ruga`   : desloca cada vertice ao longo do proprio raio por uma
                funcao deterministica da posicao (mesma posicao = mesmo
                deslocamento, entao nao abre fenda entre faces). Com
                flatShading vira "pano cheio", nao ovo liso.
   - `assenta`: achata a barriga contra o chao e alarga a saia: o puff
                fica mais largo embaixo, como saco de feijao ocupado.
   - `afunda` : cava a depressao do assento na almofada E na massa de
                baixo (senao a massa de baixo espeta pela depressao).
   Com flatShading o three calcula a normal por derivada de tela, entao
   deformar posicao depois de criada a geometria e seguro: a faceta sai
   com a normal certa sem recomputar nada. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};
window.QUARTO_MOVEIS.poltrona = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'poltrona';

  /* ---------- paleta (hex da ficha, sem subir tom) ---------- */
  var LILAS = 0xb9a0dc,          /* volume do corpo (ficha) */
      LILAS_ASSENTO = 0xcbb4e8,  /* topo: a almofada onde a crianca senta */
      LILAS_VINCO = 0x9b82c4,    /* costura encosto/assento (ficha) */
      DOURADO = 0xffd35a,        /* estrela (ficha) */
      DOURADO_BOTAO = 0xefb63c;  /* botao de almofada no meio da estrela */

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

  /* ---------- deformadores de tecido ---------- */

  /* amassa a esfera ao longo do proprio raio (usar ANTES de scale/translate) */
  function ruga(geo, amp, semente) {
    var pos = geo.attributes.position, i;
    for (i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      var f = Math.sin(x * 7.1 + semente) * Math.cos(z * 6.3 + semente * 1.7)
            + 0.6 * Math.sin(y * 8.4 - semente * 0.9);
      var k = 1 + amp * f;
      pos.setXYZ(i, x * k, y * k, z * k);
    }
    pos.needsUpdate = true;
    return geo;
  }

  /* achata a barriga no chao e alarga a saia (usar DEPOIS de posicionar) */
  function assenta(geo, yPiso, yLim, expansao) {
    var pos = geo.attributes.position, i;
    for (i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y >= yLim) continue;
      var t = Math.min(1, (yLim - y) / Math.max(0.001, yLim - yPiso));
      var k = 1 + expansao * t * t;
      pos.setXYZ(i, x * k, Math.max(yPiso, y), z * k);
    }
    pos.needsUpdate = true;
    return geo;
  }

  /* cava a depressao do bumbum (so na metade de cima do volume) */
  function afunda(geo, cx, cz, yBase, hy, raio, prof) {
    var pos = geo.attributes.position, i;
    for (i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      var dx = x - cx, dz = z - cz;
      var d = Math.sqrt(dx * dx + dz * dz) / raio;
      if (d >= 1) continue;
      var w = (y - yBase) / hy;
      if (w <= 0) continue;
      if (w > 1) w = 1;
      var q = Math.cos(d * Math.PI * 0.5);
      pos.setY(i, y - prof * q * q * w);
    }
    pos.needsUpdate = true;
    return geo;
  }

  var pecas = [];

  /* ---------- sombra de contato (elipse pintada; regra do cenario claro) ----
     Menor que a silhueta e quase toda escondida pela barriga do puff:
     ancora a peca no chao sem virar adesivo em piso de cor desconhecida. */
  var sombra = new T.CircleGeometry(1, 10);
  sombra.rotateX(-Math.PI / 2);
  sombra.scale(0.49, 1, 0.50);
  sombra.translate(0, 0.006, 0.00);
  pecas.push(pinta(sombra, CINZA.clone(), 0.0));

  /* ---------- BARRIGA (a massa que desaba no chao) ---------- */
  var corpo = new T.IcosahedronGeometry(0.5, 1);
  ruga(corpo, 0.050, 0.7);
  corpo.scale(1.00, 0.46, 0.98);
  corpo.translate(0, 0.215, 0.015);
  assenta(corpo, 0.015, 0.17, 0.10);
  /* a cova da barriga e mais funda e mais larga que a da almofada,
     senao ela espeta para fora justamente no meio do assento */
  afunda(corpo, 0, 0.16, 0.215, 0.23, 0.42, 0.20);
  pecas.push(pinta(corpo, LILAS, 0.16));

  /* ---------- ENCOSTO: massa grossa e alta, do chao ao topo ---------- */
  var encosto = new T.IcosahedronGeometry(0.5, 1);
  ruga(encosto, 0.045, 2.3);
  encosto.scale(1.00, 0.74, 0.54);
  encosto.rotateX(-0.16);            /* recosta para tras */
  encosto.translate(0, 0.378, -0.250);
  assenta(encosto, 0.015, 0.18, 0.05);
  pecas.push(pinta(encosto, LILAS, 0.16));

  /* ---------- OMBRO: rolo que coroa o encosto ----------
     E o que faz o encosto ler como "costas do movel" de longe e de tras,
     e o que fecha a emenda com os bracos. */
  var ombro = new T.IcosahedronGeometry(0.5, 1);
  ruga(ombro, 0.045, 4.6);
  ombro.scale(0.92, 0.30, 0.32);
  ombro.rotateX(-0.20);
  ombro.translate(0, 0.620, -0.240);
  pecas.push(pinta(ombro, LILAS, 0.15));

  /* ---------- BRACOS MOLES: nascem nas costas e desabam para a frente ----
     A inclinacao forte em X e o que faz a silhueta de lado virar um "C"
     (alto atras, baixo na frente) em vez de um "U" simetrico. */
  var lado;
  for (lado = -1; lado <= 1; lado += 2) {
    var braco = new T.IcosahedronGeometry(0.5, 1);
    ruga(braco, 0.050, 3.1 + lado * 1.4);
    braco.scale(0.28, 0.30, 0.66);
    braco.rotateX(0.34);             /* a ponta da frente desaba ate a barriga */
    braco.rotateZ(lado * -0.10);     /* e escorrega para fora, mole */
    braco.translate(lado * 0.408, 0.398, 0.02);
    pecas.push(pinta(braco, LILAS, 0.16));
  }

  /* ---------- ALMOFADA DO ASSENTO (a superficie macia, com a cova) ----
     Unica peca no tom claro da ficha: e a face que olha para cima.
     Duas licoes medidas aqui: (a) a cova precisa ser MAIS FUNDA que a
     corcova natural do elipsoide (0.12), senao as duas se anulam e o
     assento vira plato liso; (b) o RAIO tem que ser bem menor que a
     almofada (0.30 contra 0.42/0.37), senao ela abaixa a peca inteira em
     vez de cavar e continua plana. O degrade do `pinta` escurece o fundo
     da bacia sozinho, o que reforca a leitura de "afunda aqui". */
  var assento = new T.IcosahedronGeometry(0.5, 1);
  ruga(assento, 0.040, 7.7);
  assento.scale(0.84, 0.24, 0.74);
  assento.translate(0, 0.340, 0.06);
  afunda(assento, 0, 0.16, 0.340, 0.12, 0.30, 0.150);
  pecas.push(pinta(assento, LILAS_ASSENTO, 0.15));

  /* ---------- VINCO/COSTURA: debrum da almofada do assento ----------
     Meio toro meio enterrado na borda da frente da almofada: le como
     debrum (o cordao costurado da estofaria) e desenha o contorno do
     assento, que e o que faz o olho entender "aqui se senta".
     Duas tentativas anteriores foram MEDIDAS e descartadas por raycast:
     na emenda encosto/assento o cordao fica 100% invisivel, porque essa
     faixa inteira esta debaixo da estrela (que se apoia justo ali) e dos
     bracos. Na borda da frente ele aparece do inicio ao fim e a
     superficie e quase plana (0.373 a 0.397), entao um arco rigido
     encosta certo em toda a extensao. */
  var vinco = new T.TorusGeometry(0.33, 0.027, 3, 8, Math.PI);
  vinco.rotateX(Math.PI / 2);        /* o arco passa a abracar a frente */
  vinco.scale(1, 1, 1.03);
  vinco.translate(0, 0.385, 0.060);
  pecas.push(pinta(vinco, LILAS_VINCO, 0.06));

  /* ---------- ALMOFADA ESTRELA (o charme da peca) ----------
     Estrela de 5 pontas gorda (raio interno 52% do externo: braco cheio,
     cara de pelucia, e sobra carne para o chanfro nao se cruzar).
     Chanfro (bevel) de 1 segmento = borda macia por 60 triangulos. */
  var RE = 0.245, RI = 0.128, PROF = 0.095, CHAN = 0.030;
  var forma = new T.Shape();
  var p, raio, ang, px, py;
  for (p = 0; p < 10; p++) {
    raio = (p % 2 === 0) ? RE : RI;
    ang = Math.PI / 2 + p * Math.PI / 5;
    px = Math.cos(ang) * raio; py = Math.sin(ang) * raio;
    if (p === 0) forma.moveTo(px, py); else forma.lineTo(px, py);
  }
  /* sem closePath: o ExtrudeGeometry ja fecha o contorno, e fechar na mao
     duplicaria o primeiro ponto (aresta degenerada). */
  var estrela = new T.ExtrudeGeometry(forma, {
    depth: PROF, bevelEnabled: true, bevelThickness: 0.034,
    bevelSize: CHAN, bevelOffset: 0, bevelSegments: 1, steps: 1, curveSegments: 1
  });

  /* botao de almofada no meio da face da frente */
  var botao = new T.IcosahedronGeometry(0.052, 0);
  botao.scale(1, 1, 0.45);
  botao.translate(0, 0, PROF + 0.034 + 0.006);

  /* leva as duas para o lugar: centra em Z, gira de leve, deita no encosto */
  var alma = [estrela, botao], g;
  for (g = 0; g < alma.length; g++) {
    alma[g].translate(0, 0, -(PROF / 2 + 0.017));
    alma[g].rotateZ(0.13);           /* torta, como almofada jogada */
    alma[g].rotateX(-0.70);          /* deitada no encosto */
    alma[g].translate(0.025, 0.565, 0.030);
  }
  pecas.push(pinta(estrela, DOURADO, 0.16));
  pecas.push(pinta(botao, DOURADO_BOTAO, 0.02));

  /* ---------- 1 draw call ---------- */
  var geo = BGU.mergeBufferGeometries(pecas);
  var malha = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'poltrona_malha';
  grupo.add(malha);

  return {
    grupo: grupo,
    custo: { dc: 1, tri: 634 }
  };
};
