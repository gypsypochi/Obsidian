// frontend/src/pages/balance.jsx
import { useEffect, useMemo, useState } from "react";
import { getVentas, getGastos, getFerias, getProductos } from "../api";

const SECCIONES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "periodo", label: "Por período" },
];

export default function Balance() {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [productos, setProductos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seccionActiva, setSeccionActiva] = useState("dashboard");

  // 🔹 Filtros para "Por período"
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [ventasData, gastosData, feriasData, productosData] =
        await Promise.all([getVentas(), getGastos(), getFerias(), getProductos()]);

      setVentas(ventasData || []);
      setGastos(gastosData || []);
      setFerias(feriasData || []);
      setProductos(productosData || []);
    } catch (e) {
      setError(e.message || "Error cargando datos de balance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Mapas útiles
  const mapaFerias = useMemo(
    () => new Map(ferias.map((f) => [f.id, f])),
    [ferias]
  );

  const mapaProductos = useMemo(
    () => new Map(productos.map((p) => [p.id, p])),
    [productos]
  );

  // ---- Cálculos globales (usados en Dashboard y Período) ----
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

  const ticketPromedio = useMemo(() => {
    if (!ventas || ventas.length === 0) return 0;
    return totalIngresos / ventas.length;
  }, [ventas, totalIngresos]);

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

  function colorPorValor(valor) {
    if (valor > 0) return "#16a34a"; // verde
    if (valor < 0) return "#dc2626"; // rojo
    return "#eab308"; // amarillo
  }

  function colorResultado() {
    return colorPorValor(resultadoNeto);
  }

  function formatFechaCorta(fechaStr) {
    if (!fechaStr) return "";
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return fechaStr;
    return d.toLocaleDateString("es-AR");
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

  // ============================
  //   RANKINGS / DISTRIBUCIONES
  // ============================

  // Top productos por ingresos
  const rankingProductos = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];

    const map = new Map();

    for (const v of ventas) {
      const id = v.productoId || "sin-producto";
      const prev =
        map.get(id) || {
          productoId: id,
          unidades: 0,
          ingresos: 0,
          ventas: 0,
        };

      const monto =
        typeof v.montoTotal === "number"
          ? v.montoTotal
          : (v.precioUnitario || 0) * (v.cantidad || 0);

      prev.unidades += v.cantidad || 0;
      prev.ingresos += monto || 0;
      prev.ventas += 1;

      map.set(id, prev);
    }

    const lista = Array.from(map.values());
    lista.sort((a, b) => b.ingresos - a.ingresos);
    return lista;
  }, [ventas]);

  // Top modelos/diseños por ingresos (usa detalleModelo)
  const rankingModelos = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];

    const map = new Map();

    for (const v of ventas) {
      const nombre = (v.detalleModelo || "").trim();
      if (!nombre) continue;

      const prev =
        map.get(nombre) || {
          nombre,
          unidades: 0,
          ingresos: 0,
          ventas: 0,
        };

      const monto =
        typeof v.montoTotal === "number"
          ? v.montoTotal
          : (v.precioUnitario || 0) * (v.cantidad || 0);

      prev.unidades += v.cantidad || 0;
      prev.ingresos += monto || 0;
      prev.ventas += 1;

      map.set(nombre, prev);
    }

    const lista = Array.from(map.values());
    lista.sort((a, b) => b.ingresos - a.ingresos);
    return lista;
  }, [ventas]);

  // Ventas por canal
  const resumenCanales = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];

    const map = new Map();

    for (const v of ventas) {
      const canal = v.canal || "sin_canal";
      const prev =
        map.get(canal) || {
          canal,
          ingresos: 0,
          ventas: 0,
          unidades: 0,
        };

      const monto =
        typeof v.montoTotal === "number"
          ? v.montoTotal
          : (v.precioUnitario || 0) * (v.cantidad || 0);

      prev.ingresos += monto || 0;
      prev.ventas += 1;
      prev.unidades += v.cantidad || 0;

      map.set(canal, prev);
    }

    const lista = Array.from(map.values());
    lista.sort((a, b) => b.ingresos - a.ingresos);
    return lista;
  }, [ventas]);

  // Ingresos por mes (YYYY-MM)
  const ingresosPorMes = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];

    const map = new Map();

    for (const v of ventas) {
      if (!v.fecha) continue;
      const d = new Date(v.fecha);
      if (Number.isNaN(d.getTime())) continue;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      const prev =
        map.get(key) || {
          mes: key,
          ingresos: 0,
          ventas: 0,
        };

      const monto =
        typeof v.montoTotal === "number"
          ? v.montoTotal
          : (v.precioUnitario || 0) * (v.cantidad || 0);

      prev.ingresos += monto || 0;
      prev.ventas += 1;

      map.set(key, prev);
    }

    const lista = Array.from(map.values());
    lista.sort((a, b) => (a.mes < b.mes ? -1 : 1)); // cronológico
    // últimos 6 meses
    return lista.slice(-6);
  }, [ventas]);

  // Gastos por tipo (materiales / feria / otro / etc.)
  const gastosPorTipo = useMemo(() => {
    if (!gastos || gastos.length === 0) return [];

    const map = new Map();

    for (const g of gastos) {
      const tipo = g.tipo || "sin_tipo";
      const prev =
        map.get(tipo) || {
          tipo,
          monto: 0,
          registros: 0,
        };

      prev.monto += g.monto || 0;
      prev.registros += 1;

      map.set(tipo, prev);
    }

    const lista = Array.from(map.values());
    lista.sort((a, b) => b.monto - a.monto);
    return lista;
  }, [gastos]);

  // Balance por feria (ingresos - gastos) todo en el Dashboard
  const balancePorFeria = useMemo(() => {
    if ((!ventas || ventas.length === 0) && (!gastos || gastos.length === 0)) {
      return [];
    }

    const map = new Map();

    function ensureFeria(id) {
      let item = map.get(id);
      if (!item) {
        const feria = mapaFerias.get(id);
        item = {
          feriaId: id,
          nombre: feria?.nombre || id || "Sin feria",
          fecha: feria?.fecha || null,
          ingresos: 0,
          gastos: 0,
          ventas: 0,
          unidades: 0,
          movGastos: 0,
        };
        map.set(id, item);
      }
      return item;
    }

    // Ventas en ferias
    for (const v of ventas || []) {
      if (v.canal !== "feria" || !v.feriaId) continue;
      const item = ensureFeria(v.feriaId);

      const monto =
        typeof v.montoTotal === "number"
          ? v.montoTotal
          : (v.precioUnitario || 0) * (v.cantidad || 0);

      item.ingresos += monto || 0;
      item.ventas += 1;
      item.unidades += v.cantidad || 0;
    }

    // Gastos asociados a ferias
    for (const g of gastos || []) {
      if (g.tipo !== "feria" || !g.feriaId) continue;
      const item = ensureFeria(g.feriaId);

      item.gastos += g.monto || 0;
      item.movGastos += 1;
    }

    const lista = Array.from(map.values()).map((item) => ({
      ...item,
      neto: item.ingresos - item.gastos,
    }));

    // ordenar por fecha si existe, si no, por nombre
    lista.sort((a, b) => {
      if (a.fecha && b.fecha) {
        const da = new Date(a.fecha).getTime();
        const db = new Date(b.fecha).getTime();
        return db - da; // más reciente primero
      }
      return (a.nombre || "").localeCompare(b.nombre || "");
    });

    return lista;
  }, [ventas, gastos, mapaFerias]);

  function renderSeccion() {
    if (seccionActiva === "dashboard") return renderSeccionDashboard();
    if (seccionActiva === "periodo") return renderSeccionPeriodo();
    return null;
  }

  // ============================
  //     RENDER: POR PERÍODO
  // ============================

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
              Sin filtros de fecha, este resumen es el mismo que verías en el{" "}
              <strong>Dashboard</strong>, pero con este layout centrado en
              períodos.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ============================
  //     RENDER: DASHBOARD
  // ============================

  function renderSeccionDashboard() {
    const totalGastosNum = totalGastos || 0;

    return (
      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* KPIs principales */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Ingresos */}
          <div
            style={{
              flex: "1 1 200px",
              minWidth: 200,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Ingresos totales
            </p>
            <p style={{ margin: "4px 0", fontSize: 20, fontWeight: "700" }}>
              ${formatMonto(totalIngresos)} ARS
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              {cantidadVentas} ventas
            </p>
          </div>

          {/* Gastos */}
          <div
            style={{
              flex: "1 1 200px",
              minWidth: 200,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Gastos totales
            </p>
            <p style={{ margin: "4px 0", fontSize: 20, fontWeight: "700" }}>
              ${formatMonto(totalGastos)} ARS
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              {cantidadGastos} movimientos de gasto
            </p>
          </div>

          {/* Resultado neto */}
          <div
            style={{
              flex: "1 1 200px",
              minWidth: 200,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Resultado neto
            </p>
            <p
              style={{
                margin: "4px 0",
                fontSize: 20,
                fontWeight: "700",
                color: colorResultado(),
              }}
            >
              {resultadoNeto >= 0 ? "" : "-"}$
              {formatMonto(Math.abs(resultadoNeto))} ARS
            </p>
            {porcentajeGastosSobreIngresos != null ? (
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                Gastos ={" "}
                {porcentajeGastosSobreIngresos.toFixed(1).replace(".", ",")}
                % de los ingresos.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                Sin ventas todavía para calcular proporción de gastos.
              </p>
            )}
          </div>

          {/* Ticket promedio */}
          <div
            style={{
              flex: "1 1 200px",
              minWidth: 200,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Ticket promedio
            </p>
            <p style={{ margin: "4px 0", fontSize: 20, fontWeight: "700" }}>
              {cantidadVentas > 0
                ? `$${formatMonto(ticketPromedio)} ARS`
                : "-"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              Promedio por venta registrada
            </p>
          </div>
        </div>

        {/* Fila 2: Top productos + Gastos por tipo */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Top productos */}
          <div
            style={{
              flex: "1 1 320px",
              minWidth: 320,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Top productos</h3>
            {rankingProductos.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Todavía no hay ventas registradas.
              </p>
            ) : (
              <table
                border="1"
                cellPadding="4"
                style={{ fontSize: 12, width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Unidades</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingProductos.slice(0, 5).map((r) => {
                    const prod = mapaProductos.get(r.productoId);
                    const nombreProd =
                      prod?.nombre || r.productoId || "Sin producto";
                    return (
                      <tr key={r.productoId}>
                        <td>{nombreProd}</td>
                        <td style={{ textAlign: "right" }}>{r.unidades}</td>
                        <td style={{ textAlign: "right" }}>
                          ${formatMonto(r.ingresos)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Gastos por tipo */}
          <div
            style={{
              flex: "1 1 320px",
              minWidth: 320,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Gastos por tipo</h3>
            {gastosPorTipo.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Todavía no registraste gastos.
              </p>
            ) : (
              <table
                border="1"
                cellPadding="4"
                style={{ fontSize: 12, width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Registros</th>
                    <th>Monto</th>
                    <th>% gastos</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosPorTipo.map((g) => {
                    const porcentaje =
                      totalGastosNum > 0
                        ? (g.monto / totalGastosNum) * 100
                        : 0;
                    return (
                      <tr key={g.tipo}>
                        <td>{g.tipo}</td>
                        <td style={{ textAlign: "right" }}>
                          {g.registros}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          ${formatMonto(g.monto)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {porcentaje.toFixed(1).replace(".", ",")}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fila 3: Ventas por canal + Modelos/diseños */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Ventas por canal */}
          <div
            style={{
              flex: "1 1 320px",
              minWidth: 320,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Ventas por canal</h3>
            {resumenCanales.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Todavía no hay ventas registradas.
              </p>
            ) : (
              <table
                border="1"
                cellPadding="4"
                style={{ fontSize: 12, width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>Ventas</th>
                    <th>Ingresos</th>
                    <th>% ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenCanales.map((c) => {
                    const porcentaje =
                      totalIngresos > 0
                        ? (c.ingresos / totalIngresos) * 100
                        : 0;

                    let label = c.canal;
                    if (c.canal === "feria") label = "Feria";
                    else if (c.canal === "online") label = "Online";
                    else if (c.canal === "presencial")
                      label = "Presencial";
                    else if (c.canal === "sin_canal")
                      label = "Sin canal";

                    return (
                      <tr key={c.canal}>
                        <td>{label}</td>
                        <td style={{ textAlign: "right" }}>{c.ventas}</td>
                        <td style={{ textAlign: "right" }}>
                          ${formatMonto(c.ingresos)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {porcentaje.toFixed(1).replace(".", ",")}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Modelos / diseños más vendidos */}
          <div
            style={{
              flex: "1 1 320px",
              minWidth: 320,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>
              Modelos / diseños más vendidos
            </h3>
            {rankingModelos.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Todavía no registraste ventas con detalle de modelo/diseño.
              </p>
            ) : (
              <table
                border="1"
                cellPadding="4"
                style={{ fontSize: 12, width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Modelo / diseño</th>
                    <th>Unidades</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingModelos.slice(0, 5).map((m) => (
                    <tr key={m.nombre}>
                      <td>{m.nombre}</td>
                      <td style={{ textAlign: "right" }}>{m.unidades}</td>
                      <td style={{ textAlign: "right" }}>
                        ${formatMonto(m.ingresos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fila 4: Ingresos por mes + Balance por feria */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Ingresos por mes */}
          <div
            style={{
              flex: "1 1 320px",
              minWidth: 320,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>
              Ingresos por mes (últimos 6)
            </h3>
            {ingresosPorMes.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Todavía no hay ventas registradas.
              </p>
            ) : (
              <table
                border="1"
                cellPadding="4"
                style={{ fontSize: 12, width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Ingresos</th>
                    <th>Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresosPorMes.map((m) => (
                    <tr key={m.mes}>
                      <td>{m.mes}</td>
                      <td style={{ textAlign: "right" }}>
                        ${formatMonto(m.ingresos)}
                      </td>
                      <td style={{ textAlign: "right" }}>{m.ventas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Balance por feria */}
          <div
            style={{
              flex: "1 1 320px",
              minWidth: 320,
              border: "1px solid #4b5563",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Balance por feria</h3>
            {balancePorFeria.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>
                Aún no hay ventas o gastos asociados a ferias.
              </p>
            ) : (
              <table
                border="1"
                cellPadding="4"
                style={{ fontSize: 12, width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Feria</th>
                    <th>Fecha</th>
                    <th>Ingresos</th>
                    <th>Gastos</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {balancePorFeria.map((f) => (
                    <tr key={f.feriaId}>
                      <td>{f.nombre}</td>
                      <td>{f.fecha ? formatFechaCorta(f.fecha) : "-"}</td>
                      <td style={{ textAlign: "right" }}>
                        ${formatMonto(f.ingresos)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        ${formatMonto(f.gastos)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: colorPorValor(f.neto),
                          fontWeight: 600,
                        }}
                      >
                        {f.neto >= 0 ? "" : "-"}$
                        {formatMonto(Math.abs(f.neto))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================
  //     RENDER PRINCIPAL
  // ============================

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
