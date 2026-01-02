// frontend/src/pages/productos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../components/form/form.jsx";

/* Helper para clases de stock (igual que en Materiales) */
function getStockBadgeClass(stock) {
  const value = Number(stock ?? 0);

  if (value <= 0) {
    return "stock-badge stock-badge-zero"; // rojo
  }
  if (value > 0 && value <= 5) {
    return "stock-badge stock-badge-low"; // naranja
  }
  return "stock-badge"; // normal
}

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Alta
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    precio: 0,
    unidad: "",
    proveedorId: "",
  });

  // Filtro
  const [q, setQ] = useState("");

  // Edición
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    categoria: "",
    precio: 0,
    unidad: "",
    proveedorId: "",
  });

  async function load() {
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
    load();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "precio" ? Number(value) : value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      await createProducto(form);
      setForm({
        nombre: "",
        categoria: "",
        precio: 0,
        unidad: "",
        proveedorId: "",
      });
      await load();
    } catch (e) {
      setError(e.message || "Error creando producto");
    }
  }

  function startEdit(p) {
    setEditId(p.id);
    setEditForm({
      nombre: p.nombre || "",
      categoria: p.categoria || "",
      precio: Number(p.precio || 0),
      unidad: p.unidad || "",
      proveedorId: p.proveedorId || "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({
      nombre: "",
      categoria: "",
      precio: 0,
      unidad: "",
      proveedorId: "",
    });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "precio" ? Number(value) : value,
    }));
  }

  async function saveEdit() {
    try {
      setError("");
      await updateProducto(editId, editForm);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || "Error actualizando producto");
    }
  }

  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar este producto?");
    if (!ok) return;

    try {
      setError("");
      await deleteProducto(id);
      await load();
    } catch (e) {
      setError(e.message || "Error eliminando producto");
    }
  }

  const productosFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) =>
      String(p.nombre || "").toLowerCase().includes(term)
    );
  }, [productos, q]);

  return (
    <LayoutCrud
      title="Productos"
      description="Definí qué cosas vendés (sticker 5cm, cuaderno A5, imanes, pines, etc.) con su precio, unidad y origen."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}

      {/* FORMULARIO DE ALTA */}
      <FormSection
        title="Alta de producto"
        description="Cargá tus productos base. El stock se actualiza desde producción y ventas."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Nombre *</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              placeholder="Ej: Sticker 5cm, Cuaderno A5..."
              required
            />
          </div>

          <div className="form-field">
            <label>Categoría</label>
            <input
              name="categoria"
              value={form.categoria}
              onChange={onChange}
              placeholder="Ej: stickers, cuadernos, imanes..."
            />
          </div>

          <div className="form-field">
            <label>Precio</label>
            <input
              name="precio"
              type="number"
              value={form.precio}
              onChange={onChange}
            />
          </div>

          <div className="form-field">
            <label>Unidad</label>
            <input
              name="unidad"
              value={form.unidad}
              onChange={onChange}
              placeholder="Ej: unidad, pack, caja..."
            />
          </div>

          <div className="form-field">
            <label>Origen / proveedor (texto libre)</label>
            <input
              name="proveedorId"
              value={form.proveedorId}
              onChange={onChange}
              placeholder="Ej: Yo, Shein, Librería X..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Crear
          </button>
          <button type="button" className="btn-secondary" onClick={load}>
            Recargar
          </button>
        </div>
      </FormSection>

      {/* LISTA */}
      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Lista de productos</h2>
          <div className="crud-filters">
            <label className="crud-filter-label">
              <span>Filtrar por nombre</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="buscar..."
              />
            </label>
          </div>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Unidad</th>
                <th>Origen / proveedor</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((p) => {
                const isEditing = editId === p.id;
                const stockValue = Number(p.stock ?? 0);

                return (
                  <tr key={p.id}>
                    {/* Nombre */}
                    <td>
                      {isEditing ? (
                        <input
                          name="nombre"
                          value={editForm.nombre}
                          onChange={onEditChange}
                          required
                        />
                      ) : (
                        p.nombre
                      )}
                    </td>

                    {/* Categoría */}
                    <td>
                      {isEditing ? (
                        <input
                          name="categoria"
                          value={editForm.categoria}
                          onChange={onEditChange}
                        />
                      ) : (
                        p.categoria
                      )}
                    </td>

                    {/* Precio */}
                    <td>
                      {isEditing ? (
                        <input
                          name="precio"
                          type="number"
                          value={editForm.precio}
                          onChange={onEditChange}
                        />
                      ) : (
                        p.precio
                      )}
                    </td>

                    {/* Stock solo lectura con badge */}
                    <td>
                      <span className={getStockBadgeClass(stockValue)}>
                        {stockValue}
                      </span>
                    </td>

                    {/* Unidad */}
                    <td>
                      {isEditing ? (
                        <input
                          name="unidad"
                          value={editForm.unidad}
                          onChange={onEditChange}
                        />
                      ) : (
                        p.unidad
                      )}
                    </td>

                    {/* Origen / proveedor */}
                    <td>
                      {isEditing ? (
                        <input
                          name="proveedorId"
                          value={editForm.proveedorId}
                          onChange={onEditChange}
                        />
                      ) : (
                        p.proveedorId
                      )}
                    </td>

                    {/* Acciones */}
                    <td>
                      {!isEditing ? (
                        <div className="crud-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => startEdit(p)}
                            title="Editar"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            className="icon-btn delete"
                            onClick={() => onDelete(p.id)}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={saveEdit}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={cancelEdit}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7">No hay productos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
