/* mesa.js - dois moveis do quarto da Sarinha, no mesmo arquivo:

     mesaRedonda  (item 33) - a mesinha de centro infantil, redonda e BAIXA,
                              de sentar no chao. Cor mel/madeira clara.
     livroEstrela (item 35) - o livro fechado, deitado, capa lilas com uma
                              estrela dourada que acende. Vai EM CIMA da mesa.

   Namespace proprio (QUARTO_MOVEIS), assinatura function(T): o interior do
   quarto nao recebe o ctx do mundo, so o THREE. Cada funcao e uma fabrica pura
   e devolve { grupo, custo }.

   Sem luz nova, sem sombra de engine, sem textura, sem MeshStandardMaterial,
   sem emissive, sem import/require, ASCII puro. Corpo = UMA malha Lambert com
   cor por vertice e flatShading sobre geometrias mescladas; o que acende (so a
   estrela do livro) = uma segunda malha MeshBasic.

   ARMADILHAS DESTE PROJETO, RESPEITADAS AQUI (medido, nao no olho):
   - mergeBufferGeometries devolve null calado se os atributos nao baterem:
     TODA peca passa por `pinta`, que normaliza indice e apaga o uv.
   - faces coplanares sobrepostas piscam: a auditoria automatica das duas pecas
     fecha em ZERO pares (nenhum plano e compartilhado por duas faces que se
     cruzam em area). No livro isso foi conseguido escolhendo os planos um a um
     - nenhuma cota se repete entre capa, lombada e miolo.
   - o quarto e CLARO: os hex da ficha entram como estao; o volume vem so do
     fBase (0.10 a 0.18). Nada de clarear pigmento.
   - encaixe nunca encosta exato: perna entra 0.01 no tampo, miolo e lombada
     entram 0.002 nas capas, estrela afunda 0.002 na capa.
   - ConeGeometry (que nasce com um triangulo degenerado por gomo no r147) nao
     e usada aqui: as perninhas sao cilindros truncados, sem lixo. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};

/* ==================================================================== */
/* ITEM 33 - MESA REDONDA BAIXA                                         */
/* ==================================================================== */
/* Tampo redondo de raio 0.42 e 0.06 de espessura com a borda chanfrada, sobre
   quatro perninhas abertas para fora, o pe mais fino que o topo.
   Altura total 0.34. PIVO: centro da base, Y=0 e o CHAO.
   CUSTO MEDIDO: 1 draw call, 272 triangulos. */
