/* ===========================================================================
   PORTAL DE ZONA — o ARCO DE ENTRADA de qualquer zona do Mundo da Sarinha.
   Versao de estreia: "Vilinha" (mas nada aqui esta preso a essa palavra —
   veja PARAMETRIZACAO).

   NAMESPACE PROPRIO (window.PORTAL_ZONA), nao MUNDO_PARTES: esta peca e
   POSICIONADA pelo mundo (uma por zona, com rotacao propria); se entrasse
   no registro das partes ela seria montada sozinha na origem.

   ---------------------------------------------------------------------------
   O QUE E (arte aprovada)
     duas colunas robustas  ->  base roxa larga, corpo creme-rosado, anel
     dourado, capitel lilas e outro anel dourado; luminaria de parede acesa
     virada para a frente e estrelinha dourada chapada mais abaixo;
     arco rosa GORDO com borda mais clara nascendo do topo das colunas;
     estrela grande dourada encaixada no ponto mais alto;
     6 estrelinhas douradas espalhadas pelo arco (simetricas);
     placa pendurada no meio do vao por duas correntinhas douradas, com
     titulo, icone e coracao desenhados em CanvasTexture;
     dois vasos com arbusto florido na frente, fora das colunas.

   ---------------------------------------------------------------------------
   PIVO E EIXOS
     (0,0,0) = CENTRO DO VAO, NO CHAO.  Y=0 e o chao.  +Z e a FRENTE
     (o lado de onde a crianca chega).  A peca e simetrica em X.

   MEDIDO (node + three r147 real, sem navegador — ver rodape do arquivo):
     8.264 (X) x 6.220 (Y) x 1.490 (Z), menor Y = 0.000
     vao de passagem 4.60 de largura por 3.62 de altura (a crianca tem 1.40)

   ---------------------------------------------------------------------------
   CONTRATO (partes/CONTRATO.md) — o que esta peca NAO faz
     sem luz nova, sem castShadow/receiveShadow, sem textura de arquivo,
     sem MeshStandardMaterial, sem emissive, sem import/require, ASCII puro.
     Corpo = 1 Lambert(vertexColors, flatShading) com tudo mesclado.
     O que "acende" = 1 MeshBasic(vertexColors).
     Texto = CanvasTexture (mesma receita de partes/portais.js).

   ORCAMENTO: 3 draw calls (4 se mostrarMarcadores) — ver custo no retorno.
   =========================================================================== */
