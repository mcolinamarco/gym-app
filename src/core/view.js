// Renderer: toon fill, orange muscle shading, muscle contour lines, screen-space outlines.
import * as THREE from 'three';
import { MUSCLES } from './rig.js';
import { buildStrokes } from './strokes.js';

export const C = { bg: 0x262624, ink: 0xE8E6DC, fill: 0x4D4B46, or: 0xD97757, grid: 0x3A3935 };

export function createView(canvas, rig, opt = {}) {
  const PR = opt.pr || Math.min(devicePixelRatio, 2);
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(PR); R.setClearColor(C.bg); R.autoClear = false;
  const S = new THREE.Scene();
  S.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(2, 4, 3); S.add(dl);
  const grid = new THREE.Group(); S.add(grid);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.56, 64), new THREE.MeshBasicMaterial({ color: C.grid })); ring.rotation.x = -Math.PI / 2; grid.add(ring);
  const gh = new THREE.GridHelper(4, 16, C.grid, C.grid); gh.material.transparent = true; gh.material.opacity = .35; grid.add(gh);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 50);

  // geometry attributes: muscle masks (6 x vec4), face flag, highlight
  const g = rig.geo, nv = rig.d.nv;
  const SK = buildStrokes(rig, 12); SK.attrs.forEach((a, k) => g.setAttribute('aS' + k, new THREE.BufferAttribute(a, 4)));
  console.log('strokes', SK.count, 'dropped', SK.dropped);
  g.setAttribute('aFace', new THREE.BufferAttribute(Float32Array.from(rig.face), 1));
  const hi = new THREE.BufferAttribute(new Float32Array(nv), 1); g.setAttribute('aHi', hi);

  const grad = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 165, 165, 165, 255, 230, 230, 230, 255]), 3, 1);
  grad.needsUpdate = true; grad.minFilter = grad.magFilter = THREE.NearestFilter;
  const U = { uOr: { value: new THREE.Color(C.or) }, uInk: { value: new THREE.Color(C.ink) }, uLine: { value: opt.lines ?? 0.55 } };
  const body = new THREE.MeshToonMaterial({ color: C.fill, gradientMap: grad });
  body.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aHi,aFace;attribute vec4 aS0,aS1,aS2,aS3,aS4,aS5;varying float vHi,vFace;varying vec4 vS0,vS1,vS2,vS3,vS4,vS5;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHi=aHi;vFace=aFace;vS0=aS0;vS1=aS1;vS2=aS2;vS3=aS3;vS4=aS4;vS5=aS5;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uOr,uInk;uniform float uLine;varying float vHi,vFace;varying vec4 vS0,vS1,vS2,vS3,vS4,vS5;
float stk(vec4 a){vec2 s=a.xz;vec2 f=a.yw;vec2 w=max(fwidth(s),vec2(1e-6));vec2 wd=mix(vec2(0.05),vec2(0.45),f);vec2 l=(1.0-smoothstep(wd,wd+0.75,abs(s)/w))*smoothstep(vec2(0.12),vec2(0.35),f);return max(l.x,l.y);}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( mix(diffuse,uOr,vHi), opacity );')
      .replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + uOr*vHi*0.35;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
float ln=max(max(stk(vS0),stk(vS1)),max(max(stk(vS2),stk(vS3)),max(stk(vS4),stk(vS5))));
gl_FragColor.rgb=mix(gl_FragColor.rgb,uInk,ln*uLine);`);
  };
  rig.mesh.material = body;
  S.add(rig.root);

  // prepass: view normal + linear depth (negative on the face, where only the silhouette is drawn)
  const pre = new THREE.ShaderMaterial({
    vertexShader: `#include <common>
#include <skinning_pars_vertex>
attribute float aFace;varying vec3 vN;varying float vD;varying float vF;
void main(){
#include <beginnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <begin_vertex>
#include <skinning_vertex>
vec4 mv=modelViewMatrix*vec4(transformed,1.0);vN=normalize(normalMatrix*objectNormal);vD=-mv.z;vF=aFace;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vN;varying float vD;varying float vF;void main(){gl_FragColor=vec4(normalize(vN)*0.5+0.5,vF>0.5?-vD:vD);}`
  });
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const edge = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { tN: { value: rt.texture }, uPx: { value: new THREE.Vector2() }, uInk: U.uInk },
    vertexShader: 'varying vec2 vUv;void main(){vUv=position.xy*0.5+0.5;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: `uniform sampler2D tN;uniform vec2 uPx;uniform vec3 uInk;varying vec2 vUv;
vec4 S(vec2 o){return texture2D(tN,vUv+o*uPx);}
void main(){vec4 c=S(vec2(0));float dc=abs(c.w);vec3 nc=c.xyz*2.0-1.0;float e=0.0;
for(int i=0;i<8;i++){vec2 o=i==0?vec2(1,0):i==1?vec2(-1,0):i==2?vec2(0,1):i==3?vec2(0,-1):i==4?vec2(.7,.7):i==5?vec2(-.7,.7):i==6?vec2(.7,-.7):vec2(-.7,-.7);
vec4 s=S(o);float ds=abs(s.w);float de=abs(dc-ds)/min(dc,ds);float ed=smoothstep(0.012,0.03,de);if(c.w<0.0&&s.w<0.0)ed=0.0;e=max(e,ed);
bool face=c.w<0.0||s.w<0.0;vec3 ns=s.xyz*2.0-1.0;float ne=smoothstep(0.32,0.5,1.0-dot(nc,ns));if(!face&&ds<900.0&&dc<900.0)e=max(e,ne);}
if(e<0.01)discard;gl_FragColor=vec4(uInk,e);}`
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edge); quad.frustumCulled = false;
  const qs = new THREE.Scene(); qs.add(quad); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const res = new THREE.Vector2();
  function size(w, h) {
    R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < 600 ? 42 : 32; cam.updateProjectionMatrix();
    R.getDrawingBufferSize(res); rt.setSize(res.x, res.y); edge.uniforms.uPx.value.set(PR * 0.85 / res.x, PR * 0.85 / res.y);
  }
  function render() {
    rig.root.updateMatrixWorld(true);
    R.setRenderTarget(rt); R.setClearColor(0x8080ff, 1000); R.clear();
    rig.mesh.material = pre; props.forEach(o => o.material = pre); grid.visible = false; R.render(S, cam);
    rig.mesh.material = body; props.forEach(o => o.material = propMat); grid.visible = true;
    R.setRenderTarget(null); R.setClearColor(C.bg, 1); R.clear(); R.render(S, cam);
    R.render(qs, qc);
  }
  function setHighlight(weights, amt = 0.75, pulse = 1) {
    const a = hi.array; a.fill(0);
    for (const key in weights) {
      const side = key.endsWith('L') ? 1 : key.endsWith('R') ? -1 : 0; const m = rig.masks[side ? key.slice(0, -1) : key]; if (!m) continue;
      const k = weights[key] * amt * pulse;
      for (let i = 0; i < nv; i++) { if (side && rig.side[i] !== side) continue; const mm = m[i] < 0.3 ? 0 : m[i] > 0.7 ? 1 : (m[i] - 0.3) / 0.4; const v = mm * mm * (3 - 2 * mm) * k; if (v > a[i]) a[i] = v; }
    }
    hi.needsUpdate = true;
  }
  const props = [];
  const propMat = new THREE.MeshToonMaterial({ color: 0x3E3D39, gradientMap: grad });
  function addProp(obj) { obj.traverse(o => { if (o.isMesh) { o.material = propMat; props.push(o); } }); }
  return { R, S, cam, size, render, setHighlight, U, addProp, propMat };
}
