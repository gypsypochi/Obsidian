import { useEffect, useMemo, useState } from "react";
import {
  getMateriales,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from "../api";

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
      // 🔹 No enviamos stock, el backend lo inicializa en 0
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
      // 🔹 Tampoco mandamos stock en la edición, solo los datos básicos
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
    <div>
      <h1>Materiales</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Alta</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label>Nombre *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            placeholder="Ej: vinilo mate"
            required
          />
        </div>

        <div>
          <label>Categoría</label>
          <input
            name="categoria"
            value={form.categoria}
            onChange={onChange}
            placeholder="Ej: vinilos"
          />
        </div>

        <div>
          <label>Unidad</label>
          <input
            name="unidad"
            value={form.unidad}
            onChange={onChange}
            placeholder="Ej: planchas, metros, ml..."
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
            <th>Unidad</th>
            <th>Stock</th> {/* 🔹 Solo lectura */}
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {materialesFiltrados.map((m) => {
            const isEditing = editId === m.id;

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

                {/* Stock solo lectura: viene del backend (producción/gastos) */}
                <td>{m.stock}</td>

                <td>
                  {!isEditing ? (
                    <>
                      <button type="button" onClick={() => startEdit(m)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => onDelete(m.id)}>
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

          {!loading && materialesFiltrados.length === 0 && (
            <tr>
              <td colSpan="5">No hay materiales.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
