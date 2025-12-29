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

  // 🔹 NUEVO: datos de canal / origen
  const [origen, setOrigen] = useState("feria"); // feria / online / directo
  const [subCanal, setSubCanal] = useState(""); // p/ online: Instagram, WhatsApp...
  const [feriaNombre, setFeriaNombre] = useState(""); // nombre libre de la feria
  const [notasCanal, setNotasCanal] = useState("");

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
      origen, // feria / online / directo
      subCanal: origen === "online" ? subCanal : "",
      feriaNombre: origen === "feria" ? feriaNombre : "",
      notasCanal,
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
      // Reseteamos datos de canal pero no origen (así podés cargar varias seguidas del mismo tipo)
      setSubCanal("");
      setFeriaNombre("");
      setNotasCanal("");

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
            Si dejás el valor que aparece, se usa el precio actual del producto.
            Podés ajustarlo para promos o ferias.
          </p>
        </div>

        {/* 🔹 NUEVO: Canal / origen de la venta */}
        <fieldset
          style={{
            marginTop: 12,
            border: "1px solid #ccc",
            padding: 8,
          }}
        >
          <legend>Canal / origen</legend>

          <div>
            <label>Origen *</label>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
            >
              <option value="feria">Feria / evento</option>
              <option value="online">Online</option>
              <option value="directo">Directo / conocidos</option>
            </select>
          </div>

          {origen === "feria" && (
            <div>
              <label>Nombre de la feria</label>
              <input
                type="text"
                value={feriaNombre}
                onChange={(e) => setFeriaNombre(e.target.value)}
                placeholder="Ej: Pixel Market, Mercat, Random..."
              />
            </div>
          )}

          {origen === "online" && (
            <div>
              <label>Subcanal online</label>
              <input
                type="text"
                value={subCanal}
                onChange={(e) => setSubCanal(e.target.value)}
                placeholder="Ej: Instagram, WhatsApp, TiendaNube..."
              />
            </div>
          )}

          <div>
            <label>Notas del canal</label>
            <input
              type="text"
              value={notasCanal}
              onChange={(e) => setNotasCanal(e.target.value)}
              placeholder="Promo 2x1, venta a conocido, etc."
            />
          </div>
        </fieldset>

        <button type="submit" style={{ marginTop: 8 }}>
          Registrar venta
        </button>
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
            <th>Origen</th>         {/* 🔹 NUEVO */}
            <th>Detalle canal</th>  {/* 🔹 NUEVO */}
          </tr>
        </thead>
        <tbody>
          {ventasEnriquecidas.map((v) => {
            const origenMostrar = v.origen || "-";

            let detalleCanal = "-";
            if (v.origen === "feria" && v.feriaNombre) {
              detalleCanal = v.feriaNombre;
            } else if (v.origen === "online" && v.subCanal) {
              detalleCanal = v.subCanal;
            } else if (v.notasCanal) {
              detalleCanal = v.notasCanal;
            }

            return (
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
                <td>{origenMostrar}</td>
                <td>{detalleCanal}</td>
              </tr>
            );
          })}

          {!loading && ventasEnriquecidas.length === 0 && (
            <tr>
              <td colSpan="7">No hay ventas registradas todavía.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
