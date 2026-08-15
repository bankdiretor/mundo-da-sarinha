/* ===========================================================================
   parteJardimFe — o Jardim da Fe, dentro do Jardim (elipse 13x10 em (0,-38)).
   Uma CRUZ LUMINOSA em (-7,-34), sobre um montinho de grama com 3 degraus de
   pedra clara. 4 banquinhos de feltro em semicirculo, voltados para a cruz.
   Canteiros de florzinhas brancas e lilases ao redor. Caminho de pedras
   claras ligando a trilha principal ate o pe do montinho. Vaga-lumes
   dourados boiando devagar entre a cruz e os bancos.

   Tom: reverente e acolhedor — o lugar de silencio e beleza do mundo.
   Nao invade o coreto (0,-44 raio 3.6) nem a trilha principal serpenteada
   (ver partes/caminho.js: curvaX(z) = 3*sin(((z+20)/-20.5)*PI*1.15)); a cruz
   fica 7+ unidades a oeste da trilha, fora do seu alcance em toda a extensao.

   Orcamento MEDIDO (harness three@0.147.0 fora do navegador): 3 draw calls /
   1.736 triangulos (feltro mesclado 1412 + cruz-e-halo 44 + vaga-lumes 280).
   Contrato: partes/CONTRATO.md. Sem luz nova, sem asset externo, cor por vertice.
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteJardimFe = function (ctx) {
  var T = ctx.T, M = ctx.M, P = M.paleta, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'jardimfe';

  var CX = -7, CZ = -34;                /* centro da cruz */
  var Y_TOPO_MONTE = 0.60;              /* topo do montinho, onde a cruz nasce */

  /* ---------- pintura (cor por vertice) ---------- */
  var SOMBRA = new T.Color(0x6a5a8f);   /* armadilha paga: sem tom escuro o feltro claro lava */
  function esc(cor, k) { return new T.Color(cor).lerp(SOMBRA, k === undefined ? 0.18 : k); }

  /* toda peca vira non-indexed e perde uv (armadilha do contrato: index/uv
     tem que bater entre TODAS as pecas de um mesmo merge) */
  function nu(geo) {
    if (geo.attributes.uv) geo.deleteAttribute('uv');
    return geo.index ? geo.toNonIndexed() : geo;
  }
  function pinta(geo, cor) {
    var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    return geo;
  }
  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true });

  var pecas = [];   /* tudo que vira a malha unica de feltro (DC1) */

  /* ---------- 1. montinho: 3 degraus de pedra clara + capuz de grama ---------- */
  var DEGRAUS = [
    { rt: 0.62, rb: 0.80, h: 0.16, y: 0.08, tom: 0.32 },
    { rt: 0.42, rb: 0.60, h: 0.16, y: 0.24, tom: 0.20 },
    { rt: 0.24, rb: 0.40, h: 0.16, y: 0.40, tom: 0.08 }
  ];
  for (var d = 0; d < DEGRAUS.length; d++) {
    var g = DEGRAUS[d];
    var deg = nu(new T.CylinderGeometry(g.rt, g.rb, g.h, 12));
    deg.translate(CX, g.y, CZ);
    pinta(deg, esc(P.creme, g.tom));
    pecas.push(deg);
  }
  var capuz = nu(new T.IcosahedronGeometry(0.26, 0));
  capuz.scale(1, 0.68, 1);
  capuz.translate(CX, 0.50, CZ);
  pinta(capuz, esc(M.corGrama, 0.05));
  pecas.push(capuz);

  /* ---------- 2. quatro banquinhos de feltro, voltados para a cruz ---------- */
  var R_BANCO = 2.3, ANGS = [-60, -20, 20, 60];
  var CORES_ALMOFADA = [P.rosa, P.mel, P.azulpo, P.roxo];
  var bancos = [];
  for (var b = 0; b < ANGS.length; b++) {
    var aRad = ANGS[b] * Math.PI / 180;
    var bx = CX + R_BANCO * Math.sin(aRad);
    var bz = CZ + R_BANCO * Math.cos(aRad);
    bancos.push({ x: bx, z: bz });

    var assento = nu(new T.BoxGeometry(0.86, 0.30, 0.40).rotateY(aRad));
    assento.translate(bx, 0.15, bz);
    pinta(assento, esc(P.creme, 0.16));
    pecas.push(assento);

    /* encosto do lado de fora do semicirculo (oposto a cruz) */
    var encosto = nu(new T.BoxGeometry(0.86, 0.46, 0.09).rotateY(aRad));
    var ex = bx + 0.17 * Math.sin(aRad), ez = bz + 0.17 * Math.cos(aRad);
    encosto.translate(ex, 0.15 + 0.23, ez);
    pinta(encosto, esc(P.creme, 0.24));
    pecas.push(encosto);

    var almofada = nu(new T.BoxGeometry(0.72, 0.09, 0.32).rotateY(aRad));
    almofada.translate(bx, 0.34, bz);
    pinta(almofada, CORES_ALMOFADA[b % CORES_ALMOFADA.length]);
    pecas.push(almofada);

    ctx.COLISORES.push({ x: bx, z: bz, raio: 0.45 });
  }
  /* o "banco da frente": ponto entre os dois bancos centrais, de frente pra cruz */
  var BANCO_FRENTE = {
    x: (bancos[1].x + bancos[2].x) / 2,
    z: (bancos[1].z + bancos[2].z) / 2
  };

  /* ---------- 3. caminho de pedras claras: da trilha principal ate o montinho ----------
     A trilha principal (caminho.js) tem x = curvaX(z) = 3*sin(((z+20)/-20.5)*PI*1.15).
     Em z=-35 ela passa por x=1.43 — e daqui que puxamos o ramal ate a cruz. */
  var PEDRA_A = { x: 1.43, z: -35.0 };
  var PEDRA_B = { x: CX + 0.90, z: CZ };     /* encosta na base do 1o degrau (raio 0.80) */
  var TONS_PEDRA = [0xf4edde, 0xf0dfe4, 0xece6f5];
  var N_PEDRA = 12;
  for (var p = 0; p < N_PEDRA; p++) {
    var t = p / (N_PEDRA - 1);
    var px = PEDRA_A.x + (PEDRA_B.x - PEDRA_A.x) * t;
    var pz = PEDRA_A.z + (PEDRA_B.z - PEDRA_A.z) * t + 0.35 * Math.sin(t * Math.PI);
    var pedra = nu(new T.BoxGeometry(0.40, 0.09, 0.32).rotateY(p * 0.53));
    pedra.translate(px, 0.045, pz);
    pinta(pedra, TONS_PEDRA[p % TONS_PEDRA.length]);
    pecas.push(pedra);
  }

  /* ---------- 4. canteiros de flores brancas e lilases ao redor da cruz ----------
     2 arcos, so no setor livre (100 a 300 graus: foge dos bancos ao norte e
     do ramal de pedras a leste). Diferentes das 16 flores da danca (essas
     ficam perto do coreto, em flores.js). */
  var CORES_FLOR = [0xffffff, 0xd9c9ff];
  var ARCOS_FLOR = [{ r: 1.05, n: 12 }, { r: 1.55, n: 12 }];
  var THETA0 = 100 * Math.PI / 180, THETA1 = 300 * Math.PI / 180;
  var idxFlor = 0;
  for (var ar = 0; ar < ARCOS_FLOR.length; ar++) {
    var arco = ARCOS_FLOR[ar];
    for (var i = 0; i < arco.n; i++) {
      var tt = i / (arco.n - 1);
      var ang = THETA0 + tt * (THETA1 - THETA0);
      var fx = CX + arco.r * Math.sin(ang);
      var fz = CZ + arco.r * Math.cos(ang);

      var caule = nu(new T.CylinderGeometry(0.02, 0.03, 0.22, 5));
      caule.translate(fx, 0.11, fz);
      pinta(caule, 0x7fae72);
      pecas.push(caule);

      var cabeca = nu(new T.IcosahedronGeometry(0.08, 0));
      cabeca.translate(fx, 0.24, fz);
      pinta(cabeca, CORES_FLOR[idxFlor % CORES_FLOR.length]);
      pecas.push(cabeca);
      idxFlor++;
    }
  }

  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matFeltro));

  /* ---------- 5. a CRUZ LUMINOSA + halo (malha propria, material que brilha) ----------
     Pivot em (CX, Y_TOPO_MONTE, CZ): o "respirar" da cruz e so um scale local
     no mesh, entao ele tem que nascer com posicao propria (nao coordenada
     absoluta), senao escalar around (0,0,0) do mundo faria a cruz "voar". */
  function textoHalo() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    var g2 = cv.getContext('2d');
    var grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,243,214,1)');
    grad.addColorStop(0.38, 'rgba(255,243,214,0.75)');
    grad.addColorStop(1, 'rgba(255,243,214,0)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 64, 64);
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false;
    tex.minFilter = T.LinearFilter;
    return tex;
  }
  function uvCentro(geo) {
    var n = geo.attributes.uv.count, a = new Float32Array(n * 2);
    for (var i = 0; i < n; i++) { a[i*2] = 0.5; a[i*2+1] = 0.5; }
    geo.setAttribute('uv', new T.BufferAttribute(a, 2));
    return geo;
  }
  function nuManterUv(geo) { return geo.index ? geo.toNonIndexed() : geo; }

  var H_HASTE = 3.2, FRAC_TRAVESSA = 0.68;
  var pecasBrilho = [];

  var haste = uvCentro(new T.BoxGeometry(0.22, H_HASTE, 0.22));
  haste.translate(0, H_HASTE / 2, 0);
  pecasBrilho.push(nuManterUv(haste));

  var travessa = uvCentro(new T.BoxGeometry(1.6, 0.22, 0.22));
  travessa.translate(0, H_HASTE * FRAC_TRAVESSA, 0);
  pecasBrilho.push(nuManterUv(travessa));

  /* halo: circulo cujo UV radial (centro 0.5,0.5 -> borda) casa exatamente
     com o degrade da textura — nao mexe no uv dele, so no da haste/travessa */
  var halo = new T.CircleGeometry(1.3, 20);
  halo.rotateY(Math.PI / 2);
  halo.translate(-0.22, H_HASTE * FRAC_TRAVESSA - 0.28, 0);
  pecasBrilho.push(nuManterUv(halo));

  var matCruz = ctx.materialBrilho(0xfff3d6);
  matCruz.map = textoHalo();
  matCruz.transparent = true;
  matCruz.depthWrite = false;

  var malhaCruz = new T.Mesh(BGU.mergeBufferGeometries(pecasBrilho), matCruz);
  malhaCruz.position.set(CX, Y_TOPO_MONTE, CZ);
  malhaCruz.renderOrder = 2;
  grupo.add(malhaCruz);

  ctx.COLISORES.push({ x: CX, z: CZ, raio: 0.8 });

  /* ---------- 6. vaga-lumes: 14 pontinhos dourados entre a cruz e os bancos ---------- */
  var N_VAGALUME = 14;
  var geoVL = new T.IcosahedronGeometry(0.045, 0);
  var matVL = ctx.materialBrilho(0xffd166);
  var instVL = new T.InstancedMesh(geoVL, matVL, N_VAGALUME);
  instVL.instanceMatrix.setUsage(T.DynamicDrawUsage);
  var vlBase = [];
  for (var v = 0; v < N_VAGALUME; v++) {
    vlBase.push({
      x: CX + (((v * 53) % 100) / 100 - 0.5) * 4.2,
      z: CZ + (((v * 37) % 100) / 100) * 3.0,
      y: 0.7 + (((v * 23) % 100) / 100) * 1.3,
      fase: v * 0.9
    });
  }
  var mtxVL = new T.Matrix4(), qVL = new T.Quaternion(), sVL = new T.Vector3(1, 1, 1), vVL = new T.Vector3();
  function atualizaVagalumes(t) {
    for (var i = 0; i < N_VAGALUME; i++) {
      var q = vlBase[i];
      vVL.set(
        q.x + 0.12 * Math.sin(t * 0.4 + q.fase * 1.3),
        q.y + 0.18 * Math.sin(t * 0.6 + q.fase),
        q.z + 0.12 * Math.cos(t * 0.5 + q.fase * 0.7)
      );
      mtxVL.compose(vVL, qVL, sVL);
      instVL.setMatrixAt(i, mtxVL);
    }
    instVL.instanceMatrix.needsUpdate = true;
  }
  atualizaVagalumes(0);
  grupo.add(instVL);

  /* ---------- API para a integracao ---------- */
  grupo.userData.cruz = { x: CX, z: CZ, y: 2.0 };
  grupo.userData.bancoDaFrente = BANCO_FRENTE;

  return {
    grupo: grupo,
    update: function (t, dt) {
      /* respiracao lenta da cruz: 4% de escala, bem devagar */
      var s = 1 + 0.04 * Math.sin(t * 0.35);
      malhaCruz.scale.set(s, s, s);
      atualizaVagalumes(t);
    },
    custo: { dc: 3, tri: 1736 }   /* MEDIDO: mergeBufferGeometries + InstancedMesh.count reais */
  };
};
