// frontend/src/App.jsx
import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";

import Materiales from "./pages/materiales.jsx";
import Proveedores from "./pages/proveedores.jsx";
import Productos from "./pages/productos.jsx";
import Nav from "./components/nav.jsx";
import Recetas from "./pages/recetas.jsx";
import Produccion from "./pages/produccion.jsx";
import Historial from "./pages/historial.jsx";
// NUEVO
import Ventas from "./pages/ventas.jsx";

export default function App() {
  return (
    <>
      <Nav />

      <Routes>
        <Route path="/" element={<Navigate to="/materiales" replace />} />
        <Route path="/materiales" element={<Materiales />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/recetas" element={<Recetas />} />
        <Route path="/produccion" element={<Produccion />} />
        <Route path="/historial" element={<Historial />} />
        {/* NUEVO */}
        <Route path="/ventas" element={<Ventas />} />
        <Route path="*" element={<p>404 – Página no encontrada</p>} />
      </Routes>
    </>
  );
}
