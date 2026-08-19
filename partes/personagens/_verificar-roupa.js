/* Verificador de ROUPA do Sarinha Mini Style.
   Monta o personagem inteiro (corpo + cabeca + cabelo curto + A PECA) no three
   r147 real e checa o contrato do BRIEFING-ROUPA-NOVA.md. Uso:
     node _verificar-roupa.js SarinhaTop01.js createSarinhaTop01
   Sai 0 se passou, 1 se falhou. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const DIR = __dirname.replace(/\\/g, '/') + '/';
const THREE_DIR = 'C:/Users/pasto/arena-3d/node_modules/three';
const arquivo = process.argv[2], funcao = process.argv[3];
if (!arquivo || !funcao) { console.error('uso: node _verificar-roupa.js <arquivo.js> <funcao>'); process.exit(2); }

const T = require(path.join(THREE_DIR, 'build/three.cjs'));
const cB = { THREE: T, console }; cB.window = cB; cB.self = cB; vm.createContext(cB);
vm.runInContext(fs.readFileSync(path.join(THREE_DIR, 'examples/js/utils/BufferGeometryUtils.js'), 'utf8'), cB);
const BGU = cB.THREE.BufferGeometryUtils;

const ctx = { console, Math, Float32Array, Error }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['SarinhaCharacterBase.js','SarinhaCharacterHead.js','SarinhaHairShort01.js'])
  vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), ctx);
vm.runInContext(fs.readFileSync(DIR + arquivo, 'utf8'), ctx);
const S = ctx.window.SARINHA_PERSONAGENS;
if (typeof S[funcao] !== 'function') { console.error('funcao ' + funcao + ' nao encontrada'); process.exit(2); }

const R = { arquivo, funcao, criterios: {} };

// ---- a peca sozinha ----
const peca = S[funcao]({ T, BGU }, {});
let tri = 0, malhas = 0;
peca.traverse(o => { if (o.isMesh) { const g = o.geometry;
  tri += g.index ? g.index.count/3 : g.attributes.position.count/3; malhas++; }});
R.triangulos = tri; R.malhas = malhas;
const ud = peca.userData || {};
R.tipoRoupa = ud.tipoRoupa;
R.hideTorso = !!ud.hideTorso;
R.temLegPaint = !!ud.legPaint;

// ---- personagem completo ----
const p = S.createSarinhaCharacterBase({ T, BGU }, { showHeadPlaceholder:false, headHeight:S.HEAD_HEIGHT });
p.userData.rig.headPivot.add(S.createSarinhaCharacterHead({ T, BGU }, {}));
const cabelo = S.createSarinhaHairShort01({ T, BGU }, {});
cabelo.position.y = cabelo.userData.offsetNoHairAnchor;
p.getObjectByName('HairAnchor').add(cabelo);
const pv = p.getObjectByName('Pelvis');
const roupa = S[funcao]({ T, BGU }, {});
pv.add(roupa);
if (roupa.userData.hideTorso) { const t = p.getObjectByName('Torso'); if (t) t.visible = false; }
p.updateMatrixWorld(true);

let triTotal = 0;
p.traverse(o => { if (o.isMesh && o.visible && o.name !== 'DebugMarker') { const g = o.geometry;
  triTotal += g.index ? g.index.count/3 : g.attributes.position.count/3; }});
R.triangulosPersonagem = triTotal;

const bbP = new T.Box3().setFromObject(p);
R.minY = +bbP.min.y.toFixed(5);

let clothMesh = null;
roupa.traverse(o => { if (o.isMesh && !clothMesh) clothMesh = o; });
const bbC = new T.Box3().setFromObject(clothMesh);
R.roupaBBox = { x:[+bbC.min.x.toFixed(3),+bbC.max.x.toFixed(3)],
                y:[+bbC.min.y.toFixed(3),+bbC.max.y.toFixed(3)],
                z:[+bbC.min.z.toFixed(3),+bbC.max.z.toFixed(3)] };

// pelvis-space helpers (o pelvis mora em hipY do chao)
const invP = new T.Matrix4().copy(pv.matrixWorld).invert();
function emPelvis(v){ return v.clone().applyMatrix4(invP); }
const cMin = emPelvis(bbC.min), cMax = emPelvis(bbC.max);
const loY = Math.min(cMin.y, cMax.y), hiY = Math.max(cMin.y, cMax.y);
R.zonaY_pelvis = [+loY.toFixed(3), +hiY.toFixed(3)];

// ---- zona esperada por tipo ----
const ZONAS = {
  top:    { yMin:-0.10, yMax:0.80 },
  jacket: { yMin:-0.10, yMax:0.80 },
  bottom: { yMin:-0.45, yMax:0.10 },
  dress:  { yMin:-0.45, yMax:0.80 }
};
const zona = ZONAS[R.tipoRoupa] || null;
R.dentroDaZona = !!zona && loY >= zona.yMin - 0.08 && hiY <= zona.yMax + 0.08;

// ---- cobertura frontal da zona (raycast de frente) ----
const rc = new T.Raycaster();
let cob = 0, totCob = 0;
if (zona) {
  const y0 = Math.max(loY, zona.yMin), y1 = Math.min(hiY, zona.yMax);
  /* jaqueta tem abertura frontal DESENHADA: mede nas colunas laterais,
     onde a peca existe — medir no vao proposital daria 0% sempre */
  const colunas = (R.tipoRoupa === 'jacket') ? [-0.30, 0.30] : [-0.15, 0, 0.15];
  for (let i = 0; i < 8; i++) {
    const yl = y0 + (i + 0.5) / 8 * (y1 - y0);
    for (const xl of colunas) {
      totCob++;
      const origem = new T.Vector3(xl, yl, 3).applyMatrix4(pv.matrixWorld);
      rc.set(origem, new T.Vector3(0, 0, -1).transformDirection(pv.matrixWorld));
      const hits = rc.intersectObject(p, true);
      if (hits.length && hits[0].object === clothMesh) cob++;
    }
  }
}
R.coberturaFrontal = totCob ? +(100 * cob / totCob).toFixed(1) : 0;
// legPaint cobre as pernas por pintura; a faixa estatica so precisa existir
const coberturaMinima = R.temLegPaint ? 20 : 62;