window.PORTAL_ZONA = window.PORTAL_ZONA || {};
window.PORTAL_ZONA.criar = function (T, opcoes) {
  var BGU = T.BufferGeometryUtils;
  var o = opcoes || {};
  var titulo = o.titulo || 'Vilinha';
  var grupo = new T.Group();
  grupo.name = 'SarinhaVillageGate';

  /* ---------- PARAMETRIZACAO (a peca serve para TODAS as zonas) ---------- */
  var icone = (o.icone === undefined) ? 'casa' : o.icone;   /* casa|roda|nota|flor|null */
  var mostrarVasos      = (o.mostrarVasos === undefined) ? true : !!o.mostrarVasos;
  var mostrarLuminarias = (o.mostrarLuminarias === undefined) ? true : !!o.mostrarLuminarias;
  var mostrarMarcadores = !!o.mostrarMarcadores;            /* so para conferir anchors */
  var mostrarCoracao    = (o.mostrarCoracao === undefined) ? true : !!o.mostrarCoracao;

  /* ---------- paleta ----------
     Compensacao de cor JA APLICADA nos roxos: o portal fica ao ar livre,
     face vertical pega ~55% da luz neste rig de 2 luzes; o hex cru da arte
     (entre parenteses) apagava a base. Rosas/dourados/cremes ficaram como
     na arte — eles ja sao claros e nao lavam por causa do fBase. */
  var C = {
    roxoBase:      0x8155b8,   /* (0x7447A8) base larga da coluna */
    roxoEscuro:    0x66408f,   /* (—)        degrau do chao */
    creme:         0xfff3ef,   /* (0xF7DCD9) corpo creme-rosado — COMPENSADO */
    dourado:       0xF2B94B,   /* (0xF2B94B) aneis */
    douradoClaro:  0xffd88a,   /* luminaria.js */
    douradoEscuro: 0xe1b44a,   /* luminaria.js */
    lilas:         0xC08FEA,   /* (0xB983E3) capitel */
    /* ⛔ COMPENSADOS (17/08): o agente compensou roxo e lilas mas deixou
       creme/rosa crus, e o portal saiu roxo-acinzentado na tela. A
       hemisferica do mundo e ROXA com chao ESCURO: face vertical mistura
       ~50% ceu + ~50% chao e come o rosa. Baixar o fBase nao resolve (a
       cor certa ja estava no buffer) — quem tem de subir e o PIGMENTO. */
    arco:          0xffe2ec,   /* (0xF4C9D6) miolo do arco — COMPENSADO */
    arcoBorda:     0xfff4f8,   /* (0xFFDCE7) borda mais clara — COMPENSADO */
    estrela:       0xFFD35A,   /* (0xFFD35A) estrela grande e estrelinhas */
    vidro:         0xffe9b5,   /* luminaria.js */
    placaBorda:    0x9257C7,   /* (0x9257C7) borda roxa grossa da placa */
    placaCreme:    0xFFE7D8,   /* (0xFFE7D8) campo da placa (vai no canvas) */
    texto:         0x6C3BA8,   /* (0x6C3BA8) tinta do titulo */
    coracao:       0xFF96B5,   /* (0xFF96B5) coracao da placa */
    /* vaso-flor.js, sem mexer (o universo tem de parecer um so) */
    vaso: 0x8d68c4, vasoBorda: 0xa886d8, vasoBase: 0x6d4aa5, terra: 0x4a3550,
    verde: 0x83ab4e, verdeEscuro: 0x74994a,
    petala: 0xf58cb5, petalaClara: 0xff9fc5, miolo: 0xffd65a,
    sombra: 0xf4edde
  };
  if (o.cores) { for (var kc in o.cores) { if (Object.prototype.hasOwnProperty.call(o.cores, kc)) C[kc] = o.cores[kc]; } }

  /* =========================================================================
     MEDIDAS (todas parametrizaveis; os defaults sao os da arte)
     ========================================================================= */
  var MEIA_VAO   = (o.meiaLarguraVao || 2.30);  /* vao livre = 4.60 */
  var COL_W      = 0.86;                        /* corpo da coluna (face a face) */
  var PLINTO_W   = 1.10;                        /* degrau do chao — e ELE que define o vao */
  var CX         = MEIA_VAO + PLINTO_W / 2;     /* 2.85 — eixo de cada coluna */
  var TOPO_COL   = 3.98;                        /* topo do abaco */
  var NASCE      = 3.88;                        /* linha de nascenca do arco (enterrada 0.10) */
  var ARCO_A     = 2.38;                        /* semi-eixo horizontal interno do arco */
  var ARCO_B     = 1.36;                        /* flecha (altura da curva) */
  var ARCO_T     = 0.58;                        /* GROSSURA do arco (gordo, nao fino) */
  var ARCO_P     = 0.52;                        /* profundidade (Z) do arco */
  /* vaso: 3.78 e a menor distancia que NAO encosta no plinto (meia-largura
     do plinto 0.55 + meia-largura do vaso 0.352 = 0.902; folga 0.028) */
  var VASO_X     = 3.78, VASO_Z = 0.30, VASO_ESC = 0.58;

  var APICE_INT  = NASCE + ARCO_B;              /* 5.24 — barriga do arco no meio */
  var APICE_EXT  = NASCE + ARCO_B + ARCO_T;     /* 5.82 — costas do arco no meio */

  /* ---------- pinta (obrigatoria; normaliza uv/indice + degrade vertical) ---------- */
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

  var corpo = [];    /* DC1 — Lambert */
  var brilho = [];   /* DC2 — MeshBasic (estrelas + vidro das luminarias) */

  /* ARMADILHA PAGA: o ConeGeometry do r147 nasce com 1 triangulo DEGENERADO
     (area zero, no apice) por gomo. Nao desenha nada e ainda assim entra na
     conta do orcamento — medido aqui: 16 deles nas 4 pontas das luminarias.
     poda() arranca antes de mesclar. */
  function poda(geo) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var p = geo.attributes.position, nT = p.count / 3, manter = [], t;
    var va = new T.Vector3(), vb = new T.Vector3(), vc = new T.Vector3();
    for (t = 0; t < nT; t++) {
      va.fromBufferAttribute(p, t * 3);
      vb.fromBufferAttribute(p, t * 3 + 1).sub(va);
      vc.fromBufferAttribute(p, t * 3 + 2).sub(va);
      if (vb.cross(vc).length() > 1e-9) manter.push(t);
    }
    if (manter.length === nT) return geo;
    var g2 = new T.BufferGeometry();
    for (var nome in geo.attributes) {
      if (!Object.prototype.hasOwnProperty.call(geo.attributes, nome)) continue;
      var at = geo.attributes[nome], it = at.itemSize;
      var arr = new Float32Array(manter.length * 3 * it);
      for (var k = 0; k < manter.length; k++) {
        for (var v3 = 0; v3 < 3; v3++) {
          for (var c3 = 0; c3 < it; c3++) {
            arr[(k * 3 + v3) * it + c3] = at.array[(manter[k] * 3 + v3) * it + c3];
          }
        }
      }
      g2.setAttribute(nome, new T.BufferAttribute(arr, it));
    }
    return g2;
  }

  /* ---------- utilidades de forma ---------- */
  /* prisma octogonal com FACE virada para +Z (e para +X): a largura pedida e
     de face a face, como na arte; o raio do canto e w/2 / cos(22.5deg) */
  var K8 = 1 / Math.cos(Math.PI / 8);
  function oct(wTopo, wBase, alt, y0, aberto) {
    var g = new T.CylinderGeometry(wTopo * 0.5 * K8, wBase * 0.5 * K8, alt, 8, 1, !!aberto);
    g.rotateY(Math.PI / 8);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }
  /* estrela de N pontas como Shape 2D (XY), ponta para cima */
  function formaEstrela(pontas, R1, R2) {
    var s = new T.Shape(), i;
    for (i = 0; i < pontas * 2; i++) {
      var ang = Math.PI / 2 + (i / (pontas * 2)) * Math.PI * 2;
      var r = (i % 2 === 0) ? R1 : R2;
      var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }
  /* meia-coroa eliptica (o arco): curva interna 0->PI, volta pela externa */
  function formaArco(a, b, t, seg) {
    var s = new T.Shape(), i, th;
    for (i = 0; i <= seg; i++) {
      th = (i / seg) * Math.PI;
      if (i === 0) s.moveTo(a * Math.cos(th), b * Math.sin(th));
      else s.lineTo(a * Math.cos(th), b * Math.sin(th));
    }
    for (i = seg; i >= 0; i--) {
      th = (i / seg) * Math.PI;
      s.lineTo((a + t) * Math.cos(th), (b + t) * Math.sin(th));
    }
    s.closePath();
    return s;
  }

  /* =========================================================================
     AS DUAS COLUNAS
     Larguras de face a face. O PLINTO e a peca mais larga: e a face interna
     DELE (x = +-2.30) que define o vao livre — por isso CX sai do plinto e
     nao do corpo (armadilha: se o eixo saisse do corpo, o plinto comia 0.24
     de cada lado da passagem).
     ========================================================================= */
  var SEC = [
    /* wTopo, wBase, altura, y0, cor, fBase */
    /* fBase reduzido em toda a coluna pelo mesmo motivo do arco: a peca
       inteira precisa ler PASTEL e clara sob a hemisferica roxa do mundo */
    [PLINTO_W, PLINTO_W, 0.22, 0.00, C.roxoEscuro, 0.14],
    [0.98,     1.04,     0.58, 0.20, C.roxoBase,   0.10],
    [1.00,     1.00,     0.14, 0.76, C.lilas,      0.08],
    [COL_W - 0.04, COL_W + 0.02, 2.00, 0.86, C.creme, 0.03],
    [0.98,     0.98,     0.20, 2.82, C.dourado,    0.16],
    [1.04,     0.92,     0.64, 2.98, C.lilas,      0.07],
    [1.12,     1.12,     0.22, 3.58, C.dourado,    0.16],
    [1.06,     1.06,     0.20, TOPO_COL - 0.20, C.lilas, 0.07]
  ];
  var LADOS = [-1, 1], s, k;
  for (s = 0; s < 2; s++) {
    var sx = LADOS[s] * CX;
    /* sombra pintada a mao (o mundo nao tem sombra de engine).
       fBase 0.0: disco horizontal com fBase alto sai todo na cor escura. */
    corpo.push(pinta(new T.CircleGeometry(PLINTO_W * 0.60, 8).rotateX(-Math.PI / 2)
      .translate(sx, 0.012, 0), new T.Color(C.sombra).lerp(CINZA, 0.30), 0.0));
    for (k = 0; k < SEC.length; k++) {
      var d = SEC[k];
      corpo.push(pinta(oct(d[0], d[1], d[2], d[3]).translate(sx, 0, 0), d[4], d[5]));
    }
  }

  /* ---------- estrelinha chapada na face da coluna (frente E fundo) ----------
     armadilha paga: face coplanar pisca. A face do corpo em y=1.70 esta em
     z = 0.4265 (o corpo e afunilado); a estrela vai a 0.46 = 3.3cm SALIENTE. */
  (function estrelasDaColuna() {
    var Y = 1.70, ZF = 0.46, R1 = 0.155, R2 = 0.066;
    for (var i = 0; i < 2; i++) {
      for (var f = 0; f < 2; f++) {
        var g = new T.ShapeGeometry(formaEstrela(5, R1, R2));
        if (f === 1) g.rotateY(Math.PI);                 /* a de tras olha para -Z */
        g.translate(LADOS[i] * CX, Y, f === 0 ? ZF : -ZF);
        brilho.push(pinta(g, C.estrela, 0.06));
      }
    }
  })();

  /* =========================================================================
     O ARCO — gordo, rosa, com borda mais clara.
     Truque de custo: a silhueta INTEIRA e extrudada na cor da BORDA (clara)
     e por cima, 2cm saliente em cada face, vai uma chapa da mesma coroa
     encolhida 0.07 na cor do miolo. Da a moldura clara vista de frente sem
     pagar uma segunda extrusao.
     ========================================================================= */
  var ARCO_SEG = 16;
  (function arco() {
    var gBorda = new T.ExtrudeGeometry(formaArco(ARCO_A, ARCO_B, ARCO_T, ARCO_SEG),
      { depth: ARCO_P, bevelEnabled: false, curveSegments: 1 });
    gBorda.translate(0, NASCE, -ARCO_P / 2);
    /* fBase BAIXO no arco: e a maior superficie da peca e o portal tem de
       ler CLARO/pastel como na arte. Com 0.22 a luminancia media do corpo
       media 0.67 (a arte pede ~0.82) e o portal virava roxo-acinzentado. */
    corpo.push(pinta(gBorda, C.arcoBorda, 0.04));

    var m = 0.07;   /* espessura da borda vista de frente */
    for (var f = 0; f < 2; f++) {
      var gm = new T.ShapeGeometry(formaArco(ARCO_A + m, ARCO_B + m, ARCO_T - 2 * m, ARCO_SEG));
      if (f === 1) gm.rotateY(Math.PI);
      gm.translate(0, NASCE, (f === 0 ? 1 : -1) * (ARCO_P / 2 + 0.02));
      corpo.push(pinta(gm, C.arco, 0.05));
    }
  })();

  /* ---------- ESTRELA GRANDE no ponto mais alto (a assinatura da peca) ----------
     encaixada NO arco: o centro fica em 5.78, entao as pontas de baixo
     mergulham na barriga do arco (5.24..5.82).

     ARMADILHA PAGA (bevel infla a forma) — e a lei da inflacao NAO e a que
     se costuma citar. O caderno diz "chanfro / sen(meio-angulo)": nesta
     estrela (5 pontas, R2/R1 = 0.41, meio-angulo 19.83 graus) isso daria
     0.022/0.339 = 0.0649. MEDIDO no r147: 0.0311. Rodei bevelSize
     0.010 / 0.022 / 0.040 / 0.085 e a razao deu 1.4142 em todos —
     o getBevelVec do r147 TRAVA a esquadria em raiz(2) x bevelSize quando a
     ponta e aguda demais. Entao a compensacao certa e  chanfro * raiz(2),
     e so por isso o raio MEDIDO da estrela bate com ESTRELA_R. */
  /* ESTRELA DO TOPO — cresceu de 0.46 para 0.62 e veio para a FRENTE do
     plano do arco (z +0.34 em vez de -0.05): na v1 ela ficava espetada
     ATRAS da crista e sumia de frente. Ela e a assinatura da peca: tem de
     coroar o portal e ler inteira de frente e de 3/4. */
  var ESTRELA_Y = 5.90, ESTRELA_R = 0.62;
  var EST_CHANFRO = 0.022;
  (function estrelaGrande() {
    var rForma = ESTRELA_R - EST_CHANFRO * Math.SQRT2;   /* lei medida, nao suposta */
    var g = new T.ExtrudeGeometry(formaEstrela(5, rForma, rForma * 0.41), {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: EST_CHANFRO, bevelSegments: 1
    });
    g.translate(0, ESTRELA_Y, ARCO_P / 2 + 0.08);
    brilho.push(pinta(g, C.estrela, 0.04));
  })();

  /* ---------- 6 estrelinhas de 4 pontas espalhadas pelo arco ----------
     na linha do meio da coroa, simetricas, 2cm a frente da chapa rosa */
  (function faiscas() {
    var AM = ARCO_A + ARCO_T / 2, BM = ARCO_B + ARCO_T / 2;
    var TH = [20, 48, 76, 104, 132, 160];
    var TAM = [0.125, 0.105, 0.085, 0.085, 0.105, 0.125];
    for (var i = 0; i < TH.length; i++) {
      var th = TH[i] * Math.PI / 180;
      var x = AM * Math.cos(th), y = NASCE + BM * Math.sin(th);
      for (var f = 0; f < 2; f++) {
        var g = new T.ShapeGeometry(formaEstrela(4, TAM[i], TAM[i] * 0.34));
        if (f === 1) g.rotateY(Math.PI);
        g.translate(f === 1 ? -x : x, y, (f === 0 ? 1 : -1) * (ARCO_P / 2 + 0.04));
        brilho.push(pinta(g, C.estrela, 0.05));
      }
    }
  })();

  /* =========================================================================
     A PLACA PENDURADA
     A borda roxa e a SILHUETA extrudada (retangulo arredondado, topo em
     abobada suave, abinha embaixo no centro). O campo creme + titulo +
     icone + coracao sao desenhados em CanvasTexture e entram como 2 planos
     (frente e fundo) 2cm a frente de cada face roxa.
     A altura foi escolhida pelo VAO: a ponta da abinha para em 3.62, acima
     dos 3.60 de passagem livre exigidos (a crianca tem 1.40).
     ========================================================================= */
  var PLACA_W = 2.34, PLACA_H = 0.88, PLACA_CY = 4.16, PLACA_E = 0.10;
  var PLACA_ABA_H = 0.10, PLACA_DOMO = 0.09;
  var PLACA_TOPO = PLACA_CY + PLACA_H / 2;              /* 4.60 (borda reta) */
  var PLACA_BASE = PLACA_CY - PLACA_H / 2 - PLACA_ABA_H; /* 3.62 (ponta da aba) */
  (function placa() {
    var hx = PLACA_W / 2, hy = PLACA_H / 2, r = 0.19, ab = 0.46;
    var f = new T.Shape();
    f.moveTo(hx, hy - r);
    f.quadraticCurveTo(hx, hy, hx - r, hy);
    f.quadraticCurveTo(0, hy + PLACA_DOMO * 2, -hx + r, hy);   /* topo suave */
    f.quadraticCurveTo(-hx, hy, -hx, hy - r);
    f.lineTo(-hx, -hy + r);
    f.quadraticCurveTo(-hx, -hy, -hx + r, -hy);
    f.lineTo(-ab / 2, -hy);
    f.lineTo(-ab * 0.31, -hy - PLACA_ABA_H);                   /* abinha do centro */
    f.lineTo(ab * 0.31, -hy - PLACA_ABA_H);
    f.lineTo(ab / 2, -hy);
    f.lineTo(hx - r, -hy);
    f.quadraticCurveTo(hx, -hy, hx, -hy + r);
    f.closePath();
    var g = new T.ExtrudeGeometry(f, { depth: PLACA_E, bevelEnabled: false, curveSegments: 3 });
    g.translate(0, PLACA_CY, -PLACA_E / 2);
    corpo.push(pinta(g, C.placaBorda, 0.20));
  })();

  /* ---------- as duas correntinhas douradas ----------
     haste fina + 4 elos cruzados (o elo alternado 90 graus e o que faz o
     olho ler "corrente" por 12 triangulos cada).

     ARMADILHA PAGA (medida, nao suposta): na v1 a haste tinha raio 0.018 e
     o elo 0.028 de profundidade — a face chata do cilindro de 5 lados caia
     em z = -0.01456 e a do elo em z = -0.014: 0.6 MILIMETRO de distancia,
     16 pares coplanares piscando. Agora o elo ENGOLE a haste em qualquer
     orientacao (meia-medida 0.017 > raio 0.014). */
  var HASTE_R = 0.014, ELO_E = 0.034;
  (function correntes() {
    var XC = 0.80;
    var yCima = NASCE + ARCO_B * Math.sqrt(Math.max(0, 1 - (XC / ARCO_A) * (XC / ARCO_A)));
    var yBaixo = PLACA_TOPO - 0.02;
    var comp = yCima - yBaixo;
    for (var i = 0; i < 2; i++) {
      var x = LADOS[i] * XC;
      var haste = new T.CylinderGeometry(HASTE_R, HASTE_R, comp, 5, 1, true);
      haste.translate(x, yBaixo + comp / 2, 0);
      corpo.push(pinta(haste, C.douradoEscuro, 0.18));
      for (var e = 0; e < 4; e++) {
        var elo = new T.BoxGeometry(0.078, 0.030, ELO_E);
        if (e % 2 === 1) elo.rotateY(Math.PI / 2);
        elo.translate(x, yBaixo + comp * (0.16 + e * 0.23), 0);
        corpo.push(pinta(elo, C.douradoClaro, 0.14));
      }
    }
  })();

  /* =========================================================================
     LUMINARIA DE PAREDE (versao reduzida da luminaria.js: prisma de 4 lados
     girado 45 graus, vidro quente no MeshBasic, aros dourados, tampa
     piramidal). Fica na face da FRENTE de cada coluna, virada para +Z.
     ========================================================================= */
  function prisma4(wTopo, wBase, alt, y0, aberto) {
    var g = new T.CylinderGeometry(wTopo * 0.5 * Math.SQRT2, wBase * 0.5 * Math.SQRT2, alt, 4, 1, !!aberto);
    g.rotateY(Math.PI / 4);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }
  function luminariaParede(x) {
    var ZC = 0.66;                 /* eixo da lanterna, na frente da coluna */
    var Y_BRACO = 2.62;
    /* mao-francesa: barra na parede + braco horizontal */
    var costa = new T.BoxGeometry(0.14, 0.30, 0.09);
    costa.translate(x, Y_BRACO - 0.06, 0.44);
    corpo.push(pinta(costa, C.douradoEscuro, 0.20));
    var braco = new T.BoxGeometry(0.075, 0.075, 0.30);
    braco.translate(x, Y_BRACO, 0.56);
    corpo.push(pinta(braco, C.douradoEscuro, 0.18));
    /* vidro quente (MeshBasic: "acende" sem luz nova) */
    var VID_Y0 = Y_BRACO - 0.45, VID_ALT = 0.34;
    var vidro = prisma4(0.28, 0.19, VID_ALT, VID_Y0, true).translate(x, 0, ZC);
    brilho.push(pinta(vidro, C.vidro, 0.10));
    /* beiral/aro de cima + tampa piramidal.
       v1 tinha beiral E aro empilhados quase no mesmo lugar (2.510-2.565 e
       2.500-2.550) e a base da piramide caia a 5mm da tampa do aro: 8 pares
       coplanares medidos. Agora e UMA peca so e a piramide MERGULHA 0.02
       dentro dela — pecas que se cruzam nao piscam, pecas que se encostam sim. */
    var ARO_T_Y0 = VID_Y0 + VID_ALT - 0.03, ARO_T_ALT = 0.07;
    var aroT = prisma4(0.34, 0.30, ARO_T_ALT, ARO_T_Y0).translate(x, 0, ZC);
    corpo.push(pinta(aroT, C.douradoEscuro, 0.18));
    var tampa = new T.ConeGeometry(0.30 * 0.5 * Math.SQRT2, 0.15, 4);
    tampa.rotateY(Math.PI / 4);
    tampa.translate(x, ARO_T_Y0 + ARO_T_ALT - 0.02 + 0.075, ZC);
    corpo.push(pinta(poda(tampa), C.douradoClaro, 0.14));
    /* aro de baixo + pingente */
    var aroB = prisma4(0.22, 0.20, 0.05, VID_Y0 - 0.035).translate(x, 0, ZC);
    corpo.push(pinta(aroB, C.douradoEscuro, 0.18));
    /* pingente: sobe 0.02 para dentro do aro de baixo (mesmo motivo da tampa) */
    var pingo = new T.ConeGeometry(0.05, 0.09, 4);
    pingo.rotateY(Math.PI / 4); pingo.rotateX(Math.PI);
    pingo.translate(x, VID_Y0 - 0.06, ZC);
    corpo.push(pinta(poda(pingo), C.douradoEscuro, 0.18));
  }
  if (mostrarLuminarias) { luminariaParede(-CX); luminariaParede(CX); }

  /* =========================================================================
     VASOS COM ARBUSTO FLORIDO — mesma receita de vaso-flor.js (vaso
     facetado + borda larga + base + volumes de arbusto + flores de petala
     achatada), reduzida para 62% e com 6 lados/2 volumes/2 flores para
     caber no orcamento. Nada de estilo novo: o universo e um so.
     ========================================================================= */
  function vasoFlor(cx, cz, esc, giro) {
    function put(g, cor, fB) {
      g.scale(esc, esc, esc);
      if (giro) g.rotateY(giro);
      g.translate(cx, 0, cz);
      corpo.push(pinta(g, cor, fB));
    }
    /* o disco de sombra sobe 0.021 LOCAL porque tudo aqui e reduzido a 58%:
       o 0.012 do vaso-flor original virava 0.007 depois da escala e chegava
       perto demais da tampa de baixo do vaso (armadilha da PECA REDUZIDA:
       a folga encolhe junto e o que era seguro em tamanho natural pisca) */
    put(new T.CircleGeometry(0.58, 6).rotateX(-Math.PI / 2).translate(0, 0.021, 0),
      new T.Color(C.sombra).lerp(CINZA, 0.30), 0.0);
    put(new T.CylinderGeometry(0.335, 0.36, 0.10, 6).translate(0, 0.05, 0), C.vasoBase, 0.20);
    put(new T.CylinderGeometry(0.42, 0.31, 0.65, 6, 1, true).translate(0, 0.405, 0), C.vaso, 0.10);
    put(new T.CylinderGeometry(0.50, 0.47, 0.16, 6).translate(0, 0.79, 0), C.vasoBorda, 0.08);
    /* terra: no vaso-flor era um disco pousado 5mm acima da boca — com a
       reducao virou 2.9mm e piscou. Aqui e um cilindro baixo que ATRAVESSA
       a boca (entra 0.035 na borda e sobe 0.045 acima dela). */
    put(new T.CylinderGeometry(0.44, 0.40, 0.08, 6).translate(0, 0.875, 0), C.terra, 0.05);

    var ARB_CY = 1.30;
    var VOL = [
      { x: 0.00, y: ARB_CY,        z: 0.00, r: 0.62, cor: C.verde },
      { x: 0.28, y: ARB_CY - 0.14, z: -0.04, r: 0.34, cor: C.verdeEscuro }
    ];
    for (var v = 0; v < VOL.length; v++) {
      var b = new T.IcosahedronGeometry(VOL[v].r, 0);
      b.scale(1.0, 0.85, 0.92);
      b.rotateY(v * 1.1);
      b.translate(VOL[v].x, VOL[v].y, VOL[v].z);
      put(b, VOL[v].cor, 0.08);
    }
    /* flor: 4 petalas achatadas deitadas na copa + miolo (receita vaso-flor) */
    function flor(fx, fy, fz, corPetala, e) {
      var nx = fx, ny = fy - ARB_CY, nz = fz;
      var nl = Math.max(0.0001, Math.sqrt(nx * nx + ny * ny + nz * nz));
      var q = new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0), new T.Vector3(nx / nl, ny / nl, nz / nl));
      for (var p = 0; p < 4; p++) {
        var ang = (p / 4) * Math.PI * 2 + 0.3;
        var pet = new T.BoxGeometry(0.095 * e, 0.036 * e, 0.095 * e);
        pet.rotateY(ang);
        pet.translate(Math.cos(ang) * 0.098 * e, 0, Math.sin(ang) * 0.098 * e);
        pet.applyQuaternion(q); pet.translate(fx, fy, fz);
        put(pet, corPetala, 0.05);
      }
      var mi = new T.BoxGeometry(0.064 * e, 0.042 * e, 0.064 * e);
      mi.translate(0, 0.012 * e, 0);
      mi.applyQuaternion(q); mi.translate(fx, fy, fz);
      put(mi, C.miolo, 0.02);
    }
    flor(-0.30, 1.40, 0.42, C.petala, 1.0);
    flor(0.16, 1.24, 0.52, C.petalaClara, 0.9);
  }
  if (mostrarVasos) {
    vasoFlor(-VASO_X, VASO_Z, VASO_ESC, 0.5);
    vasoFlor(VASO_X, VASO_Z, VASO_ESC, -0.5);
  }

  /* =========================================================================
     DC1 e DC2
     ========================================================================= */
  var geoCorpo = BGU.mergeBufferGeometries(corpo);
  var malhaCorpo = new T.Mesh(geoCorpo,
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malhaCorpo.name = 'portalzona_corpo';
  grupo.add(malhaCorpo);

  var geoBrilho = BGU.mergeBufferGeometries(brilho);
  var malhaBrilho = new T.Mesh(geoBrilho,
    new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'portalzona_brilho';
  grupo.add(malhaBrilho);

  /* =========================================================================
     DC3 — TEXTO DA PLACA em CanvasTexture (receita de partes/portais.js).
     Fora do navegador (medicao em node) NAO existe document: a peca sai
     inteira, so sem os 2 planos do texto. Por isso o guard.
     ATENCAO: estes planos NAO passam por pinta() — pinta apaga o uv e sem
     uv a textura nao aparece.
     ========================================================================= */
  var TEM_DOC = (typeof document !== 'undefined' && !!document.createElement);
  var malhaTexto = null;
  if (TEM_DOC) {
    var LC = 512, AC = 256;
    var cv = document.createElement('canvas');
    cv.width = LC; cv.height = AC;
    var g2 = cv.getContext('2d');
    var hexCreme = '#' + new T.Color(C.placaCreme).getHexString();
    var hexTinta = '#' + new T.Color(C.texto).getHexString();
    var hexCoracao = '#' + new T.Color(C.coracao).getHexString();
    var hexCostura = '#' + new T.Color(C.placaBorda).lerp(new T.Color(0xffffff), 0.35).getHexString();

    function caixaRedonda(x, y, w, h, r) {
      g2.beginPath();
      g2.moveTo(x + r, y);
      g2.arcTo(x + w, y, x + w, y + h, r);
      g2.arcTo(x + w, y + h, x, y + h, r);
      g2.arcTo(x, y + h, x, y, r);
      g2.arcTo(x, y, x + w, y, r);
      g2.closePath();
    }
    function fonteQueCabe(txt, tam, larguraMax) {
      var t = tam;
      while (t > 16) {
        g2.font = '800 ' + t + 'px "Baloo 2", Arial, sans-serif';
        if (g2.measureText(txt).width <= larguraMax) break;
        t -= 2;
      }
      return t;
    }
    function desenhaCoracao(cx, cy, s) {
      g2.beginPath();
      g2.moveTo(cx, cy + s * 0.78);
      g2.bezierCurveTo(cx - s * 1.25, cy - s * 0.18, cx - s * 0.52, cy - s * 1.02, cx, cy - s * 0.32);
      g2.bezierCurveTo(cx + s * 0.52, cy - s * 1.02, cx + s * 1.25, cy - s * 0.18, cx, cy + s * 0.78);
      g2.closePath();
      g2.fill();
    }
    /* ICONES (mais barato desenhar que modelar) */
    function desenhaIcone(nome, cx, cy, s) {
      g2.fillStyle = hexTinta; g2.strokeStyle = hexTinta;
      g2.lineWidth = Math.max(4, s * 0.16); g2.lineCap = 'round';
      if (nome === 'casa') {
        g2.beginPath();
        g2.moveTo(cx, cy - s); g2.lineTo(cx + s, cy - s * 0.08); g2.lineTo(cx - s, cy - s * 0.08);
        g2.closePath(); g2.fill();
        g2.fillRect(cx - s * 0.68, cy - s * 0.12, s * 1.36, s * 1.02);
        g2.fillStyle = hexCreme;
        g2.fillRect(cx - s * 0.22, cy + s * 0.30, s * 0.44, s * 0.60);
      } else if (nome === 'roda') {
        g2.beginPath(); g2.arc(cx, cy - s * 0.12, s * 0.82, 0, Math.PI * 2); g2.stroke();
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3;
          g2.beginPath();
          g2.moveTo(cx, cy - s * 0.12);
          g2.lineTo(cx + Math.cos(a) * s * 0.82, cy - s * 0.12 + Math.sin(a) * s * 0.82);
          g2.stroke();
        }
        g2.beginPath(); g2.arc(cx, cy - s * 0.12, s * 0.18, 0, Math.PI * 2); g2.fill();
        g2.beginPath();
        g2.moveTo(cx - s * 0.55, cy + s); g2.lineTo(cx, cy - s * 0.12); g2.lineTo(cx + s * 0.55, cy + s);
        g2.stroke();
      } else if (nome === 'nota') {
        g2.beginPath(); g2.ellipse(cx - s * 0.34, cy + s * 0.56, s * 0.34, s * 0.26, -0.35, 0, Math.PI * 2); g2.fill();
        g2.beginPath(); g2.ellipse(cx + s * 0.52, cy + s * 0.30, s * 0.34, s * 0.26, -0.35, 0, Math.PI * 2); g2.fill();
        g2.beginPath();
        g2.moveTo(cx - s * 0.02, cy + s * 0.56); g2.lineTo(cx - s * 0.02, cy - s * 0.86);
        g2.moveTo(cx + s * 0.84, cy + s * 0.30); g2.lineTo(cx + s * 0.84, cy - s * 1.00);
        g2.stroke();
        g2.beginPath();
        g2.moveTo(cx - s * 0.02, cy - s * 0.86); g2.lineTo(cx + s * 0.84, cy - s * 1.00);
        g2.lineWidth = Math.max(6, s * 0.26); g2.stroke();
      } else if (nome === 'flor') {
        for (var p = 0; p < 5; p++) {
          var ap = Math.PI / 2 + p * Math.PI * 2 / 5;
          g2.beginPath();
          g2.arc(cx + Math.cos(ap) * s * 0.52, cy - Math.sin(ap) * s * 0.52, s * 0.40, 0, Math.PI * 2);
          g2.fill();
        }
        g2.fillStyle = hexCreme;
        g2.beginPath(); g2.arc(cx, cy, s * 0.30, 0, Math.PI * 2); g2.fill();
      }
    }
    function desenhaPlaca() {
      g2.clearRect(0, 0, LC, AC);
      /* campo creme, um pouco menor que a silhueta roxa (a borda e a peca 3D) */
      g2.fillStyle = hexCreme;
      caixaRedonda(26, 22, LC - 52, AC - 52, 34); g2.fill();
      /* costura pontilhada (linguagem do mundo, igual as plaquinhas da praca) */
      g2.setLineDash([13, 11]); g2.lineWidth = 4; g2.strokeStyle = hexCostura;
      caixaRedonda(44, 40, LC - 88, AC - 88, 24); g2.stroke();
      g2.setLineDash([]);

      var temIcone = (icone === 'casa' || icone === 'roda' || icone === 'nota' || icone === 'flor');
      var cxTxt = temIcone ? 300 : 256, larg = temIcone ? 330 : 400;
      var cyTxt = mostrarCoracao ? 108 : 122;
      if (temIcone) desenhaIcone(icone, 116, cyTxt - 4, 52);
      g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.fillStyle = hexTinta;

      /* QUEBRA EM 2 LINHAS. Sem isto "Palco da Festinha" e "Parque da
         Roda-Gigante" (nomes REAIS das zonas, ver partes/portais.js) eram
         espremidos para 26px numa linha so — ilegivel de longe. Quebra no
         espaco mais perto do meio, so quando a linha unica ficaria pequena. */
      var linhas = [titulo], tam = fonteQueCabe(titulo, 84, larg), q;
      if (tam < 50 && titulo.indexOf(' ') > 0) {
        var ps = titulo.split(' '), corte = 1, melhor = 1e9;
        for (q = 1; q < ps.length; q++) {
          var dif = Math.abs(ps.slice(0, q).join(' ').length - ps.slice(q).join(' ').length);
          if (dif < melhor) { melhor = dif; corte = q; }
        }
        linhas = [ps.slice(0, corte).join(' '), ps.slice(corte).join(' ')];
        tam = Math.min(fonteQueCabe(linhas[0], 56, larg), fonteQueCabe(linhas[1], 56, larg));
      }
      g2.font = '800 ' + tam + 'px "Baloo 2", Arial, sans-serif';
      if (linhas.length === 1) {
        g2.fillText(linhas[0], cxTxt, cyTxt);
      } else {
        g2.fillText(linhas[0], cxTxt, cyTxt - tam * 0.56);
        g2.fillText(linhas[1], cxTxt, cyTxt + tam * 0.56);
      }
      if (mostrarCoracao) {
        g2.fillStyle = hexCoracao;
        desenhaCoracao(cxTxt, 190, 22);
      }
    }
    desenhaPlaca();

    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false;
    tex.minFilter = T.LinearFilter;
    tex.magFilter = T.LinearFilter;
    /* a fonte "Baloo 2" pode chegar depois do 1o quadro: redesenha e sobe */
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(function () { desenhaPlaca(); tex.needsUpdate = true; });
    }

    var PW = PLACA_W - 0.10, PH = PW / 2;   /* canvas 2:1 -> plano 2:1 */
    var zTex = PLACA_E / 2 + 0.02;          /* 2cm saliente: nada de coplanar */
    var pl = [];
    var pf = new T.PlaneGeometry(PW, PH);
    pf.translate(0, PLACA_CY + 0.02, zTex);
    pl.push(pf);
    /* o de tras gira 180 em Y: assim o titulo continua legivel de quem sai */
    var pt = new T.PlaneGeometry(PW, PH);
    pt.rotateY(Math.PI);
    pt.translate(0, PLACA_CY + 0.02, -zTex);
    pl.push(pt);
    malhaTexto = new T.Mesh(BGU.mergeBufferGeometries(pl), new T.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.5
    }));
    malhaTexto.name = 'portalzona_texto';
    grupo.add(malhaTexto);
  }

  /* =========================================================================
     ANCHORS
     ========================================================================= */
  var LADO_EXT = mostrarVasos ? (VASO_X + 0.47) : (CX + PLINTO_W / 2 + 0.15);
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF = [
    { nome: 'FrontPathAnchor', x: 0, y: 0, z: 1.05 },
    { nome: 'BackPathAnchor', x: 0, y: 0, z: -1.05 },
    { nome: 'SignAnchor', x: 0, y: APICE_INT, z: 0 },
    { nome: 'LeftSideAnchor', x: -LADO_EXT, y: 0, z: 0 },
    { nome: 'RightSideAnchor', x: LADO_EXT, y: 0, z: 0 }
  ];
  var mapaAnchors = {}, ia;
  for (ia = 0; ia < DEF.length; ia++) {
    var ob = new T.Object3D();
    ob.name = DEF[ia].nome;
    ob.position.set(DEF[ia].x, DEF[ia].y, DEF[ia].z);
    anchors.add(ob);
    mapaAnchors[DEF[ia].nome] = ob;
  }
  grupo.add(anchors);
  grupo.userData.anchors = mapaAnchors;

  /* marcadores visiveis (so para conferir encaixe; +1 draw call, dev) */
  if (mostrarMarcadores) {
    var mk = [];
    for (ia = 0; ia < DEF.length; ia++) {
      var oc = new T.OctahedronGeometry(0.11, 0);
      oc.translate(DEF[ia].x, DEF[ia].y + 0.11, DEF[ia].z);
      mk.push(pinta(oc, ia === 2 ? 0xff7ab0 : 0x66ffd0, 0.0));
    }
    var mm = new T.Mesh(BGU.mergeBufferGeometries(mk),
      new T.MeshBasicMaterial({ vertexColors: true }));
    mm.name = 'portalzona_marcadores';
    grupo.add(mm);
  }

  /* =========================================================================
     COLISORES — a peca nao recebe ctx, entao devolve a lista pronta para o
     mundo empurrar em ctx.COLISORES. O VAO fica LIVRE de proposito.
     ========================================================================= */
  var colisores = [
    { x: -CX, z: 0, raio: PLINTO_W * 0.62 },
    { x: CX, z: 0, raio: PLINTO_W * 0.62 }
  ];
  if (mostrarVasos) {
    colisores.push({ x: -VASO_X, z: VASO_Z, raio: 0.40 });
    colisores.push({ x: VASO_X, z: VASO_Z, raio: 0.40 });
  }
  grupo.userData.colisores = colisores;
  grupo.userData.vaoLivre = { largura: MEIA_VAO * 2, altura: PLACA_BASE };

  /* ---------- custo MEDIDO (nao chutado): conta o que esta DE FATO no grupo,
     inclusive a malha dos marcadores — somar so as malhas que a gente lembra
     e como a contagem antes/depois que mente enquanto sobra fila. ---------- */
  var dc = 0, tri = 0;
  grupo.traverse(function (n) {
    if (!n.isMesh || !n.geometry) return;
    dc++;
    var g = n.geometry;
    tri += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });

  return {
    grupo: grupo,
    colisores: colisores,
    update: function () {},
    custo: { dc: dc, tri: tri },
    anchors: mapaAnchors
  };
};

