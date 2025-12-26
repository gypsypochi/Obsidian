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
} from "../api";

const BACKEND_URL = "http://localhost:3001";

export default function Modelos() {
  const [modelos, setModelos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({
    productoId: "",
    categoria: "",
    subcategoria: "",
    nombreModelo: "",
    codigoInterno: "",
    imagenRef: "",
    archivoPlancha: "",
    notas: "",
  });

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    productoId: "",
    categoria: "",
    subcategoria: "",
    nombreModelo: "",
    codigoInterno: "",
    imagenRef: "",
    archivoPlancha: "",
    notas: "",
  });

  // Filtros
  const [fCategoria, setFCategoria] = useState("");
  const [fSubcategoria, setFSubcategoria] = useState("");
  const [fTexto, setFTexto] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const [mods, prods] = await Promise.all([getModelos(), getProductos()]);
      setModelos(mods);
      setProductos(prods);
    } catch (e) {
      setError(e.message || "Error cargando modelos");
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

  // SUBIDA DE ARCHIVOS (ALTA)
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
        codigoInterno: "",
        imagenRef: "",
        archivoPlancha: "",
        notas: "",
      });
      await load();
    } catch (e) {
      setError(e.message || "Error creando modelo");
    }
  }

  function startEdit(m) {
    setEditId(m.id);
    setEditForm({
      productoId: m.productoId || "",
      categoria: m.categoria || "",
      subcategoria: m.subcategoria || "",
      nombreModelo: m.nombreModelo || "",
      codigoInterno: m.codigoInterno || "",
      imagenRef: m.imagenRef || "",
      archivoPlancha: m.archivoPlancha || "",
      notas: m.notas || "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({
      productoId: "",
      categoria: "",
      subcategoria: "",
      nombreModelo: "",
      codigoInterno: "",
      imagenRef: "",
      archivoPlancha: "",
      notas: "",
    });
  }

  function onEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // SUBIDA DE ARCHIVOS (EDICIÓN)
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

  const mapaProductos = useMemo(
    () => new Map(productos.map((p) => [p.id, p])),
    [productos]
  );

  const modelosFiltrados = useMemo(() => {
    return modelos.filter((m) => {
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
        const textoBusqueda = [
          m.nombreModelo || "",
          m.codigoInterno || "",
          m.notas || "",
        ]
          .join(" ")
          .toLowerCase();

        if (!textoBusqueda.includes(term)) return false;
      }

      return true;
    });
  }, [modelos, fCategoria, fSubcategoria, fTexto]);

  return (
    <div>
      <h1>Modelos / Diseños</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

      <h2>Nuevo modelo</h2>
      <form onSubmit={onSubmit}>
        <div>
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

        <div>
          <label>Categoría</label>
          <input
            name="categoria"
            value={form.categoria}
            onChange={onFormChange}
            placeholder="Ej: Anime, Películas, Memes"
          />
        </div>

        <div>
          <label>Subcategoría</label>
          <input
            name="subcategoria"
            value={form.subcategoria}
            onChange={onFormChange}
            placeholder="Ej: Harry Potter, Memes argentinos"
          />
        </div>

        <div>
          <label>Nombre del modelo / plancha *</label>
          <input
            name="nombreModelo"
            value={form.nombreModelo}
            onChange={onFormChange}
            required
            placeholder="Ej: HP - Tapa 1, Anime Plancha 2"
          />
        </div>

        <div>
          <label>Código interno (opcional)</label>
          <input
            name="codigoInterno"
            value={form.codigoInterno}
            onChange={onFormChange}
            placeholder="Ej: ST-HP-01"
          />
        </div>

        <div>
          <label>Imagen (URL o archivo)</label>
          <input
            name="imagenRef"
            value={form.imagenRef}
            onChange={onFormChange}
            placeholder="URL (opcional si subís archivo)"
          />
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImagenFileChange}
            />
          </div>
        </div>

        <div>
          <label>Archivo plancha (PDF / imprimible)</label>
          <input
            name="archivoPlancha"
            value={form.archivoPlancha}
            onChange={onFormChange}
            placeholder="URL (opcional si subís archivo)"
          />
          <div>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePlanchaFileChange}
            />
          </div>
        </div>

        <div>
          <label>Notas</label>
          <textarea
            name="notas"
            value={form.notas}
            onChange={onFormChange}
            placeholder="Qué contiene la plancha / tapa, variantes, etc."
          />
        </div>

        <button type="submit">Crear modelo</button>
        <button type="button" onClick={load} style={{ marginLeft: 8 }}>
          Recargar
        </button>
      </form>

      <h2>Catálogo de modelos</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>
          Categoría:
          <input
            value={fCategoria}
            onChange={(e) => setFCategoria(e.target.value)}
            placeholder="Anime / Películas / Memes..."
          />
        </label>

        <label style={{ marginRight: 8 }}>
          Subcategoría:
          <input
            value={fSubcategoria}
            onChange={(e) => setFSubcategoria(e.target.value)}
            placeholder="Harry Potter / Flork..."
          />
        </label>

        <label>
          Buscar:
          <input
            value={fTexto}
            onChange={(e) => setFTexto(e.target.value)}
            placeholder="Nombre, código, notas..."
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {modelosFiltrados.map((m) => {
          const prod = mapaProductos.get(m.productoId);
          const isEditing = editId === m.id;

          // Normalizar URLs de imagen y PDF
          const imagenUrl = m.imagenRef
            ? m.imagenRef.startsWith("http")
              ? m.imagenRef
              : `${BACKEND_URL}${m.imagenRef}`
            : "";

          const pdfUrl = m.archivoPlancha
            ? m.archivoPlancha.startsWith("http")
              ? m.archivoPlancha
              : `${BACKEND_URL}${m.archivoPlancha}`
            : "";

          if (isEditing) {
            return (
              <div
                key={m.id}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: 12,
                  width: 280,
                  background: "#f9fafb",
                }}
              >
                <h3>Editar modelo</h3>

                <div>
                  <label>Producto base</label>
                  <select
                    name="productoId"
                    value={editForm.productoId}
                    onChange={onEditChange}
                  >
                    <option value="">-- elegir producto --</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (cat: {p.categoria || "-"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Categoría</label>
                  <input
                    name="categoria"
                    value={editForm.categoria}
                    onChange={onEditChange}
                  />
                </div>

                <div>
                  <label>Subcategoría</label>
                  <input
                    name="subcategoria"
                    value={editForm.subcategoria}
                    onChange={onEditChange}
                  />
                </div>

                <div>
                  <label>Nombre modelo</label>
                  <input
                    name="nombreModelo"
                    value={editForm.nombreModelo}
                    onChange={onEditChange}
                    required
                  />
                </div>

                <div>
                  <label>Código interno</label>
                  <input
                    name="codigoInterno"
                    value={editForm.codigoInterno}
                    onChange={onEditChange}
                  />
                </div>

                <div>
                  <label>Imagen (URL o archivo)</label>
                  <input
                    name="imagenRef"
                    value={editForm.imagenRef}
                    onChange={onEditChange}
                  />
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagenFileChangeEdit}
                    />
                  </div>
                </div>

                <div>
                  <label>Archivo plancha (PDF)</label>
                  <input
                    name="archivoPlancha"
                    value={editForm.archivoPlancha}
                    onChange={onEditChange}
                  />
                  <div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePlanchaFileChangeEdit}
                    />
                  </div>
                </div>

                <div>
                  <label>Notas</label>
                  <textarea
                    name="notas"
                    value={editForm.notas}
                    onChange={onEditChange}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={saveEdit}>
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{ marginLeft: 4 }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              style={{
                border: "1px solid #e5e7eb",
                padding: 12,
                width: 280,
                background: "white",
              }}
            >
              {imagenUrl ? (
                <img
                  src={imagenUrl}
                  alt={m.nombreModelo}
                  style={{
                    width: "100%",
                    height: 150,
                    objectFit: "cover",
                    marginBottom: 8,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 150,
                    background: "#f3f4f6",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  Sin imagen
                </div>
              )}

              <strong>{m.nombreModelo}</strong>
              <div style={{ fontSize: 13, color: "#374151" }}>
                {m.categoria || "-"}
                {m.subcategoria ? ` – ${m.subcategoria}` : ""}
              </div>

              <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
                Producto base: {prod ? prod.nombre : m.productoId}
              </div>

              {m.codigoInterno && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Código: {m.codigoInterno}
                </div>
              )}

              {m.notas && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#4b5563",
                    marginTop: 4,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.notas}
                </p>
              )}

              {pdfUrl && (
                <div style={{ marginTop: 6 }}>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12 }}
                  >
                    Ver / imprimir plancha (PDF)
                  </a>
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={() => startEdit(m)}>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(m.id)}
                  style={{ marginLeft: 4 }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}

        {!loading && modelosFiltrados.length === 0 && (
          <p>No hay modelos cargados.</p>
        )}
      </div>
    </div>
  );
}
