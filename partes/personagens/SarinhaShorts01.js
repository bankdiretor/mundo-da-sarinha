/* SarinhaShorts01 — CHAR-10: o SHORT do Sarinha Mini Style (look dos meninos
   Theo/Davi da folha mestre).

   ⛔ A DECISAO ESTRUTURAL (armadilha R1): a perna balanca ±0.62 rad — um tubo
   estatico na coxa deixaria a perna atravessando o pano. Por isso o short e:
   · uma FAIXA DE QUADRIL estatica (cos), construida como a sainha (casca com
     parede interna + tampas), de y=+0.04 a y=-0.10;
   · + `legPaint: { thigh:'cloth' }` — o Assembler pinta a COXA da cor do short
     e a pintura acompanha a perna que balanca. A faixa da o arremate; a
     pintura da o comprimento.

   Contrato do mundo: 1 malha MeshLambertMaterial vertexColors flatShading,
   cor por vertice via pinta, sem luz, sem sombra, sem textura, sem import. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  var C = {
    gomos: 12,
    /* perfil da faixa (pelvis-space): colada no quadril em cima, abrindo o
       suficiente para as coxas (x ±0.294) passarem por dentro no balanco */
    yTopo:  0.040, rTopo:  0.238,
    yBarra: -0.100, rBarra: 0.276,
    espessura: 0.012,
    /* barra com um recorte sutil de "perninha" de short: desce um pouco nas
       laterais (sobre as coxas) e sobe no meio — le como bainha costurada */
    bainhaAmp: 0.010,
    sombraInterna: 0.28
  };

  var COR_PADRAO = 0x9FB4D8;   /* azul suave da paleta */
  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo (mesma dos vizinhos) */
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

  function anel(yBase, rBase, folga, ehBarra) {
    var pts = [], k, ang, r, y;
    for (k = 0; k < C.gomos; k++) {
      ang = (k / C.gomos) * Math.PI * 2;
      r = rBase - folga;
      y = yBase;
      /* bainha: desce sobre as coxas (|sin| alto), sobe no meio (frente/tras) */
      if (ehBarra) y -= C.bainhaAmp * Math.abs(Math.sin(ang));
      pts.push([Math.sin(ang) * r, y, Math.cos(ang) * r]);
    }
    return pts;
  }

  function fazGeo(T, quads) {
    var v = [], i, q;
    function tri(p, s, r2) { v.push(p[0], p[1], p[2], s[0], s[1], s[2], r2[0], r2[1], r2[2]); }
    for (i = 0; i < quads.length; i++) {
      q = quads[i]; tri(q[0], q[1], q[2]); tri(q[0], q[2], q[3]);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return g;
  }
  function parede(T, cima, baixo, dentro) {
    var quads = [], k, k2;
    for (k = 0; k < C.gomos; k++) {
      k2 = (k + 1) % C.gomos;
      if (!dentro) quads.push([cima[k], baixo[k], baixo[k2], cima[k2]]);
      else         quads.push([cima[k], cima[k2], baixo[k2], baixo[k]]);
    }
    return fazGeo(T, quads);
  }
  function tampa(T, fora, dentroA, paraBaixo) {
    var quads = [], k, k2;
    for (k = 0; k < C.gomos; k++) {
      k2 = (k + 1) % C.gomos;
      if (paraBaixo) quads.push([fora[k], dentroA[k], dentroA[k2], fora[k2]]);
      else           quads.push([fora[k], fora[k2], dentroA[k2], dentroA[k]]);
    }
    return fazGeo(T, quads);
  }

  window.SARINHA_PERSONAGENS.createSarinhaShorts01 = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var cor = opts.clothColor === undefined ? COR_PADRAO : opts.clothColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var oT = anel(C.yTopo, C.rTopo, 0, false),
        oB = anel(C.yBarra, C.rBarra, 0, true),
        iT = anel(C.yTopo, C.rTopo, C.espessura, false),
        iB = anel(C.yBarra, C.rBarra, C.espessura, true);

    var corDentro = new T.Color(cor).lerp(new T.Color(0x6a5a8f), C.sombraInterna);
    var partes = [
      pinta(T, parede(T, oT, oB, false), cor, -0.12),
      pinta(T, parede(T, iT, iB, true), corDentro, 0.10),
      pinta(T, tampa(T, oB, iB, true), cor, 0),
      pinta(T, tampa(T, oT, iT, false), cor, 0)
    ];
    var geo = BGU.mergeBufferGeometries(partes);
    if (!geo) throw new Error('merge do short devolveu null');

    var grupo = new T.Group();
    grupo.name = 'SarinhaShorts01';
    var malha = new T.Mesh(geo, material);
    malha.name = 'ClothMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaShorts01',
      version: '1.0',
      clothColor: cor,
      tipoRoupa: 'bottom',
      hideTorso: false,
      /* a coxa vira "perna do short" por pintura — acompanha o movimento */
      legPaint: { thigh: 'cloth', lowerLeg: 'skin', foot: null }
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.SHORTS01_MEASURES = C;
})();
