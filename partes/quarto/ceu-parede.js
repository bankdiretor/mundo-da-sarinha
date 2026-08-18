/* ceuParede — a LUA DE PAREDE + as NOVE ESTRELAS do quarto da Sarinha
   (itens 40 e 41 da ficha: o "ceu noturno" colado na parede).

   Conjunto medido em three r147: 1.871 (X) x 1.520 (Y) x 0.040 (Z), pivo no
   CENTRO em X e Y (o centro da caixa cai a 0.000 / 0.005 do pivo).
   Z = 0 e A PAREDE: nada nasce em z negativo e nada encosta no zero — todas as
   pecas vao de z 0.008 a 0.048 (dentro dos 0.05 de folga), crescendo para +Z,
   para dentro do quarto, como adesivos grossos colados a mao.
   Custo MEDIDO: 1 draw call, 396 triangulos (teto 400).

   Namespace proprio (QUARTO_MOVEIS), assinatura function(T). Sem luz, sem
   sombra, sem textura, sem Standard, sem modulo externo: UMA malha so.

   Por que MeshBasic e nao Lambert (como os outros moveis do quarto):
   aqui TUDO brilha. Lua e estrela sao "luz colada na parede", nao volume — o
   mundo ja gastou suas 2 luzes, e Basic e como este projeto acende as coisas
   (ctx.materialBrilho). Por isso a pintura e CHAPADA: degrade viraria sombra,
   e sombra num adesivo luminoso mata o efeito.

   Armadilhas ja pagas neste projeto e respeitadas aqui:
   - mergeBufferGeometries devolve null se os atributos nao baterem — TODA peca
     passa por `chapa`, que normaliza indice e apaga o uv antes de mesclar.
   - z-fighting: o menor Z do conjunto e 0.008 (> 0), nunca coplanar a parede.
   - a lua NAO foi feita com `holes`: um furo que atravessa o contorno externo
     (que e exatamente o que faz uma lua crescente) quebra a triangulacao do
     earcut. O crescente aqui e UM contorno fechado so — arco de fora + arco da
     mordida —, que triangula certo e ainda sai mais barato.
   - ExtrudeGeometry so gasta curveSegments em CURVA: os pontos aqui sao lineTo
     explicitos, entao curveSegments:1 e a contagem de triangulo e exata. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};
window.QUARTO_MOVEIS.ceuParede = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'ceuParede';

  /* ---------- paleta ----------
     Tres tons vizinhos do mesmo ouro. Sem degrade e sem luz, a UNICA coisa que
     separa uma peca da outra e o tom: com um so, o conjunto vira mancha. */
  var OURO  = 0xffd35a,   /* o tom da ficha — e o da LUA */
      CLARO = 0xffe08a,   /* as que "acendem mais", puxam o olho */
      FUNDO = 0xffc94a;   /* as que recuam, dao profundidade sem sombra */

  function chapa(geo, cor) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var n = geo.attributes.position.count, a = new Float32Array(n * 3), c = new T.Color(cor);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var pecas = [];
  var Z0 = 0.008;         /* descolado da parede: 8 mm de folga contra z-fighting */

  /* ---------- LUA CRESCENTE (item 40) ----------
     Circulo de raio R mordido por um segundo circulo. Em vez de subtrair
     geometria, desenho direto o contorno do que sobra:
       arco de FORA (o bojo)  ->  ponta rombuda  ->  arco da MORDIDA (o concavo)
       -> ponta rombuda -> fecha.
     Parametros de gosto, nao de calculo:
       esp   = quanto a lua e GORDA na cintura (0.19 de 0.55 = 35% do diametro)
       alfa  = onde ficariam as pontas afiadas (60 graus do eixo)
       rombo = quanto cada ponta e CORTADA para ficar rombuda, e nao em bico.
     Do resto (d = centro da mordida, r = raio da mordida) a geometria cuida. */
  function formaLua(R, esp, alfa, romboOut, romboIn, n1, n2) {
    var k = R - esp;                                   /* recuo da mordida na cintura */
    var d = (R * R - k * k) / (2 * (R * Math.cos(alfa) + k));
    var r = d + k;
    var xi = R * Math.cos(alfa), yi = R * Math.sin(alfa);   /* onde os dois circulos se cruzam */
    var fi = Math.atan2(yi, xi - d);                   /* esse cruzamento, visto da mordida */
    var a0 = alfa + romboOut;                          /* arco de fora para ANTES do bico */
    var f0 = fi + romboIn;                             /* arco de dentro para DEPOIS */
    var s = new T.Shape(), i, t;

    /* bojo: de +a0 ate -a0 passando por PI (anti-horario) */
    for (i = 0; i <= n1; i++) {
      t = a0 + (2 * Math.PI - 2 * a0) * (i / n1);
      if (i === 0) s.moveTo(Math.cos(t) * R, Math.sin(t) * R);
      else s.lineTo(Math.cos(t) * R, Math.sin(t) * R);
    }
    /* concavo: volta de -f0 ate +f0, tambem por PI (o corte reto entre um arco
       e o outro E a ponta rombuda — nao precisa de vertice extra) */
    for (i = 0; i <= n2; i++) {
      t = -f0 - (2 * Math.PI - 2 * f0) * (i / n2);
      s.lineTo(d + Math.cos(t) * r, Math.sin(t) * r);
    }
    return s;
  }

  var LUA_X = -0.48, LUA_Y = 0.30, LUA_GIRO = 0.22;   /* boca virada para a direita e um pouco para cima */
  var lua = new T.ExtrudeGeometry(
    formaLua(0.275, 0.19, Math.PI / 3, 0.175, 0.105, 10, 7),
    { depth: 0.040, bevelEnabled: false, curveSegments: 1 }
  );
  lua.rotateZ(LUA_GIRO);
  lua.translate(LUA_X, LUA_Y, Z0);
  pecas.push(chapa(lua, OURO));

  /* ---------- ESTRELAS (item 41) ----------
     5 pontas = 10 pontos alternando raio externo/interno. Razao 0.44: gorda,
     de crianca — a estrela "magra" (0.38) fica pontuda demais para o quarto. */
  function formaEstrela(rOut) {
    var rIn = rOut * 0.44, s = new T.Shape(), passo = Math.PI / 5, i, r, ang;
    for (i = 0; i < 10; i++) {
      r = (i % 2 === 0) ? rOut : rIn;
      ang = i * passo + Math.PI / 2;                   /* primeira ponta para cima */
      if (i === 0) s.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else s.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    return s;
  }

  /* A COMPOSICAO — e ela que faz a peca funcionar.
     Uma corrente solta que SOBE da direita-baixo ate a boca da lua, mais tres
     satelites que fecham a moldura (os dois cantos de cima e o pe da esquerda).
     As tres regras abaixo nao sao intencao: foram MEDIDAS peca a peca antes de
     fechar o arquivo, e cada uma ja mudou uma posicao aqui.
       1. Nenhuma tripla forma FILEIRA. O olho so le "linha" quando as tres
          estao alinhadas E com passo parelho E perto uma da outra: a pior
          tripla daqui tira 0.04 de 1. A primeira versao tirava 0.22, com
          E2-E4-E3 em fila — por isso a media do meio saiu de (0.46,0.20) para
          (0.37,0.21). E a propria LUA caia na reta E6-E7: quem andou foi a E6.
       2. Nenhum par VIZINHO divide a mesma linha ou a mesma coluna. Os unicos
          pares com y parecido estao a mais de 0.8 um do outro, em pontas
          opostas do conjunto — nessa distancia ninguem le alinhamento.
       3. GIRO: a estrela de 5 pontas se repete a cada 72 graus, entao dois
          giros diferentes no papel podem dar a MESMA estrela na parede. Os
          nove giros daqui estao a 6 graus ou mais um do outro nesse resto
          (dois deles eram identicos na primeira versao).
     Os tamanhos tambem nao acompanham a corrente em ordem — seria uma escada.
     E nenhuma peca encosta na outra: a folga mais apertada e 0.056, entre a
     lua e a estrela que entra na boca dela.
     Colunas: raio externo, x, y, giro (rad), tom. */
  var ESTRELAS = [
    [0.16,  0.72, -0.60,  0.35, CLARO],   /* a mais baixa e mais forte: ancora o canto de baixo */
    [0.16,  0.26, -0.22, -0.45, OURO ],   /* segunda da corrente, ja subindo */
    [0.16,  0.78,  0.46,  0.63, CLARO],   /* fora da corrente: segura o canto de cima a direita */
    [0.11,  0.37,  0.21, -0.20, FUNDO],   /* tom recuado: abre profundidade no meio do grupo */
    [0.11, -0.05,  0.40,  0.05, CLARO],   /* entra na boca da lua */
    [0.11, -0.62, -0.30,  1.20, OURO ],   /* embaixo da lua, para o lado esquerdo nao esvaziar */
    [0.07, -0.20,  0.70,  0.92, OURO ],   /* passou da lua: a que "chegou" mais alto */
    [0.07, -0.30, -0.52, -1.05, FUNDO],   /* a faisca la embaixo: e onde a corrente comeca */
    [0.07, -0.87,  0.57,  0.50, FUNDO]    /* a mais longe, atras da lua: fecha a moldura */
  ];

  for (var i = 0; i < ESTRELAS.length; i++) {
    var e = ESTRELAS[i];
    /* estrela grande sai um tico mais da parede que a pequena: da o
       empilhamento de adesivo colado em cima de adesivo, de graca */
    var prof = e[0] > 0.13 ? 0.038 : (e[0] > 0.09 ? 0.034 : 0.030);
    var g = new T.ExtrudeGeometry(formaEstrela(e[0]),
      { depth: prof, bevelEnabled: false, curveSegments: 1 });
    g.rotateZ(e[3]);
    g.translate(e[1], e[2], Z0);
    pecas.push(chapa(g, e[4]));
  }

  /* ---------- 1 draw call ----------
     MeshBasic: sem luz, sem normal para calcular, sem canal de brilho no
     material. A cor sai da malha exatamente como esta na paleta — e isso, e so
     isso, que faz a peca "acender". */
  var malha = new T.Mesh(BGU.mergeBufferGeometries(pecas),
    new T.MeshBasicMaterial({ vertexColors: true }));
  malha.name = 'ceuparede_malha';
  grupo.add(malha);

  return { grupo: grupo, custo: { dc: 1, tri: 396 } };
};
