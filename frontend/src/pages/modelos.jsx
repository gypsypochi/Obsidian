// frontend/src/pages/modelos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getModelos,
  createModelo,
  updateModelo,
  deleteModelo,
  uploadImagen,
  uploadPlancha,
  getProducciones,
  getProductosBase,
} from "../api";
import LayoutModels from "../components/layout-models/layout-models";
import { FormSection } from "../components/form/form";

function normTipoBase(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function humanTipo(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ✅ Fallback para que Modelos funcione aunque todavía no existan productos base creados
const TIPOS_FALLBACK = [
  "CUADERNO",
  "AGENDA",
  "STICKER",
  "IMAN",
  "PIN",
  "CALENDARIO",
  "PELUCHE",
  "OTRO",
];

export default function Modelos() {
  const [modelos, setModelos] = useState([]);
  const [producciones, setProducciones] = useState([]);
  const [productosBase, setProductosBase] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // ===== ALTA V2 =====
  const [form, setForm] = useState({
    productoBaseTipo: "",
    categoria: "",
    subcategoria: "",
    nombreModelo: "",
    imagenPreview: "",
    archivos: [], // [{label,tipo,url}]
    unidadesPorPlancha: "", // solo STICKER
  });

  // ===== EDICIÓN =====
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    productoBaseTipo: "",
    categoria: "",
    subcategoria: "",
    nombreModelo: "",
    imagenPreview: "",
    archivos: [],
    unidadesPorPlancha: "",
  });

  // Filtros
  const [fProductoBaseTipo, setFProductoBaseTipo] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fSubcategoria, setFSubcategoria] = useState("");
  const [fTexto, setFTexto] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const [mods, prodsHist, bases] = await Promise.all([
        getModelos(),
        getProducciones(),
        getProductosBase(),
      ]);
      setModelos(mods || []);
      setProducciones(prodsHist || []);
      setProductosBase(bases || []);
    } catch (e) {
      setError(e.message || "Error cargando modelos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ tipos de producto: dedupe de productos + fallback fijo
  const tiposDisponibles = useMemo(() => {
    const set = new Set(TIPOS_FALLBACK.map(normTipoBase));
    (productosBase || []).forEach((b) => {
      const t = normTipoBase(b?.tipoBase);
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [productosBase]);

  const formTipoNorm = useMemo(
    () => normTipoBase(form.productoBaseTipo),
    [form.productoBaseTipo]
  );
  const editTipoNorm = useMemo(
    () => normTipoBase(editForm.productoBaseTipo),
    [editForm.productoBaseTipo]
  );

  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImagenFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo imagen...");
      const data = await uploadImagen(file);
      setForm((prev) => ({ ...prev, imagenPreview: data.url }));
      setMensaje("Imagen subida correctamente.");
    } catch (err) {
      setError(err.message || "Error subiendo imagen");
      setMensaje("");
    }
  }

  async function handlePlanchaFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo PDF...");
      const data = await uploadPlancha(file);

      setForm((prev) => ({
        ...prev,
        archivos: [{ label: "Plancha", tipo: "pdf", url: data.url }],
      }));

      setMensaje("PDF subido correctamente.");
    } catch (err) {
      setError(err.message || "Error subiendo PDF");
      setMensaje("");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    const tipo = normTipoBase(form.productoBaseTipo);

    if (!tipo) {
      setError("Tenés que seleccionar el tipo (CUADERNO / STICKER / IMÁN / ...)");
      return;
    }

    if (!form.nombreModelo.trim()) {
      setError("Tenés que indicar un nombre de modelo/diseño");
      return;
    }

    let upp = 0;
    if (tipo === "STICKER") {
      if (String(form.unidadesPorPlancha).trim() !== "") {
        const n = Number(form.unidadesPorPlancha);
        if (Number.isNaN(n) || n <= 0) {
          setError("Unidades por plancha debe ser un número > 0");
          return;
        }
        upp = n;
      }
    }

    const payload = {
      productoBaseTipo: tipo, // ✅ normalizado
      categoria: form.categoria,
      subcategoria: form.subcategoria,
      nombreModelo: form.nombreModelo,
      imagenPreview: form.imagenPreview,
      archivos: form.archivos,
      unidadesPorPlancha: upp,
    };

    try {
      await createModelo(payload);
      setMensaje("Modelo creado correctamente.");
      setForm({
        productoBaseTipo: "",
        categoria: "",
        subcategoria: "",
        nombreModelo: "",
        imagenPreview: "",
        archivos: [],
        unidadesPorPlancha: "",
      });
      await load();
    } catch (e2) {
      setError(e2.message || "Error creando modelo");
    }
  }

  // ===== EDICIÓN =====
  function startEdit(m) {
    setEditId(m.id);

    const archivos =
      Array.isArray(m.archivos) && m.archivos.length > 0
        ? m.archivos
        : m.archivoPlancha
        ? [{ label: "Plancha", tipo: "pdf", url: m.archivoPlancha }]
        : [];

    setEditForm({
      productoBaseTipo: m.productoBaseTipo || "",
      categoria: m.categoria || "",
      subcategoria: m.subcategoria || "",
      nombreModelo: m.nombreModelo || "",
      imagenPreview: m.imagenPreview || m.imagenRef || "",
      archivos,
      unidadesPorPlancha:
        m.unidadesPorPlancha !== undefined && m.unidadesPorPlancha !== null
          ? String(m.unidadesPorPlancha)
          : "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({
      productoBaseTipo: "",
      categoria: "",
      subcategoria: "",
      nombreModelo: "",
      imagenPreview: "",
      archivos: [],
      unidadesPorPlancha: "",
    });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImagenFileChangeEdit(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo nueva imagen...");
      const data = await uploadImagen(file);
      setEditForm((prev) => ({ ...prev, imagenPreview: data.url }));
      setMensaje("Imagen actualizada.");
    } catch (err) {
      setError(err.message || "Error subiendo imagen");
      setMensaje("");
    }
  }

  async function handlePlanchaFileChangeEdit(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo nuevo PDF...");
      const data = await uploadPlancha(file);
      setEditForm((prev) => ({
        ...prev,
        archivos: [{ label: "Plancha", tipo: "pdf", url: data.url }],
      }));
      setMensaje("PDF actualizado.");
    } catch (err) {
      setError(err.message || "Error subiendo PDF");
      setMensaje("");
    }
  }

  async function saveEdit() {
    setError("");
    setMensaje("");

    const tipo = normTipoBase(editForm.productoBaseTipo);

    if (!editForm.nombreModelo.trim()) {
      setError("El nombre del modelo no puede estar vacío");
      return;
    }
    if (!tipo) {
      setError("Tipo base es obligatorio");
      return;
    }

    let upp = 0;
    if (tipo === "STICKER") {
      if (String(editForm.unidadesPorPlancha).trim() !== "") {
        const n = Number(editForm.unidadesPorPlancha);
        if (Number.isNaN(n) || n <= 0) {
          setError("Unidades por plancha debe ser un número > 0");
          return;
        }
        upp = n;
      }
    }

    const payload = {
      productoBaseTipo: tipo, // ✅ normalizado
      categoria: editForm.categoria,
      subcategoria: editForm.subcategoria,
      nombreModelo: editForm.nombreModelo,
      imagenPreview: editForm.imagenPreview,
      archivos: editForm.archivos,
      unidadesPorPlancha: upp,
    };

    try {
      await updateModelo(editId, payload);
      setMensaje("Modelo actualizado.");
      cancelEdit();
      await load();
    } catch (e2) {
      setError(e2.message || "Error actualizando modelo");
    }
  }

  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar este modelo/diseño?");
    if (!ok) return;

    try {
      setError("");
      setMensaje("");
      await deleteModelo(id);
      setMensaje("Modelo eliminado.");
      await load();
    } catch (e2) {
      setError(e2.message || "Error eliminando modelo");
    }
  }

  function handleClearFilters() {
    setFProductoBaseTipo("");
    setFCategoria("");
    setFSubcategoria("");
    setFTexto("");
  }

  // ===== STATS =====
  const mapaStatsModelos = useMemo(() => {
    const map = new Map();

    (producciones || []).forEach((p) => {
      if (!p.modeloId) return;

      const actual = map.get(p.modeloId) || { veces: 0, unidades: 0 };
      actual.veces += 1;

      // ✅ robusto con distintos campos y ceros
      const inc =
        (p.incrementoStock ?? p.unidadesBuenas ?? p.cantidad ?? 0);
      actual.unidades += Number(inc || 0);

      map.set(p.modeloId, actual);
    });

    return map;
  }, [producciones]);

  const opcionesCategoria = useMemo(
    () => Array.from(new Set(modelos.map((m) => m.categoria).filter(Boolean))).sort(),
    [modelos]
  );

  const opcionesSubcategoria = useMemo(
    () => Array.from(new Set(modelos.map((m) => m.subcategoria).filter(Boolean))).sort(),
    [modelos]
  );

  const modelosFiltrados = useMemo(() => {
    return modelos.filter((m) => {
      if (
        fProductoBaseTipo &&
        normTipoBase(m.productoBaseTipo) !== normTipoBase(fProductoBaseTipo)
      ) return false;

      if (
        fCategoria.trim() &&
        !String(m.categoria || "").toLowerCase().includes(fCategoria.trim().toLowerCase())
      ) return false;

      if (
        fSubcategoria.trim() &&
        !String(m.subcategoria || "").toLowerCase().includes(fSubcategoria.trim().toLowerCase())
      ) return false;

      if (fTexto.trim()) {
        const term = fTexto.trim().toLowerCase();
        const txt = String(m.nombreModelo || "").toLowerCase();
        if (!txt.includes(term)) return false;
      }

      return true;
    });
  }, [modelos, fProductoBaseTipo, fCategoria, fSubcategoria, fTexto]);

  function getPlanchaUrl(m) {
    if (Array.isArray(m.archivos) && m.archivos.length > 0) {
      const pdf =
        m.archivos.find((a) => (a.tipo || "").toLowerCase() === "pdf") ||
        m.archivos[0];
      return pdf?.url || "";
    }
    return m.archivoPlancha || "";
  }

  function getImagenUrl(m) {
    return m.imagenPreview || m.imagenRef || "";
  }

  return (
    <LayoutModels
      title="Modelos / Diseños"
      description="Modelos por TIPO general (CUADERNO/STICKER/IMÁN...). Para STICKER podés definir unidades por plancha."
    >
      <div className="models-page">
        <div className="models-status">
          {loading && <p className="models-message">Cargando modelos...</p>}
          {error && <p className="models-message models-message--error">{error}</p>}
          {mensaje && <p className="models-message models-message--success">{mensaje}</p>}
        </div>

        {/* ALTA */}
        <section className="models-section">
          <div className="models-form-wrapper">
            <FormSection
              title="Nuevo modelo"
              description="Elegí el tipo general y cargá imagen + PDF. (En stickers podés guardar unidades por plancha)."
              onSubmit={onSubmit}
            >
              <div className="models-form">
                <div className="models-form-grid">
                  <div className="form-field">
                    <label>Tipo base *</label>
                    <select
                      name="productoBaseTipo"
                      value={form.productoBaseTipo}
                      onChange={onFormChange}
                      required
                    >
                      <option value="">-- elegir tipo --</option>
                      {tiposDisponibles.map((t) => (
                        <option key={t} value={t}>
                          {humanTipo(t)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Categoría</label>
                    <input
                      name="categoria"
                      value={form.categoria}
                      onChange={onFormChange}
                      placeholder="Ej: Anime, Películas, Memes"
                    />
                  </div>

                  <div className="form-field">
                    <label>Subcategoría</label>
                    <input
                      name="subcategoria"
                      value={form.subcategoria}
                      onChange={onFormChange}
                      placeholder="Ej: Harry Potter, Memes argentinos"
                    />
                  </div>

                  <div className="form-field">
                    <label>Nombre del modelo / diseño *</label>
                    <input
                      name="nombreModelo"
                      value={form.nombreModelo}
                      onChange={onFormChange}
                      required
                      placeholder="Ej: Panda, Argentina 1..."
                    />
                  </div>

                  {formTipoNorm === "STICKER" && (
                    <div className="form-field">
                      <label>Unidades por plancha (stickers)</label>
                      <input
                        name="unidadesPorPlancha"
                        type="number"
                        min="1"
                        value={form.unidadesPorPlancha}
                        onChange={onFormChange}
                        placeholder="Ej: 25"
                      />
                      <p className="produccion-help-text">
                        Si lo completás, Producción suma automáticamente (planchas × unidades).
                      </p>
                    </div>
                  )}
                </div>

                <div className="models-form-uploads-row">
                  <div className="models-upload-group">
                    <input
                      id="modelo-imagen-nuevo"
                      type="file"
                      accept="image/*"
                      onChange={handleImagenFileChange}
                      className="upload-input"
                    />
                    <label htmlFor="modelo-imagen-nuevo" className="upload-button">
                      <span className="upload-button-label">Subir portada</span>
                    </label>
                    {form.imagenPreview && <small className="upload-hint">Archivo listo ✔</small>}
                  </div>

                  <div className="models-upload-group">
                    <input
                      id="modelo-plancha-nuevo"
                      type="file"
                      accept="application/pdf"
                      onChange={handlePlanchaFileChange}
                      className="upload-input"
                    />
                    <label htmlFor="modelo-plancha-nuevo" className="upload-button">
                      <span className="upload-button-label">Subir PDF</span>
                    </label>
                    {form.archivos.length > 0 && <small className="upload-hint">PDF listo ✔</small>}
                  </div>
                </div>

                <div className="models-form-actions">
                  <button type="submit" className="btn-primary">Crear modelo</button>
                  <button type="button" onClick={load} className="btn-secondary">Recargar</button>
                </div>
              </div>
            </FormSection>
          </div>
        </section>

        {/* CATÁLOGO */}
        <section className="models-section">
          <h2 className="models-subtitle">Catálogo de modelos</h2>

          <div className="models-filters">
            <div className="form-field">
              <label>Tipo base</label>
              <select value={fProductoBaseTipo} onChange={(e) => setFProductoBaseTipo(e.target.value)}>
                <option value="">Todos</option>
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {humanTipo(t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Categoría</label>
              <input
                value={fCategoria}
                onChange={(e) => setFCategoria(e.target.value)}
                placeholder="Anime / Películas / Memes..."
                list="categoriasOptions"
              />
              <datalist id="categoriasOptions">
                {opcionesCategoria.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="form-field">
              <label>Subcategoría</label>
              <input
                value={fSubcategoria}
                onChange={(e) => setFSubcategoria(e.target.value)}
                placeholder="Harry Potter / Flork..."
                list="subcategoriasOptions"
              />
              <datalist id="subcategoriasOptions">
                {opcionesSubcategoria.map((sub) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
            </div>

            <div className="form-field">
              <label>Buscar</label>
              <input value={fTexto} onChange={(e) => setFTexto(e.target.value)} placeholder="Nombre..." />
            </div>

            <div className="models-filters-clear">
              <button type="button" onClick={handleClearFilters} className="btn-secondary">
                Limpiar filtros
              </button>
            </div>
          </div>

          <div className="models-grid">
            {modelosFiltrados.map((m) => {
              const isEditing = editId === m.id;
              const stats = mapaStatsModelos.get(m.id);

              const imagenInputId = `modelo-imagen-edit-${m.id}`;
              const planchaInputId = `modelo-plancha-edit-${m.id}`;

              if (isEditing) {
                return (
                  <div key={m.id} className="model-card model-card--editing">
                    <h3 className="model-card__title">Editar modelo</h3>

                    <div className="form-grid model-card__edit-grid">
                      <div className="form-field">
                        <label>Tipo base *</label>
                        <select
                          name="productoBaseTipo"
                          value={editForm.productoBaseTipo}
                          onChange={onEditChange}
                          required
                        >
                          <option value="">-- elegir tipo --</option>
                          {tiposDisponibles.map((t) => (
                            <option key={t} value={t}>
                              {humanTipo(t)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field">
                        <label>Categoría</label>
                        <input name="categoria" value={editForm.categoria} onChange={onEditChange} />
                      </div>

                      <div className="form-field">
                        <label>Subcategoría</label>
                        <input name="subcategoria" value={editForm.subcategoria} onChange={onEditChange} />
                      </div>

                      <div className="form-field">
                        <label>Nombre modelo</label>
                        <input
                          name="nombreModelo"
                          value={editForm.nombreModelo}
                          onChange={onEditChange}
                          required
                        />
                      </div>

                      {editTipoNorm === "STICKER" && (
                        <div className="form-field">
                          <label>Unidades por plancha (stickers)</label>
                          <input
                            name="unidadesPorPlancha"
                            type="number"
                            min="1"
                            value={editForm.unidadesPorPlancha}
                            onChange={onEditChange}
                            placeholder="Ej: 25"
                          />
                        </div>
                      )}

                      <div className="form-field">
                        <label>Imagen</label>
                        <div className="models-upload-inline">
                          <input
                            id={imagenInputId}
                            type="file"
                            accept="image/*"
                            onChange={handleImagenFileChangeEdit}
                            className="upload-input"
                          />
                          <label htmlFor={imagenInputId} className="upload-button upload-button--small">
                            <span className="upload-button-label">Cambiar imagen</span>
                          </label>
                        </div>
                      </div>

                      <div className="form-field">
                        <label>PDF</label>
                        <div className="models-upload-inline">
                          <input
                            id={planchaInputId}
                            type="file"
                            accept="application/pdf"
                            onChange={handlePlanchaFileChangeEdit}
                            className="upload-input"
                          />
                          <label htmlFor={planchaInputId} className="upload-button upload-button--small">
                            <span className="upload-button-label">Cambiar PDF</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="model-card__edit-actions">
                      <button type="button" onClick={saveEdit} className="btn-primary">Guardar</button>
                      <button type="button" onClick={cancelEdit} className="btn-secondary">Cancelar</button>
                    </div>
                  </div>
                );
              }

              const imagenUrl = getImagenUrl(m);
              const planchaUrl = getPlanchaUrl(m);

              return (
                <div key={m.id} className="model-card">
                  <div className="model-card__actions">
                    <button type="button" onClick={() => startEdit(m)} className="icon-btn" title="Editar">✏️</button>
                    <button type="button" onClick={() => onDelete(m.id)} className="icon-btn icon-btn--danger" title="Eliminar">🗑️</button>
                  </div>

                  <div className="model-card__image-wrapper">
                    {imagenUrl ? (
                      <a href={imagenUrl} target="_blank" rel="noreferrer" title="Ver imagen">
                        <img src={imagenUrl} alt={m.nombreModelo} className="model-card__image" />
                      </a>
                    ) : (
                      <div className="model-card__image-placeholder">Sin imagen</div>
                    )}
                  </div>

                  <div className="model-card__body">
                    <h3 className="model-card__title">{m.nombreModelo}</h3>

                    <div className="model-card__tags">
                      {m.productoBaseTipo && (
                        <span className="model-card__tag model-card__tag--categoria">
                          {humanTipo(m.productoBaseTipo)}
                        </span>
                      )}
                      {m.categoria && (
                        <span className="model-card__tag model-card__tag--categoria">{m.categoria}</span>
                      )}
                      {m.subcategoria && (
                        <span className="model-card__tag model-card__tag--subcategoria">{m.subcategoria}</span>
                      )}
                      {normTipoBase(m.productoBaseTipo) === "STICKER" &&
                        Number(m.unidadesPorPlancha || 0) > 0 && (
                          <span className="model-card__tag">x{m.unidadesPorPlancha}/plancha</span>
                        )}
                    </div>

                    {stats && (
                      <p className="model-card__stats">
                        Producciones: {stats.veces} · Unidades: {stats.unidades}
                      </p>
                    )}

                    {planchaUrl && (
                      <p className="model-card__link">
                        <a href={planchaUrl} target="_blank" rel="noreferrer">Ver / imprimir PDF</a>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {!loading && modelosFiltrados.length === 0 && (
              <p className="models-empty">No hay modelos cargados.</p>
            )}
          </div>
        </section>
      </div>
    </LayoutModels>
  );
}
