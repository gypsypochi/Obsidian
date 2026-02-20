// frontend/src/pages/productos.jsx
import { useEffect, useMemo, useState } from "react";
import { getProductosBase, createProducto, updateProducto, deleteProducto } from "../api";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../components/form/form.jsx";

function getStockBadgeClass(stock) {
  const value = Number(stock ?? 0);
  if (value <= 0) return "stock-badge stock-badge-zero";
  if (value > 0 && value <= 5) return "stock-badge stock-badge-low";
  return "stock-badge";
}

function prettyLabel(value) {
  if (value === undefined || value === null) return "";
  const s = String(value).trim();
  if (!s) return "";
  return s
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/^\w|\s\w/g, (m) => m.toUpperCase());
}

const TIPOS_BASE = [
  "CUADERNO",
  "AGENDA",
  "STICKER",
  "IMAN",
  "PIN",
  "CALENDARIO",
  "PELUCHE",
  "OTRO",
];

const ORIGENES = ["propio", "comprado", "tercerizado"];

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");

  const [tipoBase, setTipoBase] = useState("CUADERNO");
  const [origen, setOrigen] = useState("propio");
  const [proveedorId, setProveedorId] = useState("");

  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [promoOn, setPromoOn] = useState(false);
  const [promoCantidad, setPromoCantidad] = useState(5);
  const [promoPrecioTotal, setPromoPrecioTotal] = useState(1000);

  const [activo, setActivo] = useState(true);

  // NUEVO para OTRO
  const [nombreManual, setNombreManual] = useState("");
  const [categoriaManual, setCategoriaManual] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getProductosBase();
      setProductos(data || []);
    } catch (e) {
      setError(e.message || "Error cargando productos base");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (origen === "propio") setProveedorId("");
  }, [origen]);

  function buildPricing() {
    const p = { unitario: Number(precioUnitario || 0), modo: "fijo" };
    if (promoOn) {
      p.promo = {
        cantidad: Number(promoCantidad || 0),
        precioTotal: Number(promoPrecioTotal || 0),
      };
    }
    return p;
  }

  function validate() {
    const t = String(tipoBase || "").toUpperCase();

    if (!t) return "Tenés que elegir un tipo base";
    if (Number(precioUnitario) < 0) return "Precio inválido";

    if ((origen === "comprado" || origen === "tercerizado") && !proveedorId.trim()) {
      return "Indicá proveedor";
    }

    if (t === "OTRO") {
      if (!nombreManual.trim()) return "Tenés que escribir el nombre del producto";
      if (!categoriaManual.trim()) return "Tenés que indicar la categoría";
    }

    if (promoOn) {
      if (Number(promoCantidad) <= 0) return "Promo: cantidad inválida";
      if (Number(promoPrecioTotal) <= 0) return "Promo: precio total inválido";
    }

    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const pricing = buildPricing();
    const isOtro = tipoBase === "OTRO";

    const payload = {
      esBase: true,
      tipoBase,
      activo,
      origen,
      proveedorId: proveedorId.trim(),
      attrs: {},
      pricing,
      precio: Number(pricing.unitario || 0),
      unidad: "unidad",
      categoria: isOtro ? categoriaManual.trim() : "",
      nombre: isOtro ? nombreManual.trim() : "",
    };

    try {
      await createProducto(payload);

      setPrecioUnitario(0);
      setPromoOn(false);
      setPromoCantidad(5);
      setPromoPrecioTotal(1000);
      setActivo(true);
      setProveedorId("");
      setNombreManual("");
      setCategoriaManual("");

      await load();
    } catch (e2) {
      setError(e2.message || "Error creando producto");
    }
  }

  async function toggleActivo(p) {
    try {
      await updateProducto(p.id, { activo: !p.activo, esBase: true });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onDelete(id) {
    if (!window.confirm("¿Eliminar este producto?")) return;
    try {
      await deleteProducto(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const productosFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) =>
      `${p.nombre} ${p.tipoBase} ${p.categoria}`.toLowerCase().includes(term)
    );
  }, [productos, q]);

  return (
    <LayoutCrud title="Productos base">
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}

      <FormSection title="Crear producto" onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label>Tipo base *</label>
            <select value={tipoBase} onChange={(e) => setTipoBase(e.target.value)}>
              {TIPOS_BASE.map((t) => (
                <option key={t} value={t}>{prettyLabel(t)}</option>
              ))}
            </select>
          </div>

          {tipoBase === "OTRO" && (
            <>
              <div className="form-field">
                <label>Nombre *</label>
                <input
                  value={nombreManual}
                  onChange={(e) => setNombreManual(e.target.value)}
                  placeholder="Ej: Box San Valentín"
                />
              </div>

              <div className="form-field">
                <label>Categoría *</label>
                <input
                  value={categoriaManual}
                  onChange={(e) => setCategoriaManual(e.target.value)}
                  placeholder="Ej: Edición limitada"
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label>Origen *</label>
            <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
              {ORIGENES.map((o) => (
                <option key={o} value={o}>{prettyLabel(o)}</option>
              ))}
            </select>
          </div>

          {(origen === "comprado" || origen === "tercerizado") && (
            <div className="form-field">
              <label>Proveedor *</label>
              <input
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                placeholder="Proveedor..."
              />
            </div>
          )}

          <div className="form-field">
            <label>Precio unitario</label>
            <input
              type="number"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={promoOn}
                onChange={(e) => setPromoOn(e.target.checked)}
              />
              Activar promo
            </label>
          </div>

          {promoOn && (
            <>
              <div className="form-field">
                <label>Cantidad promo</label>
                <input
                  type="number"
                  value={promoCantidad}
                  onChange={(e) => setPromoCantidad(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Precio total promo</label>
                <input
                  type="number"
                  value={promoPrecioTotal}
                  onChange={(e) => setPromoPrecioTotal(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              Activo
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">Crear</button>
        </div>
      </FormSection>

      <section className="crud-section">
        <h2>Lista</h2>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
        />

        <table className="crud-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{prettyLabel(p.tipoBase)}</td>
                <td>{p.categoria || "—"}</td>
                <td>{p.pricing?.unitario ?? p.precio}</td>
                <td>
                  <span className={getStockBadgeClass(p.stock)}>
                    {p.stock ?? 0}
                  </span>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={p.activo !== false}
                    onChange={() => toggleActivo(p)}
                  />
                </td>
                <td>
                  <button onClick={() => onDelete(p.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </LayoutCrud>
  );
}