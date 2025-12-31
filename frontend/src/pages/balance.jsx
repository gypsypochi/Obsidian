// frontend/src/pages/balance.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getVentas,
  getGastos,
  getFerias,
  getProductos,
} from "../api";
import PageHeader from "../components/PageHeader.jsx";
import "./balance.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const SECCIONES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "periodo", label: "Por período" },
];

const CHART_COLORS = ["#8b5cf6", "#38bdf8", "#f472b6", "#4ade80", "#facc15"];

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
        await Promise.all([
          getVentas(),
          getGastos(),
          getFerias(),
          getProductos(),
        ]);

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
    [ferias],
  );

  const mapaProductos = useMemo(
    () => new Map(productos.map((p) => [p.id, p])),
    [productos],
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
    [totalIngresos, totalGastos],
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

  function clasePorValor(valor) {
    if (valor > 0) return "text-positive";
    if (valor < 0) return "text-negative";
    return "text-neutral";
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
      0,
    );
  }, [gastosFiltrados]);

  const resultadoNetoPeriodo = useMemo(
    () => totalIngresosPeriodo - totalGastosPeriodo,
    [totalIngresosPeriodo, totalGastosPeriodo],
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
        "0",
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

  // Balance por feria (ingresos - gastos)
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
      <section className="balance-section balance-section-period">
        {/* Filtros de fecha */}
        <div className="card balance-period-filters">
          <p className="balance-label">Filtrar por período</p>

          <div className="balance-period-filters-row">
            <div className="balance-field">
              <label>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="balance-field">
              <label>Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-secondary balance-clear-btn"
              onClick={() => {
                setFechaDesde("");
                setFechaHasta("");
              }}
            >
              Limpiar fechas
            </button>
          </div>

          <p className="balance-period-range">{textoRango}</p>
        </div>

        {/* KPIs del período */}
        <div className="kpi-grid">
          <div className="card-kpi">
            <div className="card-kpi-header">
              <span>Ingresos en el período</span>
            </div>
            <div className="card-kpi-value">
              ${formatMonto(totalIngresosPeriodo)} ARS
            </div>
            <div className="card-kpi-meta">
              Registros de ventas: {cantidadVentasPeriodo}
            </div>
          </div>

          <div className="card-kpi">
            <div className="card-kpi-header">
              <span>Gastos en el período</span>
            </div>
            <div className="card-kpi-value">
              ${formatMonto(totalGastosPeriodo)} ARS
            </div>
            <div className="card-kpi-meta">
              Registros de gastos: {cantidadGastosPeriodo}
            </div>
          </div>

          <div className="card-kpi">
            <div className="card-kpi-header">
              <span>Resultado neto del período</span>
            </div>
            <div
              className={`card-kpi-value ${clasePorValor(
                resultadoNetoPeriodo,
              )}`}
            >
              {resultadoNetoPeriodo >= 0 ? "" : "-"}$
              {formatMonto(Math.abs(resultadoNetoPeriodo))} ARS
            </div>
            <div className="card-kpi-meta">
              {porcentajeGastosSobreIngresosPeriodo != null ? (
                <>
                  Gastos ={" "}
                  {porcentajeGastosSobreIngresosPeriodo
                    .toFixed(1)
                    .replace(".", ",")}
                  % de los ingresos del período.
                </>
              ) : (
                <>Aún no hay ventas en el período para calcular el porcentaje.</>
              )}
            </div>
          </div>
        </div>

        {/* Resumen textual período */}
        <div className="card balance-period-summary">
          {hayFiltroFecha() ? (
            <p>
              Entre{" "}
              <strong>
                {fechaDesde ? formatFechaFiltro(fechaDesde) : "el inicio"}
              </strong>{" "}
              y{" "}
              <strong>
                {fechaHasta ? formatFechaFiltro(fechaHasta) : "hoy"}
              </strong>
              , tu resultado neto fue de{" "}
              <strong className={clasePorValor(resultadoNetoPeriodo)}>
                {formatMontoConSigno(resultadoNetoPeriodo)} ARS
              </strong>
              .
            </p>
          ) : (
            <p>
              Sin filtros de fecha, este resumen es el mismo que verías en el{" "}
              <strong>Dashboard</strong>, pero con este layout centrado en
              períodos.
            </p>
          )}
        </div>
      </section>
    );
  }

  // ============================
  //     RENDER: DASHBOARD
  // ============================

  function renderSeccionDashboard() {
    const totalGastosNum = totalGastos || 0;
    const totalIngresosNum = totalIngresos || 0;

    // 🔔 Alertas
    const feriasNegativas = (balancePorFeria || []).filter((f) => f.neto < 0);
    const feriasMargenBajo = (balancePorFeria || []).filter((f) => {
      if (f.neto < 0) return false;
      if (!f.ingresos || f.ingresos <= 0) return false;
      const margen = (f.neto / f.ingresos) * 100;
      return margen >= 0 && margen < 15;
    });

    const tieneAlertaGlobalNegativa = resultadoNeto < 0;
    const tieneAlertaGastoAlto =
      porcentajeGastosSobreIngresos != null &&
      porcentajeGastosSobreIngresos > 70;

    const hayAlertas =
      tieneAlertaGlobalNegativa ||
      tieneAlertaGastoAlto ||
      feriasNegativas.length > 0 ||
      feriasMargenBajo.length > 0;

    const feriasNegativasTexto = [...feriasNegativas]
      .sort((a, b) => a.neto - b.neto)
      .slice(0, 3)
      .map(
        (f) => `${f.nombre} (${formatMontoConSigno(f.neto)} ARS)`,
      )
      .join(" · ");

    const feriasMargenBajoTexto = [...feriasMargenBajo]
      .sort((a, b) => {
        const ma = a.ingresos ? (a.neto / a.ingresos) * 100 : 0;
        const mb = b.ingresos ? (b.neto / b.ingresos) * 100 : 0;
        return ma - mb;
      })
      .slice(0, 3)
      .map((f) => {
        const margen = f.ingresos
          ? ((f.neto / f.ingresos) * 100).toFixed(1).replace(".", ",")
          : "0";
        return `${f.nombre} (${margen}% margen)`;
      })
      .join(" · ");

    // 📊 Insights adicionales
    const top3Productos = (rankingProductos || []).slice(0, 3);
    const ingresosTop3 = top3Productos.reduce(
      (acc, p) => acc + (p.ingresos || 0),
      0,
    );
    const porcentajeTop3 =
      totalIngresosNum > 0 ? (ingresosTop3 / totalIngresosNum) * 100 : null;

    let canalPrincipal = null;
    let porcentajeCanalPrincipal = null;
    if (resumenCanales && resumenCanales.length > 0 && totalIngresosNum > 0) {
      canalPrincipal = resumenCanales.reduce(
        (acc, c) => (!acc || c.ingresos > acc.ingresos ? c : acc),
        null,
      );
      if (canalPrincipal) {
        porcentajeCanalPrincipal =
          (canalPrincipal.ingresos / totalIngresosNum) * 100;
      }
    }

    function labelCanal(canal) {
      if (canal === "feria") return "Feria";
      if (canal === "online") return "Online";
      if (canal === "presencial") return "Presencial";
      if (canal === "sin_canal") return "Sin canal";
      return canal || "Sin canal";
    }

    let mejorFeria = null;
    let peorFeria = null;
    if (balancePorFeria && balancePorFeria.length > 0) {
      mejorFeria = balancePorFeria.reduce(
        (acc, f) => (!acc || f.neto > acc.neto ? f : acc),
        null,
      );
      peorFeria = balancePorFeria.reduce(
        (acc, f) => (!acc || f.neto < acc.neto ? f : acc),
        null,
      );
    }

    let mejorMes = null;
    let peorMes = null;
    if (ingresosPorMes && ingresosPorMes.length > 0) {
      mejorMes = ingresosPorMes.reduce(
        (acc, m) => (!acc || m.ingresos > acc.ingresos ? m : acc),
        null,
      );
      peorMes = ingresosPorMes.reduce(
        (acc, m) => (!acc || m.ingresos < acc.ingresos ? m : acc),
        null,
      );
    }

    const dataGastosPorTipo = gastosPorTipo.map((g) => ({
      name: g.tipo,
      value: g.monto,
    }));

    const dataCanales = resumenCanales.map((c) => ({
      name: labelCanal(c.canal),
      value: c.ingresos,
    }));

    return (
      <section className="balance-section balance-section-dashboard">
        {/* Alertas del negocio */}
        <div
          className={`card balance-alerts ${
            hayAlertas ? "balance-alerts--danger" : "balance-alerts--ok"
          }`}
        >
          <p className="balance-alerts-title">🔔 Alertas del negocio</p>

          {!hayAlertas ? (
            <p className="balance-alerts-text-ok">
              Todo en orden, no hay alertas por ahora ✨
            </p>
          ) : (
            <ul className="balance-alerts-list">
              {tieneAlertaGlobalNegativa && (
                <li className="balance-alerts-item balance-alerts-item--danger">
                  Resultado global negativo:{" "}
                  <strong>
                    {formatMontoConSigno(resultadoNeto)} ARS
                  </strong>
                  . Revisá costos, precios o ferias deficitarias.
                </li>
              )}

              {tieneAlertaGastoAlto && (
                <li className="balance-alerts-item balance-alerts-item--warning">
                  Los gastos representan el{" "}
                  <strong>
                    {porcentajeGastosSobreIngresos
                      ?.toFixed(1)
                      .replace(".", ",")}
                    %
                  </strong>{" "}
                  de los ingresos. Podría ser un nivel de gasto alto.
                </li>
              )}

              {feriasNegativas.length > 0 && (
                <li className="balance-alerts-item balance-alerts-item--danger-soft">
                  Ferias en negativo:{" "}
                  <strong>{feriasNegativasTexto}</strong>
                  {feriasNegativas.length > 3 && " …"}
                </li>
              )}

              {feriasMargenBajo.length > 0 && (
                <li className="balance-alerts-item balance-alerts-item--warning">
                  Ferias con margen muy ajustado:{" "}
                  <strong>{feriasMargenBajoTexto}</strong>
                  {feriasMargenBajo.length > 3 && " …"}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Insights rápidos */}
        <div className="balance-grid balance-grid--4">
          <div className="card balance-card">
            <p className="balance-card-label">Concentración de productos</p>
            {porcentajeTop3 != null && top3Productos.length > 0 ? (
              <>
                <p className="balance-card-text">
                  Tus <strong>3 productos top</strong> concentran{" "}
                  <strong>
                    {porcentajeTop3.toFixed(1).replace(".", ",")}%
                  </strong>{" "}
                  de los ingresos.
                </p>
                <p className="balance-card-meta">
                  Ingresos top 3: ${formatMonto(ingresosTop3)} ARS
                </p>
              </>
            ) : (
              <p className="balance-card-meta">
                Todavía no hay suficientes ventas para calcularlo.
              </p>
            )}
          </div>

          <div className="card balance-card">
            <p className="balance-card-label">Canal principal de ingresos</p>
            {canalPrincipal && porcentajeCanalPrincipal != null ? (
              <>
                <p className="balance-card-text">
                  El canal{" "}
                  <strong>{labelCanal(canalPrincipal.canal)}</strong> concentra{" "}
                  <strong>
                    {porcentajeCanalPrincipal
                      .toFixed(1)
                      .replace(".", ",")}
                    %
                  </strong>{" "}
                  de tus ingresos.
                </p>
                <p className="balance-card-meta">
                  Ingresos por este canal: $
                  {formatMonto(canalPrincipal.ingresos)} ARS
                </p>
              </>
            ) : (
              <p className="balance-card-meta">
                Aún no hay datos suficientes por canal.
              </p>
            )}
          </div>

          <div className="card balance-card">
            <p className="balance-card-label">Ferias destacadas</p>
            {mejorFeria || peorFeria ? (
              <div className="balance-card-text">
                {mejorFeria && (
                  <p className="balance-card-row">
                    🥇 Mejor feria:{" "}
                    <strong>{mejorFeria.nombre}</strong>{" "}
                    <span className={clasePorValor(mejorFeria.neto)}>
                      ({formatMontoConSigno(mejorFeria.neto)} ARS)
                    </span>
                  </p>
                )}
                {peorFeria && (
                  <p className="balance-card-row">
                    🥶 Peor feria:{" "}
                    <strong>{peorFeria.nombre}</strong>{" "}
                    <span className={clasePorValor(peorFeria.neto)}>
                      ({formatMontoConSigno(peorFeria.neto)} ARS)
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="balance-card-meta">
                Todavía no hay datos de ferias suficientes.
              </p>
            )}
          </div>

          <div className="card balance-card">
            <p className="balance-card-label">Meses más fuertes / flojos</p>
            {mejorMes || peorMes ? (
              <div className="balance-card-text">
                {mejorMes && (
                  <p className="balance-card-row">
                    📈 Mejor mes: <strong>{mejorMes.mes}</strong>{" "}
                    <span>
                      (${formatMonto(mejorMes.ingresos)} ARS)
                    </span>
                  </p>
                )}
                {peorMes && (
                  <p className="balance-card-row">
                    📉 Mes más flojo: <strong>{peorMes.mes}</strong>{" "}
                    <span>
                      (${formatMonto(peorMes.ingresos)} ARS)
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="balance-card-meta">
                Todavía no hay suficientes meses con ventas para comparar.
              </p>
            )}
          </div>
        </div>

        {/* KPIs principales */}
        <div className="kpi-grid">
          <div className="card-kpi">
            <div className="card-kpi-header">
              <span>Ingresos totales</span>
            </div>
            <div className="card-kpi-value">
              ${formatMonto(totalIngresos)} ARS
            </div>
            <div className="card-kpi-meta">
              {cantidadVentas} ventas registradas
            </div>
          </div>

          <div className="card-kpi">
            <div className="card-kpi-header">
              <span>Gastos totales</span>
            </div>
            <div className="card-kpi-value">
              ${formatMonto(totalGastos)} ARS
            </div>
            <div className="card-kpi-meta">
              {cantidadGastos} movimientos de gasto
            </div>
          </div>

          <div className="card-kpi">
            <div className="card-kpi-header">
              <span>Resultado neto</span>
            </div>
            <div className={`card-kpi-value ${clasePorValor(resultadoNeto)}`}>
              {resultadoNeto >= 0 ? "" : "-"}$
              {formatMonto(Math.abs(resultadoNeto))} ARS
            </div>
            <div className="card-kpi-meta">
              {porcentajeGastosSobreIngresos != null ? (
                <>
                  Gastos ={" "}
                  {porcentajeGastosSobreIngresos
                    .toFixed(1)
                    .replace(".", ",")}
                  % de los ingresos.
                </>
              ) : (
                <>Sin ventas todavía para calcular proporción de gastos.</>
              )}
            </div>
          </div>

          <div className="card-kpi">
            <div className="card-kpi-header">
              <span>Ticket promedio</span>
            </div>
            <div className="card-kpi-value">
              {cantidadVentas > 0
                ? `$${formatMonto(ticketPromedio)} ARS`
                : "-"}
            </div>
            <div className="card-kpi-meta">
              Promedio por venta registrada
            </div>
          </div>
        </div>

        {/* Fila 1: Top productos + Modelos más vendidos */}
        <div className="balance-grid balance-grid--2">
          <div className="card balance-card">
            <h3 className="balance-card-title">Top productos</h3>
            {rankingProductos.length === 0 ? (
              <p className="balance-card-meta">
                Todavía no hay ventas registradas.
              </p>
            ) : (
              <table className="balance-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Unidades</th>
                    <th className="text-right">Ingresos</th>
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
                        <td className="text-right">{r.unidades}</td>
                        <td className="text-right">
                          ${formatMonto(r.ingresos)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card balance-card">
            <h3 className="balance-card-title">
              Modelos / diseños más vendidos
            </h3>
            {rankingModelos.length === 0 ? (
              <p className="balance-card-meta">
                Todavía no registraste ventas con detalle de modelo/diseño.
              </p>
            ) : (
              <table className="balance-table">
                <thead>
                  <tr>
                    <th>Modelo / diseño</th>
                    <th className="text-right">Unidades</th>
                    <th className="text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingModelos.slice(0, 5).map((m) => (
                    <tr key={m.nombre}>
                      <td>{m.nombre}</td>
                      <td className="text-right">{m.unidades}</td>
                      <td className="text-right">
                        ${formatMonto(m.ingresos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fila 2: Gastos por tipo + Ventas por canal (tortas) */}
        <div className="balance-grid balance-grid--2">
          <div className="card balance-card">
            <h3 className="balance-card-title">Gastos por tipo</h3>
            {gastosPorTipo.length === 0 ? (
              <p className="balance-card-meta">
                Todavía no registraste gastos.
              </p>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={dataGastosPorTipo}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {dataGastosPorTipo.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            CHART_COLORS[index % CHART_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `$${formatMonto(value)}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card balance-card">
            <h3 className="balance-card-title">Ventas por canal</h3>
            {resumenCanales.length === 0 ? (
              <p className="balance-card-meta">
                Todavía no hay ventas registradas.
              </p>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={dataCanales}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {dataCanales.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            CHART_COLORS[index % CHART_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `$${formatMonto(value)}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Fila 3: Ingresos por mes (solo) */}
        <div className="card balance-card">
          <h3 className="balance-card-title">
            Ingresos por mes (últimos 6)
          </h3>
          {ingresosPorMes.length === 0 ? (
            <p className="balance-card-meta">
              Todavía no hay ventas registradas.
            </p>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={ingresosPorMes}>
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `$${formatMonto(value)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#38bdf8"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Fila 4: Balance por feria (solo) */}
        <div className="card balance-card">
          <h3 className="balance-card-title">Balance por feria</h3>
          {balancePorFeria.length === 0 ? (
            <p className="balance-card-meta">
              Aún no hay ventas o gastos asociados a ferias.
            </p>
          ) : (
            <table className="balance-table">
              <thead>
                <tr>
                  <th>Feria</th>
                  <th>Fecha</th>
                  <th className="text-right">Ingresos</th>
                  <th className="text-right">Gastos</th>
                  <th className="text-right">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {balancePorFeria.map((f) => (
                  <tr key={f.feriaId}>
                    <td>{f.nombre}</td>
                    <td>{f.fecha ? formatFechaCorta(f.fecha) : "-"}</td>
                    <td className="text-right">
                      ${formatMonto(f.ingresos)}
                    </td>
                    <td className="text-right">
                      ${formatMonto(f.gastos)}
                    </td>
                    <td
                      className={`text-right ${clasePorValor(f.neto)}`}
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
      </section>
    );
  }

  // ============================
  //     RENDER PRINCIPAL
  // ============================

  return (
    <div className="balance-page">
      <PageHeader
        title="Balance & Dashboard"
        subtitle="Resumen financiero de OBSIDIAN: ingresos, gastos, ferias y canales."
      />

      {loading && (
        <div className="alert alert--info">
          Cargando datos de balance...
        </div>
      )}
      {error && (
        <div className="alert alert--error">{error}</div>
      )}

      {/* Navegación interna de secciones */}
      <div className="card balance-tabs-card">
        <p className="balance-label">Secciones</p>
        <div className="balance-tabs">
          {SECCIONES.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className={
                seccionActiva === sec.id
                  ? "balance-tab is-active"
                  : "balance-tab"
              }
              onClick={() => setSeccionActiva(sec.id)}
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
