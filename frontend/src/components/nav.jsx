// frontend/src/components/nav.jsx
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPedidos } from "../api";

const linkStyle = ({ isActive }) => ({
  marginRight: 12,
  textDecoration: "none",
  color: isActive ? "#4f46e5" : "#111",
  fontWeight: isActive ? "600" : "400",
});

export default function Nav() {
  const [totalPedidosActivos, setTotalPedidosActivos] = useState(0);

  useEffect(() => {
    async function loadPedidos() {
      try {
        const data = await getPedidos();

        // activos = todos menos entregado / cancelado
        const activos = data.filter(
          (ped) => ped.estado !== "entregado" && ped.estado !== "cancelado"
        ).length;

        setTotalPedidosActivos(activos);
      } catch (e) {
        console.error("Error cargando pedidos para nav:", e);
      }
    }

    // primera carga
    loadPedidos();

    // refrescar cada 15s para que no quede viejo
    const intervalId = setInterval(loadPedidos, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const pedidosLabel = `Pedidos (${totalPedidosActivos})`;

  return (
    <nav
      style={{
        marginBottom: 16,
        padding: 12,
        background: "white",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <NavLink to="/materiales" style={linkStyle}>
        Materiales
      </NavLink>

      <NavLink to="/proveedores" style={linkStyle}>
        Proveedores
      </NavLink>

      <NavLink to="/productos" style={linkStyle}>
        Productos
      </NavLink>

      <NavLink to="/recetas" style={linkStyle}>
        Recetas
      </NavLink>

      <NavLink to="/produccion" style={linkStyle}>
        Producción
      </NavLink>

      <NavLink to="/historial" style={linkStyle}>
        Historial
      </NavLink>

      <NavLink to="/ventas" style={linkStyle}>
        Ventas
      </NavLink>

      {/* 👉 NUEVO: link a Ferias */}
      <NavLink to="/ferias" style={linkStyle}>
        Ferias
      </NavLink>

      <NavLink to="/pedidos" style={linkStyle}>
        {pedidosLabel}
      </NavLink>

      <NavLink to="/modelos" style={linkStyle}>
        Modelos
      </NavLink>
    </nav>
  );
}
