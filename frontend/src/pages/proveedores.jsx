// frontend/src/pages/proveedores.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from "../api";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../components/form/form.jsx";

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
      setForm({
        nombre: "",
        contacto: "",
        telefono: "",
        email: "",
        notas: "",
      });
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
    setEditForm({
      nombre: "",
      contacto: "",
      telefono: "",
      email: "",
      notas: "",
    });
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
    <LayoutCrud
      title="Proveedores"
      description="Personas y empresas a las que les comprás materiales e insumos."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}

      {/* FORMULARIO DE ALTA */}
      <FormSection
        title="Alta de proveedor"
        description="Registrá proveedores con sus datos de contacto y notas de referencia."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Nombre *</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              placeholder="Ej: Papelera San Martín"
              required
            />
          </div>

          <div className="form-field">
            <label>Contacto</label>
            <input
              name="contacto"
              value={form.contacto}
              onChange={onChange}
              placeholder="Ej: Juan"
            />
          </div>

          <div className="form-field">
            <label>Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={onChange}
              placeholder="Ej: 11-1234-5678"
            />
          </div>

          <div className="form-field">
            <label>Email</label>
            <input
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="Ej: ventas@proveedor.com"
            />
          </div>

          <div className="form-field">
            <label>Notas</label>
            <input
              name="notas"
              value={form.notas}
              onChange={onChange}
              placeholder="Ej: entrega lunes/miércoles"
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
          <h2>Lista de proveedores</h2>
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

              {!loading && proveedoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6">No hay proveedores.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
