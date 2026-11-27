// Bulgarian split squat, upright style (more quads). Keyframes: Bret Contreras video, arms: E3 Rehab.
import { splitSquat } from '../split-squat-common.js';
import { BSS } from './table.js';
export default splitSquat({
  id: 'split-squat-upright', style: 'Upright style (more quads)', note: 'Arms from E3 Rehab reference · left leg working',
  table: BSS,
  weights: { rfL: 1, vlL: 1, vmL: 1, gmaxL: .75, addL: .7, gmedL: .6, hamL: .2, gastlL: .2, gastmL: .2, rfR: .35, erecL: .25, erecR: .25 },
});
