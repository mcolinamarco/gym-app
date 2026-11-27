// Single-leg Romanian deadlift, left leg standing, dumbbell in the right hand.
// Keyframes: Mike Robertson video; arms: Prehab Guys. Lean per frame from the balance solver (table.js LEAN),
// arm angles per frame from the clipping solver (table.js ARMS).
import * as THREE from 'three';
import { makeDumbbell, attachGrip } from '../../core/props.js';
import { slrdl, GRIP, paramsAt, depthAt, REP_S, TEMPO } from './poses.js';
import { LEAN, ARMS } from './table.js';

function armsAt(p) {
  const pose = slrdl({ ...paramsAt(p, LEAN), armOut: 0, armOutR: 0 });
  const f = p * (ARMS.length - 1), i = Math.min(ARMS.length - 2, Math.floor(f)), u = f - i, a = ARMS[i].map((v, j) => v + (ARMS[i + 1][j] - v) * u);
  pose.upperarmL.z = a[0]; pose.upperarmR.z = -a[1]; pose.upperarmL.x += a[2]; pose.upperarmR.x += a[3];
  if (a[4]) pose.forearmL = { ...(pose.forearmL || {}), z: (pose.forearmL?.z || 0) + a[4] };
  if (a[5]) pose.forearmR = { ...(pose.forearmR || {}), z: (pose.forearmR?.z || 0) - a[5] };
  return pose;
}

export default {
  id: 'single-leg-rdl', name: 'Single-leg RDL', style: 'Left leg standing', note: 'Video keyframes from Mike Robertson · arms from Prehab Guys',
  aria: '3D figure for the single-leg Romanian deadlift. Drag to rotate, pinch or scroll to zoom.',
  legend: [['Hamstrings', 1], ['Glute max', 1], ['Glute med', 1], ['Adductors', .6], ['Lower back', .5]],
  weights: { hamL: 1, gmaxL: 1, gmedL: .85, addL: .55, erecL: .5, erecR: .5, gastlL: .3, gastmL: .3, hamR: .25, gmaxR: .35, gmedR: .2 },
  curl: 0.55, grip: GRIP, length: REP_S, tempo: TEMPO,
  camera: { pos: [3.1, 1.3, 4.1], target: [0, 0.4, 0], minDistance: 0.8, orbit: { r: 3.6, y: 0.7, cz: 0 } },
  load: 'Dumbbell in the right hand',
  create(rig, material) {
    const db = attachGrip(rig, makeDumbbell(material));
    rig.apply({}, 0.55, GRIP);
    const P = rig.skinned(); let my = 1e9; for (let i = 1; i < P.length; i += 3) my = Math.min(my, P[i]);
    const ground = -my, fw = new THREE.Vector3();
    // the stance foot stays where it is at the top of the rep
    const footAt = pose => { rig.root.position.set(0, 0, 0); rig.apply(pose, 0.55, GRIP); rig.bones[rig.bi.footL].getWorldPosition(fw); return fw.clone(); };
    const footRef = footAt(armsAt(0));
    return {
      attached: [db], placed: [], dumbbells: { R: db }, ground, footRef,
      poseAt: t => armsAt(depthAt(t).p),
      update(t) {
        const d = depthAt(t), f = footAt(armsAt(d.p));
        rig.root.position.set(footRef.x - f.x, footRef.y - f.y + ground, footRef.z - f.z); rig.root.updateMatrixWorld(true);
        return d.phase;
      },
    };
  },
};
