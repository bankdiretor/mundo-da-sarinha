/* parteQuartinho — o INTERIOR da casa da crianca. Fica longe do mundo (em
   400,400) numa caixa fechada; a crianca e teleportada ao entrar pela porta.
   Aqui ela DECORA: cor da parede, cor da colcha — e as estrelinhas que achou
   viram adesivos na parede. Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteQuartinho = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'quartinho';

  var QX = 400, QZ = 400;          /* longe de tudo: a caixa fechada nao deixa ver o vazio */
  var L = 4.6;                     /* meia-largura do quarto (9,2 m) */
  var H = 3.2;                     /* pe-direito */
  var CINZA = new T.Color(0x6a5a8f);

  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor).multiplyScalar(1.22), c1 = new T.Color(cor).lerp(CINZA, fBase || 0.14).multiplyScalar(1.12);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, ys = [];
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y<minY) minY=y; if (y>maxY) maxY=y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var c = c1.clone().lerp(c0, Math.min(1, ((ys[k]-minY)/faixa) * 1.3));
      a[k*3]=c.r; a[k*3+1]=c.g; a[k*3+2]=c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* ---- piso de madeira clara + rodape (1 DC) ---- */
  (function piso() {
    var pecas = [];
    var ch = new T.BoxGeometry(L*2, 0.2, L*2);
    ch.translate(QX, -0.1, QZ);
    pecas.push(pinta(ch, 0xe8d5b7, 0.10));
    /* tabuas: linhas mais escuras */
    for (var i = -4; i <= 4; i++) {
      var tb = new T.BoxGeometry(L*2, 0.02, 0.06);
      tb.translate(QX, 0.011, QZ + i * 1.0);
      pecas.push(pinta(tb, 0xd8c0a0, 0.05));
    }
    /* tapete redondo */
    var tap = new T.CircleGeometry(1.8, 24).rotateX(-Math.PI/2);
    tap.translate(QX, 0.02, QZ + 0.4);
    pecas.push(pinta(tap, 0xffd9e2, 0.06));
    var tap2 = new T.RingGeometry(1.1, 1.35, 24).rotateX(-Math.PI/2);
    tap2.translate(QX, 0.025, QZ + 0.4);
    pecas.push(pinta(tap2, 0xffe9a8, 0.05));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- PAREDES + teto: material proprio (a cor muda com o gosto da crianca) ---- */
  var matParede = new T.MeshLambertMaterial({ color: 0xd9c9ff, side: T.DoubleSide,
    emissive: new T.Color(0xd9c9ff).multiplyScalar(0.55) });
  (function paredes() {
    var pecas = [];
    /* 4 paredes viradas para dentro */
    var conf = [ [0,-L,0], [0,L,Math.PI], [-L,0,Math.PI/2], [L,0,-Math.PI/2] ];
    for (var i = 0; i < 4; i++) {
      var p = new T.PlaneGeometry(L*2, H);
      p.rotateY(conf[i][2]);
      p.translate(QX + conf[i][0], H/2, QZ + conf[i][1]);
      p.deleteAttribute('uv');
      pecas.push(p);
    }
    var teto = new T.PlaneGeometry(L*2, L*2).rotateX(Math.PI/2);
    teto.translate(QX, H, QZ);
    teto.deleteAttribute('uv');
    pecas.push(teto);
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matParede));
  })();

  /* ---- janela com vista de ceu estrelado (CanvasTexture) ---- */
  (function janela() {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    var cx = cv.getContext('2d');
    var g = cx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#26114f'); g.addColorStop(1, '#6a3fc5');
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = '#fff2c9';
    for (var i = 0; i < 40; i++) {
      var x = Math.random() * 256, y = Math.random() * 200, r = Math.random() * 1.6 + 0.5;
      cx.beginPath(); cx.arc(x, y, r, 0, 6.3); cx.fill();
    }
    /* lua */
    cx.fillStyle = '#ffe9a8'; cx.beginPath(); cx.arc(190, 60, 22, 0, 6.3); cx.fill();
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
    var vista = new T.Mesh(new T.PlaneGeometry(2.0, 1.6),
      new T.MeshBasicMaterial({ map: tex }));
    vista.position.set(QX, 1.9, QZ - L + 0.06);
    grupo.add(vista);
    /* moldura */
    var mold = [];
    [[0,0.85,2.2,0.14],[0,-0.85,2.2,0.14],[-1.05,0,0.14,1.8],[1.05,0,0.14,1.8]].forEach(function(m){
      var b = new T.BoxGeometry(m[2], m[3], 0.1);
      b.translate(QX + m[0], 1.9 + m[1], QZ - L + 0.1);
      mold.push(pinta(b, 0xf4edde, 0.12));
    });
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(mold), matV));
  })();

  /* ---- cama (estrutura) + moveis + ursinho: 1 DC ---- */
  (function moveis() {
    var pecas = [];
    /* A CAMA-CAIXA saiu (16/08): virou movel proprio, feito por agente a
       partir da ficha do Ivan — partes/quarto/cama.js, montado la embaixo
       em MOVEIS_DO_QUARTO. O mesmo vale para o bau de brinquedos. */
    /* a mesinha-CAIXA saiu: virou o CRIADO-MUDO redondo de tres pernas
       (partes/quarto/assentos.js), que e quem segura a luminaria-bolha
       e o microfone. */
    /* prateleira na parede do fundo */
    var pra = new T.BoxGeometry(2.6, 0.12, 0.42);
    pra.translate(QX - 1.6, 1.7, QZ + L - 0.25);
    pecas.push(pinta(pra, 0xf0dcc0, 0.10));
    for (var i = 0; i < 4; i++) {
      var pote = new T.CylinderGeometry(0.13, 0.13, 0.3, 8);
      pote.translate(QX - 2.5 + i * 0.6, 1.91, QZ + L - 0.25);
      pecas.push(pinta(pote, [0xe8a7b2, 0x9fb4d8, 0xbcd6b0, 0xe9b44c][i], 0.08));
    }
    /* bau antigo removido — ver partes/quarto/caixa-brinquedos.js */
    /* ursinho no tapete */
    var corpo = new T.SphereGeometry(0.28, 10, 8);
    corpo.scale(1, 1.15, 0.9);
    corpo.translate(QX - 0.4, 0.3, QZ + 0.5);
    pecas.push(pinta(corpo, 0xc9a37a, 0.14));
    var cabU = new T.SphereGeometry(0.22, 10, 8);
    cabU.translate(QX - 0.4, 0.68, QZ + 0.5);
    pecas.push(pinta(cabU, 0xd6b189, 0.10));
    [[-0.15, 0.85, 0], [0.15, 0.85, 0]].forEach(function (o) {
      var or = new T.SphereGeometry(0.08, 8, 6);
      or.translate(QX - 0.4 + o[0], o[1], QZ + 0.5);
      pecas.push(pinta(or, 0xd6b189, 0.10));
    });
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- COLCHA: material proprio (a crianca troca a cor) ---- */
  var matColcha = new T.MeshLambertMaterial({ color: 0xe8a7b2,
    emissive: new T.Color(0xe8a7b2).multiplyScalar(0.35) });
  (function colcha() {
    var c = new T.BoxGeometry(1.58, 0.16, 1.7);
    c.translate(QX + L - 1.0, 0.62, QZ - 0.85);
    c.deleteAttribute('uv');
    grupo.add(new T.Mesh(c, matColcha));
  })();

  /* ---- luminaria acesa (emissivo barato) ---- */
  (function luz() {
    var lamp = new T.Mesh(new T.SphereGeometry(0.17, 10, 8),
      new T.MeshBasicMaterial({ color: 0xffe9a8 }));
    lamp.position.set(QX + L - 1.0, 0.75, QZ + 0.6);
    grupo.add(lamp);
  })();

  /* ---- ADESIVOS: as estrelinhas conquistadas viram enfeite na parede ---- */
  var instAd = null;
  (function adesivos() {
    var forma = new T.Shape();
    for (var i = 0; i < 10; i++) {
      var r = (i % 2 === 0) ? 0.17 : 0.075;
      var a = -Math.PI/2 + i * Math.PI/5;
      var x = Math.cos(a)*r, y = Math.sin(a)*r;
      if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
    }
    forma.closePath();
    var geo = new T.ExtrudeGeometry(forma, { depth: 0.05, bevelEnabled: false });
    geo.deleteAttribute('uv');
    instAd = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ color: 0xffd166 }), 12);
    instAd.instanceMatrix.setUsage(T.DynamicDrawUsage);
    var m = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3(0,0,0);
    for (var k = 0; k < 12; k++) instAd.setMatrixAt(k, m.compose(v.set(0,-999,0), q, s));
    instAd.instanceMatrix.needsUpdate = true;
    grupo.add(instAd);
  })();

  /* ---- API ---- */
  var PAREDES = [0xd9c9ff, 0xffd9e2, 0xcfe8f5, 0xd8f0cc, 0xffe9c9, 0xf4edde];
  var COLCHAS = [0xe8a7b2, 0x9fb4d8, 0xbcd6b0, 0xe9b44c, 0xd9c9ff, 0xfff4e6];
  grupo.userData.entrada = { x: QX, z: QZ + L - 1.4 };
  grupo.userData.limites = { x: QX, z: QZ, meia: L - 0.5, alt: H };
  grupo.userData.paletaParede = PAREDES;
  grupo.userData.paletaColcha = COLCHAS;
  grupo.userData.corParede = function (i) {
    var c = PAREDES[i % PAREDES.length];
    matParede.color.setHex(c);
    matParede.emissive.setHex(c).multiplyScalar(0.55);
  };
  grupo.userData.corColcha = function (i) {
    var c = COLCHAS[i % COLCHAS.length];
    matColcha.color.setHex(c);
    matColcha.emissive.setHex(c).multiplyScalar(0.35);
  };
  grupo.userData.mostrarAdesivos = function (n) {
    var m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(),
        v = new T.Vector3(), s = new T.Vector3(1,1,1), zero = new T.Vector3(0,0,0);
    for (var k = 0; k < 12; k++) {
      if (k < n) {
        var col = k % 6, lin = Math.floor(k / 6);
        e.set(0, Math.PI/2, (k % 3 - 1) * 0.22);   /* de frente para +X: a parede que a crianca ve ao entrar */
        q.setFromEuler(e);
        v.set(QX - L + 0.07, 2.30 - lin * 0.55, QZ - 1.6 + col * 0.62);
        m.compose(v, q, s);
      } else {
        m.compose(v.set(0, -999, 0), q.identity(), zero);
      }
      instAd.setMatrixAt(k, m);
    }
    instAd.instanceMatrix.needsUpdate = true;
  };

  /* =========================================================================
     MOVEIS DO QUARTO (16/08) — cada um foi feito por um agente construtor a
     partir da ficha de referencia do Ivan, e vive em partes/quarto/*.js no
     namespace window.QUARTO_MOVEIS (nao em MUNDO_PARTES: assim nunca sao
     montados sozinhos no meio do mundo — o erro que ja custou um castelo
     empilhado na praca).
     Cada peca nasce com pivo no chao (Y=0) e frente em +Z; aqui so
     posicionamos e giramos dentro do quarto.
     O quarto: centro (QX,QZ), meia-largura L=4.6, pe-direito H=3.2.
     ========================================================================= */
  (function moveisDoQuarto() {
    var M = window.QUARTO_MOVEIS;
    if (!M) return;
    /* x,z sao RELATIVOS ao centro do quarto; y opcional (para peca de
       parede); rot em radianos (0 = olha +Z) */
    var PLANTA = [
      /* --- chao --- */
      /* cama encostada na parede DIREITA, cabeceira no fundo (-Z) */
      { nome: 'cama',            x:  L - 1.05, z: -1.15, rot: 0 },
      /* teclado na parede ESQUERDA, teclas viradas para o meio do quarto */
      { nome: 'teclado',         x: -L + 0.75, z:  0.35, rot:  Math.PI / 2 },
      /* caixa de brinquedos no canto do fundo a esquerda */
      { nome: 'caixaBrinquedos', x: -L + 1.15, z: -L + 1.25, rot: 0.35 },
      /* poltrona virada para o teclado (a crianca senta e toca) */
      { nome: 'poltrona',        x: -1.25, z:  1.55, rot: -0.55 },
      /* luminaria de piso no canto, ao lado da poltrona */
      { nome: 'luminariaEstrela', x: -2.7, z:  2.3, rot: 0 },
      /* luminaria-bolha EM CIMA da mesinha de cabeceira (topo dela: y=0.60),
         ao lado da cama. Ela existia mas tinha ficado fora da planta —
         peca construida e nao posicionada e peca que nao existe. */
      { nome: 'luminariaBolha',  x:  L - 1.0, y: 0.42, z: 0.60, rot: 0 },
      /* pufe na frente do teclado: e onde a crianca senta para tocar */
      { nome: 'pufe',            x: -3.0, z: -0.15, rot: 0 },
      /* mesa redonda baixa no meio do quarto, sobre o tapete */
      { nome: 'mesaRedonda',     x:  0.9, z:  1.9, rot: 0 },
      /* livro com estrela EM CIMA da mesa (tampo em y=0.34) */
      { nome: 'livroEstrela',    x:  0.9, y: 0.34, z:  1.9, rot: -0.4 },
      /* caixa musical no chao, perto do teclado */
      { nome: 'caixaMusica',     x: -3.2, z:  1.5, rot: 0.5 },
      /* vaso de planta no canto do fundo a direita */
      { nome: 'vasoPlanta',      x:  L - 0.9, z:  L - 1.1, rot: 0 },
      /* --- parede do FUNDO (+Z): prateleiras, ceu de parede e o quadro --- */
      { nome: 'prateleiras',     x: -1.5, y: 1.05, z:  L - 0.16, rot: Math.PI },
      { nome: 'ceuParede',       x:  1.9, y: 2.05, z:  L - 0.09, rot: Math.PI },
      { nome: 'quadroParede',    x:  3.4, y: 1.55, z:  L - 0.08, rot: Math.PI },
      /* criado-mudo ao lado da cama, no lugar da mesinha-caixa antiga.
         A luminaria-bolha (acima na lista) apoia no tampo dele, em y=0.42 */
      { nome: 'criadoMudo',      x:  L - 1.0, z:  0.60, rot: 0 },
      /* microfone em cima do criado-mudo, do lado da luminaria */
      { nome: 'microfone',       x:  L - 1.32, y: 0.42, z:  0.76, rot: 0.6 }
    ];
    for (var i = 0; i < PLANTA.length; i++) {
      var p = PLANTA[i];
      var fab = M[p.nome];
      if (typeof fab !== 'function') continue;      /* movel ainda nao entregue: pula */
      var r;
      try { r = fab(T); } catch (e) { continue; }
      if (!r || !r.grupo) continue;
      r.grupo.position.set(QX + p.x, p.y || 0, QZ + p.z);
      r.grupo.rotation.y = p.rot;
      grupo.add(r.grupo);
    }
  })();

  return { grupo: grupo, custo: { dc: 7, tri: 4200 } };
};
