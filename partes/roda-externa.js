/* parteRodaExterna -- a CHEGADA na roda-gigante: caminho de acesso, bilheteria
   fofa, jardim e bancos pra quem espera. Contrato: partes/CONTRATO.md.

   Area de trabalho (nao editavel fora dela): entre a saida do corredor de
   entrada do parque (x=19-32, |z|<3) e a fundacao da roda-gigante (comeca em
   raio 9.6 de 43.5,0, ou seja x=33.9 em z=0). Tudo aqui mora dentro do
   retangulo x=[32.15,33.90], com garden/bancos podendo abrir um pouco mais em
   z (ate |z|~2.4) mas sempre com folga medida contra os vizinhos:
     - gangorra (36.5,6.5) raio ~1.5  -- nunca chega perto, fica a leste
     - carrossel (35.5,-5.5) raio 2.4 -- idem
     - postes de luz da Rodada 2 (roda-luzes.js, NAO editado): os 3 mais
       proximos sao (31.10,0.00) (31.78,2.07) (31.52,-3.21) -- ficam a OESTE
       do x=32, ou seja ja no territorio do corredor; aqui so preciso manter
       0.4m+ de folga pra nao brigar visualmente com a base deles
     - cerca do parque, raio 11.6 de (42,0) -- meu ponto mais distante
       (33.9,0) fica a distancia 8.4 do centro da cerca, bem dentro, sem risco
     - fundacao da roda (roda-plataforma.js, NAO editado): raio 9.6 de
       (43.5,0) -- todo elemento fica com x <= 33.90, ou seja sempre a raio
       >= 9.6 do centro (43.5,0) em z=0, e com folga maior conforme |z| cresce
       (a fronteira do circulo AFASTA de mim quando |z| aumenta)

   Nota sobre a costura oeste: o mosaico do caminho comeca em x=32.15 (a
   tarefa pede a ligacao em "x=32, saida do corredor") e como cada ladrilho
   e um losango (quadrado girado 45), a PONTA da primeira coluna chega a
   x~31.94 -- 6cm alem de x=32, exatamente na emenda com o corredor. Sem
   colisor (caminho e decorativo, jogador anda livre por cima), e e a
   costura pedida, nao uma invasao de zona proibida. Todo COLISOR novo desta
   peca (bilheteria + 2 bancos), esse sim, fica com folga medida >= 0.10m
   dentro de x>=32.0 (ver scratchpad/medir-roda-externa/verify.mjs).

   ORCAMENTO -- 4 draw calls:
     DC1 (Lambert, cor por vertice): bilheteria (corpo+telhado+balcao) +
         mosaico do caminho + os 2 bancos
     DC2 (Basic rosa, "brilho"): aro do telhado da bilheteria + pezinhos
         dourados dos bancos (o "acende" da categoria)
     DC3 (Basic com CanvasTexture): a placa "Roda-Gigante" pendurada na
         bilheteria
     DC4 (InstancedMesh, Lambert cor por instancia): as florzinhas do jardim

   Armadilhas do CONTRATO.md ja tratadas:
     - geo.deleteAttribute('uv') em TODA peca antes de mesclar
     - a maioria das pecas usa formas com indice (Box/Cylinder/Cone/Sphere/
       Ring/Torus), que mesclam entre si sem normalizar. A UNICA excecao e
       a florzinha (geoFlor): caule (CylinderGeometry, COM indice) + bloom
       (IcosahedronGeometry, SEM indice) mesclados NO MESMO merge -- essa e
       exatamente a combinacao que o CONTRATO.md avisa que devolve null em
       silencio sem normalizar antes. Por isso normalizarIndice() e chamada
       nos dois ali (geo.index ? geo.toNonIndexed() : geo), igual ao padrao
       ja usado em roda-estrela.js / roda-estrutura.js.
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaExterna = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'roda-externa';

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var c = c1.clone().lerp(c0, Math.min(1, ((ys[k] - minY) / faixa) * 1.3));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  function pintaPlano(geo, cor) {
    var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  /* armadilha ja paga: geometria com indice e sem indice nao mesclam sem normalizar antes */
  function normalizarIndice(geo) { return geo.index ? geo.toNonIndexed() : geo; }

  var matV = new T.MeshLambertMaterial({ vertexColors: true });
  var pecasCorpo = [];    /* DC1 */
  var pecasBrilho = [];   /* DC2 */

  /* paleta */
  var COR_CREME = 0xF4EDDE, COR_ROSA = 0xE8A7B2, COR_AZULPO = 0x9FB4D8,
      COR_MEL = 0xE9B44C, COR_VERDE = 0xBCD6B0, COR_ROXO = 0x6A3FC5,
      COR_DOURADO = 0xFFD166;

  /* ================= 1) BILHETERIA =================
     Barraquinha fofa: base + balcao (janela virada a oeste, de onde a
     crianca chega) + telhado pontudo com aro rosa brilhante.

     Tamanho e centro MEDIDOS pra caber no vao real: entre a saida do
     corredor (x=32.0) e a fundacao da roda (raio 9.6 de 43.5,0, ou seja
     ~x=33.9-34.0 pertinho de z=1) sobra so ~1.9m de profundidade. A
     primeira versao tinha telhado+sombra com 2.1m de diametro (RAIO_
     TELHADO=1.05) -- maior que o proprio vao -- e a sombra elipsoidal
     furava 0.2m pro lado do corredor. Aqui o alcance real de cada peca
     (medido vertice a vertice, verify.mjs) e:
       oeste (o pior lado, e o balcao): BK.x - 0.79
       leste (o pior lado, e a sombra): BK.x + 0.715
     Com BK.x=33.0: oeste=32.21 (>=32.0, folga 0.21) e leste=33.715 (bem
     abaixo da fundacao, folga >0.25 mesmo no z mais apertado). */
  var BK = { x: 33.0, z: 1.0, largX: 1.1, largZ: 1.3, altura: 1.15 };
  (function bilheteria() {
    /* base/corpo */
    var corpo = new T.BoxGeometry(BK.largX, BK.altura, BK.largZ);
    corpo.translate(BK.x, BK.altura / 2, BK.z);
    pecasCorpo.push(pinta(corpo, COR_CREME, 0.10));

    /* balcao saliente no lado oeste (-x), onde a crianca apoia a mao */
    var balcao = new T.BoxGeometry(0.24, 0.42, BK.largZ * 0.8);
    balcao.translate(BK.x - BK.largX / 2 - 0.12, 0.42 / 2 + 0.28, BK.z);
    pecasCorpo.push(pinta(balcao, COR_ROSA, 0.10));

    /* janela (vao escuro, so uma faixa mais escura pintada na parede oeste) */
    var janela = new T.BoxGeometry(0.03, 0.42, 0.75);
    janela.translate(BK.x - BK.largX / 2 - 0.01, BK.altura * 0.62, BK.z);
    pecasCorpo.push(pinta(janela, 0x4a3a6a, 0.0));

    /* telhado pontudo (piramide de 4 aguas -> ConeGeometry 4 lados) */
    var RAIO_TELHADO = 0.85, ALT_TELHADO = 0.72;
    var telhado = new T.ConeGeometry(RAIO_TELHADO, ALT_TELHADO, 4);
    telhado.rotateY(Math.PI / 4);   /* aresta alinhada com os eixos, telhado "quadrado" */
    telhado.translate(BK.x, BK.altura + ALT_TELHADO / 2, BK.z);
    pecasCorpo.push(pinta(telhado, COR_ROSA, 0.16));

    /* bolinha no topo do telhado */
    var bola = new T.SphereGeometry(0.10, 8, 6);
    bola.translate(BK.x, BK.altura + ALT_TELHADO + 0.05, BK.z);
    pecasCorpo.push(pinta(bola, COR_MEL, 0.10));

    /* sombra de contato, achatada (truque ja usado em roda-plataforma.js) */
    var sombra = new T.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
    sombra.scale(BK.largX * 0.65, 1, BK.largZ * 0.68);
    sombra.translate(BK.x, 0.012, BK.z);
    pecasCorpo.push(pintaPlano(sombra, new T.Color(COR_CREME).lerp(CINZA, 0.30)));

    /* aro dourado-rosa na base do telhado (DC2, "brilho" da barraquinha) */
    var aro = new T.TorusGeometry(RAIO_TELHADO * 0.98, 0.04, 6, 4);
    aro.rotateY(Math.PI / 4);
    aro.rotateX(Math.PI / 2);
    aro.translate(BK.x, BK.altura + 0.03, BK.z);
    aro = normalizarIndice(aro);
    aro.deleteAttribute('uv');
    pecasBrilho.push(aro);

    /* colisor da bilheteria -- raio 0.9 cobre com folga o maior alcance
       visual medido (0.79 do balcao a oeste) */
    ctx.COLISORES.push({ x: BK.x, z: BK.z, raio: 0.9 });
  })();

  /* ================= 2) PLACA "Roda-Gigante" (CanvasTexture, DC3) =================
     Pendurada acima da janela, virada a oeste (mesmo lado do balcao). */
  var meshPlaca = (function placa() {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#fff8ec';
    cx.beginPath();
    cx.moveTo(10, 8); cx.lineTo(246, 8); cx.lineTo(246, 88); cx.lineTo(10, 88); cx.closePath();
    cx.fill();
    cx.strokeStyle = '#e8a7b2';
    cx.lineWidth = 6;
    cx.stroke();
    cx.fillStyle = '#6a3fc5';
    cx.font = 'bold 34px sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('Roda-Gigante', 128, 50);
    cx.font = '20px sans-serif';
    cx.fillStyle = '#e9b44c';
    cx.fillText('* entrada aqui *', 128, 76);
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false;
    tex.minFilter = T.LinearFilter;
    var geo = new T.PlaneGeometry(0.95, 0.36);
    var mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }));
    mesh.position.set(BK.x - BK.largX / 2 - 0.03, BK.altura * 0.98, BK.z);
    mesh.rotation.y = Math.PI / 2;   /* de frente pra quem chega do oeste */
    return mesh;
  })();
  grupo.add(meshPlaca);

  /* ================= 3) CAMINHO: mosaico de ladrilhos =================
     Ligando x=32.15 (saida do corredor) ate x=33.55, largura ~3.0m (z de
     -1.6 a 1.4). Padrao diferente do chao generico do parque: ladrilhos em
     diamante, cor alternada -- o parque.js so tem gradiente liso, sem
     mosaico. CAM_X1=33.55 (nao 33.9): o ladrilho e um quadrado girado 45
     graus, entao sua PONTA (nao a borda) e o ponto mais distante do centro
     --meia-diagonal de 0.30*raiz(2)/2=0.212m. Com CAM_X1=33.55 a ponta mais
     a leste chega a 33.76, que fica a distancia >=9.6 (raio da fundacao,
     roda-plataforma.js) do centro da roda (43.5,0) pra QUALQUER z do
     mosaico -- medido vertice a vertice em scratchpad/medir-roda-externa/
     verify.mjs (antes, com CAM_X1=33.85, a ponta do ladrilho invadia a
     fundacao por ate 16cm). Sobra uma friagem de grama de ~0.15m ate o aro
     dourado, o que fica bem: o mosaico "chega perto" sem se misturar nele. */
  var CAM_X0 = 32.15, CAM_X1 = 33.55;
  (function caminho() {
    var NX = 5, NZ = 8;
    var xs = [], zs = [];
    for (var i = 0; i < NX; i++) xs.push(CAM_X0 + (CAM_X1 - CAM_X0) * (i / (NX - 1)));
    for (var j = 0; j < NZ; j++) zs.push(-1.6 + (3.0) * (j / (NZ - 1)));
    var CORES = [COR_CREME, COR_ROSA, COR_AZULPO];
    for (i = 0; i < NX; i++) {
      for (j = 0; j < NZ; j++) {
        var t = new T.BoxGeometry(0.30, 0.045, 0.30);
        t.rotateY(Math.PI / 4);
        t.translate(xs[i], 0.0225, zs[j]);
        var idx = (i + j) % 5;
        var cor = (idx === 0) ? COR_MEL : CORES[(i + j) % 3];
        pecasCorpo.push(pinta(t, cor, 0.06));
      }
    }
  })();

  /* ================= 4) BANCOS (2, de feltro) =================
     Perto da bilheteria, no lado sul do caminho, virados para quem espera.
     Colisor raio 0.5 cada. Posicoes escolhidas E MEDIDAS (verify.mjs) pra
     nao encostar em NADA: nem um no outro, nem no colisor da bilheteria
     (BK.x=33.0, BK.z=1.0, raio 0.9) -- a primeira tentativa punha o banco a
     0.89 do centro da bilheteria, ou seja DENTRO do raio do telhado de
     entao (1.05): o banco ficava fisicamente debaixo do telhado pontudo.
     Aqui a distancia bilheteria-banco fica >=1.66 (raio bilheteria 0.9 +
     raio banco 0.5 = 1.4, sobra folga ~0.26) e banco-banco fica >=1.20
     (soma dos raios = 1.0, sobra folga 0.20). */
  var BANCOS = [
    { x: 32.60, z: -0.65, rot: 0.30 },
    { x: 32.60, z: -1.85, rot: -0.30 }
  ];
  (function bancos() {
    BANCOS.forEach(function (b) {
      var pecasBanco = [];
      var assento = new T.BoxGeometry(0.9, 0.16, 0.42);
      assento.translate(0, 0.36, 0);
      pecasBanco.push(pinta(assento, COR_AZULPO, 0.14));
      var encosto = new T.BoxGeometry(0.9, 0.36, 0.10);
      encosto.translate(0, 0.36 + 0.18 + 0.08, -0.16);
      pecasBanco.push(pinta(encosto, COR_AZULPO, 0.16));
      [-0.35, 0.35].forEach(function (dx) {
        var perna = new T.CylinderGeometry(0.05, 0.06, 0.36, 6);
        perna.translate(dx, 0.18, 0);
        pecasBanco.push(pinta(perna, COR_ROXO, 0.10));
      });
      var grupoBanco = BGU.mergeBufferGeometries(pecasBanco);
      grupoBanco.rotateY(b.rot);
      grupoBanco.translate(b.x, 0, b.z);
      pecasCorpo.push(grupoBanco);

      /* pezinho dourado (brilho, DC2) embaixo de cada perna, marcando o assento */
      [-0.35, 0.35].forEach(function (dx) {
        var pe = new T.SphereGeometry(0.055, 6, 5);
        var vx = Math.cos(b.rot) * dx, vz = -Math.sin(b.rot) * dx;
        pe.translate(b.x + vx, 0.02, b.z + vz);
        pe = normalizarIndice(pe);
        pe.deleteAttribute('uv');
        pecasBrilho.push(pe);
      });

      ctx.COLISORES.push({ x: b.x, z: b.z, raio: 0.5 });
    });
  })();

  /* ---------- monta DC1 e DC2 ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasCorpo), matV));
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasBrilho), ctx.materialBrilho(COR_ROSA)));

  /* ================= 5) JARDIM: florzinhas (InstancedMesh, DC4) =================
     Duas faixas ladeando o caminho (sul e norte) + uma reentrancia perto da
     fundacao, sempre com folga medida (vertice a vertice, script de
     verificacao) dos postes/gangorra/carrossel/fundacao. */
  var geoFlor = (function () {
    var pecas = [];
    var caule = new T.CylinderGeometry(0.018, 0.026, 0.22, 5);
    caule.translate(0, 0.11, 0);
    pecas.push(caule);
    var bloom = new T.IcosahedronGeometry(0.085, 0);
    bloom.translate(0, 0.24, 0);
    pecas = pecas.map(function (g) { return normalizarIndice(g); });
    bloom = normalizarIndice(bloom);
    pecas.push(bloom);
    pecas.forEach(function (g) { g.deleteAttribute('uv'); });
    var g2 = BGU.mergeBufferGeometries(pecas, false);
    var n = g2.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = 1; a[i * 3 + 1] = 1; a[i * 3 + 2] = 1; }
    g2.setAttribute('color', new T.BufferAttribute(a, 3));
    return g2;
  })();

  var FLORES = [];
  var CORES_FLOR = [COR_ROSA, COR_MEL, COR_AZULPO, COR_ROXO, COR_VERDE];
  (function semear() {
    /* faixa sul, junto do caminho */
    for (var i = 0; i < 9; i++) {
      var x = CAM_X0 + (CAM_X1 - CAM_X0) * (i / 8);
      FLORES.push({ x: x, z: -1.85 + ((i % 2) * 0.10), cor: CORES_FLOR[i % CORES_FLOR.length] });
    }
    /* faixa norte, junto do caminho (para antes de chegar perto do poste em 31.78,2.07) */
    for (var j = 0; j < 7; j++) {
      var x2 = 32.35 + (33.55 - 32.35) * (j / 6);
      FLORES.push({ x: x2, z: 1.62 + ((j % 2) * 0.10), cor: CORES_FLOR[(j + 2) % CORES_FLOR.length] });
    }
    /* reentrancia perto da fundacao, cantinho sul (entre o caminho e a roda,
       longe do carrossel que fica em 35.5,-5.5). Centro (33.25,-1.05) raio
       0.28: o ponto mais a leste (k=0) fica a distancia medida >=9.6 (raio
       da fundacao) do centro da roda (43.5,0) -- antes, com centro
       (33.55,-0.85) raio 0.32, a flor k=0 furava a fundacao por ~4cm
       (medido vertice a vertice, ver verify.mjs). */
    for (var k = 0; k < 8; k++) {
      var ang = (k / 8) * Math.PI * 2;
      var cx = 33.25 + Math.cos(ang) * 0.28;
      var cz = -1.05 + Math.sin(ang) * 0.28;
      FLORES.push({ x: cx, z: cz, cor: CORES_FLOR[(k + 1) % CORES_FLOR.length] });
    }
  })();
  var TOTAL_FLOR = FLORES.length;

  var instFlor = new T.InstancedMesh(geoFlor, matV, TOTAL_FLOR);
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(), vec = new T.Vector3(), esc = new T.Vector3();
  for (var f = 0; f < TOTAL_FLOR; f++) {
    var fl = FLORES[f];
    eul.set(0, (f * 1.7) % (Math.PI * 2), 0);
    qua.setFromEuler(eul);
    var s = 0.85 + ((f * 0.31) % 1) * 0.35;
    vec.set(fl.x, 0, fl.z);
    esc.set(s, s, s);
    mtx.compose(vec, qua, esc);
    instFlor.setMatrixAt(f, mtx);
    instFlor.setColorAt(f, new T.Color(fl.cor));
  }
  instFlor.instanceMatrix.needsUpdate = true;
  if (instFlor.instanceColor) instFlor.instanceColor.needsUpdate = true;
  grupo.add(instFlor);

  return {
    grupo: grupo,
    update: function (t, dt) { },
    /* medido com THREE r147 real (script Node separado, scratchpad/medir-
       roda-externa/measure.mjs), somando geometry.index ? index.count/3 :
       position.count/3 por malha, multiplicando por instancias:
       DC1 (placa CanvasTexture)                  =    2 tri
       DC2 (corpo: bilheteria+caminho+bancos)     =  768 tri
       DC3 (brilho rosa: aro+pezinhos)            =  240 tri
       DC4 (florzinhas, InstancedMesh x24)        =  960 tri
       total = 1970 tri, 4 draw calls */
    custo: { dc: 4, tri: 1970 }
  };
};
