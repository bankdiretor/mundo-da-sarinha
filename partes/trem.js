/* parteTrem — o TRENZINHO da cidade: trilho em oval passando pelo Jardim, pela
   Praca e pela Vilinha. A crianca sobe e controla so acelerar e parar; o trem
   segue o trilho sozinho (nada de fisica de veiculo — crianca de 7 anos bate em
   tudo). Tambem e o transporte quando a cidade fica grande.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteTrem = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'trem';

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
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

  /* ---- TRACADO EXTERNO: o trilho CONTORNA a cidade, nunca corta por cima ----
     Para cada angulo, o raio e o menor que fica FORA da praca (r 22), do Jardim
     (elipse em 0,-38) e da Vilinha (elipse em 0,+40), com folga. Isso desenha um
     oval organico: ~28 nos lados, ~54 nas pontas. */
  var PRACA_R = 22, FOLGA = 5.5;
  var AREAS = [ {cx:0, cz:-38, rx:13,   rz:10},      /* Jardim  */
                {cx:0, cz: 40, rx:15.5, rz:12.4} ];  /* Vilinha */
  function foraDeTudo(x, z) {
    if (Math.hypot(x, z) < PRACA_R + FOLGA) return false;
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      var ex = (x - a.cx) / (a.rx + FOLGA), ez = (z - a.cz) / (a.rz + FOLGA);
      if (ex*ex + ez*ez < 1) return false;
    }
    return true;
  }
  var N_AMOSTRA = 240, RAIOS = [];
  (function medirContorno() {
    for (var i = 0; i < N_AMOSTRA; i++) {
      var ang = (i / N_AMOSTRA) * Math.PI * 2;
      var cs = Math.cos(ang), sn = Math.sin(ang), r = PRACA_R;
      while (r < 90 && !foraDeTudo(cs * r, sn * r)) r += 0.5;
      RAIOS.push(r);
    }
    /* suavizar: curva de trem nao tem quina (media movel de 15 amostras) */
    var suave = [];
    for (var k = 0; k < N_AMOSTRA; k++) {
      var soma = 0;
      for (var j = -7; j <= 7; j++) soma += RAIOS[(k + j + N_AMOSTRA) % N_AMOSTRA];
      suave.push(soma / 15);
    }
    RAIOS = suave;
  })();
  function pontoDoAngulo(ang) {
    var a = ((ang % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    var f = a / (Math.PI*2) * N_AMOSTRA;
    var i0 = Math.floor(f) % N_AMOSTRA, i1 = (i0 + 1) % N_AMOSTRA, t = f - Math.floor(f);
    var r = RAIOS[i0] * (1 - t) + RAIOS[i1] * t;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }
  /* comprimento acumulado para andar em metros (nao em angulo) */
  var TABELA = [], TOTAL = 0;
  (function medirComprimento() {
    var ant = pontoDoAngulo(0);
    TABELA.push(0);
    for (var i = 1; i <= N_AMOSTRA; i++) {
      var p = pontoDoAngulo((i / N_AMOSTRA) * Math.PI * 2);
      TOTAL += Math.hypot(p.x - ant.x, p.z - ant.z);
      TABELA.push(TOTAL);
      ant = p;
    }
  })();
  function noTrilho(s) {
    s = ((s % TOTAL) + TOTAL) % TOTAL;
    var lo = 0, hi = N_AMOSTRA;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (TABELA[mid] <= s) lo = mid; else hi = mid; }
    var t = (s - TABELA[lo]) / Math.max(0.001, TABELA[lo+1] - TABELA[lo]);
    var ang = ((lo + t) / N_AMOSTRA) * Math.PI * 2;
    var p = pontoDoAngulo(ang);
    var p2 = pontoDoAngulo(ang + 0.02);
    return { x: p.x, z: p.z, ang: Math.atan2(p2.x - p.x, p2.z - p.z) };
  }

  /* ---- trilho: dormentes instanciados + dois frisos ---- */
  var N_DORM = 190;
  (function trilho() {
    var geo = new T.BoxGeometry(1.7, 0.09, 0.32);
    geo.deleteAttribute('uv');
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    var c = new T.Color(0xb08968);
    for (var i = 0; i < n; i++) { a[i*3]=c.r; a[i*3+1]=c.g; a[i*3+2]=c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    var inst = new T.InstancedMesh(geo, matV, N_DORM);
    var m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(),
        v = new T.Vector3(), s1 = new T.Vector3(1,1,1);
    for (var k = 0; k < N_DORM; k++) {
      var p = noTrilho((k / N_DORM) * TOTAL);
      e.set(0, p.ang, 0); q.setFromEuler(e);
      v.set(p.x, 0.045, p.z);
      inst.setMatrixAt(k, m.compose(v, q, s1));
    }
    inst.instanceMatrix.needsUpdate = true;
    grupo.add(inst);
    /* frisos: dois caminhos finos de metal claro acompanhando a curva */
    var pecas = [];
    for (var j = 0; j < N_DORM; j++) {
      var p1 = noTrilho((j / N_DORM) * TOTAL);
      var p2 = noTrilho(((j + 1) / N_DORM) * TOTAL);
      var dx = p2.x - p1.x, dz = p2.z - p1.z, comp = Math.hypot(dx, dz) + 0.06;
      [-0.55, 0.55].forEach(function (lado) {
        var b = new T.BoxGeometry(0.07, 0.07, comp);
        b.rotateY(Math.atan2(dx, dz));
        b.translate(p1.x + dx/2 + Math.cos(p1.ang) * lado,
                    0.115,
                    p1.z + dz/2 - Math.sin(p1.ang) * lado);
        pecas.push(pinta(b, 0xd8d2e8, 0.10));
      });
    }
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- estacao na praca (plataforma + placa) ---- */
  var ESTACAO = noTrilho(0);   /* angulo 0 = leste, onde entra o corredor da praca */
  (function estacao() {
    var pecas = [];
    var plat = new T.BoxGeometry(4.2, 0.3, 2.6);
    plat.translate(ESTACAO.x - 2.1, 0.15, ESTACAO.z);
    pecas.push(pinta(plat, 0xf0e2cf, 0.14));
    var post = new T.CylinderGeometry(0.09, 0.09, 2.1, 6);
    post.translate(ESTACAO.x - 3.4, 1.05, ESTACAO.z - 1.2);
    pecas.push(pinta(post, 0xb08968, 0.16));
    var tel = new T.BoxGeometry(1.4, 0.12, 0.9);
    tel.translate(ESTACAO.x - 3.4, 2.1, ESTACAO.z - 1.2);
    pecas.push(pinta(tel, 0xe8a7b2, 0.12));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
    ctx.COLISORES.push({ x: ESTACAO.x - 3.4, z: ESTACAO.z - 1.2, raio: 0.3 });
  })();


  /* ---- MONTANHA COM TUNEL: o trilho atravessa por dentro (o momento magico
     do passeio). Fica no lado OESTE, longe da estacao. ---- */
  (function montanha() {
    var sTunel = TOTAL * 0.88;                 /* nordeste: vao livre entre parque e jardim */
    var centro = noTrilho(sTunel);
    var ang = centro.ang;                      /* direcao do trilho ali */
    var ex = Math.sin(ang), ez = Math.cos(ang);      /* ao longo do trilho */
    var lx = Math.cos(ang), lz = -Math.sin(ang);     /* perpendicular */
    var pecas = [];
    /* corpo do morro: 3 blocos que deixam um vao no meio (nada de booleana) */
    [-1, 1].forEach(function (lado) {
      var flanco = new T.SphereGeometry(1, 12, 9);
      flanco.scale(4.2, 3.4, 5.6);
      flanco.translate(centro.x + lx * lado * 4.6, 0, centro.z + lz * lado * 4.6);
      pecas.push(pinta(flanco, lado < 0 ? 0x9aa77e : 0x8fa176, 0.26));
    });
    /* teto do tunel (arco por cima) */
    var teto = new T.SphereGeometry(1, 12, 8, 0, Math.PI*2, 0, Math.PI/2);
    teto.scale(4.9, 3.8, 5.7);
    teto.translate(centro.x, 2.6, centro.z);
    pecas.push(pinta(teto, 0x93a67c, 0.24));
    /* cume nevado */
    var cume = new T.ConeGeometry(1.9, 2.3, 7);
    cume.translate(centro.x, 4.5, centro.z);
    pecas.push(pinta(cume, 0xf4f2ea, 0.12));
    /* bocas do tunel: arco de pedra em cada ponta */
    [-1, 1].forEach(function (dir) {
      var bx = centro.x + ex * dir * 7.2, bz = centro.z + ez * dir * 7.2;
      var arco = new T.TorusGeometry(2.0, 0.42, 6, 12, Math.PI);
      arco.rotateY(ang);
      arco.translate(bx, 0.1, bz);
      pecas.push(pinta(arco, 0xbcae96, 0.20));
    });
    /* miolo escuro: da a sensacao de "entrar" na montanha */
    var dentro = new T.CylinderGeometry(2.0, 2.0, 15.5, 10, 1, true);
    dentro.rotateZ(Math.PI/2);
    dentro.rotateY(-ang);
    dentro.translate(centro.x, 1.4, centro.z);
    pecas.push(pinta(dentro, 0x3b3550, 0.05));
    /* arvorezinhas na encosta */
    for (var i = 0; i < 6; i++) {
      var a2 = (i / 6) * Math.PI * 2;
      var rx = centro.x + Math.cos(a2) * 7.5, rz = centro.z + Math.sin(a2) * 8.5;
      var tr = new T.ConeGeometry(0.85, 2.2, 6);
      tr.translate(rx, 1.1, rz);
      pecas.push(pinta(tr, i % 2 ? 0x7fae72 : 0x6f9c64, 0.22));
    }
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
    grupo.userData.tunel = { x: centro.x, z: centro.z, s: sTunel };
  })();

  /* ---- O TREM: locomotiva + 2 vagoes (1 malha; o jogo move o grupo) ---- */
  var trem = new T.Group();
  (function montarTrem() {
    var pecas = [];
    /* locomotiva (frente = +Z) */
    var corpo = new T.BoxGeometry(1.5, 0.9, 2.2);
    corpo.translate(0, 0.75, 0.2);
    pecas.push(pinta(corpo, 0xe8536e, 0.16));
    var cab = new T.BoxGeometry(1.4, 0.85, 1.0);
    cab.translate(0, 1.35, -0.5);
    pecas.push(pinta(cab, 0xf7f2e8, 0.12));
    var teto = new T.BoxGeometry(1.7, 0.14, 1.3);
    teto.translate(0, 1.85, -0.5);
    pecas.push(pinta(teto, 0xffd166, 0.10));
    var cham = new T.CylinderGeometry(0.22, 0.28, 0.7, 8);
    cham.translate(0, 1.5, 1.0);
    pecas.push(pinta(cham, 0x4a4258, 0.14));
    var farol = new T.SphereGeometry(0.18, 8, 6);
    farol.translate(0, 0.95, 1.32);
    pecas.push(pinta(farol, 0xffe9a8, 0.04));
    /* 2 vagoes abertos atras */
    [-2.6, -5.0].forEach(function (dz, i) {
      var base = new T.BoxGeometry(1.4, 0.45, 1.9);
      base.translate(0, 0.62, dz);
      pecas.push(pinta(base, i ? 0x9fb4d8 : 0xbcd6b0, 0.16));
      /* bordas do vagao */
      [[-0.68, 0], [0.68, 0], [0, -0.9], [0, 0.9]].forEach(function (b) {
        var lat = new T.BoxGeometry(b[0] ? 0.1 : 1.4, 0.42, b[0] ? 1.9 : 0.1);
        lat.translate(b[0], 1.05, dz + b[1]);
        pecas.push(pinta(lat, i ? 0x8aa2cc : 0xa8cc9c, 0.14));
      });
    });
    /* rodas (6) */
    [[0.78, 0.5], [-0.78, 0.5], [0.78, -2.6], [-0.78, -2.6], [0.78, -5.0], [-0.78, -5.0]].forEach(function (r) {
      var ro = new T.CylinderGeometry(0.3, 0.3, 0.16, 10);
      ro.rotateZ(Math.PI / 2);
      ro.translate(r[0], 0.32, r[1]);
      pecas.push(pinta(ro, 0x4a4258, 0.12));
    });
    trem.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();
  grupo.add(trem);

  /* ---- fumacinha (sprite simples que sobe quando anda) ---- */
  var fumaca = (function () {
    var cv = document.createElement('canvas'); cv.width = cv.height = 32;
    var cx = cv.getContext('2d');
    var g = cx.createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 32, 32);
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.setScalar(1.1);
    sp.visible = false;
    grupo.add(sp);
    return sp;
  })();

  var tFum = 0;
  grupo.userData.TOTAL = TOTAL;
  grupo.userData.estacao = { x: ESTACAO.x, z: ESTACAO.z, s: 0 };
  grupo.userData.noTrilho = noTrilho;
  /* porTrem(s, dt, andando): coloca o trem no trilho e cuida da fumaca */
  grupo.userData.porTrem = function (s, dt, andando) {
    var p = noTrilho(s);
    trem.position.set(p.x, 0.12, p.z);
    trem.rotation.y = p.ang;
    fumaca.visible = !!andando;
    if (andando) {
      tFum += dt;
      var k = (tFum % 1.1) / 1.1;
      var fx = p.x + Math.sin(p.ang) * 1.0, fz = p.z + Math.cos(p.ang) * 1.0;
      fumaca.position.set(fx, 1.9 + k * 1.5, fz);
      fumaca.scale.setScalar(0.8 + k * 1.4);
      fumaca.material.opacity = 0.75 * (1 - k);
    }
  };
  /* onde o passageiro senta (primeiro vagao) */
  grupo.userData.assento = function (s) {
    var p = noTrilho(s - 2.6);
    return { x: p.x, z: p.z, ang: p.ang };
  };

  return { grupo: grupo, custo: { dc: 5, tri: 9800 } };
};
