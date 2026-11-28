// Shared exercise player: one body, one renderer, one set of controls for every exercise.
// An exercise module supplies only its data (keyframes, props, tempo, muscle weights, camera).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Rig, decode } from './rig.js';
import { createView, C } from './view.js';

const $ = id => document.getElementById(id);

// skeleton overlay (main joints only)
function skeleton(rig) {
  const sk = new THREE.Group(); const jm = new THREE.MeshBasicMaterial({ color: C.or, depthTest: false });
  const main = rig.bones.filter(b => !/^f\d/.test(b.name)), pairs = [];
  const dots = main.map(b => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), jm); d.renderOrder = 10; sk.add(d); return [b, d]; });
  main.forEach(b => { if (b.parent && b.parent.isBone) pairs.push([b.parent, b]); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs.length * 6), 3));
  const ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C.or, depthTest: false, transparent: true, opacity: .8 })); ln.renderOrder = 9; sk.add(ln);
  const tv = new THREE.Vector3();
  sk.update = () => { dots.forEach(([b, d]) => b.getWorldPosition(d.position)); const a = lg.attributes.position.array; pairs.forEach(([p, c], i) => { p.getWorldPosition(tv); a.set([tv.x, tv.y, tv.z], i * 6); c.getWorldPosition(tv); a.set([tv.x, tv.y, tv.z], i * 6 + 3); }); lg.attributes.position.needsUpdate = true; };
  return sk;
}

// Fill the page text, legend and speed buttons from the exercise data.
function fillPage(ex) {
  document.title = ex.name;
  $('c').setAttribute('aria-label', ex.aria);
  $('name').textContent = ex.name;
  $('style').textContent = [ex.style, ex.note].filter(Boolean).join(' · ');
  $('legend').innerHTML = '';
  for (const [label, op] of ex.legend) { const d = document.createElement('div'); d.textContent = label + ' '; const i = document.createElement('i'); if (op < 1) i.style.opacity = op; d.append(i); $('legend').append(d); }
  const speeds = ex.speeds || [['0.5×', 0.5], ['1×', 1]];
  $('speeds').innerHTML = '';
  for (const [label, val] of speeds) { const b = document.createElement('button'); b.textContent = label; b.dataset.speed = val; b.setAttribute('aria-pressed', val === 1); $('speeds').append(b); }
  $('scrubLabel').firstChild.textContent = (ex.scrubLabel || 'Rep') + ' ';
  $('scrub').setAttribute('aria-label', ex.scrubAria || 'Scrub through the rep');
}

export async function play(ex) {
  const q = new URLSearchParams(location.search);
  const digits = ex.timeDigits ?? 1, LEN = ex.length;
  fillPage(ex);
  $('tO').textContent = (0).toFixed(digits) + 's';
  const { META, BODY } = await import('./body_c.js');
  const rig = new Rig(META, decode(META, BODY));
  if (ex.prepareRig) ex.prepareRig(rig);
  const v = createView($('c'), rig);
  const sk = skeleton(rig); v.S.add(sk); sk.visible = false;
  const inst = ex.create(rig, v.propMat);
  for (const o of inst.attached) v.addProp(o);
  for (const o of inst.placed) { v.S.add(o); v.addProp(o); }

  const cam = ex.camera, az = q.get('az');
  v.cam.position.set(...cam.pos);
  const o = cam.orbit; if (az) { const z = +az; v.cam.position.set(Math.sin(z) * o.r, +(q.get('el') || o.y), o.cz + Math.cos(z) * o.r); }
  const ctl = new OrbitControls(v.cam, $('c')); ctl.target.set(cam.target[0], +(q.get('ty') || cam.target[1]), cam.target[2]);
  ctl.enableDamping = true; ctl.minDistance = cam.minDistance; ctl.maxDistance = 8; ctl.autoRotate = !az; ctl.autoRotateSpeed = 1.2; ctl.maxPolarAngle = Math.PI * 0.62;
  if (q.get('d')) v.cam.position.sub(ctl.target).setLength(+q.get('d')).add(ctl.target);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || az) { ctl.autoRotate = false; $('tRot').setAttribute('aria-pressed', false); }
  const size = () => v.size(innerWidth, innerHeight); addEventListener('resize', size); size();

  let musOn = true, pulse = false, amt = .75, skelOn = false, playing = true, speed = 1, tRep = 0, lastNow = 0, scrubbing = false;
  const sc = $('scrub');
  $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; $('play').setAttribute('aria-pressed', playing); };
  const spBtns = [...$('speeds').children];
  spBtns.forEach(b => b.onclick = () => { speed = +b.dataset.speed; spBtns.forEach(x => x.setAttribute('aria-pressed', x === b)); });
  sc.addEventListener('input', () => { scrubbing = true; tRep = sc.value / 1000 * LEN; if (playing) $('play').click(); });
  sc.addEventListener('change', () => { scrubbing = false; });
  if (q.get('t')) { tRep = +q.get('t'); playing = false; $('play').textContent = 'Play'; $('play').setAttribute('aria-pressed', false); }
  const tog = (id, fn) => { const b = $(id); b.onclick = () => { const x = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', x); fn(x); }; };
  tog('tMus', x => { musOn = x; $('legend').style.opacity = x ? 1 : .3; });
  tog('tPulse', x => pulse = x); tog('tSkel', x => skelOn = x); tog('tRot', x => ctl.autoRotate = x);
  $('amt').oninput = e => { amt = e.target.value / 100; $('amtO').textContent = e.target.value; };
  $('load').remove();
  let last = -1;
  const loop = now => {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; lastNow = now;
    if (playing) tRep = (tRep + dt * speed) % LEN;
    $('phase').textContent = inst.update(tRep);
    if (!scrubbing) sc.value = Math.round(tRep / LEN * 1000); $('tO').textContent = tRep.toFixed(digits) + 's';
    const p = pulse ? 0.55 + 0.45 * Math.sin(now / 520) : 1; const key = musOn ? amt * p : 0;
    if (key !== last) { v.setHighlight(musOn ? ex.weights : {}, amt, p); last = key; }
    sk.visible = skelOn; if (skelOn) sk.update();
    ctl.update(); v.render(); window.__ready = true; requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
