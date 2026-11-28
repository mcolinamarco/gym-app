// Split squat grounding: puts the front sole on the floor in every keyframe (shifts each frame's root height),
// then sets the bench height so the rear instep rests on the pad, 1 mm clear at its lowest point in the rep.
// Usage: node tools/ground-split-squat.mjs split-squat-upright
import * as THREE from 'three';
import fs from 'fs';
import { Rig, decode } from '../src/core/rig.js';
import { BENCH } from '../src/core/props.js';
const id = process.argv[2], file = `src/exercises/${id}/table.js`;
const { META, BODY } = await import('../src/core/body_c.js');
const { BSS } = await import(`../${file}`);
const rig = new Rig(META, decode(META, BODY)); const GR = { L: true, R: true };
rig.apply({}, 0.55, GR); let P = rig.skinned(); let my = 1e9; for (let i = 1; i < P.length; i += 3) my = Math.min(my, P[i]);
const ground = -my - BSS.ground;            // same as the page
const front = [], rear = [];
for (let i = 0; i < rig.d.nv; i++) { const n = rig.names[rig.dom[i]]; if (n === 'footL' || n === 'toesL') front.push(i); if (n === 'footR' || n === 'toesR') rear.push(i); }
let rearMin = 9;
for (const fr of BSS.frames) {
  rig.apply(fr.pose, 0.55, GR); rig.root.position.set(fr.root[0], fr.root[1] + ground, fr.root[2]); rig.root.updateMatrixWorld(true); P = rig.skinned();
  let f = 9, r = 9; for (const i of front) f = Math.min(f, P[i * 3 + 1]); for (const i of rear) r = Math.min(r, P[i * 3 + 1]);
  fr.root[1] = +(fr.root[1] - f).toFixed(5); rearMin = Math.min(rearMin, r - f);
}
const benchTop0 = ground + BSS.ground + BENCH.top;         // pad top before
BSS.benchShift = +((rearMin - 0.001) - benchTop0).toFixed(5);
fs.writeFileSync(file, 'export const BSS = ' + JSON.stringify(BSS) + ';\n');
console.log(id, 'front sole grounded in', BSS.frames.length, 'frames; bench pad moved', (BSS.benchShift * 1000).toFixed(1), 'mm; pad top now', ((benchTop0 + BSS.benchShift) * 100).toFixed(1), 'cm');
