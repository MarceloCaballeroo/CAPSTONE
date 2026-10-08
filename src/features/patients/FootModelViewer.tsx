"use client";

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ClickTooltip } from "@/components/common/ClickTooltip";
import { guardarHallazgoClinicoAction } from "@/app/actions/hallazgos";
import type { AtencionMarcable, HallazgoClinico, LadoPie } from "@/lib/types/hallazgos";
import { hallazgosVigentes, MODELO_PIE_VERSION } from "@/lib/types/hallazgos";

export type VistaPies = "ambos" | "izquierdo" | "derecho";
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
  atenciones: AtencionLineaTiempo[];
  hallazgos: HallazgoClinico[];
  persistenciaDisponible: boolean;
};

export type AtencionLineaTiempo = AtencionMarcable & {
  nivel_riesgo_iwgdf?: string | null;
  requiere_derivacion?: boolean;
  observaciones?: string | null;
  profesional?: string | null;
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

function fechaAtencion(fecha: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

function MenuHallazgo({ onCorregir }: { onCorregir: () => void }) {
  const id = useId();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const opcionRef = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    opcionRef.current?.focus();
    const cerrarFuera = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      botonRef.current?.focus();
    };
    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <button ref={botonRef} type="button" aria-label="Más opciones del hallazgo" aria-haspopup="menu" aria-expanded={abierto} aria-controls={id}
        onClick={() => setAbierto(!abierto)} className="rounded-md px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700">
        ⋯
      </button>
      <div id={id} role="menu" hidden={!abierto} className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <button ref={opcionRef} type="button" role="menuitem" onClick={() => {
            setAbierto(false);
            if (window.confirm("La corrección quedará registrada en la auditoría inmutable de la ficha. ¿Continuar?")) onCorregir();
          }} className="w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">
            Corregir registro
          </button>
          <p className="border-t border-slate-100 px-2 pt-2 text-[10px] leading-relaxed text-slate-500">La corrección conserva el registro original y queda en la auditoría de la ficha.</p>
      </div>
    </div>
  );
}