/* ===========================================================================
   RELATORIO DE MEDICAO — 17/08
   Montado em node com o three r147 REAL (build UMD + examples/js/utils/
   BufferGeometryUtils.js). Nada aqui e estimativa.

   CUSTO            3 draw calls | 1.768 triangulos   (orcamento: 4 / 2.000)
                      corpo Lambert ....... 1.568
                      brilho MeshBasic .......196   (estrelas + vidro)
                      placa CanvasTexture .....  4   (2 planos, frente e fundo)
                    com mostrarMarcadores: 4 dc / 1.808 tri (so para conferir)
                    sem vasos e sem luminarias: 3 dc / 1.108 tri
   CAIXA            X -4.132..4.132 (8.264) | Y 0.000..6.220 | Z -0.660..0.830
                    menor Y = 0.000 exato (a peca nao fura nem flutua)
   VAO (raycast,    largura livre 4.60 (exigido >= 4.4)
   passo 2cm)       altura  livre 3.62 (exigido >= 3.4) — quem limita e a
                    ponta da abinha da placa, de proposito
   MERGES           nenhum voltou null
   TRI DEGENERADOS  0   (eram 16, das 4 pontas de cone das luminarias)
   COPLANARES       0 pares de faces paralelas a menos de 5mm com sobreposicao
                    de AREA (teste SAT 2D) — eram 72

   O QUE O NODE NAO CONSEGUE MEDIR: fora do navegador nao existe `document`,
   entao a CanvasTexture nao roda e a peca sai com 2 draw calls / 1.764 tri.
   A 3a draw call (a placa) foi provada a parte, com um `document` FALSO cujo
   contexto 2d grava toda chamada: os 5 icones desenham, a textura sai como
   CanvasTexture, o plano mantem o `uv` (nao passou por pinta) e o titulo
   longo quebra em 2 linhas. No navegador, portanto: 3 draw calls, 1.768 tri.
   =========================================================================== */
