import { useEffect, useRef } from "react";
import {
  BoxGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  TorusGeometry,
  WebGLRenderer,
} from "three";

// One small scene for the featured loading image, never one renderer per tile.
export default function MemoryScene({
  onReady,
  onUnavailable,
}: {
  onReady: () => void;
  onUnavailable: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(160, 160, false);
    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 30);
    camera.position.set(0, 0, 5.1);
    scene.add(new HemisphereLight(0xfffbef, 0x725436, 2.8));
    const light = new DirectionalLight(0xffffff, 4);
    light.position.set(2, 3, 5);
    scene.add(light);
    const gold = new MeshStandardMaterial({
      color: 0xc39a59,
      metalness: 0.7,
      roughness: 0.3,
    });
    const cream = new MeshStandardMaterial({
      color: 0xfff8eb,
      metalness: 0.1,
      roughness: 0.45,
    });
    const latte = new MeshStandardMaterial({
      color: 0xd9bd90,
      metalness: 0.25,
      roughness: 0.5,
    });
    const postcard = new Group();
    postcard.add(new Mesh(new BoxGeometry(1.14, 1.38, 0.09), cream));
    const photo = new Mesh(new BoxGeometry(0.94, 0.94, 0.025), latte);
    photo.position.set(0, 0.09, 0.065);
    postcard.add(photo);
    const seal = new Mesh(new TorusGeometry(0.19, 0.027, 6, 32), gold);
    seal.position.set(0.17, 0.22, 0.09);
    postcard.add(seal);
    const orbit = new Mesh(new TorusGeometry(1.05, 0.018, 6, 64), gold);
    orbit.rotation.set(1.05, 0.4, -0.4);
    scene.add(postcard, orbit);
    const start = performance.now();
    let frame = 0;
    let previous = 0;
    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      if (now - previous < 1000 / 30) return;
      previous = now;
      const time = (now - start) / 1000;
      postcard.rotation.set(
        Math.sin(time * 0.8) * 0.16,
        Math.sin(time * 0.65) * 0.5,
        -0.13,
      );
      postcard.position.y = Math.sin(time * 1.3) * 0.08;
      orbit.rotation.z = time * 0.3 - 0.4;
      renderer.render(scene, camera);
    }
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(animate);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      onUnavailable();
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    document.addEventListener("visibilitychange", visibility);
    renderer.render(scene, camera);
    onReady();
    visibility();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      gold.dispose();
      cream.dispose();
      latte.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [onReady, onUnavailable]);
  return (
    <canvas
      className="memory-loader__canvas"
      ref={canvasRef}
      aria-hidden="true"
    />
  );
}
