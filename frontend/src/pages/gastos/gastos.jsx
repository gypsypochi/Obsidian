// frontend/src/pages/gastos/gastos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getGastos,
  createGasto,
  deleteGasto,
  getProveedores,
  getFerias,
  updateGasto,
  getMateriales,
} from "../../api";

import LayoutCrud from "../../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../../components/form/form.jsx";
import "./gastos.css";

const OPCIONES_TIPO = [
  { value: "materiales", label: "Materiales" },
  { value: "feria", label: "Feria" },
  { value: "otro", label: "Otros" },
];

const OPCIONES_MEDIO_PAGO = [
  "efectivo",
  "mp",
  "debito",
  "credito",
  "transferencia",
];

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [materiales, setMateriales] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Form
  const [tipo, setTipo] = useState("materiales");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [proveedorId, setProveedorId] = useState("");
  const [feriaId, setFeriaId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [cantidadMaterial, setCantidadMaterial] = useState("");
  const [notas, setNotas] = useState("");

  // Edición
  const [editId, setEditId] = useState(null);

  // Filtro del historial
  const [filtroTipo, setFiltroTipo] = useState("todos");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [gastosData, provData, feriasData, materialesData] =
        await Promise.all([
          getGastos(),
          getProveedores(),
          getFerias(),
          getMateriales(),
        ]);

      setGastos(gastosData || []);
      setProveedores(provData || []);

      const feriasOrdenadas = [...(feriasData || [])].sort((a, b) => {
        const fa = new Date(a.fecha).getTime();
        const fb = new Date(b.fecha).getTime();
        return fb - fa;
      });
      setFerias(feriasOrdenadas);

      setMateriales(materialesData || []);
    } catch (e) {
      setError(e.message || "Error cargando gastos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const mapaProveedores = useMemo(
    () => new Map(proveedores.map((p) => [p.id, p])),
    [proveedores]
  );

  const mapaFerias = useMemo(
    () => new Map(ferias.map((f) => [f.id, f])),
    [ferias]
  );

  const gastosOrdenados = useMemo(() => {
    const copia = [...gastos];
    copia.sort((a, b) => {
      const fa = new Date(a.fecha).getTime();
      const fb = new Date(b.fecha).getTime();
      return fb - fa;
    });
    return copia;
  }, [gastos]);

  const gastosFiltrados = useMemo(() => {
    if (filtroTipo === "todos") return gastosOrdenados;
    return gastosOrdenados.filter((g) => g.tipo === filtroTipo);
  }, [gastosOrdenados, filtroTipo]);

  const totalGeneral = useMemo(
    () => gastos.reduce((acc, g) => acc + (g.monto || 0), 0),
    [gastos]
  );

  const totalFiltrado = useMemo(
    () => gastosFiltrados.reduce((acc, g) => acc + (g.monto || 0), 0),
    [gastosFiltrados]
  );

  function formatFecha(fechaStr) {
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return fechaStr || "";
    return d.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function formatMonto(numero) {
    const n = Number(numero) || 0;
    return n.toLocaleString("es-AR");
  }

  function resetForm() {
    setTipo("materiales");
    setCategoria("");
    setDescripcion("");
    setMonto("");
    setMedioPago("efectivo");
    setProveedorId("");
    setFeriaId("");
    setMaterialId("");
    setCantidadMaterial("");
    setNotas("");
    setEditId(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    const montoNum = Number(monto);
    if (Number.isNaN(montoNum) || montoNum <= 0) {
      setError("El monto debe ser un número mayor a 0");
      return;
    }

    if (tipo === "materiales") {
      if (!materialId) {
        setError("Tenés que elegir el material al que corresponde el gasto");
        return;
      }
      const cantMatNum = Number(cantidadMaterial);
      if (Number.isNaN(cantMatNum) || cantMatNum <= 0) {
        setError(
          "Indicá la cantidad comprada de ese material (número mayor a 0)"
        );
        return;
      }
    } else if (tipo === "feria") {
      if (!feriaId) {
        setError("Tenés que elegir la feria a la que corresponde el gasto");
        return;
      }
    } else if (tipo === "otro") {
      if (!descripcion.trim()) {
        setError("La descripción es obligatoria para gastos de tipo 'Otros'");
        return;
      }
    }

    const payload = {
      tipo,
      categoria: tipo === "otro" ? categoria || null : null,
      descripcion: tipo === "otro" ? descripcion.trim() : "",
      monto: montoNum,
      medioPago,
      proveedorId: proveedorId || null,
      feriaId: tipo === "feria" ? feriaId || null : null,
      materialId: tipo === "materiales" ? materialId || null : null,
      notas: notas || "",
      cantidadMaterial:
        tipo === "materiales" ? Number(cantidadMaterial) : undefined,
    };

    try {
      if (editId) {
        await updateGasto(editId, payload);
        setMensaje("Gasto actualizado correctamente.");
      } else {
        await createGasto(payload);
        setMensaje("Gasto registrado correctamente.");
      }

      resetForm();
      await load();
    } catch (e) {
      setError(e.message || "Error guardando gasto");
    }
  }

  function onEditar(g) {
    setEditId(g.id);
    setTipo(g.tipo || "otro");
    setCategoria(g.categoria || "");
    setDescripcion(g.descripcion || "");
    setMonto(g.monto != null ? String(g.monto) : "");
    setMedioPago(g.medioPago || "efectivo");
    setProveedorId(g.proveedorId || "");
    setFeriaId(g.feriaId || "");
    setMaterialId(g.materialId || "");
    setCantidadMaterial(
      g.cantidadMaterial != null ? String(g.cantidadMaterial) : ""
    );
    setNotas(g.notas || "");
    setMensaje("");
    setError("");
  }

  async function onEliminar(id) {
    const ok = window.confirm("¿Eliminar este gasto?");
    if (!ok) return;
    setError("");
    setMensaje("");

    try {
      await deleteGasto(id);
      setMensaje("Gasto eliminado.");
      await load();
    } catch (e) {
      setError(e.message || "Error eliminando gasto");
    }
  }

  const labelFiltroTitulo = {
    todos: "todos los gastos",
    materiales: "gastos de materiales",
    feria: "gastos de ferias",
    otro: "otros gastos",
  };

  const opcionesFiltro = [
    { value: "todos", label: "Todos" },
    { value: "materiales", label: "Materiales" },
    { value: "feria", label: "Feria" },
    { value: "otro", label: "Otros" },
  ];

  const montoPrincipal =
    filtroTipo === "todos" ? totalGeneral : totalFiltrado;

  return (
    <LayoutCrud
      title="Gastos"
      description="Registrá todos los gastos de tu emprendimiento y vinculalos con materiales, ferias y proveedores."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}
      {mensaje && <p className="text-sm badge-success">{mensaje}</p>}

      {/* FORMULARIO DE ALTA / EDICIÓN */}
      <FormSection
        title={editId ? "Editar gasto" : "Registrar nuevo gasto"}
        description="Carga rápida de gastos de materiales, ferias u otros conceptos."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Tipo *</label>
            <select
              value={tipo}
              onChange={(e) => {
                const nuevoTipo = e.target.value;
                setTipo(nuevoTipo);
                if (nuevoTipo !== "feria") setFeriaId("");
                if (nuevoTipo !== "materiales") {
                  setMaterialId("");
                  setCantidadMaterial("");
                }
              }}
            >
              {OPCIONES_TIPO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Monto *</label>
            <input
              type="number"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="$ 0"
            />
          </div>

          <div className="form-field">
            <label>Medio de pago</label>
            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
            >
              {OPCIONES_MEDIO_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Proveedor</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            >
              <option value="">-- sin proveedor --</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre || p.razonSocial || p.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {tipo === "materiales" && (
          <div className="card form-subsection">
            <h3>Gasto de materiales</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Material *</label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                >
                  <option value="">-- elegir material --</option>
                  {materiales.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre || m.id}{" "}
                      {m.stock !== undefined ? ` (stock: ${m.stock})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Cantidad comprada (para sumar al stock) *</label>
                <input
                  type="number"
                  min="1"
                  value={cantidadMaterial}
                  onChange={(e) => setCantidadMaterial(e.target.value)}
                  placeholder="Ej: 100, 50, 3..."
                />
              </div>
            </div>
          </div>
        )}

        {tipo === "feria" && (
          <div className="card form-subsection">
            <h3>Gasto asociado a feria</h3>
            <div className="form-field">
              <label>Feria *</label>
              <select
                value={feriaId}
                onChange={(e) => setFeriaId(e.target.value)}
              >
                <option value="">-- elegir feria --</option>
                {ferias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre} –{" "}
                    {new Date(f.fecha).toLocaleDateString("es-AR")} (
                    {f.estado})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {tipo === "otro" && (
          <div className="card form-subsection">
            <h3>Otros gastos</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Categoría</label>
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ej: software, transporte..."
                />
              </div>

              <div className="form-field">
                <label>Descripción *</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Suscripción Canva, Taxi a feria..."
                />
              </div>
            </div>
          </div>
        )}

        <div className="form-field">
          <label>Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editId ? "Guardar cambios" : "Registrar gasto"}
          </button>
          {editId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForm}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </FormSection>

      {/* RESUMEN DE TOTALES + FILTROS */}
      <section className="crud-section">
        <div className="gastos-summary">
          <div className="card gastos-summary-card">
            <p className="text-xs text-muted">
              Mostrando {labelFiltroTitulo[filtroTipo]}
            </p>

            <p className="gastos-summary-main">
              ${formatMonto(montoPrincipal)} ARS
            </p>

            <p className="text-xs gastos-summary-sub">
              {filtroTipo === "todos"
                ? "Total general de todos los gastos"
                : `Total general: $${formatMonto(totalGeneral)} ARS`}
            </p>

            <div className="gastos-summary-filters">
              <div className="gastos-filter-pills">
                {opcionesFiltro.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={
                      filtroTipo === opt.value
                        ? "gastos-filter-pill is-active"
                        : "gastos-filter-pill"
                    }
                    onClick={() => setFiltroTipo(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HISTORIAL DE GASTOS */}
      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Historial de gastos</h2>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Medio pago</th>
                <th>Proveedor</th>
                <th>Feria</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map((g) => {
                const prov = g.proveedorId
                  ? mapaProveedores.get(g.proveedorId)
                  : null;
                const feria = g.feriaId ? mapaFerias.get(g.feriaId) : null;

                return (
                  <tr key={g.id}>
                    <td>{formatFecha(g.fecha)}</td>
                    <td>{g.tipo}</td>
                    <td>{g.categoria || "-"}</td>
                    <td>{g.descripcion}</td>
                    <td>${formatMonto(g.monto)}</td>
                    <td>{g.medioPago || "-"}</td>
                    <td>
                      {prov
                        ? prov.nombre || prov.razonSocial || prov.id
                        : g.proveedorId || "-"}
                    </td>
                    <td>{feria ? feria.nombre : g.feriaId || "-"}</td>
                    <td>{g.notas || "-"}</td>
                    <td>
                      <div className="crud-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => onEditar(g)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="icon-btn delete"
                          onClick={() => onEliminar(g.id)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && gastosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="10">
                    No hay gastos para el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
