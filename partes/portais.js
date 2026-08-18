/* ===========================================================================
   PARTE: partePortais - Mundo da Sarinha
   Os 4 arcos de feltro da praca (raio 20, nos pontos cardeais), cada um
   virado para o centro. Tres estao fechados com cortina + plaquinha
   "em breve"; o do NORTE fica ABERTO (e a passagem para o Jardim).

   Orcamento medido: 2 draw calls / 1.328 triangulos.
     DC1 = feltro (8 pilares + 4 arcos + 8 discos de sombra + 3 cortinas),
           tudo mesclado com cor por vertice; as cortinas ondulam mexendo
           so na fatia final do buffer (updateRange).
     DC2 = 4 plaquinhas num unico atlas de CanvasTexture (2x2 celulas);
           a do NORTE balanca como pendulo girando seus 4 vertices.
   Sem luz nova, sem asset externo, sem sombra de engine, nomes ASCII.
   Texto acentuado escrito em \uXXXX para o arquivo ficar ASCII puro.
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.partePortais = function (ctx) {
  var T = ctx.T, M = ctx.M;
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();

  /* ---------- medidas do arco ---------- */
  var MEIA_L  = 2.25;   /* meia largura: pilares em x = +-2.25 (vao de 4,5) */
  var R_PILAR = 0.30;   /* pilar rolico */
  var H_PILAR = 2.50;
  var R_TUBO  = 0.28;   /* grossura do arco */
  var ACHATA  = 0.72;   /* arco achatado: altura livre ~3,9 em vez de 4,75 */
  var RAIO    = 20;
  var CINZA   = 0x6a5a8f;   /* cinza-azulado da regra de tom da praca */

  var REGIOES = [
    /* NORTE = -Z = entrada do Jardim: ABERTO, sem cortina, plaquinha alegre */
    { chave:'norte', x:0,   z:-RAIO, cor:0xBCD6B0, aberto:true,
      l1:'Jardim \uD83C\uDF3C', l2:'' },
    { chave:'sul',   x:0,   z: RAIO, cor:0xE8A7B2, aberto:true,
      l1:'Vilinha \ud83c\udfe1',        l2:'' },
    /* \u26D4 CONSERTADO 16/08: estes dois estavam TROCADOS e FECHADOS. O leste
       anunciava "Palco da Festinha", mas o palco fica no OESTE (-42,0);
       o leste d\u00E1 no Parque da roda-gigante (42,0). E os dois diziam
       "em breve" com as zonas prontas ha tempo \u2014 as duas maiores do
       mundo (parque tem 76 colisores, festa 26) estavam anunciadas como
       inacabadas e barradas por colisor. */
    { chave:'leste', x: RAIO, z:0,   cor:0xE9B44C, aberto:true,
      l1:'Parque \uD83C\uDFA1',        l2:'' },
    { chave:'oeste', x:-RAIO, z:0,   cor:0x9FB4D8, aberto:true,
      l1:'Palco da Festinha \uD83C\uDF88', l2:'' }
  ];

  /* ---------- utilidades de cor ---------- */
  function escurece(cor, f){
    return new T.Color(cor).lerp(new T.Color(CINZA), f);
  }
  /* pinta com degrade vertical: base mais escura (senao o cenario claro lava) */
  function pinta(geo, cor, y0, y1, fBase){
    var cTopo = new T.Color(cor), cBase = escurece(cor, fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var c = new T.Color();
    for (var i = 0; i < n; i++){
      var f = (y1 === y0) ? 1 : (pos.getY(i) - y0) / (y1 - y0);
      f = f < 0 ? 0 : (f > 1 ? 1 : f);
      c.copy(cBase).lerp(cTopo, f);
      a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');   /* mesclar exige atributos iguais */
    return geo;
  }

  /* ---------- matriz de cada portal: gira para olhar o centro ---------- */
  function matrizDoPortal(r){
    /* +Z local aponta para o centro da praca */
    var ang = Math.atan2(-r.x, -r.z);
    var m = new T.Matrix4().makeRotationY(ang);
    m.setPosition(r.x, 0, r.z);
    return { m: m, ang: ang, cos: Math.cos(ang), sen: Math.sin(ang) };
  }
  /* ponto local (px,0,pz) -> mundo (para os colisores) */
  function paraMundo(r, tr, px, pz){
    return { x: r.x + px * tr.cos + pz * tr.sen,
             z: r.z - px * tr.sen + pz * tr.cos };
  }

  /* altura interna do arco numa abscissa x (borda de cima da cortina) */
  function topoDoArco(x){
    var s = 1 - (x / MEIA_L) * (x / MEIA_L);
    return H_PILAR + MEIA_L * ACHATA * Math.sqrt(s > 0 ? s : 0);
  }

  /* ---------- cortina: grade propria, borda de cima colada no arco ---------- */
  var NX = 8, NY = 4;
  function geoCortina(){
    var meia = 2.10, vt = [], nr = [], ix = [], i, j;
    for (j = 0; j <= NY; j++){
      for (i = 0; i <= NX; i++){
        var u = i / NX, v = j / NY;
        var x = -meia + u * 2 * meia;
        var y = v * topoDoArco(x);
        var z = Math.sin(x * 3.1) * 0.10 * (1.1 - v);   /* dobra de feltro */
        vt.push(x, y, z); nr.push(0, 0, 1);
      }
    }
    for (j = 0; j < NY; j++){
      for (i = 0; i < NX; i++){
        var a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
        ix.push(a, b, d, a, d, c);
      }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(vt), 3));
    g.setAttribute('normal',   new T.BufferAttribute(new Float32Array(nr), 3));
    g.setIndex(ix);
    return g;
  }

  /* =========================================================================
     DC1 - feltro: pilares, arcos, discos de sombra e (no fim) as cortinas
     ========================================================================= */
  var pecas = [], nVert = 0;
  function junta(geo){ pecas.push(geo); nVert += geo.attributes.position.count; }

  var corSombra = escurece(M.corChao, 0.30);
  var i, r, tr;

  for (i = 0; i < REGIOES.length; i++){
    r = REGIOES[i]; tr = matrizDoPortal(r);
    var lados = [-1, 1];
    for (var s = 0; s < 2; s++){
      var px = lados[s] * MEIA_L;
      /* pilar rolico (capsula): pe no chao, topo encostando no arco */
      var pil = new T.CapsuleGeometry(R_PILAR, H_PILAR - R_PILAR * 2, 2, 8)
        .translate(px, H_PILAR / 2, 0);
      junta(pinta(pil, r.cor, 0, H_PILAR * 0.9, 0.34).applyMatrix4(tr.m));
      /* sombra pintada a mao (o mundo nao tem sombra de engine) */
      var disc = new T.CircleGeometry(R_PILAR + 0.26, 10)
        .rotateX(-Math.PI / 2).translate(px, 0.02, 0);
      junta(pinta(disc, corSombra.getHex(), 0, 0, 0).applyMatrix4(tr.m));
      /* colisor do pilar */
      var pm = paraMundo(r, tr, px, 0);
      ctx.COLISORES.push({ x: pm.x, z: pm.z, raio: 0.4 });
    }
    /* arco de cima: meio toro achatado, encaixado no topo dos pilares */
    var arco = new T.TorusGeometry(MEIA_L, R_TUBO, 6, 12, Math.PI)
      .scale(1, ACHATA, 1).translate(0, H_PILAR, 0);
    junta(pinta(arco, r.cor, H_PILAR - 0.2, H_PILAR + 1.2, 0.30).applyMatrix4(tr.m));

    /* vao fechado: 3 colisores tapam a passagem (raio 0,55 + 0,45 do jogador
       = discos de 1,0 que se sobrepoem entre si e ate os pilares: nao passa) */
    if (!r.aberto){
      var vaos = [-1.2, 0, 1.2];
      for (var v = 0; v < vaos.length; v++){
        var vm = paraMundo(r, tr, vaos[v], 0);
        ctx.COLISORES.push({ x: vm.x, z: vm.z, raio: 0.55 });
      }
    }
  }

  /* cortinas por ultimo: ficam num bloco contiguo no fim do buffer */
  var ONDAS = [], iniOnda = -1, nOnda = 0;
  for (i = 0; i < REGIOES.length; i++){
    r = REGIOES[i];
    if (r.aberto) continue;
    tr = matrizDoPortal(r);
    var cg = geoCortina();
    var nv = cg.attributes.position.count;
    if (iniOnda < 0) iniOnda = nVert;
    /* fase e amplitude por vertice: balanco maior embaixo, preso em cima */
    var fase = new Float32Array(nv), amp = new Float32Array(nv);
    var cp = cg.attributes.position;
    for (var k = 0; k < nv; k++){
      var vx = cp.getX(k), vy = cp.getY(k);
      var vv = vy / Math.max(0.001, topoDoArco(vx));
      fase[k] = vx * 2.6 + i * 1.7;
      amp[k]  = 0.02 + 0.13 * (1 - vv);
    }
    ONDAS.push({ ini: nVert, n: nv, fase: fase, amp: amp,
                 dx: tr.sen, dz: tr.cos, base: null });
    junta(pinta(cg, escurece(r.cor, 0.32).getHex(), 0, topoDoArco(0), 0.22)
      .applyMatrix4(tr.m));
    nOnda += nv;
  }

  var geoFeltro = BGU.mergeBufferGeometries(pecas);
  var malhaFeltro = new T.Mesh(geoFeltro, new T.MeshLambertMaterial({ vertexColors: true }));
  malhaFeltro.name = 'portais_feltro';
  grupo.add(malhaFeltro);

  /* guarda a posicao de repouso de cada vertice de cortina */
  var posFeltro = geoFeltro.attributes.position;
  for (i = 0; i < ONDAS.length; i++){
    var o = ONDAS[i], bs = new Float32Array(o.n * 3);
    for (var q = 0; q < o.n; q++){
      bs[q*3]   = posFeltro.getX(o.ini + q);
      bs[q*3+1] = posFeltro.getY(o.ini + q);
      bs[q*3+2] = posFeltro.getZ(o.ini + q);
    }
    o.base = bs;
  }

  /* =========================================================================
     DC2 - plaquinhas costuradas: 1 atlas 2x2 de CanvasTexture, 4 planos
     ========================================================================= */
  var CEL_L = 512, CEL_A = 256;
  var cv = document.createElement('canvas');
  cv.width = CEL_L * 2; cv.height = CEL_A * 2;
  var g2 = cv.getContext('2d');

  function caixaRedonda(x, y, w, h, r2){
    g2.beginPath();
    g2.moveTo(x + r2, y);
    g2.arcTo(x + w, y,     x + w, y + h, r2);
    g2.arcTo(x + w, y + h, x,     y + h, r2);
    g2.arcTo(x,     y + h, x,     y,     r2);
    g2.arcTo(x,     y,     x + w, y,     r2);
    g2.closePath();
  }
  function fonteQueCabe(txt, tam, larguraMax){
    var s = tam;
    while (s > 14){
      g2.font = '800 ' + s + 'px "Baloo 2", Arial, sans-serif';
      if (g2.measureText(txt).width <= larguraMax) break;
      s -= 2;
    }
    return s;
  }
  function desenhaPlaca(col, lin, reg){
    var ox = col * CEL_L, oy = lin * CEL_A;
    var cordao = '#' + escurece(reg.cor, 0.45).getHexString();
    var borda  = '#' + escurece(reg.cor, 0.22).getHexString();
    var linha  = '#' + escurece(reg.cor, 0.55).getHexString();
    var tinta  = '#' + new T.Color(reg.cor).lerp(new T.Color(0x3c2a8f), 0.72).getHexString();

    /* cordinhas que penduram a placa no arco */
    g2.lineCap = 'round';
    g2.strokeStyle = cordao; g2.lineWidth = 7;
    g2.beginPath();
    g2.moveTo(ox + 256, oy + 8); g2.lineTo(ox + 108, oy + 44);
    g2.moveTo(ox + 256, oy + 8); g2.lineTo(ox + 404, oy + 44);
    g2.stroke();

    /* tabuinha creme */
    g2.fillStyle = '#efe3c8';
    caixaRedonda(ox + 32, oy + 38, 448, 196, 28); g2.fill();
    g2.strokeStyle = borda; g2.lineWidth = 9; g2.stroke();

    /* costura pontilhada */
    g2.setLineDash([12, 10]); g2.lineWidth = 4; g2.strokeStyle = linha;
    caixaRedonda(ox + 52, oy + 58, 408, 156, 20); g2.stroke();
    g2.setLineDash([]);

    /* texto */
    g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillStyle = tinta;
    if (!reg.l2){
      g2.font = '800 ' + fonteQueCabe(reg.l1, 76, 372) + 'px "Baloo 2", Arial, sans-serif';
      g2.fillText(reg.l1, ox + 256, oy + 138);
    } else {
      g2.font = '800 ' + fonteQueCabe(reg.l1, 62, 372) + 'px "Baloo 2", Arial, sans-serif';
      g2.fillText(reg.l1, ox + 256, oy + 116);
      g2.fillStyle = '#7a6aa8';
      g2.font = '700 ' + fonteQueCabe(reg.l2, 42, 340) + 'px "Baloo 2", Arial, sans-serif';
      g2.fillText(reg.l2, ox + 256, oy + 184);
    }
  }
  function desenhaAtlas(){
    g2.clearRect(0, 0, cv.width, cv.height);
    for (var p = 0; p < REGIOES.length; p++) desenhaPlaca(p % 2, p < 2 ? 0 : 1, REGIOES[p]);
  }
  desenhaAtlas();

  var tex = new T.CanvasTexture(cv);
  tex.generateMipmaps = false;
  tex.minFilter = T.LinearFilter;
  tex.magFilter = T.LinearFilter;
  /* a fonte "Baloo 2" pode chegar depois do 1o quadro: redesenha e sobe de novo */
  if (document.fonts && document.fonts.ready && document.fonts.ready.then){
    document.fonts.ready.then(function(){ desenhaAtlas(); tex.needsUpdate = true; });
  }

  var LARG_P = 2.40, ALT_P = 1.20, TOPO_P = 3.72, Z_P = 0.45;
  var placas = [], eixoNorte = null;
  for (i = 0; i < REGIOES.length; i++){
    r = REGIOES[i]; tr = matrizDoPortal(r);
    var gp = new T.PlaneGeometry(LARG_P, ALT_P, 1, 1);
    var uv = gp.attributes.uv, u0 = (i % 2) * 0.5, v0 = (i < 2 ? 0.5 : 0);
    for (var w = 0; w < uv.count; w++){
      uv.setXY(w, u0 + uv.getX(w) * 0.5, v0 + uv.getY(w) * 0.5);
    }
    gp.translate(0, TOPO_P - ALT_P / 2, Z_P).applyMatrix4(tr.m);
    if (r.aberto){
      /* eixo do pendulo: a linha das cordinhas, no topo da placa */
      var an = paraMundo(r, tr, 0, Z_P);
      eixoNorte = { ini: placas.length * 4, n: 4, x: an.x, y: TOPO_P, z: an.z,
                    tx: tr.cos, tz: -tr.sen, base: null };
    }
    placas.push(gp);
  }
  var geoPlacas = BGU.mergeBufferGeometries(placas);
  var malhaPlacas = new T.Mesh(geoPlacas, new T.MeshLambertMaterial({
    map: tex, alphaTest: 0.5, transparent: false
  }));
  malhaPlacas.name = 'portais_placas';
  grupo.add(malhaPlacas);

  var posPlacas = geoPlacas.attributes.position;
  if (eixoNorte){
    var bp = new Float32Array(eixoNorte.n * 3);
    for (i = 0; i < eixoNorte.n; i++){
      bp[i*3]   = posPlacas.getX(eixoNorte.ini + i);
      bp[i*3+1] = posPlacas.getY(eixoNorte.ini + i);
      bp[i*3+2] = posPlacas.getZ(eixoNorte.ini + i);
    }
    eixoNorte.base = bp;
  }

  /* =========================================================================
     animacao
     ========================================================================= */
  function update(t){
    /* cortinas: onda de seno na profundidade local, solta embaixo */
    for (var a = 0; a < ONDAS.length; a++){
      var o = ONDAS[a], b = o.base;
      for (var k = 0; k < o.n; k++){
        var d = Math.sin(t * 1.5 + o.fase[k]) * o.amp[k];
        posFeltro.setXYZ(o.ini + k,
          b[k*3] + o.dx * d, b[k*3+1], b[k*3+2] + o.dz * d);
      }
    }
    if (nOnda > 0){
      /* so a fatia das cortinas sobe para a GPU (o resto do buffer e estatico) */
      posFeltro.updateRange.offset = iniOnda * 3;
      posFeltro.updateRange.count  = nOnda * 3;
      posFeltro.needsUpdate = true;
    }

    /* plaquinha do NORTE: pendulo em torno das cordinhas */
    if (eixoNorte){
      var e = eixoNorte, ang = Math.sin(t * 0.9) * 0.085;
      var co = Math.cos(ang), si = Math.sin(ang), pb = e.base;
      for (var p = 0; p < e.n; p++){
        var dx = pb[p*3] - e.x, dy = pb[p*3+1] - e.y, dz = pb[p*3+2] - e.z;
        var lt = dx * e.tx + dz * e.tz;                 /* eixo na largura da placa */
        var lt2 = lt * co - dy * si, dy2 = lt * si + dy * co;
        posPlacas.setXYZ(e.ini + p,
          e.x + e.tx * lt2, e.y + dy2, e.z + e.tz * lt2);
      }
      posPlacas.updateRange.offset = e.ini * 3;
      posPlacas.updateRange.count  = e.n * 3;
      posPlacas.needsUpdate = true;
    }
  }

  return {
    grupo: grupo,
    update: update,
    custo: { dc: 2, tri: 1328 }
  };
};
