// frontend/src/pages/produccion.jsx
import { useEffect, useState } from "react";
import { getProductos, createProduccion } from "../api";

export default function Produccion() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);

  async function loadProductos() {
    try {
      setError("");
      setLoading(true);
      const data = await getProductos();
      setProductos(data);
    } catch (e) {
      setError(e.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProductos();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!productoId) {
      setError("Tenés que elegir un producto");
      return;
    }

    const cantNum = Number(cantidad);
    if (isNaN(cantNum) || cantNum <= 0) {
      setError("Cantidad debe ser un número mayor a 0");
      return;
    }

    try {
      const resp = await createProduccion({
        productoId,
        cantidad: cantNum,
      });

      const nombreProd =
        productos.find((p) => p.id === productoId)?.nombre || "Producto";

      setMensaje(
        `Producción registrada: ${cantNum} (${resp.produccion.tipoProduccion}) de "${nombreProd}". Stock actual del producto: ${resp.productoActualizado.stock}.`
      );

      // Refrescamos productos para ver el nuevo stock en la tabla
      await loadProductos();
      setCantidad(1);
    } catch (e) {
      // Si el backend mandó detalles de faltantes, los mostramos
      const msgBase = e.message || "Error registrando producción";
      setError(msgBase);
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
                {p.nombre} (stock: {p.stock})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Cantidad a producir</label>
          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            min="1"
          />
          <p style={{ fontSize: 12 }}>
            Para productos con receta tipo <b>unidad</b>, la cantidad es en
            unidades.  
            Para recetas tipo <b>lote</b>, la cantidad es en lotes (ej: 3 lotes
            de stickers).
          </p>
        </div>

        <button type="submit">Registrar producción</button>
        <button type="button" onClick={loadProductos} style={{ marginLeft: 8 }}>
          Recargar productos
        </button>
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
