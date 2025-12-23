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
    </nav>
  );
}
