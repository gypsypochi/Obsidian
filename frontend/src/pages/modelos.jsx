// frontend/src/pages/modelos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getModelos,
  createModelo,
  updateModelo,
  deleteModelo,
  getProductos,
  uploadImagen,
  uploadPlancha,
  getProducciones,
} from "../api";
import LayoutModels from "../components/layout-models/layout-models";
import { FormSection } from "../components/form/form";

export default function Modelos() {
  const [modelos, setModelos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [producciones, setProducciones] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({
    productoId: "",
    categoria: "",
    subcategoria: "",
    nombreModelo: "",
    imagenRef: "",
    archivoPlancha: "",
  });

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    productoId: "",
    categoria: "",
    subcategoria: "",
    nombreModelo: "",
    imagenRef: "",
    archivoPlancha: "",
  });

  // Filtros
  const [fProductoBase, setFProductoBase] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fSubcategoria, setFSubcategoria] = useState("");
  const [fTexto, setFTexto] = useState("");

  // ---------- CARGA DE DATOS ----------
  async function load() {
    try {
      setError("");
      setLoading(true);
      const [mods, prods, prodsHist] = await Promise.all([
        getModelos(),
        getProductos(),
        getProducciones(),
      ]);
      setModelos(mods);
      setProductos(prods);
      setProducciones(prodsHist);
    } catch (e) {
      setError(e.message || "Error cargando modelos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ---------- FORMULARIO ALTA ----------
  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleImagenFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo imagen...");
      const data = await uploadImagen(file);
      setForm((prev) => ({
        ...prev,
        imagenRef: data.url,
      }));
      setMensaje("Imagen subida correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error subiendo imagen");
      setMensaje("");
    }
  }

  async function handlePlanchaFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo plancha...");
      const data = await uploadPlancha(file);
      setForm((prev) => ({
        ...prev,
        archivoPlancha: data.url,
      }));
      setMensaje("Plancha subida correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error subiendo plancha");
      setMensaje("");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!form.productoId) {
      setError("Tenés que seleccionar un producto base");
      return;
    }

    if (!form.nombreModelo.trim()) {
      setError("Tenés que indicar un nombre de modelo/plancha");
      return;
    }

    try {
      await createModelo(form);
      setMensaje("Modelo creado correctamente.");
      setForm({
        productoId: "",
        categoria: "",
        subcategoria: "",
        nombreModelo: "",
        imagenRef: "",
        archivoPlancha: "",
      });
      await load();
    } catch (e) {
      setError(e.message || "Error creando modelo");
    }
  }

  // ---------- EDICIÓN ----------
  function startEdit(m) {
    setEditId(m.id);
    setEditForm({
      productoId: m.productoId || "",
      categoria: m.categoria || "",
      subcategoria: m.subcategoria || "",
      nombreModelo: m.nombreModelo || "",
      imagenRef: m.imagenRef || "",
      archivoPlancha: m.archivoPlancha || "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({
      productoId: "",
      categoria: "",
      subcategoria: "",
      nombreModelo: "",
      imagenRef: "",
      archivoPlancha: "",
    });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleImagenFileChangeEdit(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo nueva imagen...");
      const data = await uploadImagen(file);
      setEditForm((prev) => ({
        ...prev,
        imagenRef: data.url,
      }));
      setMensaje("Imagen actualizada.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error subiendo imagen");
      setMensaje("");
    }
  }

  async function handlePlanchaFileChangeEdit(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError("");
      setMensaje("Subiendo nueva plancha...");
      const data = await uploadPlancha(file);
      setEditForm((prev) => ({
        ...prev,
        archivoPlancha: data.url,
      }));
      setMensaje("Plancha actualizada.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error subiendo plancha");
      setMensaje("");
    }
  }

  async function saveEdit() {
    setError("");
    setMensaje("");

    if (!editForm.nombreModelo.trim()) {
      setError("El nombre del modelo no puede estar vacío");
      return;
    }

    try {
      await updateModelo(editId, editForm);
      setMensaje("Modelo actualizado.");
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.message || "Error actualizando modelo");
    }
  }

  // ---------- ELIMINAR ----------
  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar este modelo/diseño?");
    if (!ok) return;
    setError("");
    setMensaje("");

    try {
      await deleteModelo(id);
      setMensaje("Modelo eliminado.");
      await load();
    } catch (e) {
      setError(e.message || "Error eliminando modelo");
    }
  }

  // ---------- LIMPIAR FILTROS ----------
  function handleClearFilters() {
    setFProductoBase("");
    setFCategoria("");
    setFSubcategoria("");
    setFTexto("");
  }

  // ---------- MAPAS Y STATS ----------
  const mapaProductos = useMemo(
    () => new Map(productos.map((p) => [p.id, p])),
    [productos]
  );

  const opcionesCategoria = useMemo(
    () =>
      Array.from(
        new Set(modelos.map((m) => m.categoria).filter(Boolean))
      ).sort(),
    [modelos]
  );

  const opcionesSubcategoria = useMemo(
    () =>
      Array.from(
        new Set(modelos.map((m) => m.subcategoria).filter(Boolean))
      ).sort(),
    [modelos]
  );

  const mapaStatsModelos = useMemo(() => {
    const map = new Map();

    producciones.forEach((p) => {
      if (!p.modeloId) return;

      const actual = map.get(p.modeloId) || { veces: 0, unidades: 0 };
      actual.veces += 1;

      let inc = 0;
      if (typeof p.incrementoStock === "number") {
        inc = p.incrementoStock;
      } else if (typeof p.unidadesBuenas === "number") {
        inc = p.unidadesBuenas;
      } else if (typeof p.cantidad === "number") {
        inc = p.cantidad;
      }
      actual.unidades += inc;

      map.set(p.modeloId, actual);
    });

    return map;
  }, [producciones]);

  // ---------- FILTROS ----------
  const modelosFiltrados = useMemo(() => {
    return modelos.filter((m) => {
      if (fProductoBase && m.productoId !== fProductoBase) return false;

      if (
        fCategoria.trim() &&
        !String(m.categoria || "")
          .toLowerCase()
          .includes(fCategoria.trim().toLowerCase())
      ) {
        return false;
      }

      if (
        fSubcategoria.trim() &&
        !String(m.subcategoria || "")
          .toLowerCase()
          .includes(fSubcategoria.trim().toLowerCase())
      ) {
        return false;
      }

      if (fTexto.trim()) {
        const term = fTexto.trim().toLowerCase();
        const textoBusqueda = [m.nombreModelo || ""]
          .join(" ")
          .toLowerCase();

        if (!textoBusqueda.includes(term)) return false;
      }

      return true;
    });
  }, [modelos, fProductoBase, fCategoria, fSubcategoria, fTexto]);

  // ---------- RENDER ----------
  return (
    <LayoutModels
      title="Modelos / Diseños"
      description="Gestioná las planchas y diseños asociadas a tus productos base, con filtros por categoría, subcategoría y estadísticas de producción."
    >
      <div className="models-page">
        {/* Mensajes */}
        <div className="models-status">
          {loading && (
            <p className="models-message">Cargando modelos...</p>
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
              title="Nuevo modelo"
              description="Creá una nueva plancha/modelo y asociála a un producto base."
              onSubmit={onSubmit}
            >
              <div className="models-form">
                {/* FILA 1: 4 campos en una línea */}
                <div className="models-form-grid">
                  <div className="form-field">
                    <label>Producto base *</label>
                    <select
                      name="productoId"
                      value={form.productoId}
                      onChange={onFormChange}
                      required
                    >
                      <option value="">-- elegir producto --</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (cat: {p.categoria || "-"})
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
                    <label>Nombre del modelo / plancha *</label>
                    <input
                      name="nombreModelo"
                      value={form.nombreModelo}
                      onChange={onFormChange}
                      required
                      placeholder="Ej: HP - Tapa 1, Anime Plancha 2"
                    />
                  </div>
                </div>

                {/* FILA 2: botones de subida centrados */}
                <div className="models-form-uploads-row">
                  <div className="models-upload-group">
                    <input
                      id="modelo-imagen-nuevo"
                      type="file"
                      accept="image/*"
                      onChange={handleImagenFileChange}
                      className="upload-input"
                    />
                    <label
                      htmlFor="modelo-imagen-nuevo"
                      className="upload-button"
                    >
                      <span className="upload-button-label">
                        Subir portada
                      </span>
                    </label>
                    {form.imagenRef && (
                      <small className="upload-hint">
                        Archivo listo para usar ✔
                      </small>
                    )}
                  </div>

                  <div className="models-upload-group">
                    <input
                      id="modelo-plancha-nuevo"
                      type="file"
                      accept="application/pdf"
                      onChange={handlePlanchaFileChange}
                      className="upload-input"
                    />
                    <label
                      htmlFor="modelo-plancha-nuevo"
                      className="upload-button"
                    >
                      <span className="upload-button-label">
                        Subir plancha
                      </span>
                    </label>
                    {form.archivoPlancha && (
                      <small className="upload-hint">
                        PDF listo para imprimir ✔
                      </small>
                    )}
                  </div>
                </div>

                {/* FILA 3: Crear / Recargar centrados */}
                <div className="models-form-actions">
                  <button type="submit" className="btn-primary">
                    Crear modelo
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

        {/* CATÁLOGO */}
        <section className="models-section">
          <h2 className="models-subtitle">Catálogo de modelos</h2>

          <div className="models-filters">
            <div className="form-field">
              <label>Producto base</label>
              <select
                value={fProductoBase}
                onChange={(e) => setFProductoBase(e.target.value)}
              >
                <option value="">Todos</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
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
              <input
                value={fTexto}
                onChange={(e) => setFTexto(e.target.value)}
                placeholder="Nombre..."
              />
            </div>

            <div className="models-filters-clear">
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-secondary"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          <div className="models-grid">
            {modelosFiltrados.map((m) => {
              const prod = mapaProductos.get(m.productoId);
              const isEditing = editId === m.id;
              const stats = mapaStatsModelos.get(m.id);

              const imagenInputId = `modelo-imagen-edit-${m.id}`;
              const planchaInputId = `modelo-plancha-edit-${m.id}`;

              if (isEditing) {
                return (
                  <div
                    key={m.id}
                    className="model-card model-card--editing"
                  >
                    <h3 className="model-card__title">
                      Editar modelo
                    </h3>
                    <p className="model-card__meta">
                      {m.categoria || "-"}
                      {m.subcategoria ? ` – ${m.subcategoria}` : ""}
                    </p>

                    <div className="form-grid model-card__edit-grid">
                      <div className="form-field">
                        <label>Producto base</label>
                        <select
                          name="productoId"
                          value={editForm.productoId}
                          onChange={onEditChange}
                        >
                          <option value="">
                            -- elegir producto --
                          </option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} (cat: {p.categoria || "-"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field">
                        <label>Categoría</label>
                        <input
                          name="categoria"
                          value={editForm.categoria}
                          onChange={onEditChange}
                        />
                      </div>

                      <div className="form-field">
                        <label>Subcategoría</label>
                        <input
                          name="subcategoria"
                          value={editForm.subcategoria}
                          onChange={onEditChange}
                        />
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

                      <div className="form-field">
                        <label>Imagen de portada</label>
                        <div className="models-upload-inline">
                          <input
                            id={imagenInputId}
                            type="file"
                            accept="image/*"
                            onChange={handleImagenFileChangeEdit}
                            className="upload-input"
                          />
                          <label
                            htmlFor={imagenInputId}
                            className="upload-button upload-button--small"
                          >
                            <span className="upload-button-label">
                              Cambiar imagen
                            </span>
                          </label>
                        </div>
                        {editForm.imagenRef && (
                          <small className="upload-hint">
                            Archivo listo ✔
                          </small>
                        )}
                      </div>

                      <div className="form-field">
                        <label>Archivo de plancha (PDF)</label>
                        <div className="models-upload-inline">
                          <input
                            id={planchaInputId}
                            type="file"
                            accept="application/pdf"
                            onChange={handlePlanchaFileChangeEdit}
                            className="upload-input"
                          />
                          <label
                            htmlFor={planchaInputId}
                            className="upload-button upload-button--small"
                          >
                            <span className="upload-button-label">
                              Cambiar plancha
                            </span>
                          </label>
                        </div>
                        {editForm.archivoPlancha && (
                          <small className="upload-hint">
                            PDF listo ✔
                          </small>
                        )}
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

              return (
                <div key={m.id} className="model-card">
                  {/* Acciones flotantes (aparecen en hover) */}
                  <div className="model-card__actions">
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      className="icon-btn"
                      title="Editar modelo"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      className="icon-btn icon-btn--danger"
                      title="Eliminar modelo"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Imagen */}
                  <div className="model-card__image-wrapper">
                    {m.imagenRef ? (
                      <a
                        href={m.imagenRef}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver imagen en grande"
                      >
                        <img
                          src={m.imagenRef}
                          alt={m.nombreModelo}
                          className="model-card__image"
                        />
                      </a>
                    ) : (
                      <div className="model-card__image-placeholder">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  {/* Texto centrado */}
                  <div className="model-card__body">
                    <h3 className="model-card__title">
                      {m.nombreModelo}
                    </h3>

                    <div className="model-card__tags">
                      {m.categoria && (
                        <span className="model-card__tag model-card__tag--categoria">
                          {m.categoria}
                        </span>
                      )}
                      {m.subcategoria && (
                        <span className="model-card__tag model-card__tag--subcategoria">
                          {m.subcategoria}
                        </span>
                      )}
                    </div>

                    {prod && (
                      <p className="model-card__product">
                        Producto base: {prod.nombre}
                      </p>
                    )}
                    {!prod && (
                      <p className="model-card__product">
                        Producto: {m.productoId}
                      </p>
                    )}

                    {stats && (
                      <p className="model-card__stats">
                        Producciones: {stats.veces} · Unidades:{" "}
                        {stats.unidades}
                      </p>
                    )}

                    {m.archivoPlancha && (
                      <p className="model-card__link">
                        <a
                          href={m.archivoPlancha}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver / imprimir plancha (PDF)
                        </a>
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
