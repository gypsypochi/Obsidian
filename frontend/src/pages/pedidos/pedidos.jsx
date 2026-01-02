// frontend/src/pages/pedidos/pedidos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getProductos,
  getPedidos,
  createPedido,
  updatePedido,
} from "../../api";
import LayoutCrud from "../../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../../components/form/form.jsx";
import "./pedidos.css";

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
    fechaLimite: "",
    canal: "",
    urgente: false, // se crea en false y luego se marca desde la lista
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
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "cantidad"
          ? Number(value)
          : value,
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
        fechaLimite: form.fechaLimite || null,
        canal: form.canal || null,
        urgente: false, // siempre se crea como NO urgente
      };

      await createPedido(payload);

      setMensaje("Pedido creado correctamente.");
      setForm({
        cliente: "",
        productoId: "",
        cantidad: 1,
        notas: "",
        fechaLimite: "",
        canal: "",
        urgente: false,
      });

      await load();
    } catch (e) {
      setError(e.message || "Error creando pedido");
    }
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyMs = hoy.getTime();

  const pedidosEnriquecidos = useMemo(() => {
    const mapaProductos = new Map(productos.map((p) => [p.id, p]));
    let lista = pedidos.map((ped) => {
      const item = ped.items && ped.items[0];
      const prod = item ? mapaProductos.get(item.productoId) : null;

      return {
        ...ped,
        productoNombre: prod ? prod.nombre : item?.productoId,
        cantidad: item?.cantidad ?? 0,
        urgente: Boolean(ped.urgente),
      };
    });

    // solo pedidos activos (no entregados ni cancelados)
    lista = lista.filter(
      (p) => p.estado !== "entregado" && p.estado !== "cancelado"
    );

    // Orden:
    // 1) urgentes primero
    // 2) fecha límite más cercana
    // 3) sin fecha límite → por fecha de creación (más nuevos arriba)
    lista.sort((a, b) => {
      if (a.urgente && !b.urgente) return -1;
      if (!a.urgente && b.urgente) return 1;

      const fa = a.fechaLimite ? new Date(a.fechaLimite).getTime() : null;
      const fb = b.fechaLimite ? new Date(b.fechaLimite).getTime() : null;

      if (fa && fb) return fa - fb;
      if (fa && !fb) return -1;
      if (!fa && fb) return 1;

      const ca = new Date(a.fechaCreacion).getTime();
      const cb = new Date(b.fechaCreacion).getTime();
      return cb - ca;
    });

    return lista;
  }, [pedidos, productos]);

  const resumen = useMemo(() => {
    let activos = 0;
    let vencidos = 0;
    let paraHoy = 0;
    let proximos3 = 0;

    pedidosEnriquecidos.forEach((ped) => {
      const esCerrado =
        ped.estado === "entregado" || ped.estado === "cancelado";

      if (!esCerrado) {
        activos++;
      }

      if (!ped.fechaLimite || esCerrado) return;

      const fLim = new Date(ped.fechaLimite);
      fLim.setHours(0, 0, 0, 0);
      const diffDias = Math.round(
        (fLim.getTime() - hoyMs) / (1000 * 60 * 60 * 24)
      );

      if (diffDias < 0 && !esCerrado) {
        vencidos++;
      } else if (diffDias === 0 && !esCerrado) {
        paraHoy++;
      } else if (diffDias > 0 && diffDias <= 3 && !esCerrado) {
        proximos3++;
      }
    });

    return { activos, vencidos, paraHoy, proximos3 };
  }, [pedidosEnriquecidos, hoyMs]);

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

  async function toggleUrgente(pedido) {
    setError("");
    setMensaje("");
    try {
      await updatePedido(pedido.id, { urgente: !pedido.urgente });
      await load();
    } catch (e) {
      setError(e.message || "Error actualizando urgencia");
    }
  }

  return (
    <LayoutCrud
      title="Pedidos"
      description="Organizá pedidos personalizados por prioridad, fecha límite y canal."
    >
      {/* Mensajes de sistema */}
      <section className="crud-section">
        {loading && <p>Cargando...</p>}
        {error && <p className="crud-error">{error}</p>}
        {mensaje && <p className="pedidos-mensaje-ok">{mensaje}</p>}
      </section>

      {/* Resumen rápido con tarjetitas */}
      <section className="crud-section">
        <div className="crud-section-header pedidos-summary-header">
          <h2>Resumen rápido</h2>
        </div>

        <div className="pedidos-summary-grid">
          <div className="pedidos-summary-card pedidos-summary-card--activos">
            <span className="pedidos-summary-label">Activos</span>
            <span className="pedidos-summary-value">{resumen.activos}</span>
          </div>

          <div className="pedidos-summary-card pedidos-summary-card--vencidos">
            <span className="pedidos-summary-label">Vencidos</span>
            <span className="pedidos-summary-value">{resumen.vencidos}</span>
          </div>

          <div className="pedidos-summary-card pedidos-summary-card--hoy">
            <span className="pedidos-summary-label">Para hoy</span>
            <span className="pedidos-summary-value">{resumen.paraHoy}</span>
          </div>

          <div className="pedidos-summary-card pedidos-summary-card--proximos">
            <span className="pedidos-summary-label">Próx. 3 días</span>
            <span className="pedidos-summary-value">{resumen.proximos3}</span>
          </div>
        </div>
      </section>

      {/* Formulario nuevo pedido con FormSection */}
      <FormSection
        title="Nuevo pedido"
        description="Cargá pedidos personalizados indicando producto, cantidad, canal y fecha límite."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Cliente</label>
            <input
              name="cliente"
              value={form.cliente}
              onChange={onFormChange}
              placeholder="Nombre del cliente o referencia"
            />
          </div>

          <div className="form-field">
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

          <div className="form-field">
            <label>Cantidad *</label>
            <input
              name="cantidad"
              type="number"
              min="1"
              value={form.cantidad}
              onChange={onFormChange}
            />
          </div>

          <div className="form-field">
            <label>Fecha límite de entrega</label>
            <input
              type="date"
              name="fechaLimite"
              value={form.fechaLimite}
              onChange={onFormChange}
            />
          </div>

          <div className="form-field">
            <label>Canal</label>
            <input
              name="canal"
              value={form.canal}
              onChange={onFormChange}
              placeholder="Instagram, Feria, WhatsApp, Local..."
            />
          </div>
        </div>

        <div className="form-field">
          <label>Notas</label>
          <textarea
            name="notas"
            value={form.notas}
            onChange={onFormChange}
            placeholder="Detalles del pedido, diseños, colores, etc."
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Crear pedido
          </button>
          <button type="button" className="btn-secondary" onClick={load}>
            Recargar
          </button>
        </div>
      </FormSection>

      {/* Lista de pedidos activos */}
      <section className="crud-section">
        <div className="crud-section-header">
          <h2>Lista de pedidos activos</h2>
        </div>

        <div className="crud-table-wrapper">
          <table className="crud-table pedidos-table">
            <thead>
              <tr>
                <th>Urgente</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Notas</th>
                <th className="pedidos-th-cantidad">Cant.</th>
                <th>Fecha</th>
                <th>Fecha límite</th>
                <th>Canal</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidosEnriquecidos.map((ped) => {
                const fLim = ped.fechaLimite ? new Date(ped.fechaLimite) : null;
                let esVencido = false;

                if (fLim) {
                  fLim.setHours(0, 0, 0, 0);
                  esVencido = fLim.getTime() < hoyMs;
                }

                const rowClass = [
                  "pedidos-row",
                  esVencido ? "is-vencido" : "",
                  ped.urgente ? "is-urgente" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={ped.id} className={rowClass}>
                    <td>
                      <input
                        type="checkbox"
                        checked={ped.urgente}
                        onChange={() => toggleUrgente(ped)}
                        title="Marcar/desmarcar urgente"
                      />
                    </td>
                    <td>{ped.cliente || "-"}</td>
                    <td>{ped.productoNombre}</td>
                    <td>{ped.notas || "-"}</td>
                    <td className="pedidos-td-cantidad">{ped.cantidad}</td>
                    <td>
                      {new Date(ped.fechaCreacion).toLocaleDateString("es-AR")}
                    </td>
                    <td>
                      {ped.fechaLimite
                        ? new Date(ped.fechaLimite).toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                    <td>{ped.canal || "-"}</td>
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
                  </tr>
                );
              })}

              {!loading && pedidosEnriquecidos.length === 0 && (
                <tr>
                  <td colSpan="9">No hay pedidos activos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
