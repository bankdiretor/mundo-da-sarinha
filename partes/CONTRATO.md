# CONTRATO DAS PARTES — Mundo da Sarinha
*Toda peça de cenário do mundo nasce como uma "parte". Este contrato é lei.*

## O que você entrega
UM arquivo `.js` com UMA função fábrica pura, no formato exato:

```js
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteNOME = function (ctx) {
  var T = ctx.T;                      // THREE (r147)
  var M = ctx.M;                      // config do mundo (ver abaixo)
  var grupo = new T.Group();
  // ... monta a geometria e adiciona ao grupo ...
  // ctx.COLISORES.push({x: 0, z: 0, raio: 1.6});   // o que o jogador não atravessa
  return {
    grupo: grupo,
    update: function (t, dt) { /* opcional: animação por tempo */ },
    custo: { dc: 2, tri: 2800 }       // MEDIDO por você, não chutado
  };
};
```

## ctx que você recebe
- `ctx.T` — THREE r147 (script clássico, sem import/módulos)
- `ctx.cena` — a cena (NÃO adicione nada nela; use só o seu `grupo`)
- `ctx.M` — `{raioPraca:22, corCeuTopo:0x241664, corCeuBase:0x6a3fc5, corNevoa:0x3c2a8f, corChao:0xf4edde, corGrama:0xbcd6b0, paleta:{creme:0xf4edde, rosa:0xe8a7b2, azulpo:0x9fb4d8, mel:0xe9b44c, roxo:0x6a3fc5}}`
- `ctx.materialFeltro(cor)` — MeshLambertMaterial (o "feltro")
- `ctx.materialBrilho(cor)` — MeshBasicMaterial (o que "acende")
- `ctx.COLISORES` — array de `{x, z, raio}`; empurra o jogador para fora

## PROIBIDO (a auditoria rejeita antes de integrar)
1. **Luz nova** — `PointLight`, `DirectionalLight`, `AmbientLight`, `SpotLight`. O mundo tem 2 luzes e ponto final. Brilho = `materialBrilho` / `emissive` / cor aditiva.
2. **Asset externo** — `TextureLoader`, `fetch`, `import`, URL de CDN, arquivo de imagem. Textura só via `document.createElement('canvas')` → `T.CanvasTexture` com `generateMipmaps=false; minFilter=T.LinearFilter`.
3. **Sombra** — `castShadow`, `receiveShadow`, `shadowMap`. Sombra é disco escuro translúcido pintado à mão.
4. **Mexer fora do seu grupo** — nada de `ctx.cena.traverse`, nada de alterar outras partes.
5. **Acento em nome de função/variável** — ASCII puro (`parteLampioes`, não `parteLâmpadas`).
6. **`outputEncoding` / pós-processamento / `sRGBEncoding`** — as cores foram escolhidas contra o padrão linear.

## Orçamento (medir, não supor)
- Máximo **2 draw calls** e **3.000 triângulos** por parte.
- Como conseguir: mescle geometrias com `T.BufferGeometryUtils.mergeBufferGeometries([...])` usando **cor por vértice** (`vertexColors:true` num único material) e use `InstancedMesh` para repetição. Um `Mesh` = 1 draw call.
- Receita de pintar vértice:
```js
function pinta(geo, cor){
  var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n*3);
  for (var i=0;i<n;i++){ a[i*3]=c.r; a[i*3+1]=c.g; a[i*3+2]=c.b; }
  geo.setAttribute('color', new T.BufferAttribute(a,3));
  return geo;
}
var mat = new T.MeshLambertMaterial({vertexColors:true});
var malha = new T.Mesh(T.BufferGeometryUtils.mergeBufferGeometries(pecas), mat);
```
- **Geometrias mescladas precisam ter os MESMOS atributos.** Use só `position`+`normal`+`color`: rode `geo.deleteAttribute('uv')` em cada peça antes de mesclar (senão `mergeBufferGeometries` devolve `null` — erro clássico e silencioso).
- **Índice também precisa bater** (armadilha irmã, descoberta em 15/08): `TetrahedronGeometry`/`IcosahedronGeometry` nascem **sem índice**, enquanto `Sphere`/`Cylinder`/`Box`/`Plane` nascem **com** — misturar as duas famílias no mesmo merge devolve `null` do mesmo jeito. Normalize dentro da sua função `pinta`: `geo = geo.index ? geo.toNonIndexed() : geo;`

## Estética (o mundo é o clipe da Sarinha)
- Diorama de **feltro artesanal**: formas redondas, sem quina viva, escala de brinquedo. Nada realista, nada de terror, nada de arma.
- Paleta pastel sob céu roxo: creme `#F4EDDE`, rosa `#E8A7B2`, azul-poeira `#9FB4D8`, mel `#E9B44C`, verde `#BCD6B0`, roxo `#6A3FC5`. Dourado da estrelinha: `#FFD166`.
- **Armadilha paga: cenário claro "lava" na tela.** Toda peça precisa de variação de tom — pinte a base/sombra de cada objeto com a cor ~18% mais escura puxada para o cinza-azulado (`new T.Color(cor).lerp(new T.Color(0x6a5a8f), 0.18)`), senão vira um borrão branco.
- O chão da praça é creme e vai até raio 23,5; a grama pastel vai daí até 58. O céu é cúpula com estrelas.

## Geografia v1 (não invadir a área do vizinho)
- **Praça**: círculo raio 22 centrado em (0,0). Jogador nasce em (0,12).
- Centro/monumento: raio ≤ 3 do (0,0).
- Lampiões: círculo raio 14.
- Portais: raio 20, nos 4 pontos cardeais. NORTE = `-Z` = entrada do Jardim (fica ABERTO).
- **Jardim**: elipse 26 (x) × 20 (z) centrada em **(0,-38)**; corredor de largura 4 ligando a praça (de z=-20 a z=-28). Coreto em **(0,-44)**.
