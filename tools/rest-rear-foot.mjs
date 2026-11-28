// Split squat: lets the rear instep rest on the bench pad (1 mm clear) in every keyframe by a small
// ankle plantarflex/dorsiflex change, with the toe joint turned back the same amount so the toes stay flat.
// Run after ground-split-squat.mjs. Usage: node tools/rest-rear-foot.mjs split-squat-upright
import fs from 'fs';
import { Rig, decode } from '../src/core/rig.js';
import { BENCH } from '../src/core/props.js';
const id = process.argv[2], file = `src/exercises/${id}/table.js`;
const { META, BODY } = await import('../src/core/body_c.js');
const { BSS } = await import(`../${file}`);
const rig = new Rig(META, decode(META, BODY)); const GR = { L: true, R: true };
rig.apply({}, 0.55, GR); let P = rig.skinned(); let my = 1e9; for (let i = 1; i < P.length; i += 3) my = Math.min(my, P[i]);
const ground = -my - BSS.ground, pad = ground + BSS.ground + BSS.benchShift + BENCH.top;
const rear = []; for (let i = 0; i < rig.d.nv; i++) if (/^(footR|toesR)$/.test(rig.names[rig.dom[i]])) rear.push(i);
function gap(fr, d) {
  const pose = structuredClone(fr.pose); pose.footR = { ...pose.footR, x: (pose.footR?.x || 0) + d }; pose.toesR = { ...pose.toesR, x: Math.max(0, (pose.toesR?.x || 0) - d) };
  rig.apply(pose, 0.55, GR); rig.root.position.set(fr.root[0], fr.root[1] + ground, fr.root[2]); rig.root.updateMatrixWorld(true); P = rig.skinned();
  let r = 9; for (const i of rear) r = Math.min(r, P[i * 3 + 1]); return { g: r - pad, pose };
}
let maxD = 0;
for (const fr of BSS.frames) {
  if (gap(fr, 0).g <= 0.0015) continue;
  // the sign that lowers the foot: try both, bisect on the one that reduces the gap
  const s = gap(fr, 0.02).g < gap(fr, -0.02).g ? 1 : -1; let lo = 0, hi = 0.15;
  for (let it = 0; it < 20; it++) { const m = (lo + hi) / 2; if (gap(fr, s * m).g > 0.001) lo = m; else hi = m; }
  const d = s * lo; fr.pose = gap(fr, d).pose; maxD = Math.max(maxD, Math.abs(d));
}
fs.writeFileSync(file, 'export const BSS = ' + JSON.stringify(BSS) + ';\n');
console.log(id, 'largest ankle change', (maxD * 57.3).toFixed(1) + '°');
