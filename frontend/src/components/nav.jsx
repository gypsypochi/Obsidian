// frontend/src/components/nav.jsx
import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  marginRight: 12,
  textDecoration: "none",
  color: isActive ? "#4f46e5" : "#111",
  fontWeight: isActive ? "600" : "400",
});

export default function Nav() {
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

      {/* NUEVO */}
      <NavLink to="/pedidos" style={linkStyle}>
        Pedidos
      </NavLink>
    </nav>
  );
}
