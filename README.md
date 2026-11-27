# Gym App

Interactive 3D exercise animations for runners (stress-fracture prevention).

Open `index.html` to pick an exercise. Each exercise plays on `exercise.html?ex=<id>`.
No build step: it is a static site.

## Layout

- `src/core/` is shared by every exercise, so a change here applies to all of them:
  - `body_c.js` the body model (MakeHuman CC0, "Option C"), `rig.js` skeleton, posing and muscle masks,
    `view.js` renderer (toon fill, outlines, muscle shading), `strokes.js` anatomical lines,
    `props.js` dumbbell and bench, `props-barbell.js` barbell, floor plate and taller bench,
    `motion.js` tempo and keyframe sampling, `player.js` the page controls and animation loop.
- `src/exercises/<id>/` holds one exercise each: `exercise.js` (name, muscle weights, tempo, props, camera)
  and `table.js` (keyframes measured from the coach video).
- `src/exercises/index.js` is the list shown on the home page.
- `vendor/three/` is three.js 0.160.0, served from the site so it doesn't depend on a CDN.
- `tools/check.mjs` re-checks every exercise using the exact poses the app shows:
  self-clipping, props, floor and balance.

## Checks

```
npm install
npm run check                 # all exercises
npm run check -- pogo-hops    # one exercise
```

## Run locally

```
npm run serve     # then open http://localhost:5173
```
