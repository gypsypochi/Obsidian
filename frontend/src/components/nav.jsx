import { NavLink } from "react-router-dom";

export default function Nav() {
  return (
    <nav style={{ marginBottom: 16, padding: 12, background: "white" }}>
      <NavLink to="/materiales" style={{ marginRight: 12, color: "black" }}>
        Materiales
      </NavLink>

      <NavLink to="/proveedores" style={{ color: "black" }}>
        Proveedores
      </NavLink>
    </nav>
  );
}
