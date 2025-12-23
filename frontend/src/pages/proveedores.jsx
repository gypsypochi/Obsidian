import { useEffect, useMemo, useState } from "react";
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from "../api";

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Alta
  const [form, setForm] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
    notas: "",
  });

  // Filtro
  const [q, setQ] = useState("");

  // Edición
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
    notas: "",
  });

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getProveedores();
      setProveedores(data);
    } catch (e) {
      setError(e.message || "Error cargando proveedores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      await createProveedor(form);
      setForm({ nombre: "", contacto: "", telefono: "", email: "", notas: "" });
      await load();
    } catch (e) {
      setError(e.message || "Error creando proveedor");
    }
  }

  function startEdit(p) {
    setEditId(p.id);
    setEditForm({
      nombre: p.nombre || "",
      contacto: p.contacto || "",
      telefono: p.telefono || "",
      email: p.email || "",
      notas: p.notas || "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({ nombre: "", contacto: "", telefono: "", email: "", notas: "" });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveEdit() {
    try {
      setError("");
      await updateProveedor(editId, editForm);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || "Error actualizando proveedor");
    }
  }

  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar este proveedor?");
    if (!ok) return;

    try {
      setError("");
      await deleteProveedor(id);
      await load();
    } catch (e) {
      setError(e.message || "Error eliminando proveedor");
    }
  }

  const proveedoresFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return proveedores;
    return proveedores.filter((p) =>
      String(p.nombre || "").toLowerCase().includes(term)
    );
  }, [proveedores, q]);

  return (
    <div>
      <h1>Proveedores</h1>

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
            placeholder="Ej: Papelera San Martín"
            required
          />
        </div>

        <div>
          <label>Contacto</label>
          <input
            name="contacto"
            value={form.contacto}
            onChange={onChange}
            placeholder="Ej: Juan"
          />
        </div>

        <div>
          <label>Teléfono</label>
          <input
            name="telefono"
            value={form.telefono}
            onChange={onChange}
            placeholder="Ej: 11-1234-5678"
          />
        </div>

        <div>
          <label>Email</label>
          <input
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="Ej: ventas@proveedor.com"
          />
        </div>

        <div>
          <label>Notas</label>
          <input
            name="notas"
            value={form.notas}
            onChange={onChange}
            placeholder="Ej: entrega lunes/miércoles"
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
            <th>Contacto</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {proveedoresFiltrados.map((p) => {
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
                      name="contacto"
                      value={editForm.contacto}
                      onChange={onEditChange}
                    />
                  ) : (
                    p.contacto
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      name="telefono"
                      value={editForm.telefono}
                      onChange={onEditChange}
                    />
                  ) : (
                    p.telefono
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      name="email"
                      value={editForm.email}
                      onChange={onEditChange}
                    />
                  ) : (
                    p.email
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      name="notas"
                      value={editForm.notas}
                      onChange={onEditChange}
                    />
                  ) : (
                    p.notas
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

          {!loading && proveedoresFiltrados.length === 0 && (
            <tr>
              <td colSpan="6">No hay proveedores.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
