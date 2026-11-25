/* El Ocotal: photoreal roasted coffee bean, built in code with Three.js (r158, global THREE).
   Shape comes from the mesh; wrinkles, pores, chaff and roast mottling are computed per pixel. */
(function () {
  const stage = document.getElementById('bean');
  if (!stage) return;
  if (!window.THREE) { stage.classList.add('nogl'); return; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- CPU noise for the large-scale shape ---------- */
  function hash(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
             l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  function fbm(x, y, z, o = 4) { let a = .5, f = 1, s = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= .5; } return s; }
  const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  /* ---------- bean shape ----------
     ~10 x 7 x 4 mm proportions: flat face with two rolled halves meeting in a deep S-shaped slit,
     domed back, one end a touch narrower. aCrease marks the slit for the shader. */
  function beanGeometry(seg, seed) {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * .55));
    const p = g.attributes.position, n = p.count;
    const col = new Float32Array(n * 3), crease = new Float32Array(n);
    const roast = new THREE.Color('#4e2c16'), deep = new THREE.Color('#26140a'), warm = new THREE.Color('#6e4120'), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = y, along = Math.max(0, 1 - t * t);
      const W = .82 * (1 - .05 * t);
      let X = x * W, Y = y * 1.2;
      let Z = z > 0 ? .37 * Math.pow(z, .68) : -.6 * Math.pow(-z, .8);
      const front = ss(.02, .3, z);
      const cx = (.06 * Math.sin(t * 2.7 + seed) + .035 * t * t * t) * W;
      const dX = X - cx;
      const ext = ss(0, .16, along);
      const roll = Math.exp(-Math.pow(dX / .17, 2));
      const slit = Math.exp(-Math.pow(dX / .024, 2));
      Z -= front * ext * (.075 * roll + .19 * slit * Math.pow(along, .35));
      const n1 = fbm(x * 2.2 + seed, y * 2.2, z * 2.2), n2 = fbm(x * 7 + seed, y * 7, z * 7, 3);
      const r = 1 + (n1 - .5) * .05 + (n2 - .5) * .012;
      p.setXYZ(i, X * r, Y * r, Z * r);
      crease[i] = front * ext * slit;
      c.copy(roast).lerp(warm, Math.max(0, (n1 - .42) * 1.5)).lerp(deep, Math.min(1, (1 - along) * .45 + Math.pow(1 - Math.abs(z), 6) * .25));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aCrease', new THREE.BufferAttribute(crease, 1));
    g.computeVertexNormals();
    return g;
  }

  /* ---------- per-pixel surface ---------- */
  const GLSL = `
  varying vec3 vObj; varying float vCrease;
  uniform mat3 normalMatrix;
  uniform float uDetail;
  float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
  // roasted skin: fine wrinkles running across the bean, micro-grain, tiny pores, fibres in the slit
  float beanHeight(vec3 p){
    float r=1.-abs(fbm3(p*vec3(8.,20.,8.)+3.)*2.-1.); r*=r;
    float big=fbm3(p*3.5);
    float fine=fbm3(p*55.);
    float pore=smoothstep(.72,.9,n3(p*130.));
    float fib=fbm3(p*vec3(110.,7.,110.));
    return uDetail*(r*.009 + big*.009 + fine*.0012 - pore*.0022) + vCrease*fib*.008;
  }`;

  function beanMaterial(detail) {
    const m = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: .44, metalness: 0,
      clearcoat: .22, clearcoatRoughness: .28,
      sheen: .35, sheenRoughness: .45, sheenColor: new THREE.Color('#a0683a'),
      envMapIntensity: .6,
    });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uDetail = { value: detail };
      sh.vertexShader = 'attribute float aCrease;\nvarying vec3 vObj; varying float vCrease;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position; vCrease = aCrease;');
      sh.fragmentShader = GLSL + '\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            float m=fbm3(vObj*4.+7.);
            float r=1.-abs(fbm3(vObj*vec3(8.,20.,8.)+3.)*2.-1.);
            float speck=smoothstep(.62,.8,n3(vObj*38.));
            diffuseColor.rgb*=mix(.74,1.14,m)*mix(.84,1.04,r*r)*mix(1.,1.12,speck*.5);
            vec3 chaff=vec3(.40,.25,.12)*mix(.65,1.15,fbm3(vObj*vec3(120.,6.,120.)));
            float cw=smoothstep(.25,.75,vCrease);
            diffuseColor.rgb=mix(diffuseColor.rgb,chaff,cw*.9);
            diffuseColor.rgb*=1.-.75*smoothstep(.86,1.,vCrease);
          }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor=clamp(roughnessFactor+(fbm3(vObj*9.)-.5)*.28+smoothstep(.25,.75,vCrease)*.4,.05,1.);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            float e=.0012; float h0=beanHeight(vObj);
            vec3 gO=vec3(beanHeight(vObj+vec3(e,0.,0.))-h0, beanHeight(vObj+vec3(0.,e,0.))-h0, beanHeight(vObj+vec3(0.,0.,e))-h0)/e;
            vec3 gV=normalMatrix*gO;
            normal=normalize(normal-(gV-dot(gV,normal)*normal));
          }`);
    };
    return m;
  }

  function studio() {
    const s = new THREE.Scene(), box = new THREE.BoxGeometry();
    const room = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x1e1a16, side: THREE.BackSide })); room.scale.set(14, 10, 14); s.add(room);
    [[-2, 4.6, 2, 5, .2, 4, 3.2], [-6.8, 1, 2, .2, 4, 5, 2], [6.8, 2, -3, .2, 3, 3, 1.4], [0, 1.5, 6.8, 6, 2.5, .2, 1.1]].forEach(([x, y, z, sx, sy, sz, k]) => {
      const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .9, .76).multiplyScalar(k) }));
      m.position.set(x, y, z); m.scale.set(sx, sy, sz); s.add(m);
    });
    return s;
  }

  function makeRenderer(cls) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    if (!r.getContext()) throw new Error('no webgl');
    r.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.className = cls;
    const pm = new THREE.PMREMGenerator(r);
    return { r, env: pm.fromScene(studio(), .04).texture };
  }

  function lights(scene, shadows) {
    const key = new THREE.DirectionalLight('#ffe1b8', 3.0); key.position.set(-2.5, 4, 4.5); scene.add(key);
    const rim = new THREE.DirectionalLight('#e0b46a', 4.2); rim.position.set(4, 1.2, -3.5); scene.add(rim);
    const bounce = new THREE.DirectionalLight('#6b3a1a', 1.1); bounce.position.set(0, -5, 2); scene.add(bounce);
    if (shadows) {
      key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 1, far: 12 });
      key.shadow.bias = -.0004; key.shadow.normalBias = .012; key.shadow.radius = 3;
    }
  }

  try {
    const front = makeRenderer('bean-front'), back = makeRenderer('bean-back');
    front.r.shadowMap.enabled = true; front.r.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.prepend(front.r.domElement); stage.prepend(back.r.domElement);

    const camera = new THREE.PerspectiveCamera(28, 1, .1, 100); camera.position.set(0, 0, 5.5);

    // hero bean
    const scene = new THREE.Scene(); scene.environment = front.env; lights(scene, true);
    const main = new THREE.Mesh(beanGeometry(innerWidth < 700 ? 300 : 420, .3), beanMaterial(1));
    main.castShadow = main.receiveShadow = true;
    const pivot = new THREE.Group(); pivot.add(main); scene.add(pivot);
    main.rotation.set(-.15, -.5, 0); pivot.rotation.z = -.5;

    // out-of-focus beans behind (separate canvas, blurred with CSS for depth of field)
    const bgScene = new THREE.Scene(); bgScene.environment = back.env; lights(bgScene, false);
    const smallGeo = beanGeometry(110, 2.1), smallMat = beanMaterial(.6);
    const smalls = [[-1.5, 1.35, -2.2, .24], [1.4, -1.35, -1.4, .27], [1.35, 1.5, -3.4, .2], [-1.35, -1.45, -2.8, .22]].map(([x, y, z, s], i) => {
      const m = new THREE.Mesh(smallGeo, smallMat); m.position.set(x, y, z); m.scale.setScalar(s);
      m.rotation.set(i, i * 1.7, i * .6); m.userData = { sx: .15 + i * .05, sy: .2 + i * .04, ph: i * 1.3, y }; bgScene.add(m); return m;
    });

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      front.r.setSize(w, h, false); back.r.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(stage); resize();

    // drag to spin with inertia; gentle tilt toward the pointer
    let vel = reduce ? 0 : .32, velX = 0, dragging = false, lx = 0, ly = 0, tiltX = 0, tiltY = 0;
    stage.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', e => {
      const b = stage.getBoundingClientRect(); tiltY = ((e.clientX - b.left) / b.width - .5) * .3; tiltX = ((e.clientY - b.top) / b.height - .5) * .3;
      if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      main.rotation.y += dx * .012; main.rotation.x += dy * .008; vel = dx * .7; velX = dy * .4;
    });
    const end = () => { dragging = false; };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('pointerleave', () => { tiltX = tiltY = 0; });

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

    const clock = new THREE.Clock(); let t = 0;
    (function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), .05); t += dt;
      if (!dragging) {
        const base = reduce ? 0 : .32; vel += (base - vel) * dt * 1.5; velX *= 1 - dt * 3;
        main.rotation.y += vel * dt; main.rotation.x += velX * dt * .02; main.rotation.x += (-.15 - main.rotation.x) * dt * .8;
      }
      pivot.rotation.x += (tiltX - pivot.rotation.x) * dt * 3; pivot.rotation.y += (tiltY - pivot.rotation.y) * dt * 3;
      if (!reduce) {
        pivot.position.y = Math.sin(t * .9) * .05;
        smalls.forEach(m => { const u = m.userData; m.rotation.x += u.sx * dt; m.rotation.y += u.sy * dt; m.position.y = u.y + Math.sin(t * .6 + u.ph) * .08; });
      }
      back.r.render(bgScene, camera);
      front.r.render(scene, camera);
    })();
    window.__bean = { main, pivot, camera, render: () => { back.r.render(bgScene, camera); front.r.render(scene, camera); } };
  } catch (err) {
    stage.classList.add('nogl'); console.warn('3D bean unavailable:', err);
  }
})();