window.QUARTO_MOVEIS.mesaRedonda = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'mesaRedonda';

  /* ---------- paleta (hex da ficha, sem clarear) ---------- */
  var MEL = 0xf2c069,        /* tampo */
      MADEIRA = 0xd9a66c;    /* perninhas */

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

  /* ---------- ajudantes ---------- */
  /* Chanfra a borda de um cilindro reto SEM peca nova e SEM emenda: um
     CylinderGeometry(raio, raio, alt, gomos, 3) nasce com 4 aneis laterais
     (y = -alt/2, -alt/6, +alt/6, +alt/2). Aqui os dois aneis do MEIO sao
     empurrados para +-(alt/2 - chY) e inchados ate `raio`, e os dois de BORDA
     (que sao os mesmos aneis onde as tampas se apoiam) sao encolhidos para
     `raio - chR`. Sai o perfil chanfrado:
        (r-chR, base) -> (r, base+chY) -> (r, topo-chY) -> (r-chR, topo)
     Como o anel da tampa e o anel da lateral sao encolhidos pela MESMA conta,
     a costura fecha exata - nada de disco separado, nada de fase trocada entre
     CircleGeometry e CylinderGeometry (essa e a emenda que costuma abrir). */
  function chanfraBorda(geo, alt, raio, chR, chY) {
    var meia = alt / 2, pos = geo.attributes.position;
    var i, x, y, z, r, alvo, k;
    for (i = 0; i < pos.count; i++) {
      x = pos.getX(i); y = pos.getY(i); z = pos.getZ(i);
      r = Math.sqrt(x * x + z * z);
      if (r < 1e-6) continue;                    /* centro das tampas: fica */
      if (Math.abs(y) > meia * 0.5) {
        alvo = raio - chR;                       /* anel de borda: encolhe */
      } else {
        alvo = raio;                             /* anel do meio: incha... */
        pos.setY(i, (y > 0 ? 1 : -1) * (meia - chY));   /* ...e sobe/desce */
      }
      k = alvo / r;
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();                  /* mexeu no vertice, refaz */
    return geo;
  }

  /* Abre a perna para fora por CISALHAMENTO, nao por rotacao. Cada fatia
     horizontal so escorrega em X, entao a tampa de baixo continua HORIZONTAL e
     apoiada exata em Y=0 - o pe assenta chapado no chao.
     Girar a perna (o caminho obvio) inclinaria o pe junto e a borda de baixo do
     disco furaria o piso em ~3.7mm de um lado, deixando a mesa na ponta dos
     pes: e a mesma armadilha que ja custou o `barraX` do teclado, so que aqui
     o cisalhamento a elimina na raiz em vez de compensar na mao. */
  function abreParaFora(geo, alt, desvio) {
    var pos = geo.attributes.position, i, f;
    for (i = 0; i < pos.count; i++) {
      f = 1 - Math.max(0, Math.min(1, pos.getY(i) / alt));   /* 1 no pe, 0 no topo */
      pos.setX(i, pos.getX(i) + desvio * f);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  var pecas = [];

  /* ============ TAMPO ============
     18 gomos: com flatShading o tampo le como um disco de feltro recortado a
     mao (corda de 146mm), que e o acabamento do mundo - e cabe no orcamento
     junto com as quatro pernas. */
  var RAIO = 0.42, ESP = 0.06, TAMPO_Y0 = 0.28;   /* topo em 0.34 = altura total */
  var tampo = new T.CylinderGeometry(RAIO, RAIO, ESP, 18, 3);
  chanfraBorda(tampo, ESP, RAIO, 0.02, 0.015);
  tampo.translate(0, TAMPO_Y0 + ESP / 2, 0);
  /* fBase 0.16: a barriga do tampo escurece e a cara de cima sai no mel puro
     (os vertices do disco de cima estao todos no maxY, entao f=1 neles). */
  pecas.push(pinta(tampo, MEL, 0.16));

  /* ============ PERNINHAS ============
     Sobem ate 0.29 e o tampo comeca em 0.28: 0.01 de sobreposicao, nunca
     encosto exato. O disco de cima da perna morre enterrado no tampo.
     Ficam nas DIAGONAIS: de frente a crianca ve duas perninhas abertas em V,
     que e o desenho de mesa infantil; a 0/90 graus uma perna esconderia a
     outra. */
  var P_ALT = 0.29,          /* do chao ate dentro do tampo */
      P_R_TOPO = 0.30,       /* distancia do centro no alto */
      P_DESVIO = 0.05,       /* quanto o pe abre para fora (pe em 0.35) */
      P_GROSSO = 0.032,      /* raio no topo */
      P_FINO = 0.022;        /* raio no pe: o pe e MAIS FINO que o topo */
  var p, perna;
  for (p = 0; p < 4; p++) {
    perna = new T.CylinderGeometry(P_GROSSO, P_FINO, P_ALT, 8, 1);
    perna.translate(0, P_ALT / 2, 0);            /* base em Y=0 */
    abreParaFora(perna, P_ALT, P_DESVIO);
    perna.translate(P_R_TOPO, 0, 0);
    perna.rotateY(Math.PI / 4 + p * Math.PI / 2);
    /* fBase 0.18: o pe entra na penumbra do chao e a perna ganha volume sem
       precisar de sombra pintada (o piso do quarto e claro demais para um
       disco escuro por baixo de uma mesa de 34cm). */
    pecas.push(pinta(perna, MADEIRA, 0.18));
  }

  /* ---------- DC 1: corpo ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

  return { grupo: grupo, custo: { dc: 1, tri: 272 } };
};

/* ==================================================================== */
/* ITEM 35 - LIVRO COM ESTRELA                                          */
/* ==================================================================== */
/* Livro fechado e deitado, 0.300 (X) x 0.220 (Z) x 0.060 de altura, lombada em
   -X. Capa lilas envolvendo (contracapa + lombada + capa), miolo creme
   aparecendo 0.010 nas tres bordas livres, estrela dourada 0.012 saliente.
   PIVO: centro da base, Y=0 e a superficie onde ele apoia (vai na mesa).
   CUSTO MEDIDO: 2 draw calls, 84 triangulos (48 no corpo + 36 na estrela). */
window.QUARTO_MOVEIS.livroEstrela = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'livroEstrela';

  /* ---------- paleta (hex da ficha, sem clarear) ---------- */
  var LILAS = 0x8e6fc0,      /* capa, contracapa e lombada */
      PAGINA = 0xf8f0e4,     /* miolo */
      OURO = 0xffd35a;       /* estrela (a unica coisa que acende) */

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

  /* Caixa dada pelos EXTREMOS, nao por centro+tamanho: o livro e uma pilha de
     quatro blocos que se atravessam, e a unica forma de garantir no papel que
     nenhuma cota se repete e escrever as cotas. A auditoria confere depois. */
  function caixa(x0, x1, y0, y1, z0, z1) {
    var g = new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return g;
  }

  var corpo = [], brilho = [];

  /* ============ AS QUATRO COTAS (nenhuma se repete) ============
     X: -0.150 lombada | -0.145 capas | -0.140 miolo | -0.130 lombada (face de
        dentro) | +0.140 miolo | +0.150 capas
     Y:  0.000 / 0.008 contracapa | 0.004 / 0.056 lombada
         0.006 / 0.054 miolo       | 0.052 / 0.060 capa
     Z: +-0.110 capas | +-0.105 lombada | +-0.100 miolo
     Nenhum plano e dividido por duas faces que se cruzam em area -> zero
     z-fighting. A capa sobra 0.010 alem do miolo nas tres bordas livres, e a
     lombada sobra 0.005 para fora da capa (a "barriga" da encadernacao). */

  /* contracapa: fBase alto porque ela e a face que encosta na mesa */
  corpo.push(pinta(caixa(-0.145, 0.150, 0.000, 0.008, -0.110, 0.110), LILAS, 0.18));

  /* lombada: atravessa as duas capas 0.002 por dentro (o topo dela morre em
     0.056, entre 0.052 e 0.060 da capa) e sai 0.005 para fora em -X */
  corpo.push(pinta(caixa(-0.150, -0.130, 0.004, 0.056, -0.105, 0.105), LILAS, 0.16));

  /* miolo: entra 0.002 em cada capa e 0.010 dentro da lombada, entao as tres
     faces que ele mostra sao so as tres bordas livres - fore-edge e as duas
     laterais. fBase 0.14 da o degrade que le como folha empilhada. */
  corpo.push(pinta(caixa(-0.140, 0.140, 0.006, 0.054, -0.100, 0.100), PAGINA, 0.14));

  /* capa de cima: e a cara do objeto, entao fBase baixo. O disco de cima cai
     todo no maxY da peca, logo sai no lilas puro da ficha. */
  corpo.push(pinta(caixa(-0.145, 0.150, 0.052, 0.060, -0.110, 0.110), LILAS, 0.10));

  /* ============ ESTRELA (MeshBasic: acende sem luz nova) ============
     Prisma de 5 pontas de 0.014 de espessura assentado em y=0.058: afunda
     0.002 na capa (nada de face rente com o topo em 0.060) e sobra 0.012
     saliente, como manda a ficha.
     0.024/0.056 = 3/7: e EXATAMENTE a proporcao das estrelas da caixa de
     brinquedos (0.075/0.175), para as duas pecas lerem como a mesma estrela do
     quarto. A luminaria usa 0.49, mais gorda, mas la a estrela e a propria luz
     e precisa de carne para acender - aqui ela e um carimbo. */
  var PONTAS = 5, R_EXT = 0.056, R_INT = 0.024, E_ESP = 0.014, E_Y0 = 0.058;
  var forma = new T.Shape(), i, ang, r;
  for (i = 0; i < PONTAS * 2; i++) {
    r = (i % 2 === 0) ? R_EXT : R_INT;
    /* comeca em -90 graus: depois do rotateX(-PI/2) essa ponta olha para +Z */
    ang = -Math.PI / 2 + i * Math.PI / PONTAS;
    if (i === 0) forma.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    else forma.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  forma.closePath();
  var estrela = new T.ExtrudeGeometry(forma, {
    depth: E_ESP, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  estrela.rotateX(-Math.PI / 2);        /* extrusao passa a subir em +Y */
  estrela.rotateY(0.16);                /* torta de proposito: parece colada a mao */
  estrela.translate(0.005, E_Y0, 0);    /* centrada na parte visivel da capa */
  /* fBase 0.14 no MeshBasic nao e luz, e desenho: sem Lambert as laterais do
     prisma sairiam do MESMO ouro chapado da cara de cima e a estrela viraria
     uma mancha sem espessura. O degrade e o que faz a ponta ter volume. */
  brilho.push(pinta(estrela, OURO, 0.14));

  /* ---------- DC 1: corpo ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

  /* ---------- DC 2: o que acende ---------- */
  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'livro_brilho';
  grupo.add(malhaBrilho);

  return { grupo: grupo, custo: { dc: 2, tri: 84 } };
};
