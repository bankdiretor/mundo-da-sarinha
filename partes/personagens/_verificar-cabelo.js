/* Verificador de CABELO do Sarinha Mini Style.
   Monta o personagem inteiro no three r147 REAL e checa tudo que ja custou
   retrabalho. Uso:
     node _verificar-cabelo.js SarinhaHairCurly01.js createSarinhaHairCurly01
   Sai 0 se passou, 1 se falhou. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const DIR = __dirname.replace(/\\/g, '/') + '/';
const THREE_DIR = 'C:/Users/pasto/arena-3d/node_modules/three';
const arquivo = process.argv[2], funcao = process.argv[3];
if (!arquivo || !funcao) { console.error('uso: node _verificar-cabelo.js <arquivo.js> <nomeDaFuncao>'); process.exit(2); }

const T = require(path.join(THREE_DIR, 'build/three.cjs'));
const cB = { THREE: T, console }; cB.window = cB; cB.self = cB; vm.createContext(cB);
vm.runInContext(fs.readFileSync(path.join(THREE_DIR, 'examples/js/utils/BufferGeometryUtils.js'), 'utf8'), cB);
const BGU = cB.THREE.BufferGeometryUtils;

const ctx = { console, Math, Float32Array, Error }; ctx.window = ctx; vm.createContext(ctx);
const base = ['SarinhaCharacterBase.js','SarinhaCharacterHead.js',
              'SarinhaHairShort01.js','SarinhaHairLong01.js','SarinhaHairWavy01.js'];
for (const f of base) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), ctx);
vm.runInContext(fs.readFileSync(DIR + arquivo, 'utf8'), ctx);
const S = ctx.window.SARINHA_PERSONAGENS;
if (typeof S[funcao] !== 'function') { console.error('funcao ' + funcao + ' nao encontrada'); process.exit(2); }

const R = { arquivo, funcao, criterios: {} };
const criar = S[funcao];

// ---- cabelo sozinho ----
const cab = criar({ T, BGU }, {});
let tri = 0, malhas = 0;
cab.traverse(o => { if (o.isMesh) { const g = o.geometry;
  tri += g.index ? g.index.count/3 : g.attributes.position.count/3; malhas++; }});
R.triangulos = tri; R.malhas = malhas;
R.temOffset = typeof (cab.userData||{}).offsetNoHairAnchor === 'number';

// ---- personagem completo ----
const p = S.createSarinhaCharacterBase({ T, BGU }, { showHeadPlaceholder:false, headHeight:S.HEAD_HEIGHT });
p.userData.rig.headPivot.add(S.createSarinhaCharacterHead({ T, BGU }, {}));
const h = criar({ T, BGU }, {});
h.position.y = h.userData.offsetNoHairAnchor;
p.getObjectByName('HairAnchor').add(h);
p.updateMatrixWorld(true);

let triTotal = 0;
p.traverse(o => { if (o.isMesh && o.name !== 'DebugMarker') { const g = o.geometry;
  triTotal += g.index ? g.index.count/3 : g.attributes.position.count/3; }});
R.triangulosPersonagem = triTotal;

const bbP = new T.Box3().setFromObject(p);
const bbHead = new T.Box3().setFromObject(p.getObjectByName('HeadMesh'));
R.minY = +bbP.min.y.toFixed(5);
R.alturaCorpo = +(bbHead.max.y - bbP.min.y).toFixed(4);

// nome da malha do cabelo (pode variar)
let hairMesh = null;
h.traverse(o => { if (o.isMesh && !hairMesh) hairMesh = o; });

// ---- clipping com o rosto ----
const rc = new T.Raycaster();
const esc = 2.60 / 1.974;
const base0 = bbHead.min.y, altC = bbHead.max.y - bbHead.min.y;
const alvos = [
  ['olho_esq', 0.62, -0.175], ['olho_dir', 0.62, 0.175],
  ['sobrancelha_e', 0.71, -0.175], ['sobrancelha_d', 0.71, 0.175],
  ['boca', 0.40, 0]
];
R.clipping = {}; let clip = false;
for (const [nome, fr, x] of alvos) {
  rc.set(new T.Vector3(x*esc, base0 + altC*fr, 6), new T.Vector3(0,0,-1));
  const hit = rc.intersectObject(p, true);
  const primeiro = hit.length ? hit[0].object.name : 'NADA';
  R.clipping[nome] = primeiro;
  if (hairMesh && primeiro === hairMesh.name) clip = true;
}

// ---- geometria enterrada no cranio ----
const pos = hairMesh.geometry.attributes.position, v = new T.Vector3();
const cx=(bbHead.max.x+bbHead.min.x)/2, cy=(bbHead.max.y+bbHead.min.y)/2, cz=(bbHead.max.z+bbHead.min.z)/2;
const ra=(bbHead.max.x-bbHead.min.x)/2, rb=(bbHead.max.y-bbHead.min.y)/2, rz=(bbHead.max.z-bbHead.min.z)/2;
let dentro = 0;
for (let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i); hairMesh.localToWorld(v);
  if (((v.x-cx)/ra)**2 + ((v.y-cy)/rb)**2 + ((v.z-cz)/rz)**2 < 0.80) dentro++; }
R.percentualEnterrado = +(100*dentro/pos.count).toFixed(1);

// ---- FURO na coroa (o "V" que o Ivan pegou de olho) ----
let furos = 0, celulas = 0;
for (let z=-0.15; z<=0.121; z+=0.03) for (let x=-0.15; x<=0.151; x+=0.03) {
  celulas++;
  rc.set(new T.Vector3(x,3,z), new T.Vector3(0,-1,0));
  if (!rc.intersectObject(h,true).length) furos++;
}
R.furosNaCoroa = furos + '/' + celulas;

// ---- a cabeca gira e o cabelo acompanha? ----
const pivot = p.userData.rig.headPivot;
let rotOk = true;
for (const yaw of [-Math.PI/4, Math.PI/4]) {
  pivot.rotation.y = yaw; p.updateMatrixWorld(true);
  const a = new T.Box3().setFromObject(hairMesh).getCenter(new T.Vector3());
  const b = new T.Box3().setFromObject(p.getObjectByName('HeadMesh')).getCenter(new T.Vector3());
  if (a.distanceTo(b) > 0.30) rotOk = false;
}
pivot.rotation.y = 0; p.updateMatrixWorld(true);

// ---- ⭐ DIFERENCA contra os cabelos que ja existem ----
/* ⛔ BUG PAGO: a 1a versao usava buckets toFixed(2) — malhas com topologias
   diferentes quase nao coincidiam (2 de 27 buckets!) e a "diferenca" que sobrava
   era so a de bbox. O longo v1.2 mediu 0.012 contra o ondulado sendo VISIVELMENTE
   diferente. Bins de 0.04 agregando o raio maximo resolvem. */
