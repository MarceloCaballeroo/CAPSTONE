"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type VistaPies = "ambos" | "izquierdo" | "derecho";

type ParejaModelos = {
  izquierdo: THREE.Object3D;
  derecho: THREE.Object3D;
  alto: number;
  ancho: number;
  largo: number;
  separacion: number;
};

function liberarModelo(modelo: THREE.Object3D) {
  modelo.traverse((objeto) => {
    if (!(objeto instanceof THREE.Mesh)) return;
    objeto.geometry.dispose();
    const materiales = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
    materiales.forEach((material) => {
      Object.values(material).forEach((valor) => {
        if (valor instanceof THREE.Texture) valor.dispose();
      });
      material.dispose();
    });
  });
}

export function FootModelViewer() {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const controlesRef = useRef<OrbitControls | null>(null);
  const modelosRef = useRef<ParejaModelos | null>(null);
  const vistaActualRef = useRef<VistaPies>("ambos");
  const encuadrarRef = useRef<(vista: VistaPies) => void>(() => {});
  const [estado, setEstado] = useState("Cargando modelo anatómico...");
  const [error, setError] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [vista, setVista] = useState<VistaPies>("ambos");

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    let desmontado = false;
    let modeloCargado: THREE.Object3D | null = null;
    let cuadroAnimacion = 0;
    const escena = new THREE.Scene();
    escena.background = new THREE.Color("#f1f5f9");

    const camara = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderizador.outputColorSpace = THREE.SRGBColorSpace;
    renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    renderizador.toneMappingExposure = 1.15;
    renderizador.domElement.setAttribute("aria-label", "Modelo 3D del pie, controlable con puntero o pantalla táctil");
    contenedor.appendChild(renderizador.domElement);

    escena.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.2));
    const luzPrincipal = new THREE.DirectionalLight(0xffffff, 3.2);
    luzPrincipal.position.set(4, 7, 6);
    escena.add(luzPrincipal);
    const luzRelleno = new THREE.DirectionalLight(0x99f6e4, 1.1);
    luzRelleno.position.set(-5, 2, -4);
    escena.add(luzRelleno);

    const controles = new OrbitControls(camara, renderizador.domElement);
    controles.enableDamping = true;
    controles.dampingFactor = 0.05;
    controles.rotateSpeed = 0.4;
    controles.zoomSpeed = 0.55;
    controles.enablePan = false;
    controles.minDistance = 0.1;
    controles.maxDistance = 100;
    controlesRef.current = controles;

    const encuadrar = (vistaSolicitada: VistaPies) => {
      const modelos = modelosRef.current;
      if (!modelos) return;

      modelos.izquierdo.visible = vistaSolicitada !== "derecho";
      modelos.derecho.visible = vistaSolicitada !== "izquierdo";

      const fovVertical = THREE.MathUtils.degToRad(camara.fov);
      const fovHorizontal = 2 * Math.atan(Math.tan(fovVertical / 2) * camara.aspect);
      const centroX = vistaSolicitada === "izquierdo" ? -modelos.separacion / 2 : vistaSolicitada === "derecho" ? modelos.separacion / 2 : 0;

      if (vistaSolicitada === "ambos") {
        const anchoVisible = modelos.separacion + modelos.ancho;
        const distanciaVertical = modelos.largo / (2 * Math.tan(fovVertical / 2));
        const distanciaHorizontal = anchoVisible / (2 * Math.tan(fovHorizontal / 2));
        const distancia = Math.max(distanciaVertical, distanciaHorizontal) * 1.4;
        camara.up.set(0, 0, -1);
        camara.position.set(0, distancia, 0);
      } else {
        const distanciaVertical = modelos.alto / (2 * Math.tan(fovVertical / 2));
        const distanciaHorizontal = modelos.largo / (2 * Math.tan(fovHorizontal / 2));
        const distancia = Math.max(distanciaVertical, distanciaHorizontal) * 1.45;
        camara.up.set(0, 1, 0);
        camara.position.set(centroX + distancia, distancia * 0.18, 0);
      }

      controles.target.set(centroX, 0, 0);
      controles.update();
      controles.saveState();
    };
    encuadrarRef.current = encuadrar;

    const ajustarTamano = () => {
      const ancho = contenedor.clientWidth;
      const alto = contenedor.clientHeight;
      if (!ancho || !alto) return;
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      renderizador.setSize(ancho, alto, false);
      encuadrar(vistaActualRef.current);
    };
    const observador = new ResizeObserver(ajustarTamano);
    observador.observe(contenedor);
    ajustarTamano();

    const loader = new GLTFLoader();
    loader.load(
      "/models/foot.glb",
      ({ scene: modelo }) => {
        if (desmontado) {
          liberarModelo(modelo);
          return;
        }

        modeloCargado = modelo;
        modelo.updateMatrixWorld(true);
        const limites = new THREE.Box3().setFromObject(modelo);
        const centro = limites.getCenter(new THREE.Vector3());
        const tamano = limites.getSize(new THREE.Vector3());
        const dimensionMaxima = Math.max(tamano.x, tamano.y, tamano.z);

        if (!dimensionMaxima || !Number.isFinite(dimensionMaxima)) {
          setError(true);
          setEstado("El modelo no contiene una malla visible.");
          return;
        }

        const escala = 3.5 / dimensionMaxima;
        const modeloDerecho = modelo.clone(true);
        const alto = tamano.y * escala;
        const ancho = tamano.x * escala;
        const largo = tamano.z * escala;
        const separacion = ancho + 0.18;

        modelo.scale.setScalar(escala);
        modelo.position.set(
          separacion / 2 - centro.x * escala,
          -centro.y * escala,
          -centro.z * escala,
        );

        modeloDerecho.scale.set(-escala, escala, escala);
        modeloDerecho.position.set(
          -separacion / 2 + centro.x * escala,
          -centro.y * escala,
          -centro.z * escala,
        );

        escena.add(modelo);
        escena.add(modeloDerecho);
        modelosRef.current = { izquierdo: modeloDerecho, derecho: modelo, alto, ancho, largo, separacion };
        setModelosListos(true);
        encuadrar(vistaActualRef.current);
        setError(false);
        setEstado("Ambos pies listos");
      },
      undefined,
      () => {
        if (desmontado) return;
        setError(true);
        setEstado("No se pudo cargar Foot.glb.");
      },
    );

    const animar = () => {
      cuadroAnimacion = window.requestAnimationFrame(animar);
      controles.update();
      renderizador.render(escena, camara);
    };
    animar();

    return () => {
      desmontado = true;
      window.cancelAnimationFrame(cuadroAnimacion);
      observador.disconnect();
      controles.dispose();
      controlesRef.current = null;
      modelosRef.current = null;
      encuadrarRef.current = () => {};
      setModelosListos(false);
      if (modeloCargado) liberarModelo(modeloCargado);
      renderizador.dispose();
      renderizador.domElement.remove();
    };
  }, []);

  const seleccionarVista = (nuevaVista: VistaPies) => {
    vistaActualRef.current = nuevaVista;
    setVista(nuevaVista);
    encuadrarRef.current(nuevaVista);
  };

  return (
    <section aria-labelledby="visor-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="visor-heading" className="font-semibold text-slate-900">Mapa clínico del pie</h2>
          <p className="mt-1 text-xs text-slate-500">Vista comparativa anatómica</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Seleccionar pie" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["ambos", "izquierdo", "derecho"] as const).map((opcion) => (
              <button key={opcion} type="button" aria-pressed={vista === opcion} disabled={!modelosListos || error} onClick={() => seleccionarVista(opcion)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${vista === opcion ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {opcion === "ambos" ? "Ambos" : opcion === "izquierdo" ? "Izquierdo" : "Derecho"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => controlesRef.current?.reset()} disabled={!modelosListos || error} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
            Restablecer
          </button>
        </div>
      </div>
      <div className="relative h-[320px] bg-slate-100 sm:h-[420px]">
        <div ref={contenedorRef} className="h-full w-full [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
        <p role={error ? "alert" : "status"} className={`absolute bottom-3 left-3 rounded-md border px-2.5 py-1.5 text-xs shadow-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-white/95 text-slate-600"}`}>
          {estado}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        <span>Arrastra para rotar · rueda o pellizca para acercar</span>
        <span>{vista === "ambos" ? "Vista comparativa" : vista === "izquierdo" ? "Pie izquierdo" : "Pie derecho"}</span>
      </div>
    </section>
  );
}