// frontend/src/pages/ferias.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getFerias,
  createFeria,
  updateFeria,
  deleteFeria,
  uploadImagen,
} from "../api";

const ESTADOS = [
  { value: "planeada", label: "Planeada" },
  { value: "realizada", label: "Realizada" },
  { value: "pospuesta", label: "Pospuesta" },
  { value: "cancelada", label: "Cancelada" },
];

export default function Ferias() {
  const [ferias, setFerias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Formulario alta
  const [form, setForm] = useState({
    nombre: "",
    fecha: "",
    lugar: "",
    direccion: "",
    costoBase: "",
    estado: "planeada",
    notas: "",
    flyerUrl: "",
  });

  // 🔹 NUEVO: edición
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    fecha: "",
    lugar: "",
    direccion: "",
    costoBase: "",
    estado: "planeada",
    notas: "",
    flyerUrl: "",
  });

  // Filtros
  const [fEstado, setFEstado] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getFerias();
      // ordenamos por fecha descendente
      data.sort((a, b) => {
        const fa = new Date(a.fecha).getTime();
        const fb = new Date(b.fecha).getTime();
        return fb - fa;
      });
      setFerias(data);
    } catch (e) {
      setError(e.message || "Error cargando ferias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // 🔹 NUEVO: cambios en formulario de edición
  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Subida de flyer (imagen) - ALTA
  async function handleFlyerFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo flyer...");
      const data = await uploadImagen(file);
      setForm((prev) => ({
        ...prev,
        flyerUrl: data.url,
      }));
      setMensaje("Flyer subido correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error subiendo flyer");
      setMensaje("");
    }
  }

  // 🔹 NUEVO: subida de flyer en EDICIÓN
  async function handleFlyerEditFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo flyer...");
      const data = await uploadImagen(file);
      setEditForm((prev) => ({
        ...prev,
        flyerUrl: data.url,
      }));
      setMensaje("Flyer actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error subiendo flyer");
      setMensaje("");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!form.nombre.trim()) {
      setError("Tenés que indicar un nombre de feria");
      return;
    }

    if (!form.fecha) {
      setError("Tenés que indicar una fecha");
      return;
    }

    const payload = {
      ...form,
      costoBase: form.costoBase ? Number(form.costoBase) : 0,
    };

    try {
      await createFeria(payload);
      setMensaje("Feria creada correctamente.");
      setForm({
        nombre: "",
        fecha: "",
        lugar: "",
        direccion: "",
        costoBase: "",
        estado: "planeada",
        notas: "",
        flyerUrl: "",
      });
      await load();
    } catch (e) {
      setError(e.message || "Error creando feria");
    }
  }

  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar esta feria?");
    if (!ok) return;
    setError("");
    setMensaje("");

    try {
      await deleteFeria(id);
      setMensaje("Feria eliminada.");
      await load();
    } catch (e) {
      setError(e.message || "Error eliminando feria");
    }
  }

  // Cambiar estado desde la tarjeta
  async function handleEstadoChange(id, nuevoEstado) {
    setError("");
    setMensaje("");

    const feriaActual = ferias.find((f) => f.id === id);
    if (!feriaActual) return;

    try {
      const actualizado = await updateFeria(id, {
        ...feriaActual,
        estado: nuevoEstado,
      });

      setFerias((prev) =>
        prev.map((f) => (f.id === id ? actualizado : f))
      );
      setMensaje("Estado de la feria actualizado.");
    } catch (e) {
      setError(e.message || "Error actualizando estado de la feria");
    }
  }

  // 🔹 NUEVO: entrar a modo edición
  function startEdit(feria) {
    setEditId(feria.id);
    setEditForm({
      nombre: feria.nombre || "",
      fecha: feria.fecha || "",
      lugar: feria.lugar || "",
      direccion: feria.direccion || "",
      costoBase:
        feria.costoBase !== undefined && feria.costoBase !== null
          ? feria.costoBase
          : "",
      estado: feria.estado || "planeada",
      notas: feria.notas || "",
      flyerUrl: feria.flyerUrl || "",
    });
  }

  // 🔹 NUEVO: cancelar edición
  function cancelEdit() {
    setEditId(null);
  }

  // 🔹 NUEVO: guardar cambios edición
  async function saveEdit() {
    if (!editForm.nombre.trim()) {
      setError("El nombre de la feria no puede estar vacío");
      return;
    }
    if (!editForm.fecha) {
      setError("La fecha es obligatoria");
      return;
    }

    setError("");
    setMensaje("");

    const payload = {
      ...editForm,
      costoBase: editForm.costoBase ? Number(editForm.costoBase) : 0,
    };

    try {
      const actualizada = await updateFeria(editId, payload);

      // actualizamos lista sin recargar si queremos
      setFerias((prev) =>
        prev.map((f) => (f.id === editId ? actualizada : f))
      );

      setMensaje("Feria actualizada correctamente.");
      setEditId(null);
    } catch (e) {
      setError(e.message || "Error actualizando feria");
    }
  }

  function handleClearFilters() {
    setFEstado("");
  }

  const feriasFiltradas = useMemo(() => {
    return ferias.filter((f) => {
      if (fEstado && f.estado !== fEstado) return false;
      return true;
    });
  }, [ferias, fEstado]);

  function formatFecha(fechaStr) {
    if (!fechaStr) return "-";
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return fechaStr;
    return d.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function getEstadoColor(estado) {
    switch (estado) {
      case "planeada":
        return "#60a5fa"; // azul
      case "realizada":
        return "#34d399"; // verde
      case "pospuesta":
        return "#fbbf24"; // amarillo
      case "cancelada":
        return "#f87171"; // rojo
      default:
        return "#9ca3af";
    }
  }

  return (
    <div>
      <h1>Ferias</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

      <h2>Nueva feria</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label>Nombre de la feria *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={onFormChange}
            placeholder="Ej: Pixel Market, Mercat, Feria Random..."
          />
        </div>

        <div>
          <label>Fecha *</label>
          <input
            type="datetime-local"
            name="fecha"
            value={form.fecha}
            onChange={onFormChange}
          />
        </div>

        <div>
          <label>Lugar / espacio</label>
          <input
            name="lugar"
            value={form.lugar}
            onChange={onFormChange}
            placeholder="Ej: Mercat de Villa Crespo"
          />
        </div>

        <div>
          <label>Dirección</label>
          <input
            name="direccion"
            value={form.direccion}
            onChange={onFormChange}
            placeholder="Ej: Thames 747, CABA"
          />
        </div>

        <div>
          <label>Costo base (stand / movilidad / etc)</label>
          <input
            type="number"
            name="costoBase"
            value={form.costoBase}
            onChange={onFormChange}
            min="0"
          />
        </div>

        <div>
          <label>Estado inicial</label>
          <select
            name="estado"
            value={form.estado}
            onChange={onFormChange}
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Flyer (URL o archivo)</label>
          <input
            name="flyerUrl"
            value={form.flyerUrl}
            onChange={onFormChange}
            placeholder="URL opcional si subís archivo"
          />
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFlyerFileChange}
            />
          </div>
        </div>

        <div>
          <label>Notas</label>
          <textarea
            name="notas"
            value={form.notas}
            onChange={onFormChange}
            placeholder="Horarios, promos, si se sortean entradas, etc."
          />
        </div>

        <button type="submit">Crear feria</button>
        <button
          type="button"
          onClick={load}
          style={{ marginLeft: 8 }}
        >
          Recargar
        </button>
      </form>

      <h2>Listado de ferias</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>
          Estado:
          <select
            value={fEstado}
            onChange={(e) => setFEstado(e.target.value)}
            style={{ marginLeft: 4 }}
          >
            <option value="">Todas</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleClearFilters}
          style={{ marginLeft: 8 }}
        >
          Limpiar filtros
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {feriasFiltradas.map((f) => {
          const isEditing = editId === f.id;

          if (isEditing) {
            // 🔹 MODO EDICIÓN EN TARJETA
            return (
              <div
                key={f.id}
                style={{
                  border: "1px solid #4b5563",
                  padding: 12,
                  width: 280,
                  background: "#111827",
                  color: "#f9fafb",
                  borderRadius: 4,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Editar feria</h3>

                {editForm.flyerUrl ? (
                  <a
                    href={editForm.flyerUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Ver flyer en grande"
                  >
                    <img
                      src={editForm.flyerUrl}
                      alt={editForm.nombre}
                      style={{
                        width: "100%",
                        height: 150,
                        objectFit: "cover",
                        marginBottom: 8,
                        borderRadius: 4,
                      }}
                    />
                  </a>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: 150,
                      background: "#4b5563",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#e5e7eb",
                      borderRadius: 4,
                    }}
                  >
                    Sin flyer
                  </div>
                )}

                <div>
                  <label>Nombre</label>
                  <input
                    name="nombre"
                    value={editForm.nombre}
                    onChange={onEditChange}
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                </div>

                <div>
                  <label>Fecha</label>
                  <input
                    type="datetime-local"
                    name="fecha"
                    value={editForm.fecha}
                    onChange={onEditChange}
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                </div>

                <div>
                  <label>Lugar</label>
                  <input
                    name="lugar"
                    value={editForm.lugar}
                    onChange={onEditChange}
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                </div>

                <div>
                  <label>Dirección</label>
                  <input
                    name="direccion"
                    value={editForm.direccion}
                    onChange={onEditChange}
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                </div>

                <div>
                  <label>Costo base</label>
                  <input
                    type="number"
                    name="costoBase"
                    value={editForm.costoBase}
                    onChange={onEditChange}
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                </div>

                <div>
                  <label>Estado</label>
                  <select
                    name="estado"
                    value={editForm.estado}
                    onChange={onEditChange}
                    style={{ width: "100%", marginBottom: 4 }}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Flyer (URL o archivo)</label>
                  <input
                    name="flyerUrl"
                    value={editForm.flyerUrl}
                    onChange={onEditChange}
                    style={{ width: "100%", marginBottom: 4 }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFlyerEditFileChange}
                    style={{ fontSize: 12, marginBottom: 4 }}
                  />
                </div>

                <div>
                  <label>Notas</label>
                  <textarea
                    name="notas"
                    value={editForm.notas}
                    onChange={onEditChange}
                    style={{ width: "100%", fontSize: 12 }}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={saveEdit}
                    style={{ fontSize: 12 }}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{ fontSize: 12, marginLeft: 6 }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            );
          }

          // 🔹 MODO NORMAL (igual al que tenías, con botón Editar agregado)
          return (
            <div
              key={f.id}
              style={{
                border: "1px solid #4b5563",
                padding: 12,
                width: 280,
                background: "#111827",
                color: "#f9fafb",
                borderRadius: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              {/* Flyer */}
              {f.flyerUrl ? (
                <a
                  href={f.flyerUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Ver flyer en grande"
                >
                  <img
                    src={f.flyerUrl}
                    alt={f.nombre}
                    style={{
                      width: "100%",
                      height: 150,
                      objectFit: "cover",
                      marginBottom: 8,
                      borderRadius: 4,
                    }}
                  />
                </a>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 150,
                    background: "#4b5563",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#e5e7eb",
                    borderRadius: 4,
                  }}
                >
                  Sin flyer
                </div>
              )}

              {/* Título + estado badge */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <strong
                  style={{
                    fontSize: 14,
                    color: "#f9fafb",
                    marginRight: 8,
                  }}
                >
                  {f.nombre}
                </strong>

                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: getEstadoColor(f.estado),
                    color: "#111827",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ESTADOS.find((e) => e.value === f.estado)?.label ||
                    f.estado}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                <div>Fecha: {formatFecha(f.fecha)}</div>
                {f.lugar && <div>Lugar: {f.lugar}</div>}
                {f.direccion && <div>Dirección: {f.direccion}</div>}
              </div>

              {f.costoBase !== undefined && f.costoBase !== null && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#d1d5db",
                    marginTop: 4,
                  }}
                >
                  Costo base: ${f.costoBase}
                </div>
              )}

              {f.notas && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#e5e7eb",
                    marginTop: 4,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {f.notas}
                </p>
              )}

              {/* Selector de estado inline */}
              <div style={{ marginTop: 8 }}>
                <label
                  style={{
                    fontSize: 11,
                    marginRight: 4,
                  }}
                >
                  Cambiar estado:
                </label>
                <select
                  value={f.estado}
                  onChange={(e) =>
                    handleEstadoChange(f.id, e.target.value)
                  }
                  style={{ fontSize: 12 }}
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => startEdit(f)}
                  style={{ fontSize: 12, marginRight: 6 }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(f.id)}
                  style={{ fontSize: 12 }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}

        {!loading && feriasFiltradas.length === 0 && (
          <p>No hay ferias cargadas.</p>
        )}
      </div>
    </div>
  );
}