function perfil(fn) {
  const g = fn({T,BGU},{}); let m = null; g.traverse(o=>{ if(o.isMesh && !m) m=o; });
  const pos = m.geometry.attributes.position, mapa = new Map();
  for (let i=0;i<pos.count;i++){
    const k = Math.round(pos.getY(i) / 0.04), r = Math.hypot(pos.getX(i), pos.getZ(i));
    if (!mapa.has(k) || mapa.get(k) < r) mapa.set(k, r);
  }
  return mapa;
}
const meu = perfil(criar);
R.diferencaContra = {};
let menorDif = 1e9;
for (const [nome, chave] of [['curto','createSarinhaHairShort01'],['longo','createSarinhaHairLong01'],
                             ['ondulado','createSarinhaHairWavy01']]) {
  if (chave === funcao) continue;          /* nao comparar consigo mesmo */
  const fn = S[chave];
  const outro = perfil(fn); let maxD = 0;
  for (const [k,r] of meu) { const ro = outro.get(k); if (ro!==undefined) maxD = Math.max(maxD, Math.abs(r-ro)); }
  // diferenca de altura conta tambem (um cabelo curto vs longo difere no comprimento)
  const bbA = new T.Box3().setFromObject(criar({T,BGU},{}));
  const bbB = new T.Box3().setFromObject(fn({T,BGU},{}));
  const difAltura = Math.abs((bbA.max.y-bbA.min.y) - (bbB.max.y-bbB.min.y));
  const total = Math.max(maxD, difAltura);
  R.diferencaContra[nome] = +total.toFixed(3);
  if (total < menorDif) menorDif = total;
}
R.menorDiferenca = +menorDif.toFixed(3);

const K = R.criterios;
K['1_orcamento_ate_420'] = tri >= 150 && tri <= 420;
K['2_uma_malha'] = malhas === 1;
K['3_personagem_ate_1800'] = triTotal <= 1800;
K['4_nao_tapa_o_rosto'] = !clip;
K['5_sobrancelhas_livres'] = R.clipping.sobrancelha_e !== (hairMesh&&hairMesh.name)
                          && R.clipping.sobrancelha_d !== (hairMesh&&hairMesh.name);
K['6_pouca_geometria_enterrada'] = R.percentualEnterrado < 25;
K['7_sem_furo_na_coroa'] = furos === 0;
K['8_acompanha_a_cabeca'] = rotOk;
K['9_pe_no_chao'] = Math.abs(bbP.min.y) < 0.0005;
K['10_tem_offsetNoHairAnchor'] = R.temOffset;
K['11_DIFERENTE_dos_outros'] = menorDif >= 0.07;
R.TODOS_OK = Object.values(K).every(Boolean);

console.log(JSON.stringify(R, null, 2));
process.exit(R.TODOS_OK ? 0 : 1);
