// frontend/src/pages/ferias.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getFerias,
  createFeria,
  updateFeria,
  deleteFeria,
  uploadImagen,
} from "../api";
import LayoutModels from "../components/layout-models/layout-models";
import { FormSection } from "../components/form/form";

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

  // Form alta
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

  // Edición
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

  // -------- CARGA --------
  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getFerias();
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

  // -------- FORM ALTA --------
  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFlyerFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo flyer...");
      const data = await uploadImagen(file);
      setForm((prev) => ({ ...prev, flyerUrl: data.url }));
      setMensaje("Flyer subido correctamente.");
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

  // -------- EDICIÓN --------
  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFlyerEditFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo flyer...");
      const data = await uploadImagen(file);
      setEditForm((prev) => ({ ...prev, flyerUrl: data.url }));
      setMensaje("Flyer actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error subiendo flyer");
      setMensaje("");
    }
  }

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

  function cancelEdit() {
    setEditId(null);
  }

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
      setFerias((prev) =>
        prev.map((f) => (f.id === editId ? actualizada : f))
      );
      setMensaje("Feria actualizada correctamente.");
      setEditId(null);
    } catch (e) {
      setError(e.message || "Error actualizando feria");
    }
  }

  // -------- ELIMINAR --------
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

  // -------- ESTADO DESDE TARJETA --------
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

  // -------- FILTROS --------
  function handleClearFilters() {
    setFEstado("");
  }

  const feriasFiltradas = useMemo(
    () =>
      ferias.filter((f) => {
        if (fEstado && f.estado !== fEstado) return false;
        return true;
      }),
    [ferias, fEstado]
  );

  // -------- HELPERS --------
  function formatFecha(fechaStr) {
    if (!fechaStr) return "-";
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return fechaStr;
    return d.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  // -------- RENDER --------
  return (
    <LayoutModels
      title="Ferias"
      description="Agenda y seguimiento de ferias, con estado, costos base, notas y flyer."
    >
      <div className="models-page">
        {/* Mensajes */}
        <div className="models-status">
          {loading && (
            <p className="models-message">Cargando ferias...</p>
          )}
          {error && (
            <p className="models-message models-message--error">
              {error}
            </p>
          )}
          {mensaje && (
            <p className="models-message models-message--success">
              {mensaje}
            </p>
          )}
        </div>

        {/* ALTA */}
        <section className="models-section">
          <div className="models-form-wrapper">
            <FormSection
              title="Nueva feria"
              description="Agendá una feria con fecha, lugar, costos base y flyer."
              onSubmit={onSubmit}
            >
              <div className="models-form">
                {/* FILA 1: 4 campos en la misma línea */}
                <div className="models-form-grid">
                  <div className="form-field">
                    <label>Nombre de la feria *</label>
                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={onFormChange}
                      placeholder="Ej: Pixel Market, Mercat..."
                    />
                  </div>

                  <div className="form-field">
                    <label>Fecha *</label>
                    <input
                      type="datetime-local"
                      name="fecha"
                      value={form.fecha}
                      onChange={onFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label>Lugar / espacio</label>
                    <input
                      name="lugar"
                      value={form.lugar}
                      onChange={onFormChange}
                      placeholder="Ej: Mercat de Villa Crespo"
                    />
                  </div>

                  <div className="form-field">
                    <label>Dirección</label>
                    <input
                      name="direccion"
                      value={form.direccion}
                      onChange={onFormChange}
                      placeholder="Ej: Thames 747, CABA"
                    />
                  </div>
                </div>

                {/* FILA 2: costo + notas */}
                <div className="fairs-row">
                  <div className="form-field">
                    <label>Costo base (stand / movilidad)</label>
                    <input
                      type="number"
                      name="costoBase"
                      value={form.costoBase}
                      onChange={onFormChange}
                      min="0"
                    />
                  </div>

                  <div className="form-field fairs-row__notes">
                    <label>Notas</label>
                    <textarea
                      name="notas"
                      value={form.notas}
                      onChange={onFormChange}
                      placeholder="Horarios, promos, sorteos, etc."
                      rows={3}
                    />
                  </div>
                </div>

                {/* FILA 3: subir flyer + estado */}
                <div className="fairs-row fairs-row--uploads">
                  <div className="fairs-upload-group">
                    <input
                      id="feria-flyer-nuevo"
                      type="file"
                      accept="image/*"
                      onChange={handleFlyerFileChange}
                      className="upload-input"
                    />
                    <label
                      htmlFor="feria-flyer-nuevo"
                      className="upload-button"
                    >
                      <span className="upload-button-label">
                        Subir flyer
                      </span>
                    </label>
                    {form.flyerUrl && (
                      <small className="upload-hint">
                        Flyer listo para usar ✔
                      </small>
                    )}
                  </div>

                  <div className="form-field fairs-estado-field">
                    <label>Estado de la feria</label>
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
                </div>

                {/* FILA 4: acciones */}
                <div className="models-form-actions">
                  <button type="submit" className="btn-primary">
                    Crear feria
                  </button>
                  <button
                    type="button"
                    onClick={load}
                    className="btn-secondary"
                  >
                    Recargar
                  </button>
                </div>
              </div>
            </FormSection>
          </div>
        </section>

        {/* LISTADO */}
        <section className="models-section">
          <h2 className="models-subtitle">Agenda de ferias</h2>

          {/* Filtros – una sola línea */}
          <div className="fairs-filters">
            <div className="form-field">
              <label>Estado</label>
              <select
                value={fEstado}
                onChange={(e) => setFEstado(e.target.value)}
              >
                <option value="">Todas</option>
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="fairs-filters-actions">
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-secondary"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="models-grid">
            {feriasFiltradas.map((f) => {
              const isEditing = editId === f.id;
              const estadoLabel =
                ESTADOS.find((e) => e.value === f.estado)?.label ||
                f.estado;

              if (isEditing) {
                return (
                  <div
                    key={f.id}
                    className="model-card model-card--editing"
                  >
                    <h3 className="model-card__title">Editar feria</h3>

                    <div className="model-card__image-wrapper">
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
                            className="model-card__image"
                          />
                        </a>
                      ) : (
                        <div className="model-card__image-placeholder">
                          Sin flyer
                        </div>
                      )}
                    </div>

                    <div className="model-card__body">
                      <div className="form-field">
                        <label>Nombre</label>
                        <input
                          name="nombre"
                          value={editForm.nombre}
                          onChange={onEditChange}
                        />
                      </div>

                      <div className="form-field">
                        <label>Fecha</label>
                        <input
                          type="datetime-local"
                          name="fecha"
                          value={editForm.fecha}
                          onChange={onEditChange}
                        />
                      </div>

                      <div className="form-field">
                        <label>Lugar</label>
                        <input
                          name="lugar"
                          value={editForm.lugar}
                          onChange={onEditChange}
                        />
                      </div>

                      <div className="form-field">
                        <label>Dirección</label>
                        <input
                          name="direccion"
                          value={editForm.direccion}
                          onChange={onEditChange}
                        />
                      </div>

                      <div className="form-field">
                        <label>Costo base</label>
                        <input
                          type="number"
                          name="costoBase"
                          value={editForm.costoBase}
                          onChange={onEditChange}
                        />
                      </div>

                      <div className="form-field">
                        <label>Estado</label>
                        <select
                          name="estado"
                          value={editForm.estado}
                          onChange={onEditChange}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e.value} value={e.value}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field">
                        <label>Notas</label>
                        <textarea
                          name="notas"
                          value={editForm.notas}
                          onChange={onEditChange}
                          rows={3}
                        />
                      </div>

                      <div className="form-field">
                        <label>Flyer (URL + archivo)</label>
                        <input
                          name="flyerUrl"
                          value={editForm.flyerUrl}
                          onChange={onEditChange}
                        />
                        <div className="models-upload-inline">
                          <input
                            id={`feria-flyer-edit-${f.id}`}
                            type="file"
                            accept="image/*"
                            onChange={handleFlyerEditFileChange}
                            className="upload-input"
                          />
                          <label
                            htmlFor={`feria-flyer-edit-${f.id}`}
                            className="upload-button upload-button--small"
                          >
                            <span className="upload-button-label">
                              Cambiar flyer
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="model-card__edit-actions">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="btn-primary"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              }

              // MODO NORMAL
              return (
                <div key={f.id} className="model-card">
                  {/* Acciones hover */}
                  <div className="model-card__actions">
                    <button
                      type="button"
                      onClick={() => startEdit(f)}
                      className="icon-btn"
                      title="Editar feria"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(f.id)}
                      className="icon-btn icon-btn--danger"
                      title="Eliminar feria"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Flyer */}
                  <div className="model-card__image-wrapper">
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
                          className="model-card__image"
                        />
                      </a>
                    ) : (
                      <div className="model-card__image-placeholder">
                        Sin flyer
                      </div>
                    )}
                  </div>

                  {/* Info feria */}
                  <div className="model-card__body">
                    <h3 className="model-card__title">{f.nombre}</h3>

                    <div className="model-card__tags">
                      <span
                        className={`fair-status fair-status--${f.estado}`}
                      >
                        {estadoLabel}
                      </span>
                    </div>

                    <p className="model-card__product">
                      Fecha: {formatFecha(f.fecha)}
                    </p>
                    {f.lugar && (
                      <p className="model-card__product">
                        Lugar: {f.lugar}
                      </p>
                    )}
                    {f.direccion && (
                      <p className="model-card__product">
                        Dirección: {f.direccion}
                      </p>
                    )}

                    {f.costoBase !== undefined &&
                      f.costoBase !== null &&
                      f.costoBase !== "" && (
                        <p className="model-card__stats">
                          Costo base: ${f.costoBase}
                        </p>
                      )}

                    {f.notas && (
                      <p
                        className="model-card__product"
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {f.notas}
                      </p>
                    )}

                    <div className="fair-status-inline">
                      <span>Cambiar estado:</span>
                      <select
                        value={f.estado}
                        onChange={(e) =>
                          handleEstadoChange(f.id, e.target.value)
                        }
                      >
                        {ESTADOS.map((e) => (
                          <option key={e.value} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && feriasFiltradas.length === 0 && (
              <p className="models-empty">No hay ferias cargadas.</p>
            )}
          </div>
        </section>
      </div>
    </LayoutModels>
  );
}
