// frontend/src/pages/produccion.jsx
import { useEffect, useState, useMemo } from "react";
import {
  getProductos,
  getRecetas,
  createProduccion,
  getModelos, // 👈 IMPORTANTE
} from "../api";

export default function Produccion() {
  const [productos, setProductos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [modelos, setModelos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1); // unidades o lotes
  const [unidadesBuenas, setUnidadesBuenas] = useState(""); // solo para lote
  const [tipoProduccion, setTipoProduccion] = useState("unidad");

  // NUEVO: modelo/diseño asociado
  const [modeloId, setModeloId] = useState("");

  async function loadDatos() {
    try {
      setError("");
      setLoading(true);
      const [prodData, recData, modData] = await Promise.all([
        getProductos(),
        getRecetas(),
        getModelos(),
      ]);
      setProductos(prodData);
      setRecetas(recData);
      setModelos(modData);
    } catch (e) {
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDatos();
  }, []);

  // Cada vez que cambia el producto seleccionado:
  // - determinamos su tipoProduccion
  // - reseteamos el modelo seleccionado
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

  // Modelos disponibles para el producto seleccionado
  const modelosDelProducto = useMemo(() => {
    if (!productoId) return [];
    return modelos.filter((m) => m.productoId === productoId);
  }, [modelos, productoId]);

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

    // ✅ Si hay modelo seleccionado, lo enviamos
    if (modeloId) {
      payload.modeloId = modeloId;
    }

    try {
      const resp = await createProduccion(payload);

      const nombreProd =
        productos.find((p) => p.id === productoId)?.nombre || "Producto";

      const modeloAsociado = resp.produccion.modeloId
        ? modelos.find((m) => m.id === resp.produccion.modeloId)
        : null;

      const textoModelo = modeloAsociado
        ? ` Modelo: "${modeloAsociado.nombreModelo}".`
        : "";

      if (resp.produccion.tipoProduccion === "lote") {
        setMensaje(
          `Producción registrada: ${resp.produccion.cantidad} lote(s)/plancha(s) de "${nombreProd}", sumando ${resp.produccion.unidadesBuenas} unidades buenas.${textoModelo} Stock actual del producto: ${resp.productoActualizado.stock}.`
        );
      } else {
        setMensaje(
          `Producción registrada: ${resp.produccion.cantidad} unidad(es) de "${nombreProd}".${textoModelo} Stock actual del producto: ${resp.productoActualizado.stock}.`
        );
      }

      // Refrescamos datos para ver el nuevo stock en la tabla
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

      {/* 👇 Línea de debug para que veas que se cargan modelos */}
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        Modelos totales cargados: {modelos.length}
      </p>

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
                {p.nombre} (stock: {p.stock})
              </option>
            ))}
          </select>
        </div>

        {/* 🔹 Ahora SIEMPRE mostramos el bloque de modelo/diseño */}
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <label>Modelo / diseño (opcional)</label>
          {productoId ? (
            modelosDelProducto.length > 0 ? (
              <>
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
                  Esto te permite registrar qué plancha/tapa exacta produjiste
                  (anime, HP, memes, etc.).
                </p>
              </>
            ) : (
              <p style={{ fontSize: 12, color: "#6b7280" }}>
                No hay modelos asociados a este producto. Podés cargarlos desde
                la sección <b>Modelos</b>.
              </p>
            )
          ) : (
            <p style={{ fontSize: 12, color: "#6b7280" }}>
              Elegí primero un producto para ver sus modelos disponibles.
            </p>
          )}
        </div>

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

      <h2>Productos (vista rápida de stock)</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Unidad</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{p.categoria}</td>
              <td>{p.precio}</td>
              <td>{p.stock}</td>
              <td>{p.unidad}</td>
            </tr>
          ))}

          {!loading && productos.length === 0 && (
            <tr>
              <td colSpan="5">No hay productos.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