export function FootModelViewer({ pacienteId, atenciones, hallazgos: hallazgosIniciales, persistenciaDisponible }: FootModelViewerProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
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
  const seleccionarHallazgoRef = useRef<(id: string) => void>(() => {});
  const [estado, setEstado] = useState("Cargando modelo anatómico...");
  const [error, setError] = useState(false);
  const [modelosListos, setModelosListos] = useState(false);
  const [vista, setVista] = useState<VistaPies>("ambos");
  const [hallazgoSeleccionadoId, setHallazgoSeleccionadoId] = useState<string | null>(null);
  const [hallazgosResaltados, setHallazgosResaltados] = useState<Set<string>>(new Set());
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<PuntoClinico | null>(null);
  const [afeccion, setAfeccion] = useState("");
  const [dolor, setDolor] = useState(0);
  const [estadoGuardar, formAction, guardando] = useActionState(guardarHallazgoClinicoAction, {});
  const [hallazgoEnEdicion, setHallazgoEnEdicion] = useState<HallazgoClinico | null>(null);
  const hallazgoEnEdicionRef = useRef<HallazgoClinico | null>(null);
  const correccionGuardada = Boolean(hallazgoEnEdicion && estadoGuardar.hallazgo && estadoGuardar.seleccionId === puntoSeleccionado?.seleccionId);
  const correccionActiva = Boolean(hallazgoEnEdicion && !correccionGuardada);
  const respuestaDelPuntoActual = estadoGuardar.seleccionId === puntoSeleccionado?.seleccionId;
  const formularioVisible = Boolean(persistenciaDisponible && atenciones.length && puntoSeleccionado && (
    (respuestaDelPuntoActual && estadoGuardar.error)
    || (!respuestaDelPuntoActual && (!correccionActiva || puntoSeleccionado.seleccionId !== hallazgoEnEdicion?.id))
  ));
  const hallazgos = useMemo(() => estadoGuardar.hallazgo
    ? [...hallazgosIniciales.filter((hallazgo) => hallazgo.id !== estadoGuardar.hallazgo?.id), estadoGuardar.hallazgo].sort((a, b) => a.created_at.localeCompare(b.created_at))
    : hallazgosIniciales, [hallazgosIniciales, estadoGuardar.hallazgo]);
  const hallazgosActivos = useMemo(() => hallazgosVigentes(hallazgos), [hallazgos]);
  const hallazgosLineaTiempo = useMemo(() => hallazgosActivos.filter((hallazgo) => vista === "ambos" || hallazgo.lado_pie === vista), [hallazgosActivos, vista]);

  useEffect(() => {
    vistaActualRef.current = vista;
    encuadrarRef.current(vista);
    for (const hallazgo of hallazgos) {
      const marcador = marcadoresRef.current.get(hallazgo.id);
      if (!marcador) continue;
      marcador.visible = vista === "ambos" || hallazgo.lado_pie === vista;
      marcador.scale.setScalar(hallazgo.id === hallazgoSeleccionadoId || hallazgosResaltados.has(hallazgo.id) ? 1.4 : 1);
    }
  }, [vista, hallazgos, hallazgoSeleccionadoId, hallazgosResaltados]);

  useEffect(() => {
    const dialogo = dialogRef.current;
    if (!dialogo) return;
    if (formularioVisible && !dialogo.open) dialogo.showModal();
    if (!formularioVisible && dialogo.open) dialogo.close();
  }, [formularioVisible]);

  useEffect(() => {
    hallazgosRef.current = hallazgosActivos;
  }, [hallazgosActivos]);

  useEffect(() => {
    hallazgoEnEdicionRef.current = correccionGuardada ? null : hallazgoEnEdicion;
  }, [hallazgoEnEdicion, correccionGuardada]);

  const seleccionarHallazgo = useCallback((id: string) => {
    const hallazgo = hallazgosActivos.find((item) => item.id === id);
    if (!hallazgo) return;
    if (vista !== "ambos" && vista !== hallazgo.lado_pie) setVista(hallazgo.lado_pie);
    setHallazgoSeleccionadoId(id);
    setHallazgosResaltados(new Set([id]));
    window.requestAnimationFrame(() => document.getElementById(`hallazgo-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [hallazgosActivos, vista]);
  useEffect(() => {
    seleccionarHallazgoRef.current = seleccionarHallazgo;
  }, [seleccionarHallazgo]);

  const resaltarAtencion = (hallazgoIds: string[]) => {
    setVista("ambos");
    setHallazgoSeleccionadoId(null);
    setHallazgosResaltados(new Set(hallazgoIds));
  };

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
        if (desmontado) return;
        setError(true);
        setEstado("Aceleración de hardware (WebGL) no disponible. El mapa 3D está deshabilitado.");
      });
      return () => {
        desmontado = true;
        window.cancelAnimationFrame(cuadroError);
      };
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
      const marcadorInterseccion = raycaster.intersectObjects([...marcadores.values()].filter((marcador) => marcador.visible), true)[0];
      if (marcadorInterseccion) {
        let marcador: THREE.Object3D = marcadorInterseccion.object;
        while (marcador.parent && !marcador.userData.hallazgoId) marcador = marcador.parent;
        const hallazgoId = marcador.userData.hallazgoId;
        if (typeof hallazgoId === "string") seleccionarHallazgoRef.current(hallazgoId);
        return;
      }
      const interseccion = raycaster.intersectObjects([modelos.izquierdo, modelos.derecho], true)[0];
      if (!interseccion?.face) return;
      if (!hallazgoEnEdicionRef.current && (!persistenciaRef.current || !atencionesRef.current.length)) return;

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
        setHallazgoEnEdicion(null);
        setHallazgoSeleccionadoId(null);
        setHallazgosResaltados(new Set());
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
          marcador.userData.hallazgoId = hallazgo.id;
          marcador.visible = vistaActualRef.current === "ambos" || hallazgo.lado_pie === vistaActualRef.current;
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
        marcadorExistente.visible = vista === "ambos" || hallazgo.lado_pie === vista;
        marcadorExistente.scale.setScalar(hallazgo.id === hallazgoSeleccionadoId || hallazgosResaltados.has(hallazgo.id) ? 1.4 : 1);
        marcadorExistente.traverse((objeto) => {
          if (objeto instanceof THREE.Mesh) objeto.material.color.setHex(colorDolor(hallazgo.intensidad_dolor));
        });
        continue;
      }
      if (marcadorPendienteRef.current && estadoGuardar.hallazgo?.id === hallazgo.id) continue;

      const marcador = crearMarcador(colorDolor(hallazgo.intensidad_dolor));
      marcador.userData.hallazgoId = hallazgo.id;
      marcador.visible = vistaActualRef.current === "ambos" || hallazgo.lado_pie === vistaActualRef.current;
      marcador.position.copy(raizHallazgo.localToWorld(puntoLocal)).addScaledVector(normalGlobal, 0.018);
      marcador.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalGlobal);
      marcador.scale.setScalar(hallazgo.id === hallazgoSeleccionadoId || hallazgosResaltados.has(hallazgo.id) ? 1.4 : 1);
      escenas.add(marcador);
      marcadoresRef.current.set(hallazgo.id, marcador);
    }
  }, [hallazgos, vista, hallazgoSeleccionadoId, hallazgosResaltados, estadoGuardar.hallazgo]);

  useEffect(() => {
    const hallazgo = estadoGuardar.hallazgo;
    if (!hallazgo || estadoGuardar.seleccionId !== puntoSeleccionado?.seleccionId) return;

    const marcador = marcadorPendienteRef.current;
    if (marcador) {
      marcador.userData.hallazgoId = hallazgo.id;
      marcador.visible = vistaActualRef.current === "ambos" || hallazgo.lado_pie === vistaActualRef.current;
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

  const iniciarEdicion = (hallazgo: HallazgoClinico) => {
    setAfeccion(hallazgo.afeccion);
    setDolor(hallazgo.intensidad_dolor);
    setHallazgoEnEdicion(hallazgo);
    setPuntoSeleccionado({
      seleccionId: crypto.randomUUID(),
      lado: hallazgo.lado_pie,
      posicion: [hallazgo.coordenada_x, hallazgo.coordenada_y, hallazgo.coordenada_z],
      normal: [hallazgo.normal_x, hallazgo.normal_y, hallazgo.normal_z],
    });
  };

  return (
    <div className="grid gap-5">
    <section aria-labelledby="visor-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="visor-heading" className="font-semibold text-slate-900">Mapa clínico del pie</h2>
          <p className="mt-1 text-xs text-slate-500">El filtro también aplica a la evolución clínica</p>
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
          <button type="button" aria-label="Restablecer vista" title="Restablecer vista" onClick={() => controlesRef.current?.reset()} disabled={!modelosListos || error} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
            Restablecer
          </button>
          <ClickTooltip ariaLabel="Ayuda del visor" content="Arrastra para rotar, usa la rueda o pellizca para acercar y toca la piel para registrar un hallazgo. Selecciona un punto o una fila de la evolución para vincularlos.">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-600">?</span>
          </ClickTooltip>
        </div>
      </div>
      <div className="relative h-[320px] bg-slate-100 sm:h-[420px]">
        <div ref={contenedorRef} className="h-full w-full [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
        {(!modelosListos || error) && <p role={error ? "alert" : "status"} className={`absolute bottom-3 left-3 rounded-md border px-2.5 py-1.5 text-xs shadow-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-white/95 text-slate-600"}`}>{estado}</p>}
        {modelosListos && !error && atenciones.length > 0 && <p className="absolute left-3 top-3 rounded-full border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs text-white">Toca el pie para registrar un hallazgo</p>}
      </div>
      <div className="grid gap-4 border-t border-slate-200 p-4 sm:p-5">
        {persistenciaDisponible ? (
          !atenciones.length && <p className="text-sm text-slate-600">Registra una atención clínica antes de ubicar hallazgos en el mapa.</p>
        ) : <p role="alert" className="text-sm text-amber-800">No se pudo cargar el historial de marcas. Verifica que la migración del visor esté aplicada.</p>}
        <dialog
          ref={dialogRef}
          aria-labelledby="hallazgo-dialog-title"
          onCancel={(evento) => {
            evento.preventDefault();
            cancelarBorrador();
          }}
          className="fixed inset-0 m-auto max-h-[90dvh] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
        >
        {formularioVisible && puntoSeleccionado && (
          <form className="grid gap-4 p-5 sm:p-6" action={formAction}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="hallazgo-dialog-title" className="font-semibold text-slate-900">{correccionActiva ? "Corregir registro" : "Nuevo hallazgo"} · pie {puntoSeleccionado.lado}</h3>
                <p className="mt-1 text-sm text-slate-500">{correccionActiva ? "La corrección se añadirá al historial de auditoría." : "Completa los datos del hallazgo marcado."}</p>
              </div>
              <button type="button" onClick={cancelarBorrador} aria-label="Cerrar formulario" className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">×</button>
            </div>
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
              <input id="dolor" name="intensidadDolor" type="range" min="0" max="10" step="1" value={dolor} onChange={(evento) => setDolor(Number(evento.target.value))} aria-valuetext={`${dolor} de 10`} className="h-10 accent-teal-700" />
            </label>
            <div className="flex gap-2 sm:justify-end">
              <button type="button" onClick={cancelarBorrador} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={guardando || !persistenciaDisponible} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">{guardando ? "Guardando…" : correccionActiva ? "Guardar corrección" : "Guardar"}</button>
            </div>
            {estadoGuardar.error && estadoGuardar.seleccionId === puntoSeleccionado.seleccionId && <p role="alert" className="text-sm text-red-700 lg:col-span-4">{estadoGuardar.error}</p>}
          </form>
        )}
        </dialog>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Leyenda de intensidad de dolor">
          <span className="font-medium text-slate-600">Dolor:</span>
          <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-teal-700" />0–3 leve</span>
          <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-600" />4–6 moderado</span>
          <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-red-700" />7–10 severo</span>
        </div>
        <span>{vista === "ambos" ? "Vista comparativa" : `Pie ${vista}`}</span>
      </div>
    </section>
      <section aria-labelledby="evolucion-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 id="evolucion-heading" className="font-semibold text-slate-900">Evolución clínica</h2>
          <p className="mt-1 text-xs text-slate-500">El filtro de pie también se aplica a los hallazgos. Selecciona uno para localizarlo en el mapa.</p>
        </div>
        {hallazgosLineaTiempo.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No hay hallazgos registrados en el pie {vista === "ambos" ? "seleccionado" : vista}. {atenciones.length ? "Puedes marcar uno directamente en el mapa." : "Registra una atención clínica antes de añadir hallazgos."}
          </p>
        )}
        {atenciones.length ? (
          <ol className="relative mt-5 grid gap-4 pl-6 before:absolute before:bottom-4 before:left-[7px] before:top-3 before:w-px before:bg-slate-200">
            {atenciones.map((atencion) => {
              const hallazgosVisita = hallazgosActivos.filter((hallazgo) => hallazgo.atencion_id === atencion.id);
              const hallazgosVisibles = hallazgosVisita.filter((hallazgo) => vista === "ambos" || hallazgo.lado_pie === vista);
              return (
                <li key={atencion.id} className="relative min-w-0">
                  <span aria-hidden="true" className="absolute -left-6 top-4 h-3.5 w-3.5 rounded-full border-2 border-teal-700 bg-white ring-4 ring-white" />
                  <article className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{atencion.diagnostico_cie10 || "Atención clínica"}</p>
                        <p className="mt-1 text-xs text-slate-500">{fechaAtencion(atencion.created_at)}{atencion.profesional ? ` · ${atencion.profesional}` : ""}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {atencion.nivel_riesgo_iwgdf && <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">IWGDF: {atencion.nivel_riesgo_iwgdf.replaceAll("_", " ")}</span>}
                        {atencion.requiere_derivacion && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Requiere derivación</span>}
                      </div>
                    </div>
                    {atencion.observaciones && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{atencion.observaciones}</p>}
                    {hallazgosVisita.length > 0 && (
                      <button type="button" onClick={() => resaltarAtencion(hallazgosVisita.map((hallazgo) => hallazgo.id))}
                        className="mt-3 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-700 hover:text-teal-800">
                        Ver hallazgos en el pie ({hallazgosVisita.length})
                      </button>
                    )}
                    {hallazgosVisita.length > hallazgosVisibles.length && hallazgosVisibles.length === 0 && (
                      <p className="mt-3 text-xs text-slate-500">Esta atención tiene hallazgos en el otro pie; usa “Ver hallazgos en el pie” para resaltarlos.</p>
                    )}
                    {hallazgosVisibles.length > 0 && (
                      <ul className="mt-3 grid gap-2">
                        {hallazgosVisibles.map((hallazgo) => (
                          <li key={hallazgo.id} className="flex items-start gap-2">
                            <button
                              id={`hallazgo-${hallazgo.id}`}
                              type="button"
                              aria-pressed={hallazgoSeleccionadoId === hallazgo.id}
                              onClick={() => seleccionarHallazgo(hallazgo.id)}
                              className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 ${hallazgoSeleccionadoId === hallazgo.id ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"}`}
                            >
                              <span className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                                  <i aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${hallazgo.intensidad_dolor >= 7 ? "bg-red-600" : hallazgo.intensidad_dolor >= 4 ? "bg-amber-500" : "bg-teal-700"}`} />
                                  {hallazgo.afeccion}
                                </span>
                                <span className="text-xs text-slate-500">Pie {hallazgo.lado_pie} · Dolor {hallazgo.intensidad_dolor}/10</span>
                              </span>
                            </button>
                            <MenuHallazgo onCorregir={() => iniciarEdicion(hallazgo)} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        ) : hallazgosLineaTiempo.length > 0 ? <p className="mt-4 text-sm text-slate-500">No hay atenciones disponibles para mostrar la evolución.</p> : null}
      </section>
    </div>
  );
}