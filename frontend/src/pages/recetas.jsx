// frontend/src/pages/recetas.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getRecetas,
  createReceta,
  updateReceta,
  deleteReceta,
  getProductos,
  getMateriales,
} from "../api";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../components/form/form.jsx";

export default function Recetas() {
  const [recetas, setRecetas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Alta
  const [form, setForm] = useState({
    productoId: "",
    materialId: "",
    cantidad: 0,
    unidad: "",
    tipoProduccion: "unidad",
  });

  // Filtro (por productoId o nombre)
  const [q, setQ] = useState("");

  // Edición
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    productoId: "",
    materialId: "",
    cantidad: 0,
    unidad: "",
    tipoProduccion: "unidad",
  });

  async function loadAll() {
    try {
      setError("");
      setLoading(true);

      const [recetasData, productosData, materialesData] = await Promise.all([
        getRecetas(),
        getProductos(),
        getMateriales(),
      ]);

      setRecetas(recetasData);
      setProductos(productosData);
      setMateriales(materialesData);
    } catch (e) {
      setError(e.message || "Error cargando recetas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "cantidad" ? Number(value) : value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setError("");

      if (!form.productoId || !form.materialId) {
        throw new Error("Debe seleccionar producto y material");
      }

      await createReceta(form);
      setForm({
        productoId: "",
        materialId: "",
        cantidad: 0,
        unidad: "",
        tipoProduccion: "unidad",
      });
      await loadAll();
    } catch (e) {
      setError(e.message || "Error creando receta");
    }
  }

  function startEdit(r) {
    setEditId(r.id);
    setEditForm({
      productoId: r.productoId || "",
      materialId: r.materialId || "",
      cantidad: Number(r.cantidad || 0),
      unidad: r.unidad || "",
      tipoProduccion: r.tipoProduccion || "unidad",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({
      productoId: "",
      materialId: "",
      cantidad: 0,
      unidad: "",
      tipoProduccion: "unidad",
    });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "cantidad" ? Number(value) : value,
    }));
  }

  async function saveEdit() {
    try {
      setError("");

      if (!editForm.productoId || !editForm.materialId) {
        throw new Error("Debe seleccionar producto y material");
      }

      await updateReceta(editId, editForm);
      cancelEdit();
      await loadAll();
    } catch (e) {
      setError(e.message || "Error actualizando receta");
    }
  }

  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar esta receta?");
    if (!ok) return;

    try {
      setError("");
      await deleteReceta(id);
      await loadAll();
    } catch (e) {
      setError(e.message || "Error eliminando receta");
    }
  }

  function findProducto(id) {
    return productos.find((p) => p.id === id);
  }

  function findMaterial(id) {
    return materiales.find((m) => m.id === id);
  }

  const recetasFiltradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return recetas;

    return recetas.filter((r) => {
      const prod = findProducto(r.productoId);
      const nombreProd = prod?.nombre || "";
      return (
        String(r.productoId || "").toLowerCase().includes(term) ||
        nombreProd.toLowerCase().includes(term)
      );
    });
  }, [recetas, q, productos]);

  function labelTipo(tipo) {
    if (tipo === "lote") return "Por lote/plancha";
    return "Por unidad";
  }

  return (
    <LayoutCrud
      title="Recetas (Producto ↔ Materiales)"
      description="Definí qué materiales y cantidades se usan para producir cada producto, por unidad o por lote/plancha."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}

      <FormSection
        title="Alta de receta"
        description="Configurá la relación entre un producto y los materiales que consume (por unidad o por lote/plancha)."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Producto *</label>
            <select
              name="productoId"
              value={form.productoId}
              onChange={onChange}
              required
            >
              <option value="">-- seleccionar producto --</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Tipo de producción *</label>
            <select
              name="tipoProduccion"
              value={form.tipoProduccion}
              onChange={onChange}
              required
            >
              <option value="unidad">Por unidad (cuadernos, etc.)</option>
              <option value="lote">Por lote/plancha (stickers, etc.)</option>
            </select>
          </div>

          <div className="form-field">
            <label>Material *</label>
            <select
              name="materialId"
              value={form.materialId}
              onChange={onChange}
              required
            >
              <option value="">-- seleccionar material --</option>
              {materiales.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Cantidad</label>
            <input
              name="cantidad"
              type="number"
              value={form.cantidad}
              onChange={onChange}
            />
          </div>

          <div className="form-field">
            <label>Unidad</label>
            <input
              name="unidad"
              value={form.unidad}
              onChange={onChange}
              placeholder="Ej: planchas / hojas / u"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Crear
          </button>
          <button type="button" className="btn-secondary" onClick={loadAll}>
            Recargar
          </button>
        </div>
      </FormSection>

      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Lista de recetas</h2>
          <div className="crud-filters">
            <label className="crud-filter-label">
              <span>Filtrar por producto (id o nombre)</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: prod-... o nombre"
              />
            </label>
          </div>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {recetasFiltradas.map((r) => {
                const isEditing = editId === r.id;
                const prod = findProducto(r.productoId);
                const mat = findMaterial(r.materialId);

                return (
                  <tr key={r.id}>
                    {/* Producto */}
                    <td>
                      {isEditing ? (
                        <select
                          name="productoId"
                          value={editForm.productoId}
                          onChange={onEditChange}
                          required
                        >
                          <option value="">-- seleccionar producto --</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.id})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <div>{prod?.nombre || "(producto no encontrado)"}</div>
                          <small>{r.productoId}</small>
                        </>
                      )}
                    </td>

                    {/* Tipo producción */}
                    <td>
                      {isEditing ? (
                        <select
                          name="tipoProduccion"
                          value={editForm.tipoProduccion}
                          onChange={onEditChange}
                          required
                        >
                          <option value="unidad">Por unidad</option>
                          <option value="lote">Por lote/plancha</option>
                        </select>
                      ) : (
                        labelTipo(r.tipoProduccion || "unidad")
                      )}
                    </td>

                    {/* Material */}
                    <td>
                      {isEditing ? (
                        <select
                          name="materialId"
                          value={editForm.materialId}
                          onChange={onEditChange}
                          required
                        >
                          <option value="">-- seleccionar material --</option>
                          {materiales.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} ({m.id})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <div>{mat?.nombre || "(material no encontrado)"}</div>
                          <small>{r.materialId}</small>
                        </>
                      )}
                    </td>

                    {/* Cantidad */}
                    <td>
                      {isEditing ? (
                        <input
                          name="cantidad"
                          type="number"
                          value={editForm.cantidad}
                          onChange={onEditChange}
                        />
                      ) : (
                        r.cantidad
                      )}
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
                        r.unidad
                      )}
                    </td>

                    {/* Acciones */}
                    <td>
                      {!isEditing ? (
                        <div className="crud-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => startEdit(r)}
                            title="Editar"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            className="icon-btn delete"
                            onClick={() => onDelete(r.id)}
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

              {!loading && recetasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="6">No hay recetas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
