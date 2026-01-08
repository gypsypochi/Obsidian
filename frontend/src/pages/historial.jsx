// frontend/src/pages/historial.jsx
import { useEffect, useMemo, useState } from "react";
import { getHistorialStock, getProductos } from "../api";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";

const API_URL = "http://localhost:3001";

export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [productoFiltro, setProductoFiltro] = useState("");

  // UI deshacer (inline)
  const [undoOpenId, setUndoOpenId] = useState(null);
  const [undoMotivo, setUndoMotivo] = useState("");
  const [undoReponerMateriales, setUndoReponerMateriales] = useState(true);

  async function load() {
    try {
      setError("");
      setMensaje("");
      setLoading(true);
      const [histData, prodData] = await Promise.all([
        getHistorialStock(),
        getProductos(),
      ]);
      setHistorial(histData || []);
      setProductos(prodData || []);
    } catch (e) {
      setError(e.message || "Error cargando historial");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const historialEnriquecido = useMemo(() => {
    const mapaProductos = new Map(
      productos.map((p) => [p.id, p.nombre || p.id])
    );

    let datos = (historial || []).map((mov) => ({
      ...mov,
      nombreProducto: mapaProductos.get(mov.productoId) || mov.productoId,
    }));

    if (productoFiltro) {
      datos = datos.filter((m) => m.productoId === productoFiltro);
    }

    datos.sort((a, b) => {
      const fa = new Date(a.fecha).getTime();
      const fb = new Date(b.fecha).getTime();
      return fb - fa;
    });

    return datos;
  }, [historial, productos, productoFiltro]);

  function fmtFecha(iso) {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return String(iso);
    }
  }

  function badgeTipo(tipo) {
    const t = String(tipo || "").toLowerCase();
    if (t === "venta") return "Venta";
    if (t === "produccion") return "Producción";
    if (t === "compra") return "Compra";
    if (t === "reversion") return "Reversión";
    return tipo || "-";
  }

  function openUndo(mov) {
    setError("");
    setMensaje("");

    setUndoOpenId(mov.id);
    setUndoMotivo("");
    setUndoReponerMateriales(true);
  }

  function closeUndo() {
    setUndoOpenId(null);
    setUndoMotivo("");
    setUndoReponerMateriales(true);
  }

  async function confirmarDeshacer(mov) {
    try {
      setError("");
      setMensaje("");

      const motivo = String(undoMotivo || "").trim();
      if (!motivo) {
        setError("Escribí el motivo para deshacer (obligatorio).");
        return;
      }

      setWorkingId(mov.id);

      const res = await fetch(`${API_URL}/historial/${mov.id}/deshacer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo,
          reponerMateriales: Boolean(undoReponerMateriales),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Error deshaciendo movimiento");
      }

      const delta = data?.reversion?.cantidad;
      const prodStock = data?.productoStock?.stock;

      let msg = `✅ Movimiento deshecho. Se creó una reversión (${data?.reversion?.id}).`;
      if (typeof delta === "number") msg += ` Delta aplicado: ${delta}.`;
      if (typeof prodStock === "number") msg += ` Stock actual: ${prodStock}.`;

      const mats = Array.isArray(data?.materialesRepuestos)
        ? data.materialesRepuestos
        : [];
      if (mats.length > 0) msg += ` Materiales repuestos: ${mats.length} item(s).`;

      setMensaje(msg);

      closeUndo();
      await load();
    } catch (e) {
      setError(e.message || "Error deshaciendo movimiento");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <LayoutCrud
      title="Historial de Stock"
      description="Registro de movimientos. Si hay un error, podés deshacer creando una reversión auditada (sin borrar el historial)."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}
      {mensaje && <p className="produccion-mensaje-ok">{mensaje}</p>}

      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Movimientos de stock</h2>
          <div className="crud-filters">
            <label className="crud-filter-label">
              <span>Filtrar por producto</span>
              <select
                value={productoFiltro}
                onChange={(e) => setProductoFiltro(e.target.value)}
              >
                <option value="">Todos</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="btn-secondary"
              onClick={load}
              disabled={loading || workingId !== null}
            >
              Recargar
            </button>
          </div>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Stock antes</th>
                <th>Stock después</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {historialEnriquecido.map((mov) => {
                const isReversion =
                  String(mov.tipoMovimiento || "").toLowerCase() === "reversion";
                const yaRevertido = mov.revertido === true;

                const disabledDeshacer =
                  workingId !== null || isReversion || yaRevertido;

                // Si tu backend pone info en historial para saber si esa producción tuvo consumos,
                // podés usarlo acá. Si no existe, igual se muestra (y el backend decide).
                const tuvoConsumos =
                  Array.isArray(mov.materialesConsumidos) &&
                  mov.materialesConsumidos.length > 0;

                const mostrarCheckboxReponer =
                  String(mov.tipoMovimiento || "").toLowerCase() === "produccion";

                return (
                  <div key={mov.id} style={{ display: "contents" }}>
                    <tr>
                      <td>{fmtFecha(mov.fecha)}</td>
                      <td>{mov.nombreProducto}</td>
                      <td>{badgeTipo(mov.tipoMovimiento)}</td>
                      <td>{mov.cantidad}</td>
                      <td>{mov.stockAntes}</td>
                      <td>{mov.stockDespues}</td>

                      <td>
                        {isReversion ? (
                          <span className="stock-badge">REVERSION</span>
                        ) : yaRevertido ? (
                          <span className="stock-badge stock-badge-low">
                            REVERTIDO
                          </span>
                        ) : (
                          <span className="stock-badge">OK</span>
                        )}
                      </td>

                      <td>
                        {undoOpenId === mov.id ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={closeUndo}
                            disabled={workingId !== null}
                          >
                            Cerrar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={disabledDeshacer}
                            onClick={() => openUndo(mov)}
                            title={
                              isReversion
                                ? "No se puede deshacer una reversión"
                                : yaRevertido
                                ? "Ya fue deshecho"
                                : "Deshacer creando una reversión"
                            }
                          >
                            Deshacer
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Panel inline para deshacer (sin popups) */}
                    {undoOpenId === mov.id && !isReversion && !yaRevertido && (
                      <tr>
                        <td colSpan="8">
                          <div
                            className="card"
                            style={{
                              padding: 12,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "grid", gap: 6 }}>
                              <div className="text-xs">
                                Estás por deshacer:{" "}
                                <b>{badgeTipo(mov.tipoMovimiento)}</b> ·{" "}
                                <b>{mov.nombreProducto}</b> · cantidad{" "}
                                <b>{mov.cantidad}</b> · {fmtFecha(mov.fecha)}
                              </div>
                              <div className="text-xs text-muted">
                                Esto <b>no borra</b> el movimiento: crea una{" "}
                                <b>reversión</b> y lo marca como revertido.
                              </div>
                            </div>

                            <div className="form-field">
                              <label>Motivo (obligatorio)</label>
                              <input
                                value={undoMotivo}
                                onChange={(e) => setUndoMotivo(e.target.value)}
                                placeholder='Ej: "Me equivoqué al cargar la cantidad"'
                              />
                            </div>

                            {/* ✅ CHECKBOX MEJORADO (100% JSX, sin CSS externo) */}
                            {mostrarCheckboxReponer && (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  setUndoReponerMateriales((v) => !v)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setUndoReponerMateriales((v) => !v);
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  background:
                                    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                                  cursor:
                                    workingId !== null ? "not-allowed" : "pointer",
                                  opacity: workingId !== null ? 0.7 : 1,
                                  userSelect: "none",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                    minWidth: 0,
                                  }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    Reponer materiales automáticamente
                                  </div>

                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "rgba(229,231,235,0.70)",
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    Si esta producción descontó materiales, al deshacer se
                                    vuelven a sumar.
                                    {tuvoConsumos ? (
                                      <span style={{ marginLeft: 6, opacity: 0.9 }}>
                                        (Detectado: tenía consumos)
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {/* “Switch” simple sin CSS */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUndoReponerMateriales((v) => !v);
                                  }}
                                  disabled={workingId !== null}
                                  aria-pressed={undoReponerMateriales}
                                  style={{
                                    width: 46,
                                    height: 28,
                                    borderRadius: 999,
                                    border: "1px solid rgba(255,255,255,0.14)",
                                    background: undoReponerMateriales
                                      ? "rgba(167, 139, 250, 0.35)"
                                      : "rgba(255,255,255,0.08)",
                                    position: "relative",
                                    padding: 0,
                                    outline: "none",
                                    cursor:
                                      workingId !== null
                                        ? "not-allowed"
                                        : "pointer",
                                    flex: "0 0 auto",
                                  }}
                                >
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: 3,
                                      left: undoReponerMateriales ? 22 : 3,
                                      width: 22,
                                      height: 22,
                                      borderRadius: "50%",
                                      background: "rgba(255,255,255,0.92)",
                                      boxShadow:
                                        "0 4px 10px rgba(0,0,0,0.35)",
                                      transition: "left 160ms ease",
                                    }}
                                  />
                                </button>
                              </div>
                            )}

                            <div
                              className="form-actions"
                              style={{ justifyContent: "flex-end" }}
                            >
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={closeUndo}
                                disabled={workingId !== null}
                              >
                                Cancelar
                              </button>

                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => confirmarDeshacer(mov)}
                                disabled={workingId !== null}
                              >
                                {workingId === mov.id
                                  ? "Deshaciendo..."
                                  : "Confirmar deshacer"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </div>
                );
              })}

              {!loading && historialEnriquecido.length === 0 && (
                <tr>
                  <td colSpan="8">No hay movimientos de stock aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
