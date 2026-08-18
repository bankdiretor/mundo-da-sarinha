/* playground.js - BALANCO + ESCORREGADOR: os dois brinquedos classicos que
   faltavam no Parque (42, 0).

   NAMESPACE PROPRIO (`window.PARQUE_BRINQUEDOS`), nao `MUNDO_PARTES`:
   `montarPartes()` monta TUDO que existir em MUNDO_PARTES, e ja plantou um
   castelo desmontado no meio da praca por causa disso. Quem integra escolhe
   onde chamar e ja recebe os colisores sugeridos em `grupo.userData.colisores`
   (coordenada LOCAL - reprojetar pela matrixWorld se o conjunto for girado).

   CONTRATO (partes/CONTRATO.md): zero luz nova, zero sombra de engine, zero
   textura externa, zero material PBR, ASCII puro.
   Corpo = UMA malha MeshLambertMaterial({vertexColors, flatShading}) sobre
   geometrias mescladas. A estrelinha do escorregador "acende" numa 2a malha
   MeshBasicMaterial (unico jeito de acender sem luz nova).

   AS ARMADILHAS QUE MAIS BATERAM AQUI (e como foram resolvidas):

   1) BARRA INCLINADA FURA O CHAO. Girar uma barra em torno do proprio centro
      joga o canto do pe abaixo de y=0 (a barra do X ja furou 7,6 mm neste
      projeto). Aqui NENHUMA barra inclinada e girada: todas usam
      CISALHAMENTO (`cisalhaZ`, z' = z + k*y). O cisalhamento nao mexe em y,
      entao a base continua plana em y=0 e o topo continua plano contra a
      travessa/plataforma. Vale para as 4 pernas do balanco, os 2 montantes
      da escada e os 2 corrimaos.

   2) ASSENTO PENDURADO FLUTUANDO. A haste nasce no EIXO da travessa
      (y=2.285, dentro do tubo de raio 0.105) e morre DENTRO do assento
      (2 cm abaixo do tampo). Sobreposicao real nas duas pontas, nada de
      encostar "no olho".

   3) FACE COPLANAR (z-fighting). Tudo que encosta em algo, encosta ENTERRADO:
      - guarda-corpo afunda 4 cm no tablado (nao pousa em cima dele);
      - calha da rampa TRANSBORDA 7,5 cm para fora da lateral do tablado
        (se ficasse rente, as duas laterais virariam o mesmo plano);
      - degrau e mais estreito que o vao entre os montantes e morre DENTRO
        deles; calha e 10 cm mais curta que o tablado;
      - topo dos pilares em y=1.49, entre o piso da plataforma (1.44) e o
        tampo (1.50) - nunca rente a nenhum dos dois.

   4) PIGMENTO. Mundo noturno de ceu roxo com 2 luzes: face vertical rende
      ~60% do pigmento. Os hex da ficha subiram ~10% em direcao ao branco
      SO nas pecas verticais (madeira, calha, corrimao); o tablado da rampa,
      que e uma face virada para cima, ficou no hex puro da ficha
      (#9FB4D8) - subir tom em face iluminada lava a cor.

   5) fBase (o degrade vertical) alto escurece superficie grande: 0.05 no
      tablado longo da rampa, 0.06 no piso da plataforma, 0.10-0.16 em peca
      pequena.

   CUSTO MEDIDO em node com o three r147 real (~/arena-3d/node_modules/three),
   nunca chutado - os numeros estao no cabecalho de cada funcao. */
