"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { guardarHallazgoClinicoAction } from "@/app/actions/hallazgos";
import type { AtencionMarcable, HallazgoClinico, LadoPie } from "@/lib/types/hallazgos";
import { hallazgosVigentes, MODELO_PIE_VERSION } from "@/lib/types/hallazgos";

type VistaPies = "ambos" | "izquierdo" | "derecho";
type PuntoClinico = { seleccionId: string; lado: LadoPie; posicion: [number, number, number]; normal: [number, number, number] };

type ParejaModelos = {
  izquierdo: THREE.Object3D;
  derecho: THREE.Object3D;
  alto: number;
  ancho: number;
  largo: number;
  separacion: number;
};

type FootModelViewerProps = {
  pacienteId: string;
  atenciones: AtencionMarcable[];
  hallazgos: HallazgoClinico[];
  persistenciaDisponible: boolean;
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

function colorDolor(intensidad: number): number {
  return intensidad >= 7 ? 0xdc2626 : intensidad >= 4 ? 0xd97706 : 0x0f766e;
}

function crearMarcador(color: number): THREE.Group {
  const marcador = new THREE.Group();
  const punto = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 12),
    new THREE.MeshBasicMaterial({ color, depthTest: false }),
  );
  const anillo = new THREE.Mesh(
    new THREE.RingGeometry(0.11, 0.17, 24),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthTest: false }),
  );
  marcador.add(punto, anillo);
  return marcador;
}

function fechaVisita(fecha: string): string {
  return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", year: "numeric" }).format(new Date(fecha));
}

