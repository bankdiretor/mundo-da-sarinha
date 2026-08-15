/* parteCriancas — as OUTRAS CRIANCAS do mundo: paradas ou brincando no lugar
   (praca, jardim, vilinha, parque, festinha), nunca andando (pra nao atravessar
   parede). Um bonequinho desenhado UMA vez (proporcao chibi, cerca de 84% do
   bonequinho do jogador) e repetido em 10 cores diferentes via InstancedMesh
   (1 draw call, mesma tecnica das casas da vilinha). Cada uma faz um gesto
   simples e diferente (pulinho, balanco, giro ou aceno), animado so pela
   MATRIZ da instancia — nao ha ossos, entao "balancar os bracos" e "acenar"
   sao aproximados por um leve balanco/giro do corpo inteiro.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCriancas = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'criancas';

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.16 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.25));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo; /* Sphere e Capsule(Lathe) ja nascem indexadas: merge seguro */
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* tons fixos (pele media unica: variar 3 tons por instancia exigiria cor por
     vertice DIFERENTE por copia, impossivel num InstancedMesh de geometria unica
     sem shader customizado — nao travar nisso, uma pele media serve bem) */
  var PELE = 0xeab68f, OLHO = 0x2a1d1d, BOCHECHA = 0xf19aa4;

  /* ---- membro (braco/perna): 1 capsula so, ja posicionada; a ponta arredondada
     da propria capsula faz de mao/pe (sem esfera extra — economia de triangulo).
     py = topo (ombro/quadril); a capsula desce ate encostar em raizY. */
  function membro(pecas, cor, raio, py, raizY, px, fBase) {
    var comp = py - raizY - 2 * raio;                 /* comprimento que encosta exatamente em raizY */
    pecas.push(pinta(new T.CapsuleGeometry(raio, comp, 1, 4)
      .translate(px, py - comp / 2 - raio, 0), cor, fBase));
  }

  /* ---- o bonequinho: cabeca grande + corpo capsula + bracinhos/perninhas ----
     Escala chibi (~0,84x o bonequinho do jogador em mundo-sarinha.html) para
     ficar por volta de 1,6 m, pe no CHAO (raizY das pernas = 0 — a primeira
     versao do bonequinho do jogador flutuou 13cm por esse mesmo descuido).
     O CORPO (a capsula do torso) fica branco puro: o setColorAt pinta a roupa
     de cada crianca; pele/olhos/bochechas tem cor fixa por vertice (cabeca,
     bracos e pernas ficam de fora da roupa, "a mostra"). Olhos/bochechas sao
     PlaneGeometry (2 tri cada) em vez de esfera — mais barato, e o mundo forca
     DoubleSide em todo material (regra da arena), entao nao ha risco de sumir
     por tras. */
  var geoCrianca = (function () {
    var pecas = [];
    pecas.push(pinta(new T.CapsuleGeometry(0.244, 0.252, 1, 6).translate(0, 0.79, 0), 0xffffff, 0.10)); /* torso = roupa */
    pecas.push(pinta(new T.SphereGeometry(0.252, 7, 5).translate(0, 1.34, 0), PELE, 0.05));              /* cabeca */
    pecas.push(pinta(new T.PlaneGeometry(0.06, 0.045).translate(-0.088, 1.36, -0.235), OLHO, 0));        /* olho esq */
    pecas.push(pinta(new T.PlaneGeometry(0.06, 0.045).translate(0.088, 1.36, -0.235), OLHO, 0));         /* olho dir */
    pecas.push(pinta(new T.PlaneGeometry(0.09, 0.065).translate(-0.147, 1.29, -0.220), BOCHECHA, 0.04)); /* bochecha esq */
    pecas.push(pinta(new T.PlaneGeometry(0.09, 0.065).translate(0.147, 1.29, -0.220), BOCHECHA, 0.04));  /* bochecha dir */
    membro(pecas, PELE, 0.084, 0.52, 0.0, -0.143, 0.10);   /* perna esq (encosta no chao) */
    membro(pecas, PELE, 0.084, 0.52, 0.0, 0.143, 0.10);    /* perna dir (encosta no chao) */
    membro(pecas, PELE, 0.063, 1.06, 0.716, -0.277, 0.10); /* braco esq (para de boiar na altura do quadril) */
    membro(pecas, PELE, 0.063, 1.06, 0.716, 0.277, 0.10);  /* braco dir */
    return BGU.mergeBufferGeometries(pecas);
  })();

  /* ---- 10 criancas: posicao fixa (nunca andam) + cor de roupa + gesto ---- */
  var POSICOES = [
    { x: 3,    z: 5    },  /* praca, perto do monumento */
    { x: -4,   z: 6    },  /* praca, perto do monumento */
    { x: 0,    z: -46  },  /* jardim, perto do coreto */
    { x: 2.5,  z: -43  },  /* jardim, perto do coreto */
    { x: 5,    z: 34   },  /* vilinha */
    { x: -6,   z: 45   },  /* vilinha */
    { x: 38,   z: 3    },  /* parque */
    { x: 44,   z: -3   },  /* parque */
    { x: -40,  z: 4    },  /* festinha */
    { x: -44,  z: -3   }   /* festinha */
  ];
  var CORES = [0xff9bb0, 0xffd166, 0x9fd8f2, 0xa8dca0, 0xd9c9ff,
               0xffb98a, 0xf58fa0, 0x8fd0e8, 0xffe3b0, 0xc9ecb8];
  var FASE = [0.0, 0.6, 1.2, 1.9, 2.5, 3.1, 3.7, 4.3, 4.9, 5.5]; /* desincroniza os gestos */
  var N = POSICOES.length;

  var inst = new T.InstancedMesh(geoCrianca, matV, N);
  inst.instanceMatrix.setUsage(T.DynamicDrawUsage);
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3(1, 1, 1);
  for (var i = 0; i < N; i++) {
    mtx.compose(vec.set(POSICOES[i].x, 0, POSICOES[i].z), qua.identity(), esc.set(1, 1, 1));
    inst.setMatrixAt(i, mtx);
    inst.setColorAt(i, new T.Color(CORES[i]));
    ctx.COLISORES.push({ x: POSICOES[i].x, z: POSICOES[i].z, raio: 0.4 });
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  grupo.add(inst);

  /* ---- gestos: so existe UMA malha por crianca (sem "ossos"), entao cada
     gesto e uma transformacao rigida da instancia inteira (posicao/rotacao/
     escala). "balancar os bracos" e "acenar" viram um balanco/giro do corpo
     todo — pequeno e fofo, nunca frenetico. */
  function update(t) {
    for (var i = 0; i < N; i++) {
      var p = POSICOES[i], tt = t + FASE[i], g = i % 4;
      var py = 0, rx = 0, ry = 0, rz = 0, s = 1;
      if (g === 0) {                              /* pulinho no lugar */
        var h = Math.max(0, Math.sin(tt * 2.4));
        py = h * 0.16; s = 1 - h * 0.05;
      } else if (g === 1) {                        /* balancar os bracos: balanco largo */
        rz = Math.sin(tt * 1.7) * 0.20;
      } else if (g === 2) {                        /* girar devagar */
        ry = tt * 0.55;
      } else {                                      /* acenar: giro curto e rapido */
        rz = Math.sin(tt * 4.2) * 0.11;
        ry = Math.sin(tt * 0.8) * 0.15;
      }
      eul.set(rx, ry, rz);
      qua.setFromEuler(eul);
      vec.set(p.x, py, p.z);
      esc.set(s, s, s);
      inst.setMatrixAt(i, mtx.compose(vec, qua, esc));
    }
    inst.instanceMatrix.needsUpdate = true;
  }

  /* ---- API ---- */
  grupo.userData.criancas = POSICOES.map(function (p) { return { x: p.x, z: p.z }; });

  return {
    grupo: grupo,
    update: update,
    custo: { dc: 1, tri: 2840 }
  };
};
