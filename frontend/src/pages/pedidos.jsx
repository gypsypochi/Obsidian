// frontend/src/pages/pedidos.jsx
import { useEffect, useMemo, useState } from "react";
import { getProductos, getPedidos, createPedido, updatePedido } from "../api";

const ESTADOS = [
  "pendiente",
  "en_produccion",
  "listo",
  "entregado",
  "cancelado",
];

export default function Pedidos() {
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({
    cliente: "",
    productoId: "",
    cantidad: 1,
    notas: "",
  });

  async function load() {
    try {
      setError("");
      setLoading(true);
      const [prodData, pedData] = await Promise.all([
        getProductos(),
        getPedidos(),
      ]);
      setProductos(prodData);
      setPedidos(pedData);
    } catch (e) {
      setError(e.message || "Error cargando pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "cantidad" ? Number(value) : value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!form.productoId) {
      setError("Tenés que elegir un producto");
      return;
    }

    if (!form.cantidad || form.cantidad <= 0) {
      setError("Cantidad debe ser mayor a 0");
      return;
    }

    try {
      const payload = {
        cliente: form.cliente,
        productoId: form.productoId,
        cantidad: form.cantidad,
        notas: form.notas,
      };

      await createPedido(payload);

      setMensaje("Pedido creado correctamente.");
      setForm({
        cliente: "",
        productoId: "",
        cantidad: 1,
        notas: "",
      });

      await load();
    } catch (e) {
      setError(e.message || "Error creando pedido");
    }
  }

  const pedidosEnriquecidos = useMemo(() => {
    const mapaProductos = new Map(productos.map((p) => [p.id, p]));
    const lista = pedidos.map((ped) => {
      const item = ped.items && ped.items[0];
      const prod = item ? mapaProductos.get(item.productoId) : null;
      return {
        ...ped,
        productoNombre: prod ? prod.nombre : item?.productoId,
        cantidad: item?.cantidad ?? 0,
      };
    });

    // orden por fecha (nuevos arriba)
    lista.sort((a, b) => {
      const fa = new Date(a.fechaCreacion).getTime();
      const fb = new Date(b.fechaCreacion).getTime();
      return fb - fa;
    });

    return lista;
  }, [pedidos, productos]);

  async function cambiarEstado(pedido, nuevoEstado) {
    setError("");
    setMensaje("");

    if (pedido.estado === nuevoEstado) return;

    if (nuevoEstado === "entregado") {
      const confirmar = window.confirm(
        "Marcar como ENTREGADO va a descontar stock y registrar una venta.\n¿Estás segura?"
      );
      if (!confirmar) return;
    }

    try {
      await updatePedido(pedido.id, { estado: nuevoEstado });
      setMensaje(`Estado de pedido actualizado a ${nuevoEstado}.`);
      await load();
    } catch (e) {
      setError(e.message || "Error actualizando pedido");
    }
  }

  return (
    <div>
      <h1>Pedidos</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

      <h2>Nuevo pedido</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label>Cliente</label>
          <input
            name="cliente"
            value={form.cliente}
            onChange={onFormChange}
            placeholder="Nombre del cliente o referencia"
          />
        </div>

        <div>
          <label>Producto *</label>
          <select
            name="productoId"
            value={form.productoId}
            onChange={onFormChange}
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
          <label>Cantidad *</label>
          <input
            name="cantidad"
            type="number"
            min="1"
            value={form.cantidad}
            onChange={onFormChange}
          />
        </div>

        <div>
          <label>Notas</label>
          <textarea
            name="notas"
            value={form.notas}
            onChange={onFormChange}
            placeholder="Detalles del pedido, diseños, colores, etc."
          />
        </div>

        <button type="submit">Crear pedido</button>
        <button type="button" onClick={load} style={{ marginLeft: 8 }}>
          Recargar
        </button>
      </form>

      <h2>Lista de pedidos</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Estado</th>
            <th>Notas</th>
            <th>Fecha entrega</th>
          </tr>
        </thead>
        <tbody>
          {pedidosEnriquecidos.map((ped) => (
            <tr key={ped.id}>
              <td>
                {new Date(ped.fechaCreacion).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td>{ped.cliente || "-"}</td>
              <td>{ped.productoNombre}</td>
              <td>{ped.cantidad}</td>
              <td>
                <select
                  value={ped.estado}
                  onChange={(e) => cambiarEstado(ped, e.target.value)}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </td>
              <td>{ped.notas || "-"}</td>
              <td>
                {ped.fechaEntrega
                  ? new Date(ped.fechaEntrega).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "-"}
              </td>
            </tr>
          ))}

          {!loading && pedidosEnriquecidos.length === 0 && (
            <tr>
              <td colSpan="7">No hay pedidos cargados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