window.PARQUE_BRINQUEDOS = window.PARQUE_BRINQUEDOS || {};

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     FERRAMENTAS (T so existe dentro do construtor, entao viram fabrica)
     --------------------------------------------------------------------- */
  function ferramentas(T) {
    var CINZA = new T.Color(0x6a5a8f);

    /* `pinta` canonica da skill: normaliza indice, tira uv (senao o merge
       devolve null em silencio) e faz o degrade vertical. */
    function pinta(geo, cor, fBase) {
      geo = geo.index ? geo.toNonIndexed() : geo;
      geo.deleteAttribute('uv');
      var cTopo = new T.Color(cor),
          cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.12 : fBase);
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

    /* CISALHAMENTO em Z: z' = z + k*y. Inclina a barra SEM girar - o pe
       continua plano no chao e o topo plano contra a travessa. E o conserto
       da armadilha "girar peca inclinada faz o pe furar o chao". */
    function cisalhaZ(geo, k) {
      var m = new T.Matrix4();
      m.set(1, 0, 0, 0,
            0, 1, 0, 0,
            0, k, 1, 0,
            0, 0, 0, 1);
      geo.applyMatrix4(m);
      geo.deleteAttribute('normal');   /* cisalhamento invalida a normal; pinta refaz */
      return geo;
    }

    /* gira em torno de um eixo X que passa por y=yPivo (z=0): e assim que o
       assento "balancado" sai do prumo sem sair da travessa. */
    function gira(geo, ang, yPivo) {
      geo.translate(0, -yPivo, 0);
      geo.rotateX(ang);
      geo.translate(0, yPivo, 0);
      return geo;
    }

    /* estrela de 5 pontas, ponta para cima (Shape 2D) */
    function formaEstrela(R1, R2) {
      var s = new T.Shape(), i, ang, r, x, y;
      for (i = 0; i < 10; i++) {
        ang = Math.PI / 2 + (i / 10) * Math.PI * 2;
        r = (i % 2 === 0) ? R1 : R2;
        x = Math.cos(ang) * r; y = Math.sin(ang) * r;
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.closePath();
      return s;
    }

    return { pinta: pinta, cisalhaZ: cisalhaZ, gira: gira, formaEstrela: formaEstrela };
  }

  /* =====================================================================
     BALANCO
     Dois porticos em A de madeira mel sustentando uma travessa; dois
     assentos pendurados por hastes finas douradas, em alturas diferentes,
     e o lilas inclinado 8 graus (o mundo nao pode parecer parado).

     MEDIDO em node/three r147: bbox 3.4000 (X) x 2.4019 (Y) x 1.6700 (Z),
     menor Y = 0.000000, pivo em x=0/z=0, merge nao-null, 0 par coplanar.
     A altura 2.4019 (e nao 2.4000) e a argola de suspensao: ela abraca a
     travessa e sobra 2 mm acima da bracadeira. Vertice mais claro #F0DCA8
     (luminancia 0.865) - dentro do teto fisico, nada estourado.
     CUSTO MEDIDO: 1 draw call, 376 triangulos.
     ===================================================================== */
  window.PARQUE_BRINQUEDOS.balanco = function (T) {
    var BGU = T.BufferGeometryUtils, F = ferramentas(T), pinta = F.pinta;
    var grupo = new T.Group();
    grupo.name = 'balanco';

    /* paleta: hex da ficha entre parenteses; vertical subiu ~10% p/ o branco */
    var MEL = 0xddaf7b,        /* (#D9A66C) pernas, travessa, travessao do A */
        MEL_ESC = 0xc9985d,    /* bracadeira no topo do A */
        HASTE = 0xf0dca8,      /* haste/argola dourada clara */
        ROSA = 0xf585a8,       /* (#F2789F) assento 1 */
        LILAS = 0xb89ad5;      /* (#A78BC9) assento 2 */

    var VAO = 3.40;            /* largura total = comprimento da travessa */
    var X_PORT = 1.45;         /* x dos porticos (a travessa sobra 0.25 de cada lado) */
    var Y_TRAV = 2.285;        /* eixo da travessa */
    var R_TRAV = 0.105;
    var Z_PE = 0.75;           /* abertura do A no chao */
    var Z_TOPO = 0.08;         /* z de cada perna la em cima (0.16 de folga: nao se cruzam) */

    var pecas = [];

    /* --- 4 pernas em A (cisalhadas, pe plano em y=0) + travessao do A --- */
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sz) {
        var perna = new T.CylinderGeometry(0.062, 0.085, Y_TRAV, 6, 1, false);
        perna.translate(0, Y_TRAV / 2, 0);          /* pe em y=0 */
        perna.translate(0, 0, sz * Z_PE);
        F.cisalhaZ(perna, sz * (Z_TOPO - Z_PE) / Y_TRAV);
        perna.translate(sx * X_PORT, 0, 0);
        pecas.push(pinta(perna, MEL, 0.10));
      });

      /* travessao horizontal: e ele que faz o portico LER como "A".
         Em y=0.85 as pernas estao em z=+-0.5008 (raio 0.076 ali), entao a
         barra de 1.06 morre dentro das duas. */
      var trav = new T.BoxGeometry(0.075, 0.075, 1.06);
      trav.translate(sx * X_PORT, 0.85, 0);
      pecas.push(pinta(trav, MEL_ESC, 0.14));

      /* bracadeira do topo: esconde o encontro das duas pernas com a
         travessa e da o remate de 2.40 de altura */
      var brac = new T.BoxGeometry(0.28, 0.24, 0.36);
      brac.translate(sx * X_PORT, 2.28, 0);
      pecas.push(pinta(brac, MEL_ESC, 0.16));
    });

    /* --- travessa horizontal (eixo em X) --- */
    var travessa = new T.CylinderGeometry(R_TRAV, R_TRAV, VAO, 8, 1, false);
    travessa.rotateZ(Math.PI / 2);
    travessa.translate(0, Y_TRAV, 0);
    pecas.push(pinta(travessa, MEL, 0.12));

    /* --- os dois assentos ---------------------------------------------
       Cada um: 2 argolas na travessa + 2 hastes + tampo arredondado +
       2 blocos de encaixe. A haste NASCE no eixo da travessa (dentro do
       tubo) e MORRE 2 cm dentro do tampo: nada flutua. */
    function assento(xc, yTampo, cor, incl) {
      var meio = 0.17;                       /* meia-distancia entre as hastes */
      var yCentro = yTampo - 0.056;          /* meia-espessura do tampo */
      var partes = [];

      [-1, 1].forEach(function (s) {
        var xr = xc + s * meio;

        /* argola de suspensao: manga aberta em volta da travessa (fica na
           travessa mesmo quando o assento balanca) */
        var arg = new T.CylinderGeometry(0.135, 0.135, 0.09, 6, 1, true);
        arg.rotateZ(Math.PI / 2);
        arg.translate(xr, Y_TRAV, 0);
        pecas.push(pinta(arg, HASTE, 0.14));

        /* haste fina: do eixo da travessa ate dentro do tampo */
        var yBase = yCentro + 0.036;         /* 2 cm abaixo do tampo, dentro dele */
        var comp = Y_TRAV - yBase;
        var haste = new T.CylinderGeometry(0.022, 0.022, comp, 5, 1, true);
        haste.translate(xr, yBase + comp / 2, 0);
        partes.push(pinta(haste, HASTE, 0.08));

        /* bloco de encaixe: afunda 3 cm no tampo e e recuado 4 cm da ponta
           dele (rente = par coplanar) */
        var bl = new T.BoxGeometry(0.07, 0.10, 0.22);
        bl.translate(xr, yTampo + 0.02, 0);
        partes.push(pinta(bl, cor, 0.14));
      });

      /* tampo: cilindro deitado em X e achatado -> 0.46 x 0.28 x 0.112,
         cantos redondos de feltro em vez de tabua quadrada */
      var tampo = new T.CylinderGeometry(0.14, 0.14, 0.46, 8, 1, false);
      tampo.rotateZ(Math.PI / 2);
      tampo.scale(1, 0.40, 1);
      tampo.deleteAttribute('normal');       /* escala nao-uniforme: pinta refaz */
      tampo.translate(xc, yCentro, 0);
      partes.push(pinta(tampo, cor, 0.14));

      if (incl) partes.forEach(function (g) { F.gira(g, incl, Y_TRAV); });
      partes.forEach(function (g) { pecas.push(g); });
    }

    assento(-0.62, 0.58, ROSA, 0);                  /* rosa: mais baixo, no prumo */
    assento(0.62, 0.70, LILAS, -8 * Math.PI / 180); /* lilas: mais alto e balancando p/ +Z */

    /* --- 1 draw call --- */
    var geo = BGU.mergeBufferGeometries(pecas);
    var malha = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    malha.name = 'balanco_malha';
    grupo.add(malha);

    /* colisores em coordenada LOCAL (quem integra reprojeta) */
    grupo.userData.altura = 2.40;
    grupo.userData.largura = VAO;
    grupo.userData.colisores = [
      { x: -X_PORT, z: -Z_PE, raio: 0.28 }, { x: -X_PORT, z: Z_PE, raio: 0.28 },
      { x: X_PORT, z: -Z_PE, raio: 0.28 }, { x: X_PORT, z: Z_PE, raio: 0.28 }
    ];

    return { grupo: grupo, custo: { dc: 1, tri: 376 } };
  };

  /* =====================================================================
     ESCORREGADOR
     Torre baixa com plataforma em 1.50, escadinha de 4 degraus no -Z e
     rampa lisa descendo para +Z, com calhas laterais levantadas. Corrimao
     dos dois lados da escada e estrelinha dourada no mastro.

     MEDIDO em node/three r147: bbox 1.0723 (X) x 2.0000 (Y) x 4.0153 (Z),
     menor Y = 0.000000, pivo em x=0/z=0 (a peca nasce torta em Z e e
     recentrada no fim - ver "PIVO no centro da base" la embaixo),
     merge nao-null, 0 par coplanar nas duas malhas. A rampa foi conferida
     amostrando o tablado: y=1.500 no topo e y=0.065 na ponta, ou seja
     DESCE PARA +Z. Vertice mais claro #F5CB80 (luminancia 0.810).
     CUSTO MEDIDO: 2 draw calls (corpo Lambert + estrela MeshBasic),
     398 + 36 = 434 triangulos.
     ===================================================================== */
  window.PARQUE_BRINQUEDOS.escorregador = function (T) {
    var BGU = T.BufferGeometryUtils, F = ferramentas(T), pinta = F.pinta;
    var grupo = new T.Group();
    grupo.name = 'escorregador';

    var MEL = 0xddaf7b,        /* (#D9A66C) estrutura */
        MEL_ESC = 0xc9985d,    /* degraus */
        AZUL = 0x9fb4d8,       /* (#9FB4D8) tablado da rampa - hex PURO: face p/ cima */
        AMARELO = 0xf5cb80,    /* (#F2C069) calhas */
        ROSA = 0xf585a8,       /* corrimao (mesma familia do balanco) */
        OURO = 0xffd166;       /* estrela */

    var corpo = [];

    /* --- plataforma ---------------------------------------------------- */
    var PLAT_Y0 = 1.44, PLAT_Y1 = 1.50;       /* piso e tampo do tablado */
    var PLAT_Z0 = -0.88, PLAT_Z1 = -0.18;
    var PLAT_MX = 0.45;

    var plat = new T.BoxGeometry(PLAT_MX * 2, PLAT_Y1 - PLAT_Y0, PLAT_Z1 - PLAT_Z0);
    plat.translate(0, (PLAT_Y0 + PLAT_Y1) / 2, (PLAT_Z0 + PLAT_Z1) / 2);
    corpo.push(pinta(plat, MEL, 0.06));

    /* 4 pilares: topo em 1.49, ENTRE o piso (1.44) e o tampo (1.50) da
       plataforma - nunca rente a nenhum dos dois (z-fighting) */
    var POSTE_TOPO = 1.49;
    [-0.34, 0.34].forEach(function (px) {
      [-0.78, -0.28].forEach(function (pz) {
        var p = new T.CylinderGeometry(0.06, 0.07, POSTE_TOPO, 6, 1, false);
        p.translate(px, POSTE_TOPO / 2, pz);
        corpo.push(pinta(p, MEL, 0.10));
      });
    });

    /* guarda-corpo: AFUNDA ate 1.46 (dentro do tablado) e e recuado dos
       quatro lados dele - pousar em cima = 2 faces no mesmo plano */
    [-1, 1].forEach(function (s) {
      var g = new T.BoxGeometry(0.12, 0.40, 0.66);
      g.translate(s * 0.36, 1.66, -0.53);
      corpo.push(pinta(g, MEL, 0.12));
    });

    /* --- rampa ---------------------------------------------------------
       O tablado desce para +Z. A inclinacao NAO foi escolhida no olho: ela
       sai de exigir que o canto de baixo da rampa toque exatamente y=0.
       Como a espessura e medida na PERPENDICULAR, a altura da ponta e
       `esp * cos(ang)` e o angulo depende dela - dai a iteracao (converge
       em 4 voltas). Sem isso a quina da rampa enterra 6,5 cm no chao. */
    var R_RUN = 1.98, R_ALTO = 1.50, R_ESP = 0.08, R_ZTOPO = -0.18;
    var R_BAIXO = 0, R_ANG = 0, it;
    for (it = 0; it < 10; it++) {
      R_ANG = Math.atan((R_ALTO - R_BAIXO) / R_RUN);
      R_BAIXO = R_ESP * Math.cos(R_ANG);
    }
    var R_COMP = Math.hypot(R_RUN, R_ALTO - R_BAIXO);
    var R_CY = (R_ALTO + R_BAIXO) / 2, R_CZ = R_ZTOPO + R_RUN / 2;

    /* leva a geometria do referencial da rampa (superficie em y=0, eixo Z)
       para o mundo */
    function naRampa(geo) {
      geo.rotateX(R_ANG);
      geo.translate(0, R_CY, R_CZ);
      return geo;
    }

    var tab = new T.BoxGeometry(0.80, R_ESP, R_COMP);
    tab.translate(0, -R_ESP / 2, 0);           /* superficie de escorregar em y=0 */
    corpo.push(pinta(naRampa(tab), AZUL, 0.05));

    /* calhas: tubo de 6 lados AFUNDADO 5,5 cm no tablado e TRANSBORDANDO
       7,5 cm para fora da lateral dele (rente = plano compartilhado), e
       5 cm mais curto em cada ponta (idem nas tampas) */
    [-1, 1].forEach(function (s) {
      var c = new T.CylinderGeometry(0.075, 0.075, R_COMP - 0.10, 6, 1, false);
      c.rotateX(Math.PI / 2);
      c.translate(s * 0.40, 0.02, 0);
      corpo.push(pinta(naRampa(c), AMARELO, 0.12));
    });

    /* 2 pezinhos sob a rampa (a barriga dela nao pode ficar no ar) */
    [-0.28, 0.28].forEach(function (px) {
      var pe = new T.CylinderGeometry(0.05, 0.055, 0.70, 5, 1, true);
      pe.translate(px, 0.35, 0.85);
      corpo.push(pinta(pe, MEL, 0.10));
    });

    /* --- escada: 2 montantes cisalhados + 4 degraus -------------------- */
    var E_Z0 = -2.02, E_Z1 = -1.00, E_ALT = 1.47;   /* eixo do montante */
    var E_K = (E_Z1 - E_Z0) / E_ALT;
    var E_MX = 0.38;

    [-1, 1].forEach(function (s) {
      var m = new T.BoxGeometry(0.09, E_ALT, 0.36);
      m.translate(0, E_ALT / 2, E_Z0);
      F.cisalhaZ(m, E_K);                    /* base plana em y=0, topo plano em 1.47 */
      m.translate(s * E_MX, 0, 0);
      corpo.push(pinta(m, MEL, 0.10));
    });

    /* degraus centrados no eixo do montante e 0.72 de largura: as pontas
       morrem DENTRO dos montantes (0.335..0.425), nunca rentes */
    [0.30, 0.60, 0.90, 1.20].forEach(function (yTopo) {
      var yc = yTopo - 0.035;
      var d = new T.BoxGeometry(0.72, 0.07, 0.26);
      d.translate(0, yc, E_Z0 + E_K * yc);
      corpo.push(pinta(d, MEL_ESC, 0.14));
    });

    /* --- corrimao dos dois lados --------------------------------------
       Mesma inclinacao do montante (mesmo k), so que 0.62 mais alto: o
       corrimao e o montante deslocado para cima, entao ele nasce no mesmo
       z da base. Dois pes verticais, cada um mirando o EIXO do corrimao na
       altura em que encosta (senao a ponta do pe aparece por tras). */
    var C_Y0 = 0.62, C_ALT = 1.28, C_MX = 0.50;
    [-1, 1].forEach(function (s) {
      var b = new T.BoxGeometry(0.07, C_ALT, 0.16);
      b.translate(0, C_ALT / 2, E_Z0);
      F.cisalhaZ(b, E_K);
      b.translate(s * C_MX, C_Y0, 0);
      corpo.push(pinta(b, ROSA, 0.12));

      [0.74, 1.84].forEach(function (yTopo) {
        var pz = E_Z0 + E_K * (yTopo - C_Y0);
        var p = new T.CylinderGeometry(0.032, 0.038, yTopo, 5, 1, false);
        p.translate(s * C_MX, yTopo / 2, pz);
        corpo.push(pinta(p, ROSA, 0.10));
      });
    });

    /* --- mastro da estrela (corpo) ------------------------------------- */
    var MASTRO_Z = -0.53, MASTRO_TOPO = 1.84;
    var mastro = new T.CylinderGeometry(0.032, 0.038, MASTRO_TOPO - 1.46, 5, 1, true);
    mastro.translate(0, (1.46 + MASTRO_TOPO) / 2, MASTRO_Z);
    corpo.push(pinta(mastro, MEL, 0.12));

    /* --- estrelinha que "acende" (MeshBasic, sem luz nova) -------------
       bevelEnabled:false de proposito: com bevel o r147 infla a forma em
       raiz(2)*bevelSize e a estrela sai maior do que a pedida. */
    var geoEstrela = new T.ExtrudeGeometry(F.formaEstrela(0.13, 0.055), {
      depth: 0.035, bevelEnabled: false, curveSegments: 1
    });
    geoEstrela.translate(0, 1.87, MASTRO_Z - 0.0175);
    geoEstrela = geoEstrela.index ? geoEstrela.toNonIndexed() : geoEstrela;
    geoEstrela.deleteAttribute('uv');
    (function () {
      var n = geoEstrela.attributes.position.count, a = new Float32Array(n * 3), c = new T.Color(OURO), i;
      for (i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      geoEstrela.setAttribute('color', new T.BufferAttribute(a, 3));
      if (!geoEstrela.attributes.normal) geoEstrela.computeVertexNormals();
    })();

    var geoCorpo = BGU.mergeBufferGeometries(corpo);

    /* --- PIVO no centro da base ----------------------------------------
       A montagem nasce desequilibrada em Z (a escada vai a -2.20 e a ponta
       da calha para em +1.8154), entao o "centro" cairia 19 cm fora do
       meio do brinquedo. Uma translacao unica, MEDIDA da propria caixa,
       poe a pegada centrada em x=0/z=0 - assim quem planta a peca no mapa
       usa a coordenada do brinquedo e nao a do canto dele. Y nao entra na
       conta: o chao continua sendo y=0. */
    geoCorpo.computeBoundingBox();
    geoEstrela.computeBoundingBox();
    var cx = geoCorpo.boundingBox.clone().union(geoEstrela.boundingBox).getCenter(new T.Vector3());
    var DX = -cx.x, DZ = -cx.z;
    geoCorpo.translate(DX, 0, DZ);
    geoEstrela.translate(DX, 0, DZ);

    /* --- DC 1: corpo Lambert --- */
    var malha = new T.Mesh(geoCorpo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    malha.name = 'escorregador_malha';
    grupo.add(malha);

    /* --- DC 2: estrela --- */
    var malhaEstrela = new T.Mesh(geoEstrela, new T.MeshBasicMaterial({ vertexColors: true }));
    malhaEstrela.name = 'escorregador_estrela';
    grupo.add(malhaEstrela);

    grupo.userData.altura = 2.00;
    grupo.userData.comprimento = 4.02;
    /* colisores em coordenada LOCAL, ja no frame recentrado */
    grupo.userData.colisores = [
      { x: 0, z: -0.53 + DZ, raio: 0.62 },   /* torre */
      { x: 0, z: -1.60 + DZ, raio: 0.55 },   /* escada */
      { x: 0, z: 0.40 + DZ, raio: 0.50 },    /* rampa (meio) */
      { x: 0, z: 1.40 + DZ, raio: 0.50 }
    ];
    /* onde a crianca sobe e onde ela chega no chao (frame recentrado) */
    grupo.userData.pePraEscada = { x: 0, z: -2.10 + DZ };
    grupo.userData.saidaDaRampa = { x: 0, z: 1.80 + DZ };

    return { grupo: grupo, custo: { dc: 2, tri: 434 } };
  };
})();
