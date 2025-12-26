// frontend/src/pages/ventas.jsx
import { useEffect, useMemo, useState } from "react";
import { getProductos, getVentas, createVenta } from "../api";

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const [prodData, ventasData] = await Promise.all([
        getProductos(),
        getVentas(),
      ]);
      setProductos(prodData);
      setVentas(ventasData);
    } catch (e) {
      setError(e.message || "Error cargando datos de ventas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Cuando cambia el producto, inicializamos el precio con el precio del producto
  useEffect(() => {
    if (!productoId) {
      setPrecioUnitario("");
      return;
    }
    const prod = productos.find((p) => p.id === productoId);
    if (prod) {
      setPrecioUnitario(prod.precio ?? 0);
    }
  }, [productoId, productos]);

  const ventasEnriquecidas = useMemo(() => {
    const mapaProductos = new Map(productos.map((p) => [p.id, p]));
    const lista = ventas.map((v) => {
      const prod = mapaProductos.get(v.productoId);
      return {
        ...v,
        nombreProducto: prod ? prod.nombre : v.productoId,
      };
    });

    // más recientes primero
    lista.sort((a, b) => {
      const fa = new Date(a.fecha).getTime();
      const fb = new Date(b.fecha).getTime();
      return fb - fa;
    });

    return lista;
  }, [ventas, productos]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!productoId) {
      setError("Tenés que elegir un producto");
      return;
    }

    const cantNum = Number(cantidad);
    if (Number.isNaN(cantNum) || cantNum <= 0) {
      setError("Cantidad debe ser un número mayor a 0");
      return;
    }

    const precioNum = Number(precioUnitario);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError("Precio unitario debe ser un número mayor o igual a 0");
      return;
    }

    const ventaPayload = {
      productoId,
      cantidad: cantNum,
      precioUnitario: precioNum,
    };

    try {
      const resp = await createVenta(ventaPayload);

      const nombreProd =
        productos.find((p) => p.id === productoId)?.nombre || "Producto";

      setMensaje(
        `Venta registrada: ${cantNum} unidad(es) de "${nombreProd}" a $${precioNum} c/u. Total: $${resp.venta.montoTotal}. Stock actual: ${resp.productoActualizado.stock}.`
      );

      setCantidad(1);
      // dejamos el precio igual por si vendés más al mismo precio

      await load();
    } catch (e) {
      setError(e.message || "Error registrando venta");
    }
  }

  return (
    <div>
      <h1>Ventas</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

      <h2>Registrar venta</h2>
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
          <label>Cantidad vendida *</label>
          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </div>

        <div>
          <label>Precio unitario</label>
          <input
            type="number"
            min="0"
            value={precioUnitario}
            onChange={(e) => setPrecioUnitario(e.target.value)}
          />
          <p style={{ fontSize: 12 }}>
            Si dejás el valor que aparece, se usa el precio actual del
            producto. Podés ajustarlo para promos o ferias.
          </p>
        </div>

        <button type="submit">Registrar venta</button>
      </form>

      <h2>Historial de ventas</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Monto total</th>
          </tr>
        </thead>
        <tbody>
          {ventasEnriquecidas.map((v) => (
            <tr key={v.id}>
              <td>
                {new Date(v.fecha).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td>{v.nombreProducto}</td>
              <td>{v.cantidad}</td>
              <td>{v.precioUnitario}</td>
              <td>{v.montoTotal}</td>
            </tr>
          ))}

          {!loading && ventasEnriquecidas.length === 0 && (
            <tr>
              <td colSpan="5">No hay ventas registradas todavía.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
