/* kart.js — O KART do Kartodromo do Mundo da Sarinha.
   Carrinho de brinquedo, fofo e legivel de longe (nao e kart de competicao).
   A crianca (1,40) senta nele; o sistema de pilotagem consome
   grupo.userData.assento / girarRodas / virarRodas.

   CONTRATO (partes/CONTRATO.md): zero luz nova, zero sombra real, zero
   textura externa, zero material Standard, zero brilho por material, zero
   modulo externo, ASCII puro. Corpo = 1 malha Lambert com cor por vertice (geometrias
   mescladas). O que "acende" (a estrelinha) = 1 malha MeshBasic.

   ⛔ NAMESPACE PROPRIO (armadilha 16): NAO e window.MUNDO_PARTES. Se fosse,
   montarPartes() plantaria um kart solto no meio da praca. Quem monta e o
   kartodromo / o sistema de pilotagem.

   ORIENTACAO E MEDIDAS (contrato de codigo, o jogo depende):
     - frente do kart aponta para -Z (convencao do boneco deste jogo)
     - pivo no centro do kart; Y=0 e o CHAO (a base dos 4 pneus toca y=0)
     - comprimento ~1.90 (z -0.950 .. +0.947) · largura 1.150 · altura ~0.95

   USO:
     var k = window.KART_VEICULO.kart(THREE);            // rosa padrao
     var k = window.KART_VEICULO.kart(THREE, 0x6fc3d6);  // outro kart do box
     cena.add(k.grupo);
     k.grupo.userData.girarRodas(anguloEmRadianos);      // ABSOLUTO
     k.grupo.userData.virarRodas(esterco);               // ABSOLUTO, +-0.60
*/
window.KART_VEICULO = window.KART_VEICULO || {};   /* namespace proprio: NAO pode ser montado sozinho no mundo */
window.KART_VEICULO.kart = function (T, corChassi) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'kart';

  /* ---------------- paleta ---------------- */
  var COR_CHASSI = (corChassi === undefined || corChassi === null) ? 0xe8536e : corChassi;
  var COR_PNEU   = 0x4a4458,   /* preto-suavizado pedido      */
      COR_CALOTA = 0xf4edde,   /* creme do mundo              */
      COR_BANCO  = 0xf6e4d2,   /* creme do banco (pedido)     */
      COR_VOLANTE= 0x3f3a52,   /* volante/coluna escuros      */
      COR_BRANCO = 0xfdf6ec,   /* faixa + circulo do bico     */
      COR_PRATA  = 0xbfb8ce,   /* escapamento                 */
      COR_ESTRELA= 0xffd35a;   /* estrelinha dourada (pedido) */

  /* ---------------- pinta canonica (degrade vertical + normaliza uv/indice) ----------------
     ⛔ armadilha 1 e 2: mergeBufferGeometries devolve null EM SILENCIO se os
     atributos ou o indice nao baterem. Toda geometria do corpo passa por aqui. */
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

  /* afunila em X entre dois z (chassi de brinquedo e mais estreito na frente).
     Deforma vertice, custo ZERO de triangulo. Recomputa normal depois. */
  function afunilaX(geo, zA, kA, zB, kB) {
    var pos = geo.attributes.position, i, t, k;
    for (i = 0; i < pos.count; i++) {
      t = (pos.getZ(i) - zA) / (zB - zA);
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      k = kA + (kB - kA) * t;
      pos.setX(i, pos.getX(i) * k);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  /* =========================================================================
     CORPO — 1 malha Lambert (draw call 1)
     ========================================================================= */
  var pecas = [];        /* geometrias ja pintadas, prontas para mesclar */
  var fatias = [];       /* {nome, ini, n} em VERTICES: o verificador de coplanares usa */
  var _cursor = 0;
  function add(nome, geo) {
    var n = geo.attributes.position.count;
    fatias.push({ nome: nome, ini: _cursor, n: n });
    _cursor += n;
    pecas.push(geo);
    return geo;
  }

  /* --- sombra pintada no chao (o mundo nao tem sombra real) --------------- */
  add('sombra', pinta(new T.CircleGeometry(1, 14).rotateX(-Math.PI / 2)
      .scale(0.56, 1, 0.92).translate(0, 0.03, 0.02),
      new T.Color(0xf4edde).lerp(CINZA, 0.34), 0.0));   /* fBase 0 em disco horizontal (armadilha 14) */

  /* --- assoalho: a prancha baixa entre as rodas --------------------------- */
  add('assoalho', pinta(afunilaX(
      new T.BoxGeometry(0.86, 0.09, 1.28).translate(0, 0.185, 0.02),
      -0.62, 0.72, 0.66, 1.0), COR_CHASSI, 0.14));

  /* --- pods laterais: tubos redondos achatados (a "gordurinha" do kart) --- */
  var Z_POD = 0.06, L_POD = 0.86;
  function pod(sx) {
    return pinta(new T.CylinderGeometry(0.13, 0.13, L_POD, 8).rotateX(Math.PI / 2)
      .scale(1, 0.62, 1).translate(sx * 0.44, 0.20, Z_POD), COR_CHASSI, 0.16);
  }
  add('podEsq', pod(-1));
  add('podDir', pod(1));

  /* --- bico/nariz: cone truncado octogonal, ponta fina para -Z ------------ */
  /* rotateX(+PI/2) leva +Y -> +Z, entao radiusTop fica na TRASEIRA (maior). */
  var NOSE_Y = 0.33, NOSE_Z = -0.66, NOSE_SY = 0.78;
  add('bico', pinta(new T.CylinderGeometry(0.25, 0.19, 0.40, 8).rotateX(Math.PI / 2)
      .scale(1, NOSE_SY, 1).translate(0, NOSE_Y, NOSE_Z), COR_CHASSI, 0.16));

  /* faixa branca: anel concentrico com o bico (mesma conicidade + 0.010).
     openEnded => so a casca, 16 tri, e nenhuma tampa escondida dentro. */
  add('faixaBico', pinta(new T.CylinderGeometry(0.2265, 0.2160, 0.07, 8, 1, true)
      .rotateX(Math.PI / 2).scale(1, NOSE_SY, 1).translate(0, NOSE_Y, -0.72), COR_BRANCO, 0.10));

  /* circulo branco no bico (o "numero"): CAMADA na frente da face, nunca no
     plano dela (armadilha 11). Face do bico em z=-0.860, circulo em -0.875. */
  add('circuloBico', pinta(new T.CircleGeometry(0.125, 12).rotateY(Math.PI)
      .translate(0, NOSE_Y, -0.875), COR_BRANCO, 0.06));

  /* --- para-choque frontal em U: e ele que define z = -0.950 --------------
     ⛔ medido: em y=0.175 a base do para-choque caia EXATAMENTE em y=0.140,
     o mesmo plano da base do assoalho -> 12 pares coplanares (z-fighting).
     Baixado para y=0.155 (0.020 de folga). E a barra encurtou para 0.06 de
     profundidade para nao chegar a 0.005 do circulo branco do bico. */
  add('choqueBarra', pinta(new T.BoxGeometry(0.66, 0.10, 0.06).translate(0, 0.155, -0.92), COR_CHASSI, 0.16));
  add('choqueBracoE', pinta(new T.BoxGeometry(0.07, 0.07, 0.30).translate(-0.28, 0.155, -0.76), COR_CHASSI, 0.16));
  add('choqueBracoD', pinta(new T.BoxGeometry(0.07, 0.07, 0.30).translate(0.28, 0.155, -0.76), COR_CHASSI, 0.16));

  /* --- banco creme de encosto alto --------------------------------------- */
  var TILT = 0.20;   /* encosto reclinado para tras (+Z) */
  add('bancoAssento', pinta(afunilaX(
      new T.BoxGeometry(0.46, 0.09, 0.44).translate(0, 0.325, 0.28),
      0.06, 0.88, 0.50, 1.0), COR_BANCO, 0.13));
  add('bancoEncosto', pinta(new T.BoxGeometry(0.44, 0.59, 0.10)
      .translate(0, 0.295, 0).rotateX(TILT).translate(0, 0.360, 0.50), COR_BANCO, 0.13));
  function aba(sx) {
    return pinta(new T.BoxGeometry(0.08, 0.44, 0.14)
      .translate(sx * 0.245, 0.22, -0.04).rotateX(TILT).translate(0, 0.380, 0.50), COR_BANCO, 0.15);
  }
  add('abaEsq', aba(-1));
  add('abaDir', aba(1));

  /* --- coluna de direcao + volante pequeno inclinado ---------------------- */
  var ANG_COL = 0.6323;                       /* ~36 graus do eixo vertical, deitado para tras */
  add('coluna', pinta(new T.CylinderGeometry(0.028, 0.034, 0.40, 6)
      .rotateX(ANG_COL).translate(0, 0.45, -0.17), COR_VOLANTE, 0.18));
  /* eixo do torus e +Z; para casar com a coluna, gira X em (ANG_COL - PI/2) */
  add('volanteAro', pinta(new T.TorusGeometry(0.135, 0.026, 4, 10)
      .rotateX(ANG_COL - Math.PI / 2).translate(0, 0.605, -0.055), COR_VOLANTE, 0.18));
  add('volanteCubo', pinta(new T.CylinderGeometry(0.05, 0.05, 0.035, 6)
      .rotateX(ANG_COL).translate(0, 0.605, -0.055), COR_VOLANTE, 0.18));

  /* --- pedais (onde os pes da crianca pousam) ----------------------------- */
  function pedal(sx) {
    return pinta(new T.BoxGeometry(0.10, 0.035, 0.13).rotateX(-0.35)
      .translate(sx * 0.13, 0.265, -0.42), COR_VOLANTE, 0.18);
  }
  add('pedalEsq', pedal(-1));
  add('pedalDir', pedal(1));

  /* --- traseira: bloco do motor + aerofolio pequenininho + escapamento ---- */
  add('blocoTras', pinta(new T.BoxGeometry(0.52, 0.24, 0.34).translate(0, 0.32, 0.70), COR_CHASSI, 0.16));
  add('asaPlaca', pinta(new T.BoxGeometry(0.62, 0.045, 0.20).rotateX(-0.12)
      .translate(0, 0.70, 0.845), COR_CHASSI, 0.14));
  /* ⛔ medido: suporte com 0.06 de profundidade parava a 0.005 da traseira do
     bloco do motor (quase-coplanar). 0.08 atravessa a face e resolve. */
  function suporteAsa(sx) {
    return pinta(new T.BoxGeometry(0.05, 0.30, 0.08).translate(sx * 0.20, 0.56, 0.845), COR_VOLANTE, 0.18);
  }
  add('suporteAsaE', suporteAsa(-1));
  add('suporteAsaD', suporteAsa(1));
  /* ⛔ medido: o escapamento inclinado esticava o kart ate z=+0.978 (compr.
     1.929, fora do contrato de 1.90). Puxado 0.06 para dentro: agora quem
     manda no z maximo e o aerofolio (+0.947). */
  var ANG_ESC = 0.738;
  add('escapeTubo', pinta(new T.CylinderGeometry(0.045, 0.052, 0.34, 6)
      .rotateX(ANG_ESC).translate(0.30, 0.45, 0.74), COR_PRATA, 0.16));
  add('escapePonta', pinta(new T.CylinderGeometry(0.058, 0.058, 0.07, 6)
      .rotateX(ANG_ESC).translate(0.30, 0.5758, 0.8543), COR_VOLANTE, 0.16));

  /* --- eixos escuros ligando as rodas ------------------------------------ */
  /* ⛔ medido: a face dianteira do eixo caia EXATAMENTE em z=0.53, o mesmo
     plano da face dianteira do bloco do motor -> 4 pares coplanares. */
  add('eixoTras', pinta(new T.BoxGeometry(0.98, 0.06, 0.09).translate(0, 0.245, 0.555), COR_VOLANTE, 0.18));
  /* ⛔ medido: com 0.05 de profundidade a face do eixo caia a 0.005 da face
     dianteira do assoalho (quase-coplanar). 0.08 atravessa o plano, some. */
  add('eixoFrente', pinta(new T.BoxGeometry(0.94, 0.05, 0.08).translate(0, 0.195, -0.60), COR_VOLANTE, 0.18));

  var geoCorpo = BGU.mergeBufferGeometries(pecas);
  if (!geoCorpo) throw new Error('kart: mergeBufferGeometries devolveu null (atributos/indice nao batem)');
  var matCorpo = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var malhaCorpo = new T.Mesh(geoCorpo, matCorpo);
  malhaCorpo.name = 'kartCorpo';
  grupo.add(malhaCorpo);

  /* =========================================================================
     RODAS — 1 InstancedMesh com 4 instancias (draw call 2)
     Cada instancia tem matriz propria => giram e estercam de verdade, e o
     corpo nunca se mexe. Geometria construida no tamanho TRASEIRO; a
     dianteira e a MESMA geometria com escala menor na instancia.
     ⛔ armadilha 15: material PROPRIO, nunca compartilhado com o corpo.
     ========================================================================= */
  var R_TRAS = 0.245, W_TRAS = 0.20, R_FRENTE = 0.195, W_FRENTE = 0.165;
  var rodaPecas = [];
  /* pneu: cilindro com o eixo em X */
  rodaPecas.push(pinta(new T.CylinderGeometry(R_TRAS, R_TRAS, W_TRAS, 12).rotateZ(Math.PI / 2), COR_PNEU, 0.16));
  /* calota clara nos DOIS lados (0.012 saliente; mirror por escala negativa
     inverteria o winding, entao e mais barato ter as duas) */
  rodaPecas.push(pinta(new T.CircleGeometry(0.115, 8).rotateY(Math.PI / 2).translate(0.112, 0, 0), COR_CALOTA, 0.10));
  rodaPecas.push(pinta(new T.CircleGeometry(0.115, 8).rotateY(-Math.PI / 2).translate(-0.112, 0, 0), COR_CALOTA, 0.10));
  var geoRoda = BGU.mergeBufferGeometries(rodaPecas);
  if (!geoRoda) throw new Error('kart: merge da roda devolveu null');

  var K_LARG = W_FRENTE / W_TRAS, K_RAIO = R_FRENTE / R_TRAS;
  /* ⛔ medido: com as traseiras em x=0.475 a CALOTA (0.012 saliente) levava a
     largura para 1.174. Em 0.463 a calota cai exatamente em 0.575 -> 1.150. */
  var RODAS = [
    { x: -0.455, y: R_FRENTE, z: -0.60, sx: K_LARG, sr: K_RAIO, dianteira: true },
    { x:  0.455, y: R_FRENTE, z: -0.60, sx: K_LARG, sr: K_RAIO, dianteira: true },
    { x: -0.463, y: R_TRAS,   z:  0.56, sx: 1,      sr: 1,      dianteira: false },
    { x:  0.463, y: R_TRAS,   z:  0.56, sx: 1,      sr: 1,      dianteira: false }
  ];
  var matRodas = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var malhaRodas = new T.InstancedMesh(geoRoda, matRodas, RODAS.length);
  malhaRodas.name = 'kartRodas';
  malhaRodas.instanceMatrix.setUsage(T.DynamicDrawUsage);
  grupo.add(malhaRodas);

  var giroRoda = 0, estercoRoda = 0;
  var _m = new T.Matrix4(), _e = new T.Euler(), _v = new T.Vector3();
  function atualizaRodas() {
    for (var i = 0; i < RODAS.length; i++) {
      var r = RODAS[i];
      /* ordem 'YXZ' => R = Ry(esterco) . Rx(giro): estercar carrega o eixo de giro junto */
      _e.set(giroRoda, r.dianteira ? estercoRoda : 0, 0, 'YXZ');
      _m.makeRotationFromEuler(_e);
      _v.set(r.sx, r.sr, r.sr);
      _m.scale(_v);                       /* M = R . S */
      _m.setPosition(r.x, r.y, r.z);      /* M = T . R . S */
      malhaRodas.setMatrixAt(i, _m);
    }
    malhaRodas.instanceMatrix.needsUpdate = true;
  }
  atualizaRodas();

  /* =========================================================================
     ESTRELINHA DOURADA — MeshBasic (draw call 3). E assim que este mundo
     acende coisa sem luz nova.
     ========================================================================= */
  function formaEstrela(rFora, rDentro) {
    var s = new T.Shape(), i, a, r, x, y;
    for (i = 0; i < 10; i++) {
      a = Math.PI / 2 + i * Math.PI / 5;
      r = (i % 2 === 0) ? rFora : rDentro;
      x = Math.cos(a) * r; y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }
  /* sem bevel: a armadilha 7 (bevel infla sqrt(2)*bevelSize) nao se aplica */
  var geoEstrela = new T.ExtrudeGeometry(formaEstrela(0.085, 0.040),
    { depth: 0.03, bevelEnabled: false, curveSegments: 1, steps: 1 });
  geoEstrela.translate(0, NOSE_Y, -0.915);   /* 0.010 a frente do circulo branco (-0.875) */
  var malhaEstrela = new T.Mesh(pinta(geoEstrela, COR_ESTRELA, 0.0),
    new T.MeshBasicMaterial({ vertexColors: true }));
  malhaEstrela.name = 'kartEstrela';
  grupo.add(malhaEstrela);

  /* =========================================================================
     userData — o contrato que o sistema de pilotagem consome
     ========================================================================= */
  /* quadril da crianca (1,40) sentada: 3 cm acima do assento creme (topo 0.370) */
  grupo.userData.assento = { x: 0, y: 0.40, z: 0.30 };

  /* gira as 4 rodas no proprio eixo. ANGULO ABSOLUTO em radianos. */
  grupo.userData.girarRodas = function (giro) {
    giroRoda = giro || 0;
    atualizaRodas();
  };

  /* esterca SO as duas dianteiras. ANGULO ABSOLUTO em radianos, +-0.60. */
  grupo.userData.virarRodas = function (ang) {
    ang = ang || 0;
    estercoRoda = ang < -0.60 ? -0.60 : (ang > 0.60 ? 0.60 : ang);
    atualizaRodas();
  };

  /* extras uteis para quem monta a pista / o piloto */
  grupo.userData.medidas = { comprimento: 1.897, largura: 1.150, altura: 0.951, frente: -1 };
  grupo.userData.volante = { x: 0, y: 0.605, z: -0.055 };
  grupo.userData.colisor = { x: 0, z: 0, raio: 0.80 };
  grupo.userData.raioRodaTras = R_TRAS;     /* giro = distancia / raio */
  grupo.userData.raioRodaFrente = R_FRENTE;
  grupo.userData.corChassi = COR_CHASSI;
  grupo.userData.fatias = fatias;           /* {nome,ini,n} por peca — o verificador de coplanares usa */

  return { grupo: grupo, custo: { dc: 3, tri: 798 } };
};
