// frontend/src/pages/produccion.jsx
import { useEffect, useState } from "react";
import {
  getProductos,
  getRecetas,
  getModelos,
  getProducciones,
  createProduccion,
} from "../api";

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

    let payload = {
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
    <div>
      <h1>Producción</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

      <h2>Registrar producción</h2>

      <form onSubmit={onSubmit}>
        <div>
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
          <div>
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
            <p style={{ fontSize: 12 }}>
              Esto te permite registrar qué plancha / tapa se produjo.
            </p>
          </div>
        )}

        <div>
          {tipoProduccion === "lote" ? (
            <>
              <label>Cantidad de lotes / planchas usadas</label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                min="1"
              />
              <p style={{ fontSize: 12 }}>
                Esta cantidad se usa para calcular el consumo de materiales.
              </p>

              <label>Unidades buenas a sumar al stock</label>
              <input
                type="number"
                value={unidadesBuenas}
                onChange={(e) => setUnidadesBuenas(e.target.value)}
                min="1"
              />
              <p style={{ fontSize: 12 }}>
                Acá ponés cuántos imanes/stickers buenos salieron realmente
                (ej: 8, 9, 30, 31, 32...).
              </p>
            </>
          ) : (
            <>
              <label>Cantidad a producir (unidades)</label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                min="1"
              />
              <p style={{ fontSize: 12 }}>
                Para productos tipo <b>unidad</b>, esta cantidad es la que se
                suma al stock.
              </p>
            </>
          )}
        </div>

        <button type="submit">Registrar producción</button>
      </form>

      <h2 style={{ marginTop: "24px" }}>Productos y modelos</h2>

      {productos.length === 0 && !loading && <p>No hay productos.</p>}

      {productos.map((p) => {
        const modelosDeEsteProducto = modelos.filter(
          (m) => m.productoId === p.id
        );
        const cantidadModelos = modelosDeEsteProducto.length;

        const nombreProdLower = (p.nombre || "").toLowerCase();
        const esCuaderno = nombreProdLower.includes("cuaderno");
        const esAutomatico = p.controlStock !== "sin_stock";

        return (
          <details
            key={p.id}
            style={{
              marginBottom: "8px",
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid #333",
              background: "#111",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                padding: "10px 14px",
                background: "#1f2933",
                color: "#f9fafb",
                fontWeight: 600,
                listStyle: "none",
              }}
            >
              {p.nombre} · stock: {p.stock}
              {p.controlStock === "sin_stock" ? " · sin control auto" : ""}
            </summary>

            <div
              style={{
                padding: "10px 14px",
                background: "#111827",
                borderTop: "1px solid #333",
              }}
            >
              {esCuaderno && cantidadModelos === 0 && (
                <p
                  style={{
                    fontSize: 13,
                    marginBottom: 8,
                    padding: "6px 8px",
                    background: "#7c2d12",
                    color: "#fed7aa",
                    borderRadius: "4px",
                  }}
                >
                  ⚠️ Este cuaderno todavía no tiene ningún modelo/tapa
                  registrada. Con que tengas al menos 1 modelo ya estarías OK.
                </p>
              )}

              {cantidadModelos === 0 ? (
                !esCuaderno && (
                  <p style={{ fontSize: 13 }}>
                    Este producto todavía no tiene modelos/diseños cargados.
                  </p>
                )
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  {modelosDeEsteProducto.map((m) => {
                    const produccionesDeEsteModelo = producciones.filter(
                      (pr) => pr.modeloId === m.id
                    );

                    const unidadesProducidas = produccionesDeEsteModelo.reduce(
                      (acc, pr) => acc + (Number(pr.incrementoStock) || 0),
                      0
                    );

                    const stockModelo = Number(m.stockModelo ?? 0);

                    return (
                      <div
                        key={m.id}
                        style={{
                          border: "1px solid #4b5563",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          minWidth: "220px",
                          background: "#020617",
                          color: "#e5e7eb",
                        }}
                      >
                        <strong>{m.nombreModelo}</strong>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {m.categoria && (
                            <div>
                              {m.categoria}
                              {m.subcategoria ? ` – ${m.subcategoria}` : ""}
                            </div>
                          )}
                          {m.codigoInterno && (
                            <div>Código: {m.codigoInterno}</div>
                          )}

                          {esAutomatico && (
                            <div>
                              Stock actual de este modelo:{" "}
                              <b>{stockModelo}</b>
                            </div>
                          )}

                          <div>
                            Unidades producidas (histórico) para este modelo:{" "}
                            <b>{unidadesProducidas}</b>
                          </div>

                          {m.estado && <div>Estado: {m.estado}</div>}
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
  );
}
