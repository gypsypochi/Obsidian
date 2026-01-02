// frontend/src/pages/ventas/ventas.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getProductos,
  getVentas,
  createVenta,
  getFerias,
  getModelos,
} from "../../api";

import LayoutCrud from "../../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../../components/form/form.jsx";
import "./ventas.css";

const OPCIONES_CANAL = [
  { value: "feria", label: "Feria" },
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial / directo" },
];

/* Helper para texto de stock en el combo */
function getStockLabel(p) {
  const stock = Number(p.stock ?? 0);
  const base = `Stock: ${stock}`;
  if (p.controlStock === "sin_stock") {
    return `${base} · sin control auto`;
  }
  return base;
}

function formatMonto(numero) {
  const n = Number(numero) || 0;
  return n.toLocaleString("es-AR");
}

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [modelos, setModelos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState("");

  // Canal de venta
  const [canal, setCanal] = useState("feria");
  const [feriaId, setFeriaId] = useState("");
  const [origen, setOrigen] = useState("");

  // Detalle texto libre del modelo / diseño
  const [detalleModelo, setDetalleModelo] = useState("");

  // Controles para categoría y modelo (plancha / tapa)
  const [categoriaModelo, setCategoriaModelo] = useState("");
  const [modeloId, setModeloId] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const [prodData, ventasData, feriasData, modelosData] = await Promise.all(
        [getProductos(), getVentas(), getFerias(), getModelos()]
      );

      setProductos(prodData);
      setVentas(ventasData);

      const feriasOrdenadas = [...feriasData].sort((a, b) => {
        const fa = new Date(a.fecha).getTime();
        const fb = new Date(b.fecha).getTime();
        return fb - fa;
      });
      setFerias(feriasOrdenadas);
      setModelos(modelosData || []);
    } catch (e) {
      setError(e.message || "Error cargando datos de ventas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // producto seleccionado
  const productoSeleccionado = useMemo(
    () => productos.find((p) => p.id === productoId) || null,
    [productos, productoId]
  );

  // Si cambia el producto, reseteamos categoría y modelo
  useEffect(() => {
    setCategoriaModelo("");
    setModeloId("");
  }, [productoId]);

  // Si cambia el producto, seteamos precioUnitario por defecto
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

  const modelosDelProducto = useMemo(
    () => modelos.filter((m) => m.productoId === productoId),
    [modelos, productoId]
  );

  // Categorías únicas de esos modelos
  const categoriasDisponibles = useMemo(() => {
    const setCat = new Set(
      modelosDelProducto.map((m) => m.categoria).filter(Boolean)
    );
    return Array.from(setCat);
  }, [modelosDelProducto]);

  // Modelos filtrados por categoría elegida
  const modelosFiltradosPorCategoria = useMemo(() => {
    if (!categoriaModelo) return modelosDelProducto;
    return modelosDelProducto.filter((m) => m.categoria === categoriaModelo);
  }, [modelosDelProducto, categoriaModelo]);

  const ventasEnriquecidas = useMemo(() => {
    const mapaProductos = new Map(productos.map((p) => [p.id, p]));
    const mapaFerias = new Map(ferias.map((f) => [f.id, f]));
    const mapaModelos = new Map(modelos.map((m) => [m.id, m]));

    const lista = ventas.map((v) => {
      const prod = mapaProductos.get(v.productoId);
      const feria = v.feriaId ? mapaFerias.get(v.feriaId) : null;
      const modelo = v.modeloId ? mapaModelos.get(v.modeloId) : null;

      const nombreProducto = prod ? prod.nombre : v.productoId;
      const nombreFeria = feria ? feria.nombre : v.feriaId || null;

      const nombreModelo =
        (modelo && modelo.nombreModelo) || v.detalleModelo || null;

      const categoriaModeloMostrar =
        v.categoriaModelo || (modelo && modelo.categoria) || null;

      return {
        ...v,
        nombreProducto,
        nombreFeria,
        nombreModelo,
        categoriaModeloMostrar,
      };
    });

    lista.sort((a, b) => {
      const fa = new Date(a.fecha).getTime();
      const fb = new Date(b.fecha).getTime();
      return fb - fa;
    });

    return lista;
  }, [ventas, productos, ferias, modelos]);

  // Totales para la tarjetita tipo "Gastos"
  const totalMontoVentas = useMemo(
    () => ventas.reduce((acc, v) => acc + (v.montoTotal || 0), 0),
    [ventas]
  );

  const totalUnidadesVendidas = useMemo(
    () => ventas.reduce((acc, v) => acc + (v.cantidad || 0), 0),
    [ventas]
  );

  function formatFecha(fechaStr) {
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return fechaStr;
    return d.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

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

    if (canal === "feria" && !feriaId) {
      setError("Elegí la feria en la que estás vendiendo");
      return;
    }

    const ventaPayload = {
      productoId,
      cantidad: cantNum,
      precioUnitario: precioNum,
      canal,
      feriaId: canal === "feria" ? feriaId : null,
      origen: origen || null,
      detalleModelo: detalleModelo || null,
    };

    // Mandamos modeloId y categoriaModelo solo si se eligieron
    if (modeloId) ventaPayload.modeloId = modeloId;
    if (categoriaModelo) ventaPayload.categoriaModelo = categoriaModelo;

    try {
      const resp = await createVenta(ventaPayload);

      const prodSel =
        productos.find((p) => p.id === productoId) || productoSeleccionado;
      const controlStock = prodSel?.controlStock || "automatico";
      const nombreProd = prodSel?.nombre || "Producto";

      let textoMensajeBase = `Venta registrada: ${cantNum} unidad(es) de "${nombreProd}" a $${precioNum} c/u. Total: $${resp.venta.montoTotal}.`;

      if (controlStock === "automatico") {
        textoMensajeBase += ` Stock actual: ${
          resp.productoActualizado?.stock ?? "–"
        }.`;
      } else {
        textoMensajeBase +=
          " (Este producto no tiene control de stock automático).";
      }

      setMensaje(textoMensajeBase);

      setCantidad(1);
      // dejamos precio, canal, feria, detalle y modelo/categoría para cargar varias seguidas
      await load();
    } catch (e) {
      setError(e.message || "Error registrando venta");
    }
  }

  return (
    <LayoutCrud
      title="Ventas"
      description="Registrá tus ventas, asociándolas a productos, modelos y ferias para analizar mejor tu negocio."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}
      {mensaje && <p className="text-sm badge-success">{mensaje}</p>}

      {/* FORMULARIO DE ALTA */}
      <FormSection
        title="Registrar venta"
        description="Elegí un producto, completá los datos de la venta y el sistema actualiza el stock automáticamente."
        onSubmit={onSubmit}
      >
        {/* Datos principales de la venta */}
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
                  {p.nombre} ({getStockLabel(p)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Cantidad vendida *</label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Precio unitario</label>
            <input
              type="number"
              min="0"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
            />
            <p className="text-xs">
              Si dejás el valor que aparece, se usa el precio actual del
              producto. Podés ajustarlo para promos o ferias.
            </p>
          </div>
        </div>

        {/* Detalle de modelo / diseño (modelos asociados al producto) */}
        {productoId && modelosDelProducto.length > 0 && (
          <div className="card form-subsection">
            <h3>Detalle opcional de modelo / plancha / tapa</h3>

            <div className="form-grid">
              <div className="form-field">
                <label>Categoría de modelo</label>
                <select
                  value={categoriaModelo}
                  onChange={(e) => {
                    setCategoriaModelo(e.target.value);
                    setModeloId("");
                  }}
                >
                  <option value="">-- cualquiera --</option>
                  {categoriasDisponibles.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-xs">
                  Ej: Anime, Naturaleza, etc. Para cuadernos serían las
                  categorías de tapas; para stickers, las cajitas.
                </p>
              </div>

              <div className="form-field">
                <label>Modelo / plancha / tapa</label>
                <select
                  value={modeloId}
                  onChange={(e) => setModeloId(e.target.value)}
                >
                  <option value="">-- sin modelo específico --</option>
                  {modelosFiltradosPorCategoria.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombreModelo}
                      {m.categoria
                        ? ` (${m.categoria}${
                            m.subcategoria ? " - " + m.subcategoria : ""
                          })`
                        : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs">
                  Para cuadernos: elegí la tapa que vendiste. Para stickers:
                  elegí la plancha si sabés cuál fue.
                </p>
              </div>
            </div>

            <div className="form-field">
              <label>Detalle modelo / diseño (texto)</label>
              <input
                type="text"
                value={detalleModelo}
                onChange={(e) => setDetalleModelo(e.target.value)}
                placeholder="Ej: Tapa panda blanda, Caja Anime variada..."
              />
              <p className="text-xs">
                Podés usarlo como nota libre. Si elegís modelo/categoría arriba,
                igual queda todo guardado.
              </p>
            </div>
          </div>
        )}

        {/* Canal de venta */}
        <div className="card form-subsection">
          <h3>Canal de venta</h3>

          <div className="form-grid">
            <div className="form-field">
              <label>Canal *</label>
              <select
                value={canal}
                onChange={(e) => {
                  setCanal(e.target.value);
                  if (e.target.value !== "feria") {
                    setFeriaId("");
                  }
                }}
              >
                {OPCIONES_CANAL.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {canal === "feria" && (
              <div className="form-field">
                <label>Feria</label>
                <select
                  value={feriaId}
                  onChange={(e) => setFeriaId(e.target.value)}
                >
                  <option value="">-- elegir feria --</option>
                  {ferias.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} –{" "}
                      {new Date(f.fecha).toLocaleDateString("es-AR")} (
                      {f.estado})
                    </option>
                  ))}
                </select>
                <p className="text-xs">
                  Así enganchás todas las ventas de esa feria.
                </p>
              </div>
            )}

            {canal !== "feria" && (
              <div className="form-field">
                <label>Origen / detalle</label>
                <input
                  type="text"
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  placeholder={
                    canal === "online"
                      ? "Instagram, TikTok, tienda online..."
                      : "Conocido, pedido directo, etc."
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Registrar venta
          </button>
        </div>
      </FormSection>

      {/* TARJETA RESUMEN TIPO "GASTOS" */}
      <section className="crud-section">
        <div className="ventas-summary">
          <div className="card ventas-summary-card">
            <p className="text-xs text-muted">Monto total vendido</p>
            <p className="ventas-summary-main">
              ${formatMonto(totalMontoVentas)} ARS
            </p>
            <p className="text-xs ventas-summary-sub">
              Unidades vendidas:{" "}
              <strong>{totalUnidadesVendidas}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* HISTORIAL DE VENTAS */}
      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Historial de ventas</h2>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Monto total</th>
                <th>Modelo / diseño</th>
                <th>Categoría modelo</th>
                <th>Canal / Feria</th>
              </tr>
            </thead>
            <tbody>
              {ventasEnriquecidas.map((v) => {
                let canalTexto = "-";

                if (v.canal === "feria") {
                  canalTexto = `Feria: ${v.nombreFeria || "–"}`;
                } else if (v.canal === "online") {
                  canalTexto = `Online${v.origen ? " – " + v.origen : ""}`;
                } else if (v.canal === "presencial") {
                  canalTexto = `Presencial${
                    v.origen ? " – " + v.origen : ""
                  }`;
                }

                return (
                  <tr key={v.id}>
                    <td>{formatFecha(v.fecha)}</td>
                    <td>{v.nombreProducto}</td>
                    <td>{v.cantidad}</td>
                    <td>{v.precioUnitario}</td>
                    <td>{v.montoTotal}</td>
                    <td>{v.nombreModelo || "-"}</td>
                    <td>{v.categoriaModeloMostrar || "-"}</td>
                    <td>{canalTexto}</td>
                  </tr>
                );
              })}

              {!loading && ventasEnriquecidas.length === 0 && (
                <tr>
                  <td colSpan="8">No hay ventas registradas todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
