// Bulgarian split squat, forward-lean style (more glutes). Keyframes: Bret Contreras video, arms: E3 Rehab.
import { splitSquat } from '../split-squat-common.js';
import { BSS } from './table.js';
export default splitSquat({
  id: 'split-squat-lean', style: 'Forward-lean style (more glutes)', note: 'Arms from E3 Rehab reference · left leg working',
  table: BSS,
  weights: { rfL: .8, vlL: .8, vmL: .8, gmaxL: 1, addL: .7, gmedL: .6, hamL: .35, gastlL: .2, gastmL: .2, rfR: .35, erecL: .25, erecR: .25 },
});
