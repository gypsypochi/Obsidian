// frontend/src/pages/materiales.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getMateriales,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from "../api";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../components/form/form.jsx";

/* Helper para clases de stock */
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

export default function Materiales() {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Alta (sin stock, solo nombre / categoría / unidad)
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    unidad: "",
  });

  // Filtro
  const [q, setQ] = useState("");

  // Edición (sin stock)
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    categoria: "",
    unidad: "",
  });

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getMateriales();
      setMateriales(data);
    } catch (e) {
      setError(e.message || "Error cargando materiales");
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
      [name]: value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      await createMaterial(form);
      setForm({ nombre: "", categoria: "", unidad: "" });
      await load();
    } catch (e) {
      setError(e.message || "Error creando material");
    }
  }

  function startEdit(m) {
    setEditId(m.id);
    setEditForm({
      nombre: m.nombre || "",
      categoria: m.categoria || "",
      unidad: m.unidad || "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({ nombre: "", categoria: "", unidad: "" });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function saveEdit() {
    try {
      setError("");
      await updateMaterial(editId, editForm);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || "Error actualizando material");
    }
  }

  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar este material?");
    if (!ok) return;

    try {
      setError("");
      await deleteMaterial(id);
      await load();
    } catch (e) {
      setError(e.message || "Error eliminando material");
    }
  }

  const materialesFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return materiales;
    return materiales.filter((m) =>
      String(m.nombre || "").toLowerCase().includes(term)
    );
  }, [materiales, q]);

  return (
    <LayoutCrud
      title="Materiales"
      description="Base de todos los insumos que usás en el emprendimiento."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}

      {/* FORMULARIO DE ALTA */}
      <FormSection
        title="Alta de material"
        description="Cargá materiales sin stock inicial; el stock se actualiza con producción y consumos."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Nombre *</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              placeholder="Ej: vinilo mate"
              required
            />
          </div>

          <div className="form-field">
            <label>Categoría</label>
            <input
              name="categoria"
              value={form.categoria}
              onChange={onChange}
              placeholder="Ej: vinilos"
            />
          </div>

          <div className="form-field">
            <label>Unidad</label>
            <input
              name="unidad"
              value={form.unidad}
              onChange={onChange}
              placeholder="Ej: planchas, metros, ml..."
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
          <h2>Lista de materiales</h2>
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
                <th>Unidad</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {materialesFiltrados.map((m) => {
                const isEditing = editId === m.id;
                const stockValue = Number(m.stock ?? 0);

                return (
                  <tr key={m.id}>
                    <td>
                      {isEditing ? (
                        <input
                          name="nombre"
                          value={editForm.nombre}
                          onChange={onEditChange}
                          required
                        />
                      ) : (
                        m.nombre
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
                        m.categoria
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
                        m.unidad
                      )}
                    </td>

                    {/* Stock solo lectura con alarmas */}
                    <td>
                      <span className={getStockBadgeClass(stockValue)}>
                        {stockValue}
                      </span>
                    </td>

                    <td>
                      {!isEditing ? (
                        <div className="crud-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => startEdit(m)}
                            title="Editar"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            className="icon-btn delete"
                            onClick={() => onDelete(m.id)}
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

              {!loading && materialesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5">No hay materiales.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