// ---- nao invade rosto nem sapatos ----
// ⚠️ o topo do torso SOBE atras da cabeca por desenho (armadilha 2 do CHAR-00),
// entao comparar bbox em Y acusaria falso. O teste certo: raio na altura dos
// OLHOS, de frente — o primeiro objeto atingido nao pode ser a roupa.
const bbHead = new T.Box3().setFromObject(p.getObjectByName('HeadMesh'));
const yOlhos = bbHead.min.y + (bbHead.max.y - bbHead.min.y) * 0.62;
rc.set(new T.Vector3(0, yOlhos, 6), new T.Vector3(0, 0, -1));
const hitRosto = rc.intersectObject(p, true);
R.invadeRosto = hitRosto.length > 0 && hitRosto[0].object === clothMesh;
const bbFoot = new T.Box3().setFromObject(p.getObjectByName('LeftFoot'));
R.invadeSapato = cMin.y < -0.58 && R.tipoRoupa !== 'dress' ? true
               : (R.tipoRoupa === 'dress' ? cMin.y < -0.50 : cMin.y < -0.58);

// ---- enterrado no torso (a roupa nao pode estar DENTRO do corpo) ----
const torso = p.getObjectByName('Torso');
const bbT = new T.Box3().setFromObject(torso);
const ct = bbT.getCenter(new T.Vector3()), st = bbT.getSize(new T.Vector3()).multiplyScalar(0.5);
const posC = clothMesh.geometry.attributes.position, v = new T.Vector3();
let dentroTorso = 0;
for (let i=0;i<posC.count;i++){ v.fromBufferAttribute(posC,i); clothMesh.localToWorld(v);
  const q = ((v.x-ct.x)/st.x)**2 + ((v.y-ct.y)/st.y)**2 + ((v.z-ct.z)/st.z)**2;
  if (q < 0.75) dentroTorso++; }
R.percentualDentroDoTorso = +(100*dentroTorso/posC.count).toFixed(1);
// top/jacket/dress envolvem o torso: tolerancia maior na sobreposicao da casca
const tetoDentro = (R.tipoRoupa === 'bottom') ? 25 : 45;

// ---- balanco da perna: saia/vestido precisam de vao para o passo ----
R.folgaDePasso = null;
if (R.tipoRoupa === 'dress' || (R.tipoRoupa === 'bottom' && !R.temLegPaint)) {
  R.folgaDePasso = +(Math.max(Math.abs(cMin.z), Math.abs(cMax.z))).toFixed(3);
}
const passoOk = R.folgaDePasso === null || R.folgaDePasso >= 0.28;

const K = R.criterios;
K['1_orcamento_80_450'] = tri >= 80 && tri <= 450;
K['2_uma_malha'] = malhas === 1;
K['3_tipoRoupa_valido'] = ['top','bottom','dress','jacket'].includes(R.tipoRoupa);
K['4_dentro_da_zona'] = R.dentroDaZona;
K['5_cobre_a_zona'] = R.coberturaFrontal >= coberturaMinima;
K['6_nao_invade_rosto'] = !R.invadeRosto;
K['7_nao_invade_sapato'] = !R.invadeSapato;
K['8_nao_enterrada_no_corpo'] = R.percentualDentroDoTorso <= tetoDentro;
K['9_folga_de_passo'] = passoOk;
K['10_personagem_ate_2000'] = triTotal <= 2000;
K['11_pe_no_chao'] = Math.abs(bbP.min.y) < 0.0005;
R.TODOS_OK = Object.values(K).every(Boolean);

console.log(JSON.stringify(R, null, 2));
process.exit(R.TODOS_OK ? 0 : 1);
