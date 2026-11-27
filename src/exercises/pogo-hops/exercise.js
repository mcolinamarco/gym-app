// Pogo hops, hands on hips, low effort (3/10). Measured from The Irish Physio TV.
// One hop = 0.4 s (2.5 hops/s), feet on the floor for the first 0.17 s.
import { sampleLoop } from '../../core/motion.js';
import { POGO } from './table.js';

const CURL = POGO.curl ?? 0.2;

export default {
  id: 'pogo-hops', name: 'Pogo hops', style: 'Low effort (3/10)', note: 'From The Irish Physio TV · hands on hips',
  aria: '3D figure doing pogo hops. Drag to rotate, pinch or scroll to zoom.',
  legend: [['Calves and Achilles', 1], ['Quads', .5], ['Shin (landing prep)', .45], ['Glutes', .4]],
  // calves/Achilles do the spring work; quads and glutes brace the knee and hip (judgement)
  weights: { gastm: 1, gastl: 1, sol: 1, tib: .35, rf: .4, vl: .4, vm: .4, gmax: .3 },
  curl: CURL, grip: {}, length: POGO.per,
  timeDigits: 2, scrubLabel: 'Hop', scrubAria: 'Scrub through one hop',
  speeds: [['Real speed', 1], ['½×', 0.5], ['¼×', 0.25]],
  camera: { pos: [-3.9, 1.5, 1.4], target: [0, 0.85, 0], minDistance: 0.6, orbit: { r: 3.6, y: 0.9, cz: 0 } },
  load: 'Bodyweight',
  create(rig) {
    const frameAt = t => sampleLoop(POGO.frames, POGO.per, t);
    const phase = t => (((t % POGO.per) + POGO.per) % POGO.per) < POGO.tc ? 'Feet on the floor' : 'In the air';
    return {
      attached: [], placed: [], contactTime: POGO.tc,
      poseAt: t => frameAt(t).pose,
      update(t) {
        const fr = frameAt(t); rig.apply(fr.pose, CURL, {}); rig.root.position.set(...fr.root); rig.root.updateMatrixWorld(true);
        return phase(t);
      },
    };
  },
};
