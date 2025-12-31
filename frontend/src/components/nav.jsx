// frontend/src/components/nav.jsx
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPedidos } from "../api";
import "./nav.css";

function linkClassName({ isActive }) {
  return isActive ? "sidebar-link is-active" : "sidebar-link";
}

export default function Nav() {
  const [totalPedidosActivos, setTotalPedidosActivos] = useState(0);

  // ❗ estado para colapsables
  const [open, setOpen] = useState({
    base: true,
    operativa: true,
    finanzas: true,
  });

  function toggle(section) {
    setOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  useEffect(() => {
    async function loadPedidos() {
      try {
        const data = await getPedidos();
        const activos = data.filter(
          (ped) => ped.estado !== "entregado" && ped.estado !== "cancelado"
        ).length;
        setTotalPedidosActivos(activos);
      } catch (e) {
        console.error("Error cargando pedidos para nav:", e);
      }
    }

    loadPedidos();
    const intervalId = setInterval(loadPedidos, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const pedidosLabel = `Pedidos (${totalPedidosActivos})`;

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
  <img
    src="/src/assets/logo-obsidian.png"
    alt="OBSIDIAN logo"
    className="sidebar-logo-img"
  />
</div>

        <div className="sidebar-title">
          <span className="sidebar-title-name">OBSIDIAN</span>
          <span className="sidebar-title-version">Ver 1.0</span>
        </div>
      </div>

      <nav className="sidebar-nav">

        {/* ================= BASE ================= */}
        <div className="sidebar-section">
          <button className="sidebar-section-toggle" onClick={() => toggle("base")}>
            <span>Base</span>
            <span className={`caret ${open.base ? "open" : ""}`}>▸</span>
          </button>

          <div className={`sidebar-section-content ${open.base ? "open" : ""}`}>
            <NavLink to="/materiales" className={linkClassName}>
              Materiales
            </NavLink>
            <NavLink to="/proveedores" className={linkClassName}>
              Proveedores
            </NavLink>
            <NavLink to="/productos" className={linkClassName}>
              Productos
            </NavLink>
            <NavLink to="/recetas" className={linkClassName}>
              Recetas
            </NavLink>
          </div>
        </div>

        {/* ================= OPERATIVA ================= */}
        <div className="sidebar-section">
          <button
            className="sidebar-section-toggle"
            onClick={() => toggle("operativa")}
          >
            <span>Operativa</span>
            <span className={`caret ${open.operativa ? "open" : ""}`}>▸</span>
          </button>

          <div className={`sidebar-section-content ${open.operativa ? "open" : ""}`}>
            <NavLink to="/produccion" className={linkClassName}>
              Producción
            </NavLink>
            <NavLink to="/historial" className={linkClassName}>
              Historial
            </NavLink>
            <NavLink to="/ventas" className={linkClassName}>
              Ventas
            </NavLink>
            <NavLink to="/pedidos" className={linkClassName}>
              {pedidosLabel}
            </NavLink>
            <NavLink to="/modelos" className={linkClassName}>
              Modelos
            </NavLink>
            <NavLink to="/ferias" className={linkClassName}>
              Ferias
            </NavLink>
          </div>
        </div>

        {/* ================= FINANZAS ================= */}
        <div className="sidebar-section">
          <button
            className="sidebar-section-toggle"
            onClick={() => toggle("finanzas")}
          >
            <span>Finanzas</span>
            <span className={`caret ${open.finanzas ? "open" : ""}`}>▸</span>
          </button>

          <div className={`sidebar-section-content ${open.finanzas ? "open" : ""}`}>
            <NavLink to="/gastos" className={linkClassName}>
              Gastos
            </NavLink>
            <NavLink to="/balance" className={linkClassName}>
              Balance / Dashboard
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-text">
          Emprendimiento stickers & cuadernos
        </span>
      </div>
    </aside>
  );
}
