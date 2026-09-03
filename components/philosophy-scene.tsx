'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function PhilosophyScene({ phase = 0 }: { phase?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 7.5;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const world = new THREE.Group();
    scene.add(world);
    const solid = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 2), new THREE.MeshPhysicalMaterial({ color: 0x11130d, roughness: 0.15, metalness: 0.65, clearcoat: 1 }));
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.57, 3), new THREE.MeshBasicMaterial({ color: 0xd9ff43, wireframe: true, transparent: true, opacity: 0.8 }));
    world.add(solid, wire);
    const rings: THREE.Mesh[] = [];
    [2.25, 2.65, 3.05].forEach((radius, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .015 + i * .005, 10, 160), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xf2efe6 : 0xd9ff43, transparent: true, opacity: .48 - i * .08 }));
      ring.rotation.set(Math.PI / 2 + i * .45, i * .65, i * .2);
      rings.push(ring); world.add(ring);
    });
    const starPositions = new Float32Array(120 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = (Math.random() - .5) * 15;
      starPositions[i + 1] = (Math.random() - .5) * 9;
      starPositions[i + 2] = (Math.random() - .5) * 8;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xf2efe6, size: .025, transparent: true, opacity: .55 }));
    scene.add(stars);
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const acidLight = new THREE.PointLight(0xd9ff43, 16, 12); acidLight.position.set(3, 4, 4); scene.add(acidLight);
    const violetLight = new THREE.PointLight(0x6d5cff, 12, 10); violetLight.position.set(-4, -3, 3); scene.add(violetLight);

    let mx = 0, my = 0, frame = 0;
    const onPointer = (event: PointerEvent) => { mx = event.clientX / innerWidth * 2 - 1; my = -(event.clientY / innerHeight * 2 - 1); };
    const onResize = () => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener('pointermove', onPointer); window.addEventListener('resize', onResize);
    const clock = new THREE.Clock();
    const loop = () => {
      const t = clock.getElapsedTime();
      const currentPhase = phaseRef.current;
      const targetScale = [1, .82, 1.28, .62][currentPhase] ?? 1;
      world.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), .035);
      world.rotation.x += ((my * .28 + Math.sin(t * .35) * .06 + currentPhase * .34) - world.rotation.x) * .035;
      world.rotation.y += ((mx * .38 + t * .1 + currentPhase * .5) - world.rotation.y) * .035;
      world.position.x += ((currentPhase === 1 ? 1.5 : currentPhase === 2 ? -1.4 : 0) - world.position.x) * .025;
      world.position.y += ((Math.sin(t * .65) * .12 + (currentPhase === 3 ? .45 : 0)) - world.position.y) * .03;
      rings.forEach((ring, i) => { ring.rotation.z += (.001 + currentPhase * .0007) * (i + 1); ring.scale.setScalar(1 + Math.sin(t * .5 + i + currentPhase) * .025); });
      wire.rotation.z = t * (.045 + currentPhase * .018); solid.rotation.y = -t * .08; stars.rotation.y = t * .006;
      renderer.render(scene, camera); frame = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onPointer); window.removeEventListener('resize', onResize); renderer.dispose(); solid.geometry.dispose(); wire.geometry.dispose(); starGeo.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  return <div ref={host} className="h-full w-full" aria-hidden="true" />;
}
