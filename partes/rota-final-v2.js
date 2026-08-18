const fs = require('fs');
const { EXT, RES, N, dist } = JSON.parse(fs.readFileSync('clearance.json','utf8'));
function clearanceEm(x,z){
  const i = Math.floor((x+EXT)/RES), j = Math.floor((z+EXT)/RES);
  if (i<0||i>=N||j<0||j>=N) return 0;
  return dist[j][i];
}
function medir(WP, passoM){
  const REQ = 2.4;
  let L = 0, ruins = [], piorClar=1e9;
  for (let s = 0; s < WP.length - 1; s++) {
    const [ax,az] = WP[s], [bx,bz] = WP[s+1];
    const seg = Math.hypot(bx-ax, bz-az);
    const passos = Math.max(1, Math.round(seg / (passoM||0.5)));
    for (let k = (s===0?0:1); k <= passos; k++) {
      const t = k / passos, x = ax + (bx-ax)*t, z = az + (bz-az)*t;
      L += seg/passos;
      const c = clearanceEm(x,z);
      if (c<piorClar) piorClar=c;
      if (c < REQ) ruins.push({x:+x.toFixed(1), z:+z.toFixed(1), clar:+c.toFixed(2)});
    }
  }
  return {L, ruins, piorClar};
}
/* rota final: desvia os 5 focos (10.9,2.4) (25,-30.7) (29.4,-26) (26.6,-20.6) (19.3,-2.8)
   com folga extra de 3m em cada um, mantendo o formato geral do laco. */
const WP = [
  [26,26],   /* sai do kartodromo (oeste da pista existente) */
  [16,17],
  [8,5],     /* desvia de (10.9,2.4) por dentro (x menor) */
  [8,-9],
  [9,-19],
  [16,-23],  /* desvia de (26.6,-20.6): passa mais a oeste */
  [21,-29],  /* desvia de (29.4,-26) e de (25,-30.7): entra mais direto no castelo, x menor */
  [28,-33.5],/* chega perto do castelo pelo sul, evitando o anel D_ENCOSTA_TUNEL a oeste */
  [32,-33],  /* ponto de contato com o Castelo */
  /* volta */
  [28,-27],
  [22,-14],
  [16,-1],
  [15,12],
  [20,22],
  [26,26]
];
const r = medir(WP);
const solidos = r.ruins.filter(p=>p.clar===0);
console.log('comprimento:', r.L.toFixed(0)+'m');
console.log('pior clareza:', r.piorClar.toFixed(2)+'m');
console.log('apertados (<2.4m):', r.ruins.length, '· SOLIDOS (0.00m):', solidos.length);
const grupos = [];
solidos.forEach(p => {
  let g = grupos.find(g => Math.hypot(g.x-p.x, g.z-p.z) < 2.5);
  if (g) g.n++; else grupos.push({x:p.x, z:p.z, n:1});
});
console.log('grupos solidos restantes:', grupos.length);
grupos.forEach(g => console.log('  (' + g.x + ', ' + g.z + ')  ' + g.n + ' amostras'));
fs.writeFileSync('rota-final.json', JSON.stringify({WP, comprimento:r.L}));
