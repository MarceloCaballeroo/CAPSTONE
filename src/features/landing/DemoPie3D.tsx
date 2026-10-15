"use client";

import { useEffect, useRef, useState } from "react";
import { nombreZona } from "@/lib/types/hallazgos";

export type ZonaCalor = { patron: string; color: string };

// Demo pública del visor: mismo modelo y misma lectura de zonas que FootModelViewer, sin guardar nada.
// Con `calor`, muestra la planta fija y tiñe cada zona (regiones del modelo que calzan con `patron`).
export function DemoPie3D({ calor }: { calor?: ZonaCalor[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [zona, setZona] = useState<string | null>(null);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    let desmontado = false;
    let limpiar = () => {};

    (async () => {
      // three se carga solo en el cliente y después del primer render, para no frenar la landing.
      const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/controls/OrbitControls.js"),
      ]);
      if (desmontado) return;

      let renderizador: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setEstado("error");
        return;
      }
      renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderizador.outputColorSpace = THREE.SRGBColorSpace;
      renderizador.toneMapping = THREE.ACESFilmicToneMapping;
      renderizador.toneMappingExposure = 1.15;
      renderizador.domElement.setAttribute("aria-label", "Modelo 3D de un pie izquierdo; arrastra para girarlo y tócalo para detectar la zona");
      renderizador.domElement.className = "block h-full w-full cursor-crosshair touch-none";
      contenedor.appendChild(renderizador.domElement);

      const escena = new THREE.Scene();
      escena.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.2));
      const luzPrincipal = new THREE.DirectionalLight(0xffffff, 3.2);
      luzPrincipal.position.set(4, 7, 6);
      const luzRelleno = new THREE.DirectionalLight(0x99f6e4, 1.1);
      luzRelleno.position.set(-5, 2, -4);
      const luzPlantar = new THREE.DirectionalLight(0xffffff, calor ? 2.6 : 1.6);
      luzPlantar.position.set(1.5, -8, 3);
      escena.add(luzPrincipal, luzRelleno, luzPlantar);

      const camara = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
      const controles = new OrbitControls(camara, renderizador.domElement);
      controles.enableDamping = true;
      controles.enablePan = false;
      controles.rotateSpeed = 0.5;
      controles.minDistance = 2.5;
      controles.maxDistance = 12;
      controles.autoRotate = !calor;
      controles.enabled = !calor;
      controles.autoRotateSpeed = 1.2;
      controles.addEventListener("start", () => { controles.autoRotate = false; });

      const marcador = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0f766e, depthTest: false }));
      marcador.renderOrder = 1;
      marcador.visible = false;
      escena.add(marcador);

      let modelo: InstanceType<typeof THREE.Object3D> | null = null;
      new GLTFLoader().load("/models/foot-v2.glb", ({ scene }) => {
        if (desmontado) return;
        const limites = new THREE.Box3().setFromObject(scene);
        const centro = limites.getCenter(new THREE.Vector3());
        const escala = 3.5 / Math.max(...limites.getSize(new THREE.Vector3()).toArray());
        scene.scale.setScalar(escala);
        scene.position.copy(centro.multiplyScalar(-escala));
        escena.add(scene);
        modelo = scene;
        if (calor) {
          const zonas = calor.map((z) => ({ patron: new RegExp(z.patron), color: z.color }));
          scene.traverse((objeto) => {
            if (!(objeto instanceof THREE.Mesh)) return;
            const material = (Array.isArray(objeto.material) ? objeto.material[0] : objeto.material).clone();
            const region = material.name.replace(/^zona:/, "");
            material.color.set(zonas.find((z) => z.patron.test(region))?.color ?? "#475569");
            objeto.material = material;
          });
        }
        encuadrar();
        setEstado("listo");
      }, undefined, () => setEstado("error"));

      const encuadrar = () => {
        if (calor) {
          // Planta fija, dedos arriba, como la vista "Plantas" de la ficha.
          const fov = THREE.MathUtils.degToRad(camara.fov);
          const distancia = Math.max(3.5 / (2 * Math.tan(fov / 2)), 1.6 / (2 * Math.tan(fov / 2) * camara.aspect)) * 1.12;
          camara.up.set(0, 0, 1);
          camara.position.set(0, -distancia, 0);
        } else {
          // Vista medial en tres cuartos (foot-v2 es un pie izquierdo: -X medial, +Y dorsal, +Z dedos).
          camara.position.set(-4.2, 2, 2.1);
        }
        controles.target.set(0, 0, 0);
        controles.update();
      };

      let inicio: { x: number; y: number } | null = null;
      const alPresionar = (evento: PointerEvent) => { inicio = { x: evento.clientX, y: evento.clientY }; };
      const alSoltar = (evento: PointerEvent) => {
        // Un arrastre gira el modelo; solo un toque detecta la zona.
        if (calor || !modelo || !inicio || Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) > 6) return;
        const limites = renderizador.domElement.getBoundingClientRect();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(((evento.clientX - limites.left) / limites.width) * 2 - 1, -((evento.clientY - limites.top) / limites.height) * 2 + 1), camara);
        const impacto = raycaster.intersectObject(modelo, true)[0];
        if (!impacto?.face || !(impacto.object instanceof THREE.Mesh)) return;
        const material = Array.isArray(impacto.object.material) ? impacto.object.material[0] : impacto.object.material;
        const region = material.name.replace(/^zona:/, "");
        const normal = impacto.face.normal.clone().transformDirection(impacto.object.matrixWorld).transformDirection(modelo.matrixWorld.clone().invert());
        // nombreZona espera el pie izquierdo con X negada, igual que los hallazgos guardados.
        setZona(nombreZona(region, "izquierdo", [-normal.x, normal.y, normal.z]) ?? "Zona sin identificar");
        marcador.position.copy(impacto.point);
        marcador.visible = true;
        controles.autoRotate = false;
      };
      renderizador.domElement.addEventListener("pointerdown", alPresionar);
      renderizador.domElement.addEventListener("pointerup", alSoltar);

      const ajustar = () => {
        const { clientWidth: ancho, clientHeight: alto } = contenedor;
        if (!ancho || !alto) return;
        camara.aspect = ancho / alto;
        camara.updateProjectionMatrix();
        renderizador.setSize(ancho, alto, false);
        if (calor && modelo) encuadrar();
      };
      const observador = new ResizeObserver(ajustar);
      observador.observe(contenedor);
      ajustar();

      let cuadro = 0;
      const animar = () => {
        controles.update();
        renderizador.render(escena, camara);
        cuadro = requestAnimationFrame(animar);
      };
      animar();

      limpiar = () => {
        cancelAnimationFrame(cuadro);
        observador.disconnect();
        controles.dispose();
        escena.traverse((objeto) => {
          if (!(objeto instanceof THREE.Mesh)) return;
          objeto.geometry.dispose();
          (Array.isArray(objeto.material) ? objeto.material : [objeto.material]).forEach((m) => m.dispose());
        });
        renderizador.dispose();
        renderizador.domElement.remove();
      };
    })().catch(() => setEstado("error"));

    return () => {
      desmontado = true;
      limpiar();
    };
  }, [calor]);

  if (calor) {
    return (
      <div className="relative h-[340px] w-full">
        <div ref={contenedorRef} className="absolute inset-0" />
        {estado !== "listo" && <p role={estado === "error" ? "alert" : "status"} className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-slate-300">{estado === "error" ? "Modelo 3D no disponible en este navegador." : "Cargando modelo 3D…"}</p>}
      </div>
    );
  }

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl bg-linear-to-b from-slate-50 to-slate-100 sm:h-[460px]">
      <div ref={contenedorRef} className="absolute inset-0" />
      <span className="pointer-events-none absolute top-3 left-3 rounded-full border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs text-white">Arrastra para girar · toca el pie para detectar la zona</span>
      {estado !== "listo" && (
        <p role={estado === "error" ? "alert" : "status"} className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-slate-600">
          {estado === "error" ? "Tu navegador no permite mostrar el modelo 3D (WebGL no disponible)." : "Cargando modelo 3D…"}
        </p>
      )}
      <div aria-live="polite" className="pointer-events-none absolute right-3 bottom-3 left-3 flex justify-center">
        <span className="rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm shadow-sm backdrop-blur">
          {zona ? <><span className="text-slate-500">Zona detectada: </span><strong className="font-semibold text-teal-800">{zona}</strong></> : <span className="text-slate-600">Toca cualquier punto del pie</span>}
        </span>
      </div>
    </div>
  );
}