export function FootModelViewer({ pacienteId, atenciones, hallazgos: hallazgosIniciales, persistenciaDisponible }: FootModelViewerProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const controlesRef = useRef<OrbitControls | null>(null);
  const punteroInicialRef = useRef<{ x: number; y: number } | null>(null);
  const atencionesRef = useRef(atenciones);
  const modelosRef = useRef<ParejaModelos | null>(null);
  const marcadorPendienteRef = useRef<THREE.Group | null>(null);
  const marcadoresRef = useRef(new Map<string, THREE.Group>());
  const hallazgosRef = useRef(hallazgosVigentes(hallazgosIniciales));
  const persistenciaRef = useRef(persistenciaDisponible);
  const vistaActualRef = useRef<VistaPies>("ambos");
  const encuadrarRef = useRef<(vista: VistaPies) => void>(() => { });
  const [estado, setEstado] = useState("Cargando modelo anatómico...");
  const [error, setError] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [vista, setVista] = useState<VistaPies>("ambos");
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<PuntoClinico | null>(null);
  const [afeccion, setAfeccion] = useState("");
  const [dolor, setDolor] = useState(0);
  const [estadoGuardar, formAction, guardando] = useActionState(guardarHallazgoClinicoAction, {});
  const [hallazgoEnEdicion, setHallazgoEnEdicion] = useState<HallazgoClinico | null>(null);
  const hallazgoEnEdicionRef = useRef<HallazgoClinico | null>(null);
  const correccionGuardada = Boolean(hallazgoEnEdicion && estadoGuardar.hallazgo && estadoGuardar.seleccionId === puntoSeleccionado?.seleccionId);
  const correccionActiva = Boolean(hallazgoEnEdicion && !correccionGuardada);
  const respuestaDelPuntoActual = estadoGuardar.seleccionId === puntoSeleccionado?.seleccionId;
  const formularioVisible = Boolean(puntoSeleccionado && (
    (respuestaDelPuntoActual && estadoGuardar.error)
    || (!respuestaDelPuntoActual && (!correccionActiva || puntoSeleccionado.seleccionId !== hallazgoEnEdicion?.id))
  ));
  const hallazgos = estadoGuardar.hallazgo
    ? [...hallazgosIniciales.filter((hallazgo) => hallazgo.id !== estadoGuardar.hallazgo?.id), estadoGuardar.hallazgo].sort((a, b) => a.created_at.localeCompare(b.created_at))
    : hallazgosIniciales;
  const hallazgosActivos = hallazgosVigentes(hallazgos);
  const idsReemplazados = new Set(hallazgos.map((hallazgo) => hallazgo.corrige_hallazgo_id).filter((id): id is string => id !== null));
  const atencionesSinHallazgos = atenciones.filter((atencion) => !hallazgosActivos.some((hallazgo) => hallazgo.atencion_id === atencion.id));

  useEffect(() => {
    hallazgosRef.current = hallazgosActivos;
  }, [hallazgosActivos]);

  useEffect(() => {
    hallazgoEnEdicionRef.current = correccionGuardada ? null : hallazgoEnEdicion;
  }, [hallazgoEnEdicion, correccionGuardada]);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    const marcadores = marcadoresRef.current;

    let desmontado = false;
    let modeloCargado: THREE.Object3D | null = null;
    let cuadroAnimacion = 0;

    const escena = new THREE.Scene();
    escena.background = new THREE.Color("#f1f5f9");

    const camara = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    let renderizador: THREE.WebGLRenderer;
    try {
      renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      const cuadroError = window.requestAnimationFrame(() => {
        setError(true);
        setEstado("Aceleración de hardware (WebGL) no disponible. El mapa 3D está deshabilitado.");
      });
      return () => window.cancelAnimationFrame(cuadroError);
    }
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

    const seleccionarPunto = (evento: MouseEvent) => {
      const modelos = modelosRef.current;
      if (!modelos) return;
      const punteroInicial = punteroInicialRef.current;
      punteroInicialRef.current = null;
      if (punteroInicial && Math.hypot(evento.clientX - punteroInicial.x, evento.clientY - punteroInicial.y) > 6) return;

      const limites = renderizador.domElement.getBoundingClientRect();
      const puntero = new THREE.Vector2(
        ((evento.clientX - limites.left) / limites.width) * 2 - 1,
        -((evento.clientY - limites.top) / limites.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(puntero, camara);
      const interseccion = raycaster.intersectObjects([modelos.izquierdo, modelos.derecho], true)[0];
      if (!interseccion?.face) return;

      let raiz: THREE.Object3D = interseccion.object;
      while (raiz.parent && raiz.parent !== escena) raiz = raiz.parent;
      const lado: LadoPie = raiz === modelos.izquierdo ? "izquierdo" : "derecho";
      const normal = interseccion.face.normal.clone().applyMatrix3(
        new THREE.Matrix3().getNormalMatrix(interseccion.object.matrixWorld),
      ).normalize();
      const normalLocal = normal.clone().transformDirection(raiz.matrixWorld.clone().invert());
      const posicionMarcador = interseccion.point.clone().addScaledVector(normal, 0.018);
      const marcador = crearMarcador(0xf59e0b);
      marcador.position.copy(posicionMarcador);
      marcador.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      if (marcadorPendienteRef.current) {
        escena.remove(marcadorPendienteRef.current);
        liberarModelo(marcadorPendienteRef.current);
      }
      marcadorPendienteRef.current = marcador;
      escena.add(marcador);

      const local = raiz.worldToLocal(interseccion.point.clone());
      if (lado === "izquierdo") {
        local.x *= -1;
        normalLocal.x *= -1;
      }

      if (hallazgoEnEdicionRef.current) {
        const hallazgoOrigen = hallazgoEnEdicionRef.current;
        setAfeccion(hallazgoOrigen.afeccion);
        setDolor(hallazgoOrigen.intensidad_dolor);
        setPuntoSeleccionado({
          seleccionId: crypto.randomUUID(),
          lado,
          posicion: [local.x, local.y, local.z],
          normal: [normalLocal.x, normalLocal.y, normalLocal.z],
        });
        return;
      }

      setPuntoSeleccionado({
        seleccionId: crypto.randomUUID(),
        lado,
        posicion: [local.x, local.y, local.z],
        normal: [normalLocal.x, normalLocal.y, normalLocal.z],
      });

      if (!hallazgoEnEdicionRef.current) {
        if (!persistenciaRef.current || !atencionesRef.current.length) return;
        setAfeccion("");
        setDolor(0);
        return;
      }
    };

    const iniciarPuntero = (evento: PointerEvent) => {
      punteroInicialRef.current = { x: evento.clientX, y: evento.clientY };
    };

    renderizador.domElement.addEventListener("pointerdown", iniciarPuntero);
    renderizador.domElement.addEventListener("click", seleccionarPunto);
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
        modelosRef.current.izquierdo.updateMatrixWorld(true);
        modelosRef.current.derecho.updateMatrixWorld(true);

        for (const hallazgo of hallazgosRef.current) {
          if (hallazgo.modelo_version !== MODELO_PIE_VERSION || marcadoresRef.current.has(hallazgo.id)) continue;
          const raizHallazgo = hallazgo.lado_pie === "izquierdo" ? modelosRef.current.izquierdo : modelosRef.current.derecho;
          const puntoLocal = new THREE.Vector3(hallazgo.coordenada_x, hallazgo.coordenada_y, hallazgo.coordenada_z);
          const normalHallazgo = new THREE.Vector3(hallazgo.normal_x, hallazgo.normal_y, hallazgo.normal_z);
          if (hallazgo.lado_pie === "izquierdo") {
            puntoLocal.x *= -1;
            normalHallazgo.x *= -1;
          }
          const normalGlobal = normalHallazgo.transformDirection(raizHallazgo.matrixWorld);
          const marcador = crearMarcador(colorDolor(hallazgo.intensidad_dolor));
          marcador.position.copy(raizHallazgo.localToWorld(puntoLocal)).addScaledVector(normalGlobal, 0.018);
          marcador.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalGlobal);
          escena.add(marcador);
          marcadoresRef.current.set(hallazgo.id, marcador);
        }

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
      renderizador.domElement.removeEventListener("pointerdown", iniciarPuntero);
      renderizador.domElement.removeEventListener("click", seleccionarPunto);
      controlesRef.current = null;
      modelosRef.current = null;
      encuadrarRef.current = () => { };
      setModelosListos(false);
      if (marcadorPendienteRef.current) liberarModelo(marcadorPendienteRef.current);
      marcadores.forEach(liberarModelo);
      marcadorPendienteRef.current = null;
      marcadores.clear();
      if (modeloCargado) liberarModelo(modeloCargado);
      renderizador.dispose();
      renderizador.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const modeli = modelosRef.current;
    if (!modeli) return;

    const escenas = modeli.izquierdo.parent;
    if (!escenas) return;
    for (const [id, marcador] of marcadoresRef.current) {
      if (!hallazgosRef.current.some((hallazgo) => hallazgo.id === id)) {
        marcador.removeFromParent();
        liberarModelo(marcador);
        marcadoresRef.current.delete(id);
      }
    }

    for (const hallazgo of hallazgosRef.current) {
      if (hallazgo.modelo_version !== MODELO_PIE_VERSION) continue;
      const raizHallazgo = hallazgo.lado_pie === "izquierdo" ? modeli.izquierdo : modeli.derecho;
      const puntoLocal = new THREE.Vector3(hallazgo.coordenada_x, hallazgo.coordenada_y, hallazgo.coordenada_z);
      const normalHallazgo = new THREE.Vector3(hallazgo.normal_x, hallazgo.normal_y, hallazgo.normal_z);
      if (hallazgo.lado_pie === "izquierdo") {
        puntoLocal.x *= -1;
        normalHallazgo.x *= -1;
      }
      const normalGlobal = normalHallazgo.transformDirection(raizHallazgo.matrixWorld);
      const marcadorExistente = marcadoresRef.current.get(hallazgo.id);
      if (marcadorExistente) {
        marcadorExistente.position.copy(raizHallazgo.localToWorld(puntoLocal)).addScaledVector(normalGlobal, 0.018);
        marcadorExistente.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalGlobal);
        marcadorExistente.traverse((objeto) => {
          if (objeto instanceof THREE.Mesh) objeto.material.color.setHex(colorDolor(hallazgo.intensidad_dolor));
        });
        continue;
      }

      const marcador = crearMarcador(colorDolor(hallazgo.intensidad_dolor));
      marcador.position.copy(raizHallazgo.localToWorld(puntoLocal)).addScaledVector(normalGlobal, 0.018);
      marcador.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalGlobal);
      escenas.add(marcador);
      marcadoresRef.current.set(hallazgo.id, marcador);
    }
  }, [hallazgos]);

  useEffect(() => {
    const hallazgo = estadoGuardar.hallazgo;
    if (!hallazgo || estadoGuardar.seleccionId !== puntoSeleccionado?.seleccionId) return;

    const marcador = marcadorPendienteRef.current;
    if (marcador) {
      marcador.traverse((objeto) => {
        if (objeto instanceof THREE.Mesh) objeto.material.color.setHex(colorDolor(hallazgo.intensidad_dolor));
      });
      marcadoresRef.current.set(hallazgo.id, marcador);
      marcadorPendienteRef.current = null;
    }
  }, [estadoGuardar.hallazgo, estadoGuardar.seleccionId, puntoSeleccionado?.seleccionId]);

  const seleccionarVista = (nuevaVista: VistaPies) => {
    vistaActualRef.current = nuevaVista;
    setVista(nuevaVista);
    encuadrarRef.current(nuevaVista);
  };

  const cancelarBorrador = () => {
    if (marcadorPendienteRef.current) {
      marcadorPendienteRef.current.removeFromParent();
      liberarModelo(marcadorPendienteRef.current);
      marcadorPendienteRef.current = null;
    }
    setPuntoSeleccionado(null);
    setHallazgoEnEdicion(null);
  };

  const cancelarEdicion = () => {
    setHallazgoEnEdicion(null);
    setPuntoSeleccionado(null);
  };

  const iniciarEdicion = (hallazgo: HallazgoClinico) => {
    setHallazgoEnEdicion(hallazgo);
    setPuntoSeleccionado({
      seleccionId: hallazgo.id,
      lado: hallazgo.lado_pie,
      posicion: [hallazgo.coordenada_x, hallazgo.coordenada_y, hallazgo.coordenada_z],
      normal: [hallazgo.normal_x, hallazgo.normal_y, hallazgo.normal_z],
    });
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
      <div className="grid gap-4 border-t border-slate-200 p-4 sm:p-5">
        {persistenciaDisponible ? (
          atenciones.length ? <p className="text-xs text-slate-500">Haz clic en el pie para marcar una afección y asociarla a una atención. Los puntos quedan en su historial clínico.</p>
            : <p className="text-sm text-slate-600">Registra una atención clínica antes de ubicar hallazgos en el mapa.</p>
        ) : <p role="alert" className="text-sm text-amber-800">No se pudo cargar el historial de marcas. Verifica que la migración del visor esté aplicada.</p>}
        {correccionActiva && hallazgoEnEdicion && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-amber-900">Corrección de marca</p>
                <p className="mt-1 text-sm text-slate-600">La marca original se conserva. Haz clic en el pie para elegir la nueva ubicación de la corrección.</p>
              </div>
              <button type="button" onClick={cancelarEdicion} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        )}
        {formularioVisible && puntoSeleccionado && (
          <form className="grid gap-4 rounded-lg border border-teal-200 bg-teal-50/60 p-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(0,1fr)_minmax(180px,0.7fr)_auto] lg:items-end" action={formAction}>
            <input type="hidden" name="seleccionId" value={puntoSeleccionado.seleccionId} />
            <input type="hidden" name="pacienteId" value={pacienteId} />
            <input type="hidden" name="corrigeHallazgoId" value={correccionActiva ? hallazgoEnEdicion?.id ?? "" : ""} />
            <input type="hidden" name="ladoPie" value={puntoSeleccionado.lado} />
            <input type="hidden" name="x" value={puntoSeleccionado.posicion[0]} />
            <input type="hidden" name="y" value={puntoSeleccionado.posicion[1]} />
            <input type="hidden" name="z" value={puntoSeleccionado.posicion[2]} />
            <input type="hidden" name="normalX" value={puntoSeleccionado.normal[0]} />
            <input type="hidden" name="normalY" value={puntoSeleccionado.normal[1]} />
            <input type="hidden" name="normalZ" value={puntoSeleccionado.normal[2]} />
            {correccionActiva && hallazgoEnEdicion ? (
              <>
                <input type="hidden" name="atencionId" value={hallazgoEnEdicion.atencion_id} />
                <p className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Corrección · misma atención
                  <span className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700">
                    {fechaVisita(atenciones.find((atencion) => atencion.id === hallazgoEnEdicion.atencion_id)?.created_at ?? hallazgoEnEdicion.created_at)} · {hallazgoEnEdicion.afeccion}
                  </span>
                </p>
              </>
            ) : (
              <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="atencionId">
                Atención · pie {puntoSeleccionado.lado}
                <select id="atencionId" name="atencionId" required defaultValue={atenciones[0]?.id ?? ""} className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100">
                  {atenciones.map((atencion) => <option key={atencion.id} value={atencion.id}>{fechaVisita(atencion.created_at)} · {atencion.diagnostico_cie10 || "Atención clínica"}</option>)}
                </select>
              </label>
            )}
            <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="afeccion">
              {correccionActiva ? "Afección corregida" : "Afección o hallazgo"}
              <input id="afeccion" name="afeccion" autoFocus required maxLength={120} value={afeccion} onChange={(evento) => setAfeccion(evento.target.value)} placeholder="Ej.: callosidad plantar" className="h-10 rounded-md border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="dolor">
              Intensidad de dolor <output className="font-semibold text-teal-800">{dolor}/10</output>
              <input id="dolor" name="intensidadDolor" type="range" min="0" max="10" step="1" value={dolor} onChange={(evento) => setDolor(Number(evento.target.value))} className="h-10 accent-teal-700" />
            </label>
            <div className="flex gap-2 sm:justify-end">
              <button type="button" onClick={cancelarBorrador} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardando || !persistenciaDisponible} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">{guardando ? "Guardando…" : correccionActiva ? "Guardar corrección" : "Guardar"}</button>
            </div>
            {estadoGuardar.error && estadoGuardar.seleccionId === puntoSeleccionado.seleccionId && <p role="alert" className="text-sm text-red-700 lg:col-span-4">{estadoGuardar.error}</p>}
          </form>
        )}
        {hallazgos.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Evolución marcada en el mapa</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {hallazgos.map((hallazgo) => {
                const atencion = atenciones.find((visita) => visita.id === hallazgo.atencion_id);
                return (
                  <li key={hallazgo.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{hallazgo.afeccion}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{atencion ? `${fechaVisita(atencion.created_at)} · ${atencion.diagnostico_cie10 || "Atención clínica"}` : "Atención clínica"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-slate-600">{hallazgo.lado_pie} · Dolor {hallazgo.intensidad_dolor}/10</span>
                      {idsReemplazados.has(hallazgo.id)
                        ? <span className="text-xs text-slate-500">Reemplazada</span>
                        : <button type="button" onClick={() => iniciarEdicion(hallazgo)} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800">Corregir</button>}
                    </div>
                    {hallazgo.modelo_version !== MODELO_PIE_VERSION && <span className="shrink-0 text-xs text-amber-800">Modelo anterior</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {atencionesSinHallazgos.length > 0 && (
          <p className="text-xs text-slate-500">
            {atencionesSinHallazgos.length} {atencionesSinHallazgos.length === 1 ? "atención previa aún no tiene" : "atenciones previas aún no tienen"} ubicaciones anatómicas. Selecciona una al marcar para añadirlas al mapa.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        <span>Arrastra para rotar · rueda o pellizca para acercar · clic en el pie para marcar</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Leyenda de intensidad de dolor">
          <span className="font-medium text-slate-600">Dolor:</span>
          <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-teal-700" />0–3</span>
          <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-600" />4–6</span>
          <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-red-700" />7–10</span>
          <span className="ml-1 border-l border-slate-200 pl-3">{vista === "ambos" ? "Vista comparativa" : vista === "izquierdo" ? "Pie izquierdo" : "Pie derecho"}</span>
        </div>
      </div>
    </section>
  );
}