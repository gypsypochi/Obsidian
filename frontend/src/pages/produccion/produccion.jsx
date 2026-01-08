// frontend/src/pages/produccion/produccion.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getProductosBase,
  getModelos,
  getProducciones,
  createProduccion,
  getMateriales, // ✅ NUEVO
} from "../../api";
import LayoutCrud from "../../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../../components/form/form.jsx";
import "./produccion.css";

function normTipoBase(v) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "_");
}

function humanTipo(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Produccion() {
  const [productosBase, setProductosBase] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [materiales, setMateriales] = useState([]); // ✅ NUEVO

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // ✅ paso 1: tipo general
  const [tipoBase, setTipoBase] = useState("");
  // ✅ paso 2: variante (producto)
  const [productoBaseId, setProductoBaseId] = useState("");
  // ✅ paso 3: modelo opcional (producción)
  const [modeloId, setModeloId] = useState("");

  // ingreso por “producción” o “compra”
  const [tipoMovimiento, setTipoMovimiento] = useState("produccion");

  // no-sticker / fallback
  const [cantidad, setCantidad] = useState(1);

  // stickers: planchas → unidades
  const [planchasBuenas, setPlanchasBuenas] = useState(1);
  const [unidadesBuenasOverride, setUnidadesBuenasOverride] = useState("");

  // compras: detalle libre (obligatorio)
  const [detalle, setDetalle] = useState("");

  // ✅ NUEVO: consumos de materiales (solo producción)
  // [{ materialId, cantidad }]
  const [consumos, setConsumos] = useState([]);

  // ✅ NUEVO: refs para scroll interno
  const consumosEndRef = useRef(null);

  async function loadDatos() {
    try {
      setError("");
      setLoading(true);

      const [bases, mods, prodOps, mats] = await Promise.all([
        getProductosBase(),
        getModelos(),
        getProducciones(),
        getMateriales(),
      ]);

      setProductosBase(bases || []);
      setModelos(mods || []);
      setMovimientos(prodOps || []);

      const matsOrdenados = [...(mats || [])].sort((a, b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || ""))
      );
      setMateriales(matsOrdenados);
    } catch (e) {
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDatos();
  }, []);

  // tipos desde productos base
  const tiposDisponibles = useMemo(() => {
    const set = new Set();
    (productosBase || []).forEach((p) => {
      const t = normTipoBase(p?.tipoBase);
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [productosBase]);

  const productosFiltradosPorTipo = useMemo(() => {
    const t = normTipoBase(tipoBase);
    if (!t) return [];
    return (productosBase || []).filter((p) => normTipoBase(p?.tipoBase) === t);
  }, [productosBase, tipoBase]);

  const productoSeleccionado = useMemo(
    () => productosBase.find((b) => b.id === productoBaseId),
    [productosBase, productoBaseId]
  );

  const tipoBaseSel = useMemo(
    () => normTipoBase(productoSeleccionado?.tipoBase || tipoBase),
    [productoSeleccionado, tipoBase]
  );

  const modelosDisponibles = useMemo(() => {
    if (!tipoBaseSel) return [];
    return (modelos || []).filter(
      (m) => normTipoBase(m.productoBaseTipo) === tipoBaseSel
    );
  }, [modelos, tipoBaseSel]);

  const modeloSeleccionado = useMemo(
    () => modelosDisponibles.find((m) => m.id === modeloId),
    [modelosDisponibles, modeloId]
  );

  const unidadesPorPlancha = Number(modeloSeleccionado?.unidadesPorPlancha || 0);

  const cantidadAutoStickers = useMemo(() => {
    if (tipoBaseSel !== "STICKER") return null;
    if (!modeloId) return null;
    if (!unidadesPorPlancha) return null;

    const pb = Number(planchasBuenas || 0);
    if (!pb || pb <= 0) return null;

    return pb * unidadesPorPlancha;
  }, [tipoBaseSel, modeloId, unidadesPorPlancha, planchasBuenas]);

  // si cambio a compra, modelo y consumos no aplican
  useEffect(() => {
    if (tipoMovimiento === "compra") {
      setModeloId("");
      setConsumos([]); // ✅
    }
  }, [tipoMovimiento]);

  // si cambio el tipo, reseteo producto/modelo y calculadores
  useEffect(() => {
    setProductoBaseId("");
    setModeloId("");
    setCantidad(1);
    setPlanchasBuenas(1);
    setUnidadesBuenasOverride("");
    setConsumos([]); // ✅
  }, [tipoBase]);

  function addConsumoLine() {
    setConsumos((prev) => [...prev, { materialId: "", cantidad: 1 }]);

    // ✅ Scroll interno al final (sin bajar la página)
    requestAnimationFrame(() => {
      if (consumosEndRef.current) {
        consumosEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    });
  }

  function updateConsumoLine(idx, patch) {
    setConsumos((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  }

  function removeConsumoLine(idx) {
    setConsumos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!tipoBaseSel) {
      setError("Elegí un tipo base");
      return;
    }
    if (!productoBaseId) {
      setError("Elegí una variante/producto");
      return;
    }

    // compra: detalle obligatorio
    if (tipoMovimiento === "compra" && !String(detalle || "").trim()) {
      setError('En compras, agregá un detalle (ej: "7 Mafalda + 7 Ghibli")');
      return;
    }

    // decidir cantidad final a sumar
    let cantFinal = Number(cantidad);

    // stickers: si hay modelo con unidadesPorPlancha, preferimos planchas→unidades (o override)
    const esStickerCalc =
      tipoMovimiento === "produccion" &&
      tipoBaseSel === "STICKER" &&
      modeloId &&
      unidadesPorPlancha > 0;

    if (esStickerCalc) {
      if (String(unidadesBuenasOverride).trim() !== "") {
        const n = Number(unidadesBuenasOverride);
        if (Number.isNaN(n) || n <= 0) {
          setError("Unidades buenas inválidas");
          return;
        }
        cantFinal = n;
      } else {
        const auto = Number(cantidadAutoStickers || 0);
        if (!auto || auto <= 0) {
          setError(
            "Indicá planchas buenas (y que el modelo tenga unidades por plancha)"
          );
          return;
        }
        cantFinal = auto;
      }
    } else {
      // no-sticker: cantidad directa
      if (Number.isNaN(cantFinal) || cantFinal <= 0) {
        setError("Cantidad debe ser un número mayor a 0");
        return;
      }
    }

    // ✅ Validar consumos (solo producción)
    let consumosValidos = [];
    if (tipoMovimiento === "produccion" && consumos.length > 0) {
      for (const c of consumos) {
        const matId = String(c.materialId || "").trim();
        const cant = Number(c.cantidad);

        if (!matId) {
          setError(
            "En materiales consumidos, elegí el material en todas las filas."
          );
          return;
        }
        if (Number.isNaN(cant) || cant <= 0) {
          setError("En materiales consumidos, la cantidad debe ser > 0.");
          return;
        }
      }

      // Dejar listo para backend
      consumosValidos = consumos.map((c) => ({
        materialId: String(c.materialId || "").trim(),
        cantidad: Number(c.cantidad),
      }));
    }

    try {
      const resp = await createProduccion({
        productoBaseId,
        tipoMovimiento,
        cantidad: cantFinal,

        // modelo solo en producción
        modeloId: tipoMovimiento === "produccion" ? modeloId || null : null,

        // compras: detalle, producción puede dejarlo vacío
        detalle: String(detalle || "").trim(),

        // ✅ auditoría stickers (backend puede recalcular también si le mandás esto)
        planchasBuenas: esStickerCalc ? Number(planchasBuenas || 0) : undefined,
        unidadesBuenas:
          esStickerCalc && String(unidadesBuenasOverride).trim() !== ""
            ? Number(unidadesBuenasOverride)
            : undefined,

        // ✅ NUEVO: materiales consumidos
        materialesConsumidos: tipoMovimiento === "produccion" ? consumosValidos : [],
      });

      // el backend devuelve productoBaseActualizado (alias) o productoStockActualizado (original)
      const prodResp =
        resp?.productoBaseActualizado || resp?.productoStockActualizado || null;
      const nombreProd = prodResp?.nombre || "Producto";
      const stock = prodResp?.stock;

      const nombreModelo = modeloId
        ? modelos.find((m) => m.id === modeloId)?.nombreModelo || ""
        : "";

      let txt =
        `${
          tipoMovimiento === "compra" ? "Compra registrada" : "Producción registrada"
        }: ` + `+${cantFinal} a "${nombreProd}"`;

      if (nombreModelo) txt += ` (modelo: ${nombreModelo})`;
      if (detalle) txt += ` · ${detalle}`;

      if (tipoMovimiento === "produccion" && consumosValidos.length > 0) {
        txt += ` · Materiales: ${consumosValidos.length} item(s) descontados`;
      }

      if (typeof stock === "number") txt += ` · Stock: ${stock}.`;

      setMensaje(txt);

      await loadDatos();

      // reset
      setCantidad(1);
      setModeloId("");
      setDetalle("");
      setPlanchasBuenas(1);
      setUnidadesBuenasOverride("");
      setConsumos([]);
    } catch (e2) {
      setError(e2.message || "Error registrando ingreso");
    }
  }

  return (
    <LayoutCrud
      title="Ingreso de stock"
      description="Sumá stock a tus variantes (por Producción o Compra). En Producción podés descontar materiales automáticamente."
    >
      <section className="crud-section">
        {loading && <p>Cargando...</p>}
        {error && <p className="crud-error">{error}</p>}
        {mensaje && <p className="produccion-mensaje-ok">{mensaje}</p>}
      </section>

      <FormSection
        title="Registrar ingreso"
        description="Paso 1: tipo · Paso 2: variante · Paso 3: modelo opcional (solo producción) · Materiales consumidos (opcional)."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Tipo de ingreso *</label>
            <select
              value={tipoMovimiento}
              onChange={(e) => setTipoMovimiento(e.target.value)}
            >
              <option value="produccion">Producción</option>
              <option value="compra">Compra</option>
            </select>
          </div>

          <div className="form-field">
            <label>Tipo base *</label>
            <select
              value={tipoBase}
              onChange={(e) => setTipoBase(e.target.value)}
              required
            >
              <option value="">-- elegir tipo --</option>
              {tiposDisponibles.map((t) => (
                <option key={t} value={t}>
                  {humanTipo(t)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Variante / Producto *</label>
            <select
              value={productoBaseId}
              onChange={(e) => {
                setProductoBaseId(e.target.value);
                setModeloId("");
                setUnidadesBuenasOverride("");
                setPlanchasBuenas(1);
              }}
              disabled={!tipoBase}
              required
            >
              <option value="">-- elegir variante --</option>
              {productosFiltradosPorTipo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · stock: {p.stock ?? 0}
                </option>
              ))}
            </select>
            <p className="produccion-help-text">
              Acá elegís la variante específica (ej: <b>A5 tapa blanda</b>).
            </p>
          </div>

          {/* MODELO (solo producción) */}
          {tipoMovimiento === "produccion" && (
            <div className="form-field">
              <label>Modelo / diseño (opcional)</label>
              <select
                value={modeloId}
                onChange={(e) => setModeloId(e.target.value)}
                disabled={!productoBaseId}
              >
                <option value="">-- sin modelo --</option>
                {modelosDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombreModelo}
                    {normTipoBase(m.productoBaseTipo) === "STICKER" &&
                    Number(m.unidadesPorPlancha || 0) > 0
                      ? ` · x${m.unidadesPorPlancha}/plancha`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="produccion-help-text">
                El modelo es independiente de la variante (ej: <b>Panda</b> sirve
                para A4/A5/tapa dura/blanda).
              </p>
            </div>
          )}

          {/* STICKERS: modo planchas */}
          {tipoMovimiento === "produccion" &&
          tipoBaseSel === "STICKER" &&
          modeloId &&
          unidadesPorPlancha > 0 ? (
            <>
              <div className="form-field">
                <label>Planchas buenas *</label>
                <input
                  type="number"
                  min="1"
                  value={planchasBuenas}
                  onChange={(e) => setPlanchasBuenas(e.target.value)}
                />
                <p className="produccion-help-text">
                  Se suman automáticamente:{" "}
                  <b>
                    {Number(planchasBuenas || 0) * unidadesPorPlancha || 0}
                  </b>{" "}
                  unidades.
                </p>
              </div>

              <div className="form-field">
                <label>Unidades buenas (override opcional)</label>
                <input
                  type="number"
                  min="1"
                  value={unidadesBuenasOverride}
                  onChange={(e) => setUnidadesBuenasOverride(e.target.value)}
                  placeholder="Si querés sobrescribir el cálculo"
                />
              </div>
            </>
          ) : (
            <div className="form-field">
              <label>Cantidad a sumar *</label>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
          )}

          {/* detalle para compras */}
          {tipoMovimiento === "compra" && (
            <div className="form-field">
              <label>Detalle de compra *</label>
              <input
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder='Ej: "7 Mafalda + 7 Ghibli" / "50 stickers Shein"'
              />
            </div>
          )}
        </div>

        {/* ✅ MATERIALES CONSUMIDOS (solo producción) */}
        {tipoMovimiento === "produccion" && (
          <div className="card form-subsection" style={{ marginTop: 12 }}>
            <h3>Materiales consumidos (opcional)</h3>
            <p className="text-xs">
              Si cargás consumos, al guardar se descuenta automáticamente del
              stock en Materiales.
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={addConsumoLine}
              >
                + Agregar material
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConsumos([])}
                disabled={consumos.length === 0}
              >
                Limpiar
              </button>
            </div>

            {consumos.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gap: 10,

                  // ✅ clave: lista con scroll interno
                  maxHeight: 320,
                  overflowY: "auto",
                  paddingRight: 6,
                }}
              >
                {consumos.map((c, idx) => {
                  const mat = materiales.find((m) => m.id === c.materialId);
                  const stock = Number(mat?.stock ?? 0);

                  return (
                    <div
                      key={`cons-${idx}`}
                      className="card"
                      style={{ padding: 12, display: "grid", gap: 8 }}
                    >
                      <div className="form-grid">
                        <div className="form-field">
                          <label>Material</label>
                          <select
                            value={c.materialId}
                            onChange={(e) =>
                              updateConsumoLine(idx, {
                                materialId: e.target.value,
                              })
                            }
                          >
                            <option value="">-- elegir material --</option>
                            {materiales.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nombre} · stock: {m.stock ?? 0}{" "}
                                {m.unidad ? `(${m.unidad})` : ""}
                              </option>
                            ))}
                          </select>
                          {mat && (
                            <p className="text-xs">
                              Stock actual: <b>{stock}</b>{" "}
                              {mat.unidad ? `(${mat.unidad})` : ""}
                            </p>
                          )}
                        </div>

                        <div className="form-field">
                          <label>Cantidad consumida</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={c.cantidad}
                            onChange={(e) =>
                              updateConsumoLine(idx, {
                                cantidad: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div
                        className="form-actions"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => removeConsumoLine(idx)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* ✅ ancla para auto-scroll */}
                <div ref={consumosEndRef} />
              </div>
            )}

            {consumos.length === 0 && (
              <p className="text-xs text-muted" style={{ marginTop: 8 }}>
                No cargaste consumos. La producción no descontará materiales.
              </p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Registrar
          </button>
          <button type="button" className="btn-secondary" onClick={loadDatos}>
            Recargar
          </button>
        </div>
      </FormSection>

      {/* ✅ LISTA de ingresos */}
      <section className="crud-section" style={{ marginTop: 16 }}>
        <header className="crud-section-header">
          <h2>Historial de ingresos</h2>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Tipo base</th>
                <th>Producto</th>
                <th>Modelo</th>
                <th>Cantidad</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {(movimientos || [])
                .slice()
                .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
                .map((m) => {
                  const prod = productosBase.find((p) => p.id === m.productoBaseId);
                  const mod = modelos.find((x) => x.id === m.modeloId);

                  const tipo = normTipoBase(prod?.tipoBase);

                  return (
                    <tr key={m.id}>
                      <td>{m.fecha ? new Date(m.fecha).toLocaleString() : "-"}</td>
                      <td>{m.tipoMovimiento === "compra" ? "Compra" : "Producción"}</td>
                      <td>{tipo ? humanTipo(tipo) : "—"}</td>
                      <td>{prod?.nombre || m.productoBaseId}</td>
                      <td>{mod?.nombreModelo || "—"}</td>
                      <td>{m.incrementoStock ?? m.cantidad ?? 0}</td>
                      <td>{m.detalle || "—"}</td>
                    </tr>
                  );
                })}

              {!loading && (!movimientos || movimientos.length === 0) && (
                <tr>
                  <td colSpan="7">Todavía no hay ingresos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
