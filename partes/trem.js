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

  /* ---- TRACADO: CIRCULO PERFEITO na extremidade do mundo ----
     ⬆ ERA um anel organico ("abraca cada zona", raio variando 26 a 68 —
     a logica antiga vinha de quando o trem contornava a cidade sem folga
     de sobra). O Ivan pediu circulo perfeito, bem na extremidade — e essa
     troca simplifica o codigo, nao complica: raio CONSTANTE em vez de
     recalcular contorno por zona.
     RAIO_TREM = 74 nao e chute: e onde o gramado verde cheio TERMINA (o
     anel de grama derrete de 74 a 88 — ver mundo-sarinha.html). Ficar
     exatamente nessa borda e "na extremidade" sem entrar na neblina nem no
     roxo. Ainda folga 4,6m acima do que a maior zona exige pra nao ser
     cortada (Kartodromo: 69,4 = 48,4 do centro dele + 21 de envolvente) e
     fica dentro do RAIO_ILHA=78 que a crianca anda, entao da pra alcancar
     qualquer estacao a pe. */
  var RAIO_TREM = 74;
  function pontoDoAngulo(ang) {
    var a = ((ang % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    return { x: Math.cos(a) * RAIO_TREM, z: Math.sin(a) * RAIO_TREM };
  }
  /* N_AMOSTRA so define a resolucao da tabela de comprimento (usada por
     noTrilho para converter metros andados em angulo) — nao tem mais
     contorno pra amostrar, mas o resto do arquivo consome essa tabela. */
  var N_AMOSTRA = 240;
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

  /* =========================================================================
     AS 6 ESTACOES — uma por zona (17/08, pedido do Ivan a partir do mapa do
     GPT). Antes havia UMA so, e o trem circulava sem servir para nada.
     Agora o anel e transporte: a crianca sobe onde quiser, dirige, e cada
     parada tem nome — isso tambem resolve orientacao (ela sabe onde esta).

     Cada estacao fica no ponto do trilho mais proximo da sua zona, e a
     PLATAFORMA nasce do lado de DENTRO do anel (na direcao do centro),
     para a crianca descer virada para a cidade, nunca para o vazio.

     As 6 placas usam UM atlas de canvas (2 colunas x 3 linhas) e uma malha
     so: 6 texturas separadas seriam 6 draw calls. Receita do portais.js. */
  var ESTACOES = [
    { nome: 'Parque',  ang: 0.00 },                       /* leste  — roda-gigante */
    { nome: 'Vilinha', ang: Math.PI / 2 },                /* sul    — a Central    */
    { nome: 'Palco',   ang: Math.PI * 0.82 },             /* sudoeste              */
    { nome: 'Radio',   ang: Math.PI },                    /* oeste                 */
    { nome: 'Jardim',  ang: Math.PI * 1.5 },              /* norte                 */
    { nome: 'Castelo', ang: Math.PI * 1.75 }              /* nordeste              */
  ];
  (function estacoes() {
    var pecas = [], placas = [];
    /* ---- atlas 2x3 com os 6 nomes ---- */
    var cv = document.createElement('canvas');
    cv.width = 512; cv.height = 384;
    var g2 = cv.getContext('2d');
    for (var n = 0; n < 6; n++) {
      var col = n % 2, lin = Math.floor(n / 2);
      var ox = col * 256, oy = lin * 128;
      g2.fillStyle = '#fff3e2'; g2.fillRect(ox + 6, oy + 6, 244, 116);
      g2.strokeStyle = '#9257c7'; g2.lineWidth = 7;
      g2.strokeRect(ox + 10, oy + 10, 236, 108);
      g2.fillStyle = '#6c3ba8';
      g2.font = 'bold 52px Verdana, sans-serif';
      g2.textAlign = 'center'; g2.textBaseline = 'middle';
      var t = ESTACOES[n].nome;
      if (g2.measureText(t).width > 210) g2.font = 'bold 40px Verdana, sans-serif';
      g2.fillText(t, ox + 128, oy + 66);
    }
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;

    for (var i = 0; i < ESTACOES.length; i++) {
      var E = ESTACOES[i];
      var p = pontoDoAngulo(E.ang);
      /* s (distancia no trilho) da estacao, para o jogo posicionar o trem */
      E.x = p.x; E.z = p.z;
      E.s = (E.ang / (Math.PI * 2)) * TOTAL;
      /* versor apontando para DENTRO (o centro do mundo) */
      var d = Math.hypot(p.x, p.z) || 1;
      var ix = -p.x / d, iz = -p.z / d;
      var px = p.x + ix * 2.3, pz = p.z + iz * 2.3;      /* centro da plataforma */
      var rot = Math.atan2(ix, iz);                       /* olhando para o centro */

      var plat = new T.BoxGeometry(5.0, 0.3, 2.8);
      plat.rotateY(rot);
      plat.translate(px, 0.15, pz);
      pecas.push(pinta(plat, 0xf0e2cf, 0.12));
      /* 2 postes + cobertura de duas aguas */
      for (var lado = -1; lado <= 1; lado += 2) {
        var ex = Math.cos(rot) * lado * 1.7, ez = -Math.sin(rot) * lado * 1.7;
        var post = new T.CylinderGeometry(0.08, 0.10, 2.2, 6);
        post.translate(px + ex, 1.1, pz + ez);
        pecas.push(pinta(post, 0xb08968, 0.14));
      }
      var tel = new T.BoxGeometry(4.4, 0.16, 1.9);
      tel.rotateY(rot);
      tel.translate(px, 2.28, pz);
      pecas.push(pinta(tel, 0xe8a7b2, 0.10));
      var cume = new T.BoxGeometry(4.5, 0.14, 0.5);
      cume.rotateY(rot);
      cume.translate(px, 2.42, pz);
      pecas.push(pinta(cume, 0xd98da0, 0.10));
      /* banquinho para esperar o trem */
      var banco = new T.BoxGeometry(1.5, 0.12, 0.42);
      banco.rotateY(rot);
      banco.translate(px + ix * 0.7, 0.52, pz + iz * 0.7);
      pecas.push(pinta(banco, 0xc9a37a, 0.14));

      /* placa: um retangulo com a faixa do atlas que traz o nome desta estacao */
      var col2 = i % 2, lin2 = Math.floor(i / 2);
      /* ⛔ a placa era 2.0x1.0 com centro em 2.05: o topo (2.55) ATRAVESSAVA
         o telhado (2.20-2.36) e o nome ficava cortado. Menor e mais baixa. */
      var pl = new T.PlaneGeometry(1.7, 0.85);
      var uv = pl.attributes.uv;
      for (var u = 0; u < uv.count; u++) {
        uv.setXY(u, (uv.getX(u) + col2) / 2, 1 - (1 - uv.getY(u) + lin2) / 3);
      }
      pl.rotateY(rot);
      pl.translate(px + ix * 0.05, 1.70, pz + iz * 0.05);
      placas.push(pl);

      ctx.COLISORES.push({ x: px, z: pz, raio: 0.9 });
    }
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
    var mPlacas = new T.Mesh(BGU.mergeBufferGeometries(placas),
      new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }));
    mPlacas.name = 'placas_estacoes';
    grupo.add(mPlacas);
  })();
  /* a Vilinha e a estacao CENTRAL: e onde o trem dorme e onde o jogo o coloca */
  var ESTACAO = { x: ESTACOES[1].x, z: ESTACOES[1].z, s: ESTACOES[1].s };


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
    /* as 6 arvorezinhas da encosta (cone verde) foram substituidas pela
       arvore-flor nova (partes/arvores-mundo.js, grupo D_ENCOSTA_TUNEL,
       coordenadas calculadas com a mesma formula: centro.x+cos*7.5,
       centro.z+sin*8.5) - pedido do Ivan de trocar toda arvore antiga
       do jogo pela nova. */
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
  /* ⚠️ o `s` era 0 fixo (a estacao unica ficava no angulo 0). Agora aponta
     para a CENTRAL, senao o trem nasceria longe de qualquer plataforma. */
  grupo.userData.estacao = { x: ESTACAO.x, z: ESTACAO.z, s: ESTACAO.s };
  grupo.userData.estacoes = ESTACOES;   /* o jogo usa para anunciar a parada */
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
