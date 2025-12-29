// frontend/src/pages/balance.jsx
import { useEffect, useMemo, useState } from "react";
import { getVentas, getGastos } from "../api";

const SECCIONES = [
  { id: "resumen", label: "Resumen global" },
  { id: "periodo", label: "Por período" },
  { id: "feria", label: "Por feria" },
  { id: "dashboard", label: "Dashboard" },
];

export default function Balance() {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seccionActiva, setSeccionActiva] = useState("resumen");

  // 🔹 Filtros para "Por período"
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [ventasData, gastosData] = await Promise.all([
        getVentas(),
        getGastos(),
      ]);

      setVentas(ventasData || []);
      setGastos(gastosData || []);
    } catch (e) {
      setError(e.message || "Error cargando datos de balance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ---- Cálculos para resumen global ----
  const totalIngresos = useMemo(() => {
    return (ventas || []).reduce((acc, v) => {
      const monto =
        typeof v.montoTotal === "number"
          ? v.montoTotal
          : (v.precioUnitario || 0) * (v.cantidad || 0);
      return acc + (monto || 0);
    }, 0);
  }, [ventas]);

  const totalGastos = useMemo(() => {
    return (gastos || []).reduce((acc, g) => acc + (g.monto || 0), 0);
  }, [gastos]);

  const resultadoNeto = useMemo(
    () => totalIngresos - totalGastos,
    [totalIngresos, totalGastos]
  );

  const porcentajeGastosSobreIngresos = useMemo(() => {
    if (!totalIngresos) return null;
    return (totalGastos / totalIngresos) * 100;
  }, [totalIngresos, totalGastos]);

  const cantidadVentas = ventas.length;
  const cantidadGastos = gastos.length;

  function formatMonto(numero) {
    const n = Number(numero) || 0;
    return n.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function formatMontoConSigno(numero) {
    const n = Number(numero) || 0;
    const abs = Math.abs(n);
    const base = abs.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (n > 0) return `+${base}`;
    if (n < 0) return `-${base}`;
    return base;
  }

  // helper de color reutilizable
  function colorPorValor(valor) {
    if (valor > 0) return "#16a34a"; // verde
    if (valor < 0) return "#dc2626"; // rojo
    return "#eab308"; // amarillo
  }

  function colorResultado() {
    return colorPorValor(resultadoNeto);
  }

  // ============================
  //   BALANCE POR PERÍODO
  // ============================

  function estaEnRango(fechaStr) {
    if (!fechaStr) return false;
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return false;

    if (!fechaDesde && !fechaHasta) {
      // Sin filtros → cuenta todo
      return true;
    }

    if (fechaDesde) {
      const dDesde = new Date(fechaDesde);
      if (d < dDesde) return false;
    }

    if (fechaHasta) {
      const dHasta = new Date(fechaHasta);
      if (d > dHasta) return false;
    }

    return true;
  }

  const ventasFiltradas = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return ventas || [];
    return (ventas || []).filter((v) => estaEnRango(v.fecha));
  }, [ventas, fechaDesde, fechaHasta]);

  const gastosFiltrados = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return gastos || [];
    return (gastos || []).filter((g) => estaEnRango(g.fecha));
  }, [gastos, fechaDesde, fechaHasta]);

  const totalIngresosPeriodo = useMemo(() => {
    return (ventasFiltradas || []).reduce((acc, v) => {
      const monto =
        typeof v.montoTotal === "number"
          ? v.montoTotal
          : (v.precioUnitario || 0) * (v.cantidad || 0);
      return acc + (monto || 0);
    }, 0);
  }, [ventasFiltradas]);

  const totalGastosPeriodo = useMemo(() => {
    return (gastosFiltrados || []).reduce(
      (acc, g) => acc + (g.monto || 0),
      0
    );
  }, [gastosFiltrados]);

  const resultadoNetoPeriodo = useMemo(
    () => totalIngresosPeriodo - totalGastosPeriodo,
    [totalIngresosPeriodo, totalGastosPeriodo]
  );

  const porcentajeGastosSobreIngresosPeriodo = useMemo(() => {
    if (!totalIngresosPeriodo) return null;
    return (totalGastosPeriodo / totalIngresosPeriodo) * 100;
  }, [totalIngresosPeriodo, totalGastosPeriodo]);

  const cantidadVentasPeriodo = ventasFiltradas.length;
  const cantidadGastosPeriodo = gastosFiltrados.length;

  function hayFiltroFecha() {
    return Boolean(fechaDesde || fechaHasta);
  }

  function formatFechaFiltro(fechaStr) {
    if (!fechaStr) return "";
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return fechaStr;
    return d.toLocaleDateString("es-AR");
  }

  function renderSeccion() {
    if (seccionActiva === "resumen") return renderSeccionResumen();

    if (seccionActiva === "periodo") {
      return renderSeccionPeriodo();
    }

    if (seccionActiva === "feria") {
      return (
        <p style={{ marginTop: 24 }}>
          Sección <strong>Balance por feria</strong> la hacemos en 5.2.3,
          cruzando ventas y gastos por feria.
        </p>
      );
    }

    if (seccionActiva === "dashboard") {
      return (
        <p style={{ marginTop: 24 }}>
          Sección <strong>Dashboard</strong> va en la ETAPA 5.3, con
          rankings/tarjetas/gráficos.
        </p>
      );
    }

    return null;
  }

  function renderSeccionResumen() {
    return (
      <div style={{ marginTop: 24 }}>
        {/* Tarjetas principales */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Ingresos */}
          <div
            style={{
              flex: "1 1 220px",
              minWidth: 220,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
              Ingresos totales
            </p>
            <p style={{ margin: "4px 0", fontSize: 22, fontWeight: "700" }}>
              ${formatMonto(totalIngresos)} ARS
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Registros de ventas: {cantidadVentas}
            </p>
          </div>

          {/* Gastos */}
          <div
            style={{
              flex: "1 1 220px",
              minWidth: 220,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
              Gastos totales
            </p>
            <p style={{ margin: "4px 0", fontSize: 22, fontWeight: "700" }}>
              ${formatMonto(totalGastos)} ARS
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Registros de gastos: {cantidadGastos}
            </p>
          </div>

          {/* Resultado neto */}
          <div
            style={{
              flex: "1 1 220px",
              minWidth: 220,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
              Resultado neto
            </p>
            <p
              style={{
                margin: "4px 0",
                fontSize: 22,
                fontWeight: "700",
                color: colorResultado(),
              }}
            >
              {resultadoNeto >= 0 ? "" : "-"}$
              {formatMonto(Math.abs(resultadoNeto))} ARS
            </p>
            {porcentajeGastosSobreIngresos != null ? (
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                Gastos ={" "}
                {porcentajeGastosSobreIngresos.toFixed(1).replace(".", ",")}
                % de los ingresos.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                Aún no hay ventas registradas para calcular el porcentaje.
              </p>
            )}
          </div>
        </div>

        {/* Resumen textual */}
        <div
          style={{
            border: "1px dashed #4b5563",
            borderRadius: 8,
            padding: 12,
            maxWidth: 600,
          }}
        >
          <p style={{ margin: 0, fontSize: 14 }}>
            Hasta ahora, tu emprendimiento tiene un{" "}
            <strong style={{ color: colorResultado() }}>
              resultado neto de {formatMontoConSigno(resultadoNeto)} ARS
            </strong>{" "}
            (ingresos menos gastos).
          </p>
        </div>
      </div>
    );
  }

  function renderSeccionPeriodo() {
    const textoRango = hayFiltroFecha()
      ? `${fechaDesde ? formatFechaFiltro(fechaDesde) : "inicio"}  →  ${
          fechaHasta ? formatFechaFiltro(fechaHasta) : "hoy"
        }`
      : "Sin filtros de fecha (todos los movimientos)";

    return (
      <div style={{ marginTop: 24 }}>
        {/* Filtros de fecha */}
        <div
          style={{
            border: "1px solid #4b5563",
            borderRadius: 8,
            padding: 12,
            maxWidth: 600,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>
            Filtrar por período
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>
              <label style={{ fontSize: 12, display: "block" }}>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, display: "block" }}>Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Limpiar fechas
              </button>
            </div>
          </div>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            {textoRango}
          </p>
        </div>

        {/* Tarjetas para el período */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Ingresos período */}
          <div
            style={{
              flex: "1 1 220px",
              minWidth: 220,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
              Ingresos en el período
            </p>
            <p style={{ margin: "4px 0", fontSize: 22, fontWeight: "700" }}>
              ${formatMonto(totalIngresosPeriodo)} ARS
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Registros de ventas: {cantidadVentasPeriodo}
            </p>
          </div>

          {/* Gastos período */}
          <div
            style={{
              flex: "1 1 220px",
              minWidth: 220,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
              Gastos en el período
            </p>
            <p style={{ margin: "4px 0", fontSize: 22, fontWeight: "700" }}>
              ${formatMonto(totalGastosPeriodo)} ARS
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Registros de gastos: {cantidadGastosPeriodo}
            </p>
          </div>

          {/* Resultado neto período */}
          <div
            style={{
              flex: "1 1 220px",
              minWidth: 220,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
              Resultado neto del período
            </p>
            <p
              style={{
                margin: "4px 0",
                fontSize: 22,
                fontWeight: "700",
                color: colorPorValor(resultadoNetoPeriodo),
              }}
            >
              {resultadoNetoPeriodo >= 0 ? "" : "-"}$
              {formatMonto(Math.abs(resultadoNetoPeriodo))} ARS
            </p>
            {porcentajeGastosSobreIngresosPeriodo != null ? (
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                Gastos ={" "}
                {porcentajeGastosSobreIngresosPeriodo
                  .toFixed(1)
                  .replace(".", ",")}
                % de los ingresos del período.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                Aún no hay ventas en el período para calcular el porcentaje.
              </p>
            )}
          </div>
        </div>

        {/* Resumen textual período */}
        <div
          style={{
            border: "1px dashed #4b5563",
            borderRadius: 8,
            padding: 12,
            maxWidth: 600,
          }}
        >
          {hayFiltroFecha() ? (
            <p style={{ margin: 0, fontSize: 14 }}>
              Entre{" "}
              <strong>
                {fechaDesde ? formatFechaFiltro(fechaDesde) : "el inicio"}
              </strong>{" "}
              y{" "}
              <strong>
                {fechaHasta ? formatFechaFiltro(fechaHasta) : "hoy"}
              </strong>
              , tu resultado neto fue de{" "}
              <strong
                style={{
                  color: colorPorValor(resultadoNetoPeriodo),
                }}
              >
                {formatMontoConSigno(resultadoNetoPeriodo)} ARS
              </strong>
              .
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14 }}>
              Sin filtros de fecha, estás viendo el mismo resumen que en{" "}
              <strong>Resumen global</strong>, pero con este layout por
              período.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Balance</h1>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Navegación interna de secciones */}
      <div
        style={{
          marginTop: 8,
          padding: 8,
          borderRadius: 8,
          border: "1px solid #4b5563",
          maxWidth: 600,
        }}
      >
        <p style={{ margin: "0 0 6px", fontSize: 13 }}>Secciones</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SECCIONES.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSeccionActiva(sec.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border:
                  seccionActiva === sec.id
                    ? "1px solid #4f46e5"
                    : "1px solid #4b5563",
                backgroundColor:
                  seccionActiva === sec.id ? "#4f46e5" : "transparent",
                color: seccionActiva === sec.id ? "#fff" : "inherit",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {renderSeccion()}
    </div>
  );
}
