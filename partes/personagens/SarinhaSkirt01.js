/* SarinhaSkirt01 — CHAR-09: a SAINHA rosa do look "Classica Sarinha" do
   Sarinha Mini Style. Roupa 'bottom': cone suave (evase) preso na cintura,
   pregas sugeridas por FACETAS (12 gomos + flat shading) e barra levemente
   ondulada mas coesa.

   Contrato (BRIEFING-ROUPA-NOVA.md):
   · construida em PELVIS-SPACE; o Assembler pendura no Pelvis em posicao zero
   · comeca em y=+0.04 com raio 0.240 (por baixo da barra do top, que termina
     em y=-0.02; folga de camada respeitada — armadilha R3)
   · abre em cone ate a barra em y=-0.20
   · ⛔ ARMADILHA R1: a saia e ESTATICA e a coxa avanca 0.19 no passo — a barra
     precisa de extensao em Z >= 0.30. Aqui: 0.335 + prega 0.012 = 0.347 em Z.
   · casca com espessura: parede interna a -0.012 + anel fechando a barra +
     anel fechando a cintura — de baixo NAO se ve interior oco de face unica.
   · tipoRoupa 'bottom', hideTorso false, legPaint null.

   Como as pregas funcionam: os 12 gomos alternam raio (par = para fora,
   impar = para dentro), com amplitude que cresce de 0 na cintura ate 0.012
   na barra. Com flat shading, cada par de paineis vizinhos pega a luz num
   angulo diferente — knife pleats de graca, sem triangulo extra.

   Contrato do mundo: 1 malha MeshLambertMaterial vertexColors flatShading,
   cor por vertice via pinta, sem luz, sem sombra, sem textura, sem import. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  var C = {
    gomos: 12,               /* 10-12 da ficha; 12 = pregas em pares certinhos */

    /* perfil do cone (pelvis-space). O anel do meio faz o "sino" do evase:
       um pouco PARA DENTRO da reta cintura->barra, senao vira funil reto. */
    yCintura: 0.040, rCintura: 0.240,   /* colada no quadril, sob o top */
    yMeio:   -0.100, rMeio:   0.283,    /* reta daria 0.295 — sino sutil */
    yBarra:  -0.196, rBarra:  0.335,    /* + prega 0.012 => 0.347 >= 0.30 (R1) */

    espessura: 0.012,        /* casca: parede interna a -0.012 do lado de fora */

    /* pregas: amplitude do zigue-zague radial, 0 na cintura -> max na barra */
    pregaMax: 0.012,

    /* barra ondulada mas coesa: gomo de prega externa desce um pouco mais,
       e uma onda lenta de 2 lobulos com fase da a assimetria que tira a cara
       de manequim (mesma licao do topo deslocado do cabelo). Total <= 14mm. */
    quedaPregaFora: 0.008,
    ondaBarraAmp: 0.003, ondaBarraK: 2.0, ondaBarraFase: 0.9,

    /* quanto a parede interna escurece (le como sombra do interior do pano) */
    sombraInterna: 0.28
  };

  var COR_PADRAO = 0xE8A7B2;   /* rosa da paleta pastel da folha mestre */

  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo — normaliza uv/indice (senao o merge devolve null
     em silencio) e faz o degrade vertical. fBase negativo CLAREIA a base,
     compensando a luz noturna que apaga a barriga dos volumes. */
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

  /* fator 0..1 da altura do perfil: 0 na cintura, 1 na barra (para a prega) */
  function tDoY(y) {
    return Math.min(1, Math.max(0, (C.yCintura - y) / (C.yCintura - C.yBarra)));
  }

  /* um anel de vertices [x,y,z] por gomo. folga = 0 na parede externa,
     C.espessura na interna. ehBarra liga a ondulacao da barra. */
  function anel(yBase, rBase, folga, ehBarra) {
    var pts = [], k, ang, par, r, y, t = tDoY(yBase);
    for (k = 0; k < C.gomos; k++) {
      ang = (k / C.gomos) * Math.PI * 2;      /* k=0 na frente (+Z), k=6 atras */
      par = (k % 2 === 0) ? 1 : -1;           /* prega: par fora, impar dentro */
      r = rBase + par * C.pregaMax * t - folga;
      y = yBase;
      if (ehBarra) {
        /* barra ondulada: prega externa desce + onda lenta assimetrica.
           So desce (nunca sobe) — a barra fica coesa, sem dente de serra. */
        y -= (par > 0 ? C.quedaPregaFora : 0);
        y -= C.ondaBarraAmp * (1 + Math.sin(C.ondaBarraK * ang + C.ondaBarraFase));
      }
      pts.push([Math.sin(ang) * r, y, Math.cos(ang) * r]);
    }
    return pts;
  }

  /* junta quads (2 triangulos, nao-indexado) num Float32Array de posicoes */
  function fazGeo(T, quads) {
    var v = [], i, q, a, b, c, d;
    function tri(p, s, r2) { v.push(p[0], p[1], p[2], s[0], s[1], s[2], r2[0], r2[1], r2[2]); }
    for (i = 0; i < quads.length; i++) {
      q = quads[i]; a = q[0]; b = q[1]; c = q[2]; d = q[3];
      tri(a, b, c); tri(a, c, d);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return g;
  }

  /* costura dois aneis em faixa de parede. dentro=false: normal para fora. */
  function parede(T, cima, baixo, dentro) {
    var quads = [], k, k2;
    for (k = 0; k < C.gomos; k++) {
      k2 = (k + 1) % C.gomos;
      if (!dentro) quads.push([cima[k], baixo[k], baixo[k2], cima[k2]]);
      else         quads.push([cima[k], cima[k2], baixo[k2], baixo[k]]);
    }
    return fazGeo(T, quads);
  }

  /* anel horizontal fechando externa->interna. paraBaixo=true na barra. */
  function tampa(T, fora, dentroA, paraBaixo) {
    var quads = [], k, k2;
    for (k = 0; k < C.gomos; k++) {
      k2 = (k + 1) % C.gomos;
      if (paraBaixo) quads.push([fora[k], dentroA[k], dentroA[k2], fora[k2]]);
      else           quads.push([fora[k], fora[k2], dentroA[k2], dentroA[k]]);
    }
    return fazGeo(T, quads);
  }

  window.SARINHA_PERSONAGENS.createSarinhaSkirt01 = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var cor = opts.clothColor === undefined ? COR_PADRAO : opts.clothColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    /* aneis da parede externa (3: cintura, meio, barra) e interna (-0.012) */
    var oC = anel(C.yCintura, C.rCintura, 0, false),
        oM = anel(C.yMeio,   C.rMeio,   0, false),
        oB = anel(C.yBarra,  C.rBarra,  0, true),
        iC = anel(C.yCintura, C.rCintura, C.espessura, false),
        iM = anel(C.yMeio,   C.rMeio,   C.espessura, false),
        iB = anel(C.yBarra,  C.rBarra,  C.espessura, true);

    /* cores: externa com barra um tom mais clara (a luz noturna come a parte
       de baixo — fBase negativo clareia); interna escurecida le como sombra */
    var corDentro = new T.Color(cor).lerp(new T.Color(0x6a5a8f), C.sombraInterna);

    var partes = [
      pinta(T, BGU.mergeBufferGeometries([
        parede(T, oC, oM, false), parede(T, oM, oB, false)]), cor, -0.12),
      pinta(T, BGU.mergeBufferGeometries([
        parede(T, iC, iM, true), parede(T, iM, iB, true)]), corDentro, 0.10),
      pinta(T, tampa(T, oB, iB, true),  cor, 0),   /* fecha a barra por baixo */
      pinta(T, tampa(T, oC, iC, false), cor, 0)    /* fecha a cintura por cima */
    ];

    var geo = BGU.mergeBufferGeometries(partes);
    if (!geo) throw new Error('merge da sainha devolveu null');

    var grupo = new T.Group();
    grupo.name = 'SarinhaSkirt01';
    var malha = new T.Mesh(geo, material);
    malha.name = 'ClothMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaSkirt01',
      version: '1.0',
      clothColor: cor,
      tipoRoupa: 'bottom',
      hideTorso: false,
      legPaint: null
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.SKIRT01_MEASURES = C;
})();
