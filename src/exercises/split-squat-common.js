// Shared setup for the two Bulgarian split squat styles (same props, tempo and camera; different keyframes).
import { makeDumbbell, attachGrip, makeBench } from '../core/props.js';
import { repDepth, repLength, sampleRep } from '../core/motion.js';

const TEMPO = [['Top', 0.5], ['Lowering', 2.5], ['Bottom', 0.4], ['Rising', 1.6]];

export function splitSquat({ id, style, note, table, weights }) {
  const GRIP = { L: true, R: true };
  return {
    id, name: 'Bulgarian split squat', style, note,
    aria: '3D figure for the Bulgarian split squat. Drag to rotate, pinch or scroll to zoom.',
    legend: [['Quads', 1], ['Glute max', 1], ['Adductors', .7], ['Glute med', .6], ['Hip flexor stretch (rear)', .35]],
    weights, curl: 0.55, grip: GRIP,
    length: repLength(TEMPO), tempo: TEMPO,
    camera: { pos: [-3.9, 1.7, 2.9], target: [0, 0.5, -0.3], minDistance: 0.8, orbit: { r: 3.6, y: 0.7, cz: -0.35 } },
    load: 'Dumbbell in each hand',
    create(rig, material) {
      const dumbbells = {};
      for (const s of ['L', 'R']) dumbbells[s] = attachGrip(rig, makeDumbbell(material), s);
      rig.apply({}, 0.55, GRIP);
      const P = rig.skinned(); let my = 1e9; for (let i = 1; i < P.length; i += 3) my = Math.min(my, P[i]);
      const ground = -my - table.ground;
      const bench = makeBench(material, table.benchX, table.benchFront); bench.position.y = ground + table.ground + (table.benchShift || 0);
      const frameAt = t => { const d = repDepth(TEMPO, t); return { ...sampleRep(table.frames, d.p), phase: d.phase, p: d.p }; };
      return {
        attached: Object.values(dumbbells), placed: [bench], dumbbells, bench, ground,
        poseAt: t => frameAt(t).pose,
        update(t) {
          const fr = frameAt(t);
          rig.apply(fr.pose, 0.55, GRIP); rig.root.position.set(fr.root[0], fr.root[1] + ground, fr.root[2]); rig.root.updateMatrixWorld(true);
          return fr.phase;
        },
      };
    },
  };
}
