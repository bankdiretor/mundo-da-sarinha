/* SarinhaTop01 — CHAR-08: CAMISETA do look "Classica Sarinha" (Mini Style).
   Casca que SUBSTITUI o torso (hideTorso:true), manga curta, estrela de 5
   pontas no peito em accentColor. Briefing: BRIEFING-ROUPA-NOVA.md.

   DECISOES ESTRUTURAIS (as armadilhas R1-R4 do briefing aplicadas):
   R4 — a casca NAO e uma forma nova: e a MESMA capsula do torso do CHAR-00
        (r 0.28, comprimento 0.22, escala [1.357,1,0.85], centro y+0.34 em
        pelvis-space), inflada +0.015 DEPOIS — forma e folga separadas, a
        mesma licao paga 4 vezes no cabelo curto.
   R2 — manga curta: 0.136 a partir do ombro (teto 0.15), raio de abertura
        0.163 (piso 0.135) e leve inclinacao para fora, para o braco girar
        sem raspar.
   R3 — a estrela fica 0.016 A FRENTE da superficie do peito (piso 0.012),
        e cada vertice dela e PROJETADO sobre a curva do peito — decal que
        acompanha o volume, nao um papel chapado boiando.

   TECNICA DA CASCA: em vez de cortar uma CapsuleGeometry (o polo de baixo
   tem x=z=0 e o angulo do vertice se perde — colapsaria a barra num ponto,
   o mesmo defeito dos aneis travados que o cabelo pagou), a casca nasce de
   uma SphereGeometry ABERTA embaixo (thetaLength < PI): o angulo vem do UV
   e o parametro vertical e REMAPEADO sobre o perfil da capsula, com
   espacamento cosseno (denso nos casquetes, economico no cilindro). O anel
   de baixo cai exatamente na barra — barra reta, nenhum vertice colapsado.

   ⚠️ three r147: ExtrudeGeometry com bevel infla sqrt(2)*bevelSize — a
   estrela e ShapeGeometry pura, sem extrusao.

   Contrato do mundo: 1 malha (ClothMesh), MeshLambertMaterial vertexColors,
   cor por vertice, sem luz/sombra/textura, sem import/export, ASCII puro. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  var C = {
    /* a capsula do torso do CHAR-00, copiada numero a numero */
    raio:       0.28,
    meiaAltura: 0.11,               /* torsoLength/2 */
    escala:     [1.357, 1.00, 0.85],
    centroY:    0.34,               /* centro do torso em pelvis-space */
    folga:      0.015,              /* R4: infla DEPOIS, nunca na forma */

    topoLocal:  0.39,               /* topo da capsula (some dentro da cabeca) */
    /* barra em y=-0.02 do pelvis: -0.36 local. A folga empurra o anel da
       barra ~0.013 para BAIXO (a normal ali aponta para baixo-fora), entao
       o corte e feito em -0.347 para a barra FINAL cair em -0.36. */
    hemLocal:   -0.347,
    segCasca:   [10, 7],            /* 130 tri */
    thetaFim:   Math.PI * 0.96,

    /* manga: ombro em (+-0.365, +0.583); comprimento 0.136 <= 0.15 (R2) */
    ombroX:     0.365,
    ombroY:     0.583,
    tiltManga:  0.10,               /* abre para fora — folga extra no balanco */
    segManga:   7,
    /* perfil de revolucao [raio, y], de baixo para cima: abertura larga,
       corpo do tubo, e domo quase fechado ACIMA do ombro (cobre a junta;
       ali o braco nao varre, o raio pode afinar) */
    perfilManga: [
      [0.163, 0.447],
      [0.155, 0.520],
      [0.120, 0.598],
      [0.010, 0.632]
    ],

    /* estrela de 5 pontas no peito */
    estrelaY:     0.42,             /* centro, em pelvis-space */
    estrelaRaio:  0.11,
    estrelaMiolo: 0.045,            /* raio interno ~0.41 do externo */
    estrelaFolga: 0.016,            /* R3: >= 0.012 senao pisca */

    /* disco interno na barra: o torso esta escondido — sem ele, olhando de
       baixo, a camiseta e um tubo vazado que mostra o ceu pelo pescoco */
    discoY:  -0.012,
    discoRX:  0.195,
    discoRZ:  0.122,
    segDisco: 10
  };

  var COR_PANO    = 0xC9A7D8;   /* lavanda da folha mestre */
  var COR_DETALHE = 0xF2D98A;   /* dourado CLARO da estrela — 0xffd166 e
                                   reservado ao coletavel do jogo */

  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo — normaliza uv/indice (senao o merge devolve
     null em silencio) e faz o degrade vertical. fBase negativo CLAREIA a
     base, compensando a luz noturna que apaga a barriga dos volumes. */
  function pinta(T, geo, cor, fBase) {
    if (!CINZA) { CINZA = new T.Color(0x6a5a8f); BRANCO = new T.Color(0xffffff); }
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    if (fBase === undefined) fBase = 0.10;
    var cTopo = new T.Color(cor),
        cBase = (fBase < 0) ? new T.Color(cor).lerp(BRANCO, -fBase)
              : (fBase === 0) ? new T.Color(cor)
                              : new T.Color(cor).lerp(CINZA, fBase);
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

  /* raio horizontal da capsula do torso numa altura local (0 = centro) */
  function raioCapsula(yl) {
    var d = Math.abs(yl) - C.meiaAltura;
    if (d <= 0) return C.raio;
    return Math.sqrt(Math.max(0, C.raio * C.raio - d * d));
  }

  /* z da superficie EXTERNA da casca (ja com folga) num ponto (x, yPelvis)
     da frente — usado para assentar a estrela sobre a curva do peito */
  function zCasca(x, yPelvis) {
    var yl = yPelvis - C.centroY;
    var r = raioCapsula(yl);
    var a = r * C.escala[0] + C.folga;
    var c = r * C.escala[2] + C.folga;
    var q = 1 - (x * x) / Math.max(0.0001, a * a);
    return c * Math.sqrt(Math.max(0, q));
  }

  /* casca da camiseta: esfera aberta reparametrizada sobre a capsula do
     torso. O angulo vem do UV (funciona ate no polo, onde x=z=0); o
     parametro vertical usa espacamento cosseno — denso nos casquetes, onde
     ha curvatura, e economico no cilindro, que e reto. */
  function casca(T, cor) {
    var g = new T.SphereGeometry(1, C.segCasca[0], C.segCasca[1], 0, Math.PI * 2, 0, C.thetaFim);
    var pos = g.attributes.position, uv = g.attributes.uv;
    var kden = 1 - Math.cos(C.thetaFim);
    var i, u, vv, ang, phi, s, yl, r, sx, sz, x, y, z, s0, nx, ny, nz, nl;
    for (i = 0; i < pos.count; i++) {
      u = uv.getX(i); vv = uv.getY(i);          /* uv.y: 1 no topo, 0 na barra */
      ang = u * Math.PI * 2;                    /* ang 0 = frente (+Z) */
      phi = (1 - vv) * C.thetaFim;
      s = (1 - Math.cos(phi)) / kden;           /* 0 topo · 1 barra, cosseno */
      yl = C.topoLocal + s * (C.hemLocal - C.topoLocal);
      r = raioCapsula(yl);
      sx = Math.sin(ang); sz = Math.cos(ang);

      /* forma base: a capsula ESCALADA do torso — identica ao CHAR-00 */
      x = sx * r * C.escala[0];
      y = yl;
      z = sz * r * C.escala[2];

      /* R4: infla +folga ao longo da normal VERDADEIRA da capsula escalada
         (normal da capsula crua corrigida pela inversa da escala) — a folga
         e uniforme de verdade, nao 2% maior num eixo e menor no outro */
      s0 = Math.max(-C.meiaAltura, Math.min(C.meiaAltura, yl));
      nx = sx * r; ny = yl - s0; nz = sz * r;
      nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      nx /= C.escala[0]; nz /= C.escala[2];
      nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      x += nx / nl * C.folga;
      y += ny / nl * C.folga;
      z += nz / nl * C.folga;

      pos.setXYZ(i, x, y + C.centroY, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.16);
  }

  /* manga: solido de revolucao construido a mao — winding controlado
     (⛔ scale(-1,1,1) para espelhar SOME com a peca; como a revolucao e
     simetrica, a manga esquerda e a MESMA geometria transladada). */
  function manga(T, cor, lado) {
    var v = [];
    function tri(p, q, r) { v.push(p[0], p[1], p[2], q[0], q[1], q[2], r[0], r[1], r[2]); }
    var n = C.segManga, per = C.perfilManga, TAU = Math.PI * 2;
    var i, j, a0, a1, s0, c0, s1, c1, rb, yb, rt, yt, A, B, Cq, D;
    for (i = 0; i < n; i++) {
      a0 = i / n * TAU; a1 = (i + 1) / n * TAU;
      s0 = Math.sin(a0); c0 = Math.cos(a0);
      s1 = Math.sin(a1); c1 = Math.cos(a1);
      for (j = 0; j < per.length - 1; j++) {
        rb = per[j][0]; yb = per[j][1];
        rt = per[j + 1][0]; yt = per[j + 1][1];
        A  = [rb * s0, yb, rb * c0]; B = [rb * s1, yb, rb * c1];
        Cq = [rt * s0, yt, rt * c0]; D = [rt * s1, yt, rt * c1];
        tri(A, B, Cq); tri(Cq, B, D);      /* winding para FORA, conferido */
      }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    /* inclina para fora girando em torno do OMBRO, nao do meio da manga */
    g.translate(0, -C.ombroY, 0);
    g.rotateZ(lado * C.tiltManga);
    g.translate(lado * C.ombroX, C.ombroY, 0);
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.14);
  }

  /* estrela de 5 pontas: ShapeGeometry chata (sem extrusao — bevel do r147
     infla sqrt(2)x), com cada vertice assentado sobre a curva do peito */
  function estrela(T, cor) {
    var forma = new T.Shape();
    var i, ang, r, px, py;
    for (i = 0; i < 10; i++) {
      ang = Math.PI / 2 + i * Math.PI / 5;      /* comeca na ponta de CIMA */
      r = (i % 2 === 0) ? C.estrelaRaio : C.estrelaMiolo;
      px = Math.cos(ang) * r; py = Math.sin(ang) * r;
      if (i === 0) forma.moveTo(px, py); else forma.lineTo(px, py);
    }
    forma.closePath();
    var g = new T.ShapeGeometry(forma);        /* CCW -> face para +Z */
    var pos = g.attributes.position;
    var sx, sy;
    for (i = 0; i < pos.count; i++) {
      sx = pos.getX(i); sy = pos.getY(i) + C.estrelaY;
      pos.setXYZ(i, sx, sy, zCasca(sx, sy) + C.estrelaFolga);
    }
    pos.needsUpdate = true;
    return pinta(T, g, cor, 0);
  }

  /* disco interno da barra, virado para BAIXO — fecha o tubo por dentro */
  function disco(T, cor) {
    var v = [], n = C.segDisco, TAU = Math.PI * 2, i, a0, a1;
    for (i = 0; i < n; i++) {
      a0 = i / n * TAU; a1 = (i + 1) / n * TAU;
      v.push(0, C.discoY, 0,
             C.discoRX * Math.sin(a1), C.discoY, C.discoRZ * Math.cos(a1),
             C.discoRX * Math.sin(a0), C.discoY, C.discoRZ * Math.cos(a0));
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return pinta(T, g, cor, 0.35);             /* sombreado: le como interior */
  }

  window.SARINHA_PERSONAGENS.createSarinhaTop01 = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var corPano    = opts.clothColor  === undefined ? COR_PANO    : opts.clothColor;
    var corDetalhe = opts.accentColor === undefined ? COR_DETALHE : opts.accentColor;
    var material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var pecas = [
      casca(T, corPano),
      manga(T, corPano, +1),
      manga(T, corPano, -1),
      estrela(T, corDetalhe),
      disco(T, corPano)
    ];
    var geo = BGU.mergeBufferGeometries(pecas, false);
    if (!geo) throw new Error('merge da camiseta devolveu null');

    var grupo = new T.Group();
    grupo.name = 'SarinhaTop01';
    var malha = new T.Mesh(geo, material);
    malha.name = 'ClothMesh';
    grupo.add(malha);

    /* o Assembler pendura este grupo NO PELVIS em posicao zero — a peca ja
       nasce no lugar; nada de anexar ao corpo nem girar aqui */
    grupo.userData = {
      type: 'SarinhaTop01',
      version: '1.0',
      tipoRoupa: 'top',
      hideTorso: true,
      legPaint: null,
      clothColor: corPano,
      accentColor: corDetalhe
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.TOP01_MEASURES = C;
})();
