/* ===========================================================================
   parteRodaCerca -- cercadinho baixo e fofo demarcando a area de espera da
   roda-gigante, perto da fila (Rodada 4, roda-fila.js). Peca FIXA: nao
   sincroniza com nada (a roda gira, as luzes piscam, isso aqui so fica
   parado no chao). Sem grupo.userData.sincronizar, sem logica no update.

   Diferente de proposito do guarda-corpo ALTO e colado na plataforma que ja
   existe em roda-plataforma.js (postes 0.42 + 1 travessa, topo em y=0.76,
   azul-poeira/rosa/creme): esta cerca e BAIXA (postes 0.34, topo do poste
   em ~0.44 com a bolinha) e tem 2 travessas horizontais empilhadas, cor
   creme/dourado, e fica bem mais AFASTADA da roda -- um arco decorativo na
   area onde a crianca aguarda antes de entrar no corredor da fila.

   Geometria de referencia (roda-fila.js + parque.js, NAO editados, so lidos
   para as contas):
     centro da fila / referencia da area de espera: (43.5,-2.5) -- e o meio
       do corredor de postinhos de roda-fila.js (z de -1.7 a -3.3)
     corredor da fila (roda-fila.js): x=42.9 a 44.1 (1.2m de largura),
       SEM colisor -- e so sugestao visual
     cerca do parque (parque.js, NAO editada): elipse raio 11.6(x)/10.6(z)
       em torno de (42,0) -- meu arco (raio <=6.5 em torno de 43.5,-2.5)
       fica bem dentro, nao encosta nela
     pernas da roda (colisores raio 0.5, parque.js): (41.1,-1.9) (45.9,-1.9)
       (41.1,1.9) (45.9,1.9) -- todas mais perto do centro do que o meu arco

   Forma: arco de raio 6.5 em torno de (43.5,-2.5), 90 graus (45 pra cada
   lado da direcao "norte" -- direcao de z crescente, mesma convencao usada
   em roda-fila.js: "vindo do norte, z perto de 0, andando para o sul"),
   com abertura central SEM postinho: nenhum poste com offset de x menor
   que 0.9 do eixo 43.5 -- ou seja, uma faixa livre de 1.8m (folga sobre o
   minimo de 1.5m pedido), que cobre com sobra o corredor de 1.2m da fila.

   ORCAMENTO -- 1 draw call so (Lambert, cor por vertice), igual ao padrao
   de roda-fila.js: hastes + bolinhas dos 10 postes + travessas (2 niveis)
   entre postes vizinhos do mesmo lado.

   Armadilhas do CONTRATO.md ja tratadas:
     - geo.deleteAttribute('uv') em toda peca antes de mesclar (dentro de
       pintaVol)
     - so uso formas com indice (Cylinder/Sphere/Box); nenhuma familia sem
       indice (Tetrahedron/Icosahedron) entra no merge, entao nao precisa
       normalizar com toNonIndexed()
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaCerca = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'rodaCerca';

  /* ---------- referencia (roda-fila.js, so leitura) ---------- */
  var CX = 43.5, CZ = -2.5;      /* centro da fila / da area de espera */
  var R = 6.5;                    /* raio do arco (pedido: ~6 a 7) */
  var MEIO_ANGULO = Math.PI / 4;  /* 45 graus pra cada lado = 90 graus total */
  var GAP_MEIO = 0.9;             /* metade da abertura central: 1.8m livre no total,
                                      folga sobre o minimo de 1.5m pedido */
  var ANGULO_MIN = Math.asin(GAP_MEIO / R);
  var N_POR_LADO = 5;             /* postes por lado do arco (10 no total) */

  /* ---------- paleta (hex direto, igual ao contrato): creme/dourado ---------- */
  var COR_CREME = 0xf4edde, COR_DOURADO = 0xffd166;
  var CINZA = new T.Color(0x6a5a8f);

  /* cor por vertice com gradiente vertical (mais escuro embaixo, ~18% pro
     cinza-azulado) -- regra do contrato para pecas com volume */
  function pintaVol(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, ys = [];
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var t = Math.min(1, ((ys[k] - minY) / faixa) * 1.3);
      var c = c1.clone().lerp(c0, t);
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  var pecas = [];   /* 1 draw call so */

  /* ================= POSTINHOS DO ARCO ================= */
  var POST_R = 0.05, POST_H = 0.34, BOLA_R = 0.085;
  var TRAVESSA_Y0 = 0.13, TRAVESSA_Y1 = 0.27;   /* 2 travessas horizontais, baixas */

  function poste(x, z) {
    var haste = new T.CylinderGeometry(POST_R, POST_R * 1.1, POST_H, 6);
    haste.translate(x, POST_H / 2, z);
    pecas.push(pintaVol(haste, COR_CREME, 0.16));

    var bola = new T.SphereGeometry(BOLA_R, 6, 5);
    bola.translate(x, POST_H + BOLA_R * 0.55, z);
    pecas.push(pintaVol(bola, COR_DOURADO, 0.10));
  }

  function travessaEntre(x0, z0, x1, z1, y) {
    var dx = x1 - x0, dz = z1 - z0;
    var comprimento = Math.sqrt(dx * dx + dz * dz);
    var ang = Math.atan2(dx, dz);
    var t = new T.BoxGeometry(0.035, 0.035, comprimento);
    t.rotateY(ang);
    t.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    pecas.push(pintaVol(t, COR_DOURADO, 0.12));
  }

  /* gera os postos de UM lado do arco (lado=-1 oeste, lado=+1 leste),
     do mais proximo da abertura central (ANGULO_MIN) ate a ponta (45 graus) */
  function ladoDoArco(lado) {
    var pontos = [];
    for (var i = 0; i < N_POR_LADO; i++) {
      var ang = ANGULO_MIN + (MEIO_ANGULO - ANGULO_MIN) * (i / (N_POR_LADO - 1));
      var x = CX + lado * R * Math.sin(ang);
      var z = CZ + R * Math.cos(ang);
      pontos.push({ x: x, z: z });
      poste(x, z);
      ctx.COLISORES.push({ x: x, z: z, raio: 0.12 });
    }
    /* travessas ligando postes vizinhos do MESMO lado, nos 2 niveis */
    for (var j = 0; j < pontos.length - 1; j++) {
      travessaEntre(pontos[j].x, pontos[j].z, pontos[j + 1].x, pontos[j + 1].z, TRAVESSA_Y0);
      travessaEntre(pontos[j].x, pontos[j].z, pontos[j + 1].x, pontos[j + 1].z, TRAVESSA_Y1);
    }
  }
  ladoDoArco(-1);   /* lado oeste */
  ladoDoArco(1);    /* lado leste */
  /* nenhuma travessa cruza o meio: os dois lados nao se tocam, a abertura
     central (faixa |x-43.5| < 0.9) fica livre de proposito -- ver ORCAMENTO
     no cabecalho e a lista de colisores reportada junto com a medicao. */

  /* ---------- monta o unico draw call ---------- */
  var matV = new T.MeshLambertMaterial({ vertexColors: true });
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));

  return {
    grupo: grupo,
    update: function (t, dt) { },
    /* medido com THREE r147 real (harness Node com o three@0.147.0 de
       verdade, scratchpad/medir-roda-cerca/medir.js): 1 draw call, 912
       triangulos (10 postes x (haste+bola) + 16 travessas, tudo mesclado) */
    custo: { dc: 1, tri: 912 }
  };
};
