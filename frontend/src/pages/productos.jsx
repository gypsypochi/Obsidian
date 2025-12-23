import { useEffect, useMemo, useState } from "react";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api";

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Alta
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    precio: 0,
    stock: 0,
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
    stock: 0,
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
      [name]:
        name === "stock" || name === "precio" ? Number(value) : value,
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
        stock: 0,
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
      stock: Number(p.stock || 0),
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
      stock: 0,
      unidad: "",
      proveedorId: "",
    });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]:
        name === "stock" || name === "precio" ? Number(value) : value,
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
    <div>
      <h1>Productos</h1>

      {loading && <p>Cargando...</p>}
      {error && <p>{error}</p>}

      <h2>Alta</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label>Nombre *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            placeholder="Ej: Sticker pack 10u"
            required
          />
        </div>

        <div>
          <label>Categoría</label>
          <input
            name="categoria"
            value={form.categoria}
            onChange={onChange}
            placeholder="Ej: stickers"
          />
        </div>

        <div>
          <label>Precio</label>
          <input
            name="precio"
            type="number"
            value={form.precio}
            onChange={onChange}
          />
        </div>

        <div>
          <label>Stock</label>
          <input
            name="stock"
            type="number"
            value={form.stock}
            onChange={onChange}
          />
        </div>

        <div>
          <label>Unidad</label>
          <input
            name="unidad"
            value={form.unidad}
            onChange={onChange}
            placeholder="Ej: u / packs"
          />
        </div>

        <div>
          <label>ProveedorId (opcional)</label>
          <input
            name="proveedorId"
            value={form.proveedorId}
            onChange={onChange}
            placeholder="Ej: prov-..."
          />
        </div>

        <button type="submit">Crear</button>
        <button type="button" onClick={load}>
          Recargar
        </button>
      </form>

      <h2>Lista</h2>

      <div>
        <label>Filtrar por nombre</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar..."
        />
      </div>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Unidad</th>
            <th>ProveedorId</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {productosFiltrados.map((p) => {
            const isEditing = editId === p.id;

            return (
              <tr key={p.id}>
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

                <td>
                  {isEditing ? (
                    <input
                      name="stock"
                      type="number"
                      value={editForm.stock}
                      onChange={onEditChange}
                    />
                  ) : (
                    p.stock
                  )}
                </td>

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

                <td>
                  {!isEditing ? (
                    <>
                      <button type="button" onClick={() => startEdit(p)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => onDelete(p.id)}>
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={saveEdit}>
                        Guardar
                      </button>
                      <button type="button" onClick={cancelEdit}>
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
  );
}
