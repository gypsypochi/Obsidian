// frontend/src/pages/produccion/produccion.jsx
import { useEffect, useState } from "react";
import {
  getProductos,
  getRecetas,
  getModelos,
  getProducciones,
  createProduccion,
} from "../../api";
import LayoutCrud from "../../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../../components/form/form.jsx";
import "./produccion.css";

export default function Produccion() {
  const [productos, setProductos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [producciones, setProducciones] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [productoId, setProductoId] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [unidadesBuenas, setUnidadesBuenas] = useState("");
  const [tipoProduccion, setTipoProduccion] = useState("unidad");

  async function loadDatos() {
    try {
      setError("");
      setLoading(true);

      const [prodData, recData, modData, prodOpsData] = await Promise.all([
        getProductos(),
        getRecetas(),
        getModelos(),
        getProducciones(),
      ]);

      setProductos(prodData);
      setRecetas(recData);
      setModelos(modData);
      setProducciones(prodOpsData || []);
    } catch (e) {
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDatos();
  }, []);

  // Detectar automáticamente si el producto se produce por unidad o por lote
  useEffect(() => {
    if (!productoId) {
      setTipoProduccion("unidad");
      setModeloId("");
      return;
    }
    const recetaProd = recetas.find((r) => r.productoId === productoId);
    if (recetaProd && recetaProd.tipoProduccion) {
      setTipoProduccion(recetaProd.tipoProduccion);
    } else {
      setTipoProduccion("unidad");
    }
    setModeloId("");
  }, [productoId, recetas]);

  const modelosDelProducto = modelos.filter((m) => m.productoId === productoId);

  async function onSubmit(e) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!productoId) {
      setError("Tenés que elegir un producto");
      return;
    }

    const cantNum = Number(cantidad);
    if (Number.isNaN(cantNum) || cantNum <= 0) {
      setError("Cantidad debe ser un número mayor a 0");
      return;
    }

    const payload = {
      productoId,
      cantidad: cantNum,
    };

    if (modeloId) {
      payload.modeloId = modeloId;
    }

    if (tipoProduccion === "lote") {
      const ubNum = Number(unidadesBuenas);
      if (Number.isNaN(ubNum) || ubNum <= 0) {
        setError(
          "Para productos por lote, indicá cuántas unidades buenas vas a sumar"
        );
        return;
      }
      payload.unidadesBuenas = ubNum;
    }

    try {
      const resp = await createProduccion(payload);

      const prodSel = productos.find((p) => p.id === productoId);
      const nombreProd = prodSel?.nombre || "Producto";
      const controlStock = prodSel?.controlStock || "automatico";

      const nombreModelo = modeloId
        ? modelos.find((m) => m.id === modeloId)?.nombreModelo || ""
        : "";

      const etiquetaModelo = nombreModelo ? ` (modelo: ${nombreModelo})` : "";

      let textoBase = "";
      if (resp.produccion.tipoProduccion === "lote") {
        textoBase = `Producción registrada: ${resp.produccion.cantidad} lote(s)/plancha(s) de "${nombreProd}"${etiquetaModelo}, sumando ${resp.produccion.unidadesBuenas} unidades buenas.`;
      } else {
        textoBase = `Producción registrada: ${resp.produccion.cantidad} unidad(es) de "${nombreProd}"${etiquetaModelo}.`;
      }

      if (controlStock === "automatico") {
        textoBase += ` Stock actual del producto: ${resp.productoActualizado.stock}.`;
      } else {
        textoBase +=
          " (Este producto no tiene control de stock automático, el número de stock visible no se ajusta solo).";
      }

      setMensaje(textoBase);

      await loadDatos();
      setCantidad(1);
      setUnidadesBuenas("");
      setModeloId("");
    } catch (e) {
      setError(e.message || "Error registrando producción");
    }
  }

  return (
    <LayoutCrud
      title="Producción"
      description="Registrá producciones por unidad o por lote, vinculando productos y modelos/diseños."
    >
      {/* Mensajes de sistema */}
      <section className="crud-section">
        {loading && <p>Cargando...</p>}
        {error && <p className="crud-error">{error}</p>}
        {mensaje && <p className="produccion-mensaje-ok">{mensaje}</p>}
      </section>

      {/* Formulario principal */}
      <FormSection
        title="Registrar producción"
        description="Elegí el producto, (opcional) modelo/tapa, y la cantidad a producir. El sistema descuenta insumos y ajusta el stock."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Producto *</label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              required
            >
              <option value="">-- elegir producto --</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (stock: {p.stock}
                  {p.controlStock === "sin_stock" ? " · sin control auto" : ""})
                </option>
              ))}
            </select>
          </div>

          {productoId && (
            <div className="form-field">
              <label>Modelo / diseño (opcional)</label>
              <select
                value={modeloId}
                onChange={(e) => setModeloId(e.target.value)}
              >
                <option value="">-- sin modelo específico --</option>
                {modelosDelProducto.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombreModelo}{" "}
                    {m.categoria
                      ? `(${m.categoria}${
                          m.subcategoria ? " - " + m.subcategoria : ""
                        })`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="produccion-help-text">
                Podés asociar la producción a una plancha / tapa específica.
              </p>
            </div>
          )}

          {tipoProduccion === "lote" ? (
            <>
              <div className="form-field">
                <label>Lotes / planchas usadas</label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  min="1"
                />
                <p className="produccion-help-text">
                  Se usa para calcular el consumo de materiales.
                </p>
              </div>

              <div className="form-field">
                <label>Unidades buenas a stock</label>
                <input
                  type="number"
                  value={unidadesBuenas}
                  onChange={(e) => setUnidadesBuenas(e.target.value)}
                  min="1"
                />
                <p className="produccion-help-text">
                  Cuántos imanes/stickers buenos salieron (8, 9, 30, 31, 32...).
                </p>
              </div>
            </>
          ) : (
            <div className="form-field">
              <label>Cantidad a producir (unidades)</label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                min="1"
              />
              <p className="produccion-help-text">
                Para productos <b>unidad</b>, esto es lo que se suma al stock.
              </p>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Registrar producción
          </button>
        </div>
      </FormSection>

      {/* Acordeón de productos + modelos */}
      <section className="crud-section">
        <div className="crud-section-header produccion-accordion-header">
          <h2>Productos y modelos</h2>
        </div>

        {productos.length === 0 && !loading && (
          <p>No hay productos cargados.</p>
        )}

        <div className="produccion-accordion">
          {productos.map((p) => {
            const modelosDeEsteProducto = modelos.filter(
              (m) => m.productoId === p.id
            );
            const cantidadModelos = modelosDeEsteProducto.length;

            const nombreProdLower = (p.nombre || "").toLowerCase();
            const esCuaderno = nombreProdLower.includes("cuaderno");
            const esAutomatico = p.controlStock !== "sin_stock";

            return (
              <details key={p.id} className="produccion-accordion-item">
                <summary className="produccion-accordion-summary">
                  <div className="produccion-product-main">
                    <span className="produccion-product-name">{p.nombre}</span>
                    <span className="produccion-product-stock">
                      Stock: <b>{p.stock}</b>
                    </span>
                  </div>
                  <div className="produccion-product-tags">
                    <span className="produccion-badge produccion-badge--models">
                      {cantidadModelos} modelo(s)
                    </span>
                  </div>
                </summary>

                <div className="produccion-accordion-body">
                  {esCuaderno && cantidadModelos === 0 && (
                    <p className="produccion-warning produccion-warning--cuaderno">
                      ⚠️ Este cuaderno todavía no tiene modelos/tapas cargadas.
                      Con al menos 1 modelo ya estás OK.
                    </p>
                  )}

                  {cantidadModelos === 0 ? (
                    !esCuaderno && (
                      <p className="produccion-help-text">
                        Este producto todavía no tiene modelos/diseños cargados.
                      </p>
                    )
                  ) : (
                    <div className="produccion-model-cards">
                      {modelosDeEsteProducto.map((m) => {
                        const produccionesDeEsteModelo = producciones.filter(
                          (pr) => pr.modeloId === m.id
                        );

                        const unidadesProducidas =
                          produccionesDeEsteModelo.reduce(
                            (acc, pr) =>
                              acc + (Number(pr.incrementoStock) || 0),
                            0
                          );

                        const stockModelo = Number(m.stockModelo ?? 0);

                        return (
                          <div
                            key={m.id}
                            className="produccion-model-card"
                          >
                            <div className="produccion-model-card-header">
                              <strong>{m.nombreModelo}</strong>
                              {m.codigoInterno && (
                                <span className="produccion-model-code">
                                  Cod: {m.codigoInterno}
                                </span>
                              )}
                            </div>

                            <div className="produccion-model-card-body">
                              {m.categoria && (
                                <div className="produccion-model-line">
                                  {m.categoria}
                                  {m.subcategoria
                                    ? ` – ${m.subcategoria}`
                                    : ""}
                                </div>
                              )}

                              {esAutomatico && (
                                <div className="produccion-model-line">
                                  Stock actual de este modelo:{" "}
                                  <b>{stockModelo}</b>
                                </div>
                              )}

                              <div className="produccion-model-line">
                                Unidades producidas (histórico) para este
                                modelo: <b>{unidadesProducidas}</b>
                              </div>

                              {m.estado && (
                                <div className="produccion-model-line">
                                  Estado: {m.estado}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </LayoutCrud>
  );
}
