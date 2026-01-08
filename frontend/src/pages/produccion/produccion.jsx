// frontend/src/pages/produccion/produccion.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getProductosBase,
  getModelos,
  getProducciones,
  createProduccion,
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [productoBaseId, setProductoBaseId] = useState("");
  const [modeloId, setModeloId] = useState("");

  // ✅ nuevo: ingreso por “producción” o “compra”
  const [tipoMovimiento, setTipoMovimiento] = useState("produccion");

  // cantidad final a sumar
  const [cantidad, setCantidad] = useState(1);

  // ✅ sticker: planchas → unidades
  const [planchasBuenas, setPlanchasBuenas] = useState(1);
  const [unidadesBuenasOverride, setUnidadesBuenasOverride] = useState(""); // si querés override

  // compras: detalle libre
  const [detalle, setDetalle] = useState("");

  async function loadDatos() {
    try {
      setError("");
      setLoading(true);

      const [bases, mods, prodOps] = await Promise.all([
        getProductosBase(),
        getModelos(),
        getProducciones(),
      ]);

      setProductosBase(bases || []);
      setModelos(mods || []);
      setMovimientos(prodOps || []);
    } catch (e) {
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDatos();
  }, []);

  const baseSeleccionada = useMemo(
    () => productosBase.find((b) => b.id === productoBaseId),
    [productosBase, productoBaseId]
  );

  const tipoBaseSel = useMemo(
    () => normTipoBase(baseSeleccionada?.tipoBase),
    [baseSeleccionada]
  );

  const modelosDisponibles = useMemo(() => {
    if (!tipoBaseSel) return [];
    return modelos.filter(
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

  // si cambio a compra, modelo no aplica
  useEffect(() => {
    if (tipoMovimiento === "compra") setModeloId("");
  }, [tipoMovimiento]);

  async function onSubmit(e) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!productoBaseId) {
      setError("Tenés que elegir un producto base");
      return;
    }

    let cantFinal = Number(cantidad);

    // stickers: si hay modelo con unidadesPorPlancha, preferimos auto
    if (tipoBaseSel === "STICKER" && modeloId && unidadesPorPlancha > 0) {
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
          setError("Indicá planchas buenas (y que el modelo tenga unidades por plancha)");
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

    // compra: detalle recomendado
    if (tipoMovimiento === "compra" && !String(detalle || "").trim()) {
      setError("En compras, agregá un detalle (ej: 7 Mafalda + 7 Ghibli)");
      return;
    }

    try {
      const resp = await createProduccion({
        productoBaseId,
        tipoMovimiento,
        cantidad: cantFinal,
        modeloId: tipoMovimiento === "produccion" ? (modeloId || null) : null,
        detalle: String(detalle || "").trim(),
      });

      const nombreBase = resp?.productoBaseActualizado?.nombre || "Producto base";
      const stock = resp?.productoBaseActualizado?.stock;

      const nombreModelo =
        modeloId ? modelos.find((m) => m.id === modeloId)?.nombreModelo || "" : "";

      let txt = `${tipoMovimiento === "compra" ? "Compra registrada" : "Producción registrada"}: +${cantFinal} a "${nombreBase}"`;
      if (nombreModelo) txt += ` (modelo: ${nombreModelo})`;
      if (detalle) txt += ` · ${detalle}`;
      if (typeof stock === "number") txt += ` · Stock: ${stock}.`;

      setMensaje(txt);

      await loadDatos();

      // reset
      setCantidad(1);
      setModeloId("");
      setDetalle("");
      setPlanchasBuenas(1);
      setUnidadesBuenasOverride("");
    } catch (e) {
      setError(e.message || "Error registrando ingreso");
    }
  }

  return (
    <LayoutCrud
      title="Ingreso de stock"
      description="Sumá stock a tus variantes base. Puede ser por Producción o por Compra. Modelos se usan sólo cuando aplica."
    >
      <section className="crud-section">
        {loading && <p>Cargando...</p>}
        {error && <p className="crud-error">{error}</p>}
        {mensaje && <p className="produccion-mensaje-ok">{mensaje}</p>}
      </section>

      <FormSection
        title="Registrar ingreso"
        description="Elegí variante base. Si es sticker con modelo y unidades por plancha, se calcula automático."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Tipo de ingreso *</label>
            <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)}>
              <option value="produccion">Producción</option>
              <option value="compra">Compra</option>
            </select>
          </div>

          <div className="form-field">
            <label>Producto (variante base) *</label>
            <select
              value={productoBaseId}
              onChange={(e) => {
                setProductoBaseId(e.target.value);
                setModeloId("");
                setUnidadesBuenasOverride("");
                setPlanchasBuenas(1);
              }}
              required
            >
              <option value="">-- elegir producto base --</option>
              {productosBase.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre} · {humanTipo(b.tipoBase)} · stock: {b.stock ?? 0}
                </option>
              ))}
            </select>
          </div>

          {/* MODELO (solo producción y si tiene tipo) */}
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
                    {normTipoBase(m.productoBaseTipo) === "STICKER" && Number(m.unidadesPorPlancha || 0) > 0
                      ? ` · x${m.unidadesPorPlancha}/plancha`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="produccion-help-text">
                Los modelos se filtran por el <b>tipo</b> del producto seleccionado.
              </p>
            </div>
          )}

          {/* STICKERS: modo planchas */}
          {tipoMovimiento === "produccion" && tipoBaseSel === "STICKER" && modeloId && unidadesPorPlancha > 0 ? (
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
                  Se suman automáticamente: {Number(planchasBuenas || 0) * unidadesPorPlancha || 0} unidades.
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
                placeholder='Ej: "7 Mafalda + 7 Ghibli" / "50 stickers transparentes Shein"'
              />
            </div>
          )}
        </div>

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
                  const base = productosBase.find((p) => p.id === m.productoBaseId);
                  const mod = modelos.find((x) => x.id === m.modeloId);

                  return (
                    <tr key={m.id}>
                      <td>{m.fecha ? new Date(m.fecha).toLocaleString() : "-"}</td>
                      <td>{m.tipoMovimiento === "compra" ? "Compra" : "Producción"}</td>
                      <td>{base?.nombre || m.productoBaseId}</td>
                      <td>{mod?.nombreModelo || "—"}</td>
                      <td>{m.incrementoStock ?? m.cantidad ?? 0}</td>
                      <td>{m.detalle || "—"}</td>
                    </tr>
                  );
                })}

              {!loading && (!movimientos || movimientos.length === 0) && (
                <tr>
                  <td colSpan="6">Todavía no hay ingresos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
