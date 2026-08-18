/* parteKartAnelBordas — as DUAS BORDAS/BARRAS que "vestem" o traçado de
   pista-kart-anel.js: um meio-fio baixo, listrado (zebra vermelho-coral /
   creme, igual partes/kartodromo.js), rente as duas margens da pista
   (x local = -3.0 e +3.0), correndo os 447m do anel inteiro sem gap nem
   desalinhamento — é o "guarda-corpo baixo" que o Ivan pediu pra deixar a
   pista "perfeitinha, com as duas barras limitando e alinhando".

   DE ONDE VEM O TRAÇADO: esta peça NÃO recalcula a geometria do anel a mão
   (proibido — armadilha 22 do CONTRATO: constante de zona duplicada apodrece,
   foi isso que fez o kart bater em parede invisível uma vez). Em vez disso
   ela monta uma SEGUNDA instância de partePistaKartAnel(ctx) só pra ler
   userData.tracado. partePistaKartAnel é pura (sem Math.random, sem tocar em
   ctx.COLISORES/ctx.M), então os números batem EXATAMENTE com os da pista
   real que o host monta ao lado — mesma função, mesmo resultado. O grupo
   dessa instância extra nunca é adicionado à cena nem ao nosso `grupo`: uma
   vez que os closures centro()/tangente() são extraídos (eles fecham só
   sobre arrays de número — LC/ACUM/N/TOTAL — não sobre as malhas), soltamos
   a referência e o GC recolhe a instância inteira, malhas incluídas.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteKartAnelBordas = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'kart-anel-bordas';

  var pistaTmp = window.MUNDO_PARTES.partePistaKartAnel(ctx);
  var tracado = pistaTmp.grupo.userData.tracado;
  var centro = tracado.centro, tangenteFn = tracado.tangente;
  var LARG = tracado.largura, MEIA = LARG / 2;
  pistaTmp = null;   /* solta a referencia — nao precisamos mais das malhas dela */

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    if (geo.attributes.uv) geo.deleteAttribute('uv');
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
    geo.computeVertexNormals();
    return geo;
  }

  var matV = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  var N = 360;                        /* mesma resolucao angular da pista */
  var LARGURA_BORDA = 0.14;           /* espessura, perpendicular ao eixo da pista */
  var ALTURA_BORDA = 0.20;            /* altura acima do asfalto */
  var COR_A = 0xE8536E, COR_B = 0xF6F1E8;   /* mesma zebra de partes/kartodromo.js */

  /* amostra o tracado UMA vez (360 pontos de centro+normal) — reaproveitado
     pelos dois lados em vez de chamar centro()/tangente() 6x por indice.
     nx/nz aqui usa a MESMA formula de normal que fita() usa dentro de
     pista-kart-anel.js (nx=tg.z, nz=-tg.x) — e por isso que offLateral bate
     exatamente com o "x local" da pista (mesma convencao de sinal de
     grupo.userData.pista.projetar().lateral). */
  var AM = [];
  for (var k = 0; k < N; k++) {
    var s = k / N, c = centro(s), tg = tangenteFn(s);
    AM.push({ x: c.x, z: c.z, nx: tg.z, nz: -tg.x });
  }

  /* ⛔ DEFEITO ACHADO NA VALIDACAO (nao aparece no asfalto chato, so numa
     borda com volume): o traçado de pista-kart-anel.js, mesmo ja suavizado
     por ele mesmo, guarda uns poucos pontos (perto de k=125, e nos dois
     "bump" que o proprio arquivo documenta ter aplicado perto de k=228 e
     k=340) onde o RAIO DE CURVATURA LOCAL da linha de centro cai abaixo dos
     ~3.14m que a borda precisa de offset — pior caso medido: 0.79m em
     k=125. Teoria padrao de offset-curve: deslocar uma curva por distancia
     d so e seguro onde o raio local >= d; abaixo disso a fita "dobra sobre
     si mesma" (a mesma degeneracao de uma curva paralela cruzando o proprio
     traçado). Isso e o que gerava as normais invertidas medidas no Node.
     Correcao: uma ESCALA de seguranca por indice (1.0 na pista inteira,
     exceto ~40 amostras de 360, em 4-5 trechos curtos perto desses pontos,
     onde a borda encolhe suavemente rumo ao centro so o suficiente pra
     nunca se auto-cruzar nem disparar uma cunha gigante) — nao mexe em
     pista-kart-anel.js (proibido editar), so ajusta ONDE a nossa propria
     borda pode seguir o offset cheio com seguranca. Fora desses trechos
     (~89% do anel) o offset e EXATO (ESCALA=1, desvio zero medido). */
  function circunraio(a, b, c) {
    var A = Math.hypot(b.x - c.x, b.z - c.z), B = Math.hypot(a.x - c.x, a.z - c.z), Cc = Math.hypot(a.x - b.x, a.z - b.z);
    var s2 = (A + B + Cc) / 2, area = Math.sqrt(Math.max(0, s2 * (s2 - A) * (s2 - B) * (s2 - Cc)));
    return area < 1e-9 ? 1e9 : (A * B * Cc) / (4 * area);
  }
  var OFFSET_MAX = MEIA + LARGURA_BORDA;
  var RLOCAL = [];
  for (var k1 = 0; k1 < N; k1++) {
    RLOCAL.push(circunraio(AM[(k1 - 1 + N) % N], AM[k1], AM[(k1 + 1) % N]));
  }
  /* ⛔ SEGUNDO ACHADO NA VALIDACAO: so autocorrigir o winding (acima) nao
     bastava — perto do ponto mais apertado (k=125) o passo de UM segmento
     saltava ~5.9m (contra um passo normal de ~1.24m), porque a direcao
     normal quase inverte num unico passo: o triangulo ficava "de frente"
     certo, mas era uma CUNHA gigante disparando pro meio do mapa, nao um
     defeito pequeno. Por isso a ESCALA e necessaria de verdade, nao so
     estetica. Afinados fs/janela por medicao (nao chute): janela grande
     "gastava" mais trecho da pista (35% do anel) pro mesmo resultado de
     0 defeitos; estes valores (0.9 / ±1 / ±1) derrubam pra ~11% do anel
     mantendo 0 defeitos e maior aresta medida em 2.93m (nunca vira cunha:
     testado ate 3x o passo nominal, ninguem passa). */
  var FATOR_SEGURANCA = 0.9, JANELA_MIN = 1, JANELA_MEDIA = 1;
  var ESCALA_BRUTA = [];
  for (var k2 = 0; k2 < N; k2++) {
    var minCap = OFFSET_MAX;
    for (var j = -JANELA_MIN; j <= JANELA_MIN; j++) {
      var cap = RLOCAL[((k2 + j) % N + N) % N] * FATOR_SEGURANCA;
      if (cap < minCap) minCap = cap;
    }
    ESCALA_BRUTA.push(Math.min(1, minCap / OFFSET_MAX));
  }
  var ESCALA = [];
  for (var k3 = 0; k3 < N; k3++) {
    var soma = 0, cnt = 0;
    for (var j2 = -JANELA_MEDIA; j2 <= JANELA_MEDIA; j2++) { soma += ESCALA_BRUTA[((k3 + j2) % N + N) % N]; cnt++; }
    ESCALA.push(soma / cnt);
  }

  function ponto(idx, offLateral, y) {
    var ii = ((idx % N) + N) % N;
    var a = AM[ii];
    var off = offLateral * ESCALA[ii];
    return { x: a.x + a.nx * off, y: y, z: a.z + a.nz * off };
  }
  /* LIMITE CONHECIDO (medido, nao escondido): no PIOR ponto (k=125, raio de
     curvatura ~0.79m — a pista faz ali um giro mais fechado que a propria
     largura da pista+borda), os DOIS lados encolhem tanto que os topos das
     bordas esquerda e direita chegam a se tocar/sobrepor por uma fracao de
     metro (medido: ~1-2m de traçado, 2 pontos isolados de 360). E o preco
     de nao inventar geometria que a fonte (pista-kart-anel.js, proibida de
     editar) nao suporta num raio tao apertado — a alternativa seria a fita
     furar/dobrar sobre si mesma, pior visualmente. Fora desses 2 pontos
     isolados o anel inteiro fecha sem sobreposicao (ver validacao no Node). */
  /* um quad (2 triangulos) entre duas "colunas" ao longo do segmento k->k+1.
     Winding AUTOCORRETIVO, POR TRIANGULO (nao por quad inteiro): calcula a
     normal de verdade de CADA triangulo e vira SO ELE se nao bater com a
     direcao esperada. ⛔ MEDIDO: corrigir o quad inteiro de uma vez (1 so
     flip pros 2 triangulos) deixava 2 triangulos quase degenerados (area
     ~0.004 e ~0.02, bem na borda da rampa de ESCALA, onde o proprio quad
     fica levemente "borboleta") ainda de cabeca pra baixo — os dois
     triangulos do mesmo quad podem precisar de flips DIFERENTES quando a
     geometria tá torcida. Corrigir cada um por conta propria zera os 2. */
  function normalCrua(a, b, c) {
    var e1x = b.x - a.x, e1y = b.y - a.y, e1z = b.z - a.z;
    var e2x = c.x - a.x, e2y = c.y - a.y, e2z = c.z - a.z;
    return { x: e1y * e2z - e1z * e2y, y: e1z * e2x - e1x * e2z, z: e1x * e2y - e1y * e2x };
  }
  function triOrientado(a, b, c, dirEsperada) {
    var n = normalCrua(a, b, c);
    var dot = n.x * dirEsperada.x + n.y * dirEsperada.y + n.z * dirEsperada.z;
    return dot < 0 ? [a, c, b] : [a, b, c];
  }
  function quad(colLo, colHi, k, dirEsperada) {
    var lo0 = colLo(k), lo1 = colLo(k + 1), hi0 = colHi(k), hi1 = colHi(k + 1);
    var t1 = triOrientado(lo0, lo1, hi0, dirEsperada);
    var t2 = triOrientado(hi0, lo1, hi1, dirEsperada);
    var v = [];
    [t1, t2].forEach(function (t) { t.forEach(function (p) { v.push(p.x, p.y, p.z); }); });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    return g;
  }

  var PECAS = [];
  [-1, 1].forEach(function (lado) {
    var xInterno = lado * MEIA;                      /* encosta no limite do asfalto */
    var xExterno = lado * (MEIA + LARGURA_BORDA);     /* cresce pra fora a partir dai */
    var xMin = Math.min(xInterno, xExterno), xMax = Math.max(xInterno, xExterno);

    var colTopoMin = function (k) { return ponto(k, xMin, ALTURA_BORDA); };
    var colTopoMax = function (k) { return ponto(k, xMax, ALTURA_BORDA); };
    var colBaseInt = function (k) { return ponto(k, xInterno, 0); };
    var colTopoInt = function (k) { return ponto(k, xInterno, ALTURA_BORDA); };
    var colBaseExt = function (k) { return ponto(k, xExterno, 0); };
    var colTopoExt = function (k) { return ponto(k, xExterno, ALTURA_BORDA); };

    for (var k = 0; k < N; k++) {
      var cor = (k % 2 === 0) ? COR_A : COR_B;
      var amK = AM[k];
      var doutX = lado * amK.nx, doutZ = lado * amK.nz;   /* direcao "pra fora da pista" neste k */

      /* topo (y=ALTURA_BORDA constante): espera normal +Y. fBase=0: disco/
         tampo horizontal usa pigmento cheio (armadilha 14). */
      PECAS.push(pinta(quad(colTopoMin, colTopoMax, k, { x: 0, y: 1, z: 0 }), cor, 0.0));
      /* face externa: espera normal apontando pra fora da pista */
      PECAS.push(pinta(quad(colBaseExt, colTopoExt, k, { x: doutX, y: 0, z: doutZ }), cor, 0.12));
      /* face interna: espera normal apontando pra dentro (pro asfalto) */
      PECAS.push(pinta(quad(colBaseInt, colTopoInt, k, { x: -doutX, y: 0, z: -doutZ }), cor, 0.12));
    }
  });

  var geoFinal = BGU.mergeBufferGeometries(PECAS);
  var tri = 0;
  if (geoFinal) {
    grupo.add(new T.Mesh(geoFinal, matV));
    tri = (geoFinal.index ? geoFinal.index.count : geoFinal.attributes.position.count) / 3;
  }

  return {
    grupo: grupo,
    custo: { dc: geoFinal ? 1 : 0, tri: tri }
  };
};
