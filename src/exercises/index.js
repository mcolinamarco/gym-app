// The exercise list shown on the home page. Each entry loads its own small module.
export const EXERCISES = [
  { id: 'split-squat-upright', name: 'Bulgarian split squat', style: 'Upright (more quads)', load: () => import('./split-squat-upright/exercise.js') },
  { id: 'split-squat-lean', name: 'Bulgarian split squat', style: 'Forward lean (more glutes)', load: () => import('./split-squat-lean/exercise.js') },
  { id: 'single-leg-rdl', name: 'Single-leg RDL', style: 'Dumbbell, left leg standing', load: () => import('./single-leg-rdl/exercise.js') },
  { id: 'pogo-hops', name: 'Pogo hops', style: 'Hands on hips, low effort', load: () => import('./pogo-hops/exercise.js') },
  { id: 'seated-calf-raise', name: 'Seated calf raise', style: 'Barbell on the knees', load: () => import('./seated-calf-raise/exercise.js') },
];
