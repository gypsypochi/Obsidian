import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";

import Materiales from "./pages/materiales.jsx";
import Proveedores from "./pages/proveedores.jsx";
import Nav from "./components/nav.jsx";

export default function App() {
  return (
    <>
      <Nav />

      <Routes>
        <Route path="/" element={<Navigate to="/materiales" replace />} />
        <Route path="/materiales" element={<Materiales />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="*" element={<p>404 – Página no encontrada</p>} />
      </Routes>
    </>
  );
}
