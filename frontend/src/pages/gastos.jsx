// frontend/src/pages/gastos.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getGastos,
  createGasto,
  deleteGasto,
  getProveedores,
  getFerias,
  updateGasto,
  getMateriales,
} from "../api";

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
  const [notas, setNotas] = useState("");

  // Edición
  const [editId, setEditId] = useState(null);

  // Filtro del historial
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos | materiales | feria | otro

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

    // Validaciones por tipo
    if (tipo === "materiales") {
      if (!materialId) {
        setError("Tenés que elegir el material al que corresponde el gasto");
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
      // solo usamos categoría/descripcion manual en "otro"
      categoria: tipo === "otro" ? categoria || null : null,
      descripcion: tipo === "otro" ? descripcion.trim() : "",
      monto: montoNum,
      medioPago,
      proveedorId: proveedorId || null,
      feriaId: tipo === "feria" ? feriaId || null : null,
      materialId: tipo === "materiales" ? materialId || null : null,
      notas: notas || "",
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

  function renderFiltros() {
    const opcionesFiltro = [
      { value: "todos", label: "Todos" },
      { value: "materiales", label: "Materiales" },
      { value: "feria", label: "Feria" },
      { value: "otro", label: "Otros" },
    ];

    return (
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <span style={{ marginRight: 8 }}>Ver:</span>
        {opcionesFiltro.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFiltroTipo(opt.value)}
            style={{
              marginRight: 6,
              padding: "4px 8px",
              borderRadius: 4,
              border:
                filtroTipo === opt.value
                  ? "1px solid #4f46e5"
                  : "1px solid #4b5563",
              backgroundColor:
                filtroTipo === opt.value ? "#4f46e5" : "transparent",
              color: filtroTipo === opt.value ? "#fff" : "inherit",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  const labelFiltro = {
    materiales: "materiales",
    feria: "ferias",
    otro: "otros",
  };

  return (
    <div>
      <h1>Gastos</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}

      <h2>{editId ? "Editar gasto" : "Registrar nuevo gasto"}</h2>

      <form onSubmit={onSubmit}>
        {/* TIPO */}
        <div>
          <label>Tipo *</label>
          <select
            value={tipo}
            onChange={(e) => {
              const nuevoTipo = e.target.value;
              setTipo(nuevoTipo);
              if (nuevoTipo !== "feria") {
                setFeriaId("");
              }
              if (nuevoTipo !== "materiales") {
                setMaterialId("");
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

        {/* MATERIAL (solo si tipo = materiales) */}
        {tipo === "materiales" && (
          <div>
            <label>Material *</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              <option value="">-- elegir material --</option>
              {materiales.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre || m.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* FERIA (solo si tipo = feria) */}
        {tipo === "feria" && (
          <div>
            <label>Feria *</label>
            <select
              value={feriaId}
              onChange={(e) => setFeriaId(e.target.value)}
            >
              <option value="">-- elegir feria --</option>
              {ferias.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre} –{" "}
                  {new Date(f.fecha).toLocaleDateString("es-AR")} ({f.estado})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CAMPOS SOLO PARA "OTRO" */}
        {tipo === "otro" && (
          <>
            <div>
              <label>Categoría</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej: software, transporte, herramientas..."
              />
            </div>

            <div>
              <label>Descripción *</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Suscripción Canva, Taxi a feria..."
              />
            </div>
          </>
        )}

        {/* MONTO */}
        <div>
          <label>Monto *</label>
          <input
            type="number"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="$ 0"
          />
        </div>

        {/* MEDIO DE PAGO */}
        <div>
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

        {/* PROVEEDOR (opcional, pero siempre disponible) */}
        <div>
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

        {/* NOTAS */}
        <div>
          <label>Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit">
            {editId ? "Guardar cambios" : "Registrar gasto"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              style={{ marginLeft: 8 }}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {/* RESUMEN DE TOTALES */}
      <div
        style={{
          margin: "24px auto 8px",
          padding: 8,
          border: "1px solid #4b5563",
          borderRadius: 4,
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontWeight: "600" }}>Totales de gastos</p>
        <p style={{ margin: "4px 0" }}>
          Total general: <strong>${formatMonto(totalGeneral)} ARS</strong>
        </p>

        {filtroTipo !== "todos" && (
          <p style={{ margin: 0, fontSize: 13 }}>
            Total {labelFiltro[filtroTipo]}:{" "}
            <strong>${formatMonto(totalFiltrado)} ARS</strong>
          </p>
        )}
      </div>

      {/* FILTROS */}
      {renderFiltros()}

      <h2 style={{ marginTop: 8 }}>Historial de gastos</h2>

      <table border="1" cellPadding="8">
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
                  <button type="button" onClick={() => onEditar(g)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(g.id)}
                    style={{ marginLeft: 4 }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            );
          })}

          {!loading && gastosFiltrados.length === 0 && (
            <tr>
              <td colSpan="10">No hay gastos para el filtro seleccionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
