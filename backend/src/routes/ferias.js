// backend/src/routes/ferias.js
const express = require("express");
const router = express.Router();

const { readFerias, writeFerias } = require("../utils/fileDB");

// GET /ferias - listar todas
router.get("/", (req, res) => {
  try {
    const ferias = readFerias();
    res.json(ferias);
  } catch (err) {
    console.error("Error leyendo ferias:", err);
    res.status(500).json({ error: "Error leyendo ferias" });
  }
});

// POST /ferias - crear nueva feria
router.post("/", (req, res) => {
  try {
    const {
      nombre,
      fecha,        // ISO string o "YYYY-MM-DD"
      lugar,
      direccion,
      costoBase,
      estado,
      notas,
      flyerUrl,     // 🔹 NUEVO: URL del flyer (imagen)
    } = req.body;

    if (!nombre || String(nombre).trim() === "") {
      return res.status(400).json({ error: "nombre es obligatorio" });
    }

    if (!fecha || String(fecha).trim() === "") {
      return res.status(400).json({ error: "fecha es obligatoria" });
    }

    const ferias = readFerias();

    const ahora = new Date().toISOString();

    const nuevaFeria = {
      id: `feria-${Date.now()}`,
      nombre: String(nombre).trim(),
      fecha: String(fecha).trim(),
      lugar: (lugar || "").toString().trim(),
      direccion: (direccion || "").toString().trim(),
      costoBase: costoBase !== undefined ? Number(costoBase) : 0,
      estado: (estado || "planeada").toString().trim(), // planeada / realizada / cancelada / pospuesta
      notas: (notas || "").toString().trim(),
      flyerUrl: (flyerUrl || "").toString().trim(), // puede venir vacío
      totalVentas: 0,
      totalGastos: 0,
      gananciaNeta: 0,
      createdAt: ahora,
      updatedAt: ahora,
    };

    ferias.push(nuevaFeria);
    writeFerias(ferias);

    res.status(201).json(nuevaFeria);
  } catch (err) {
    console.error("Error creando feria:", err);
    res.status(500).json({ error: "Error interno creando feria" });
  }
});

// PUT /ferias/:id - editar feria completa
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      fecha,
      lugar,
      direccion,
      costoBase,
      estado,
      notas,
      flyerUrl,
      totalVentas,
      totalGastos,
      gananciaNeta,
    } = req.body;

    const ferias = readFerias();
    const idx = ferias.findIndex((f) => f.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Feria no encontrada" });
    }

    const actual = ferias[idx];

    const actualizado = {
      ...actual,
      nombre:
        nombre !== undefined ? String(nombre).trim() : actual.nombre,
      fecha: fecha !== undefined ? String(fecha).trim() : actual.fecha,
      lugar:
        lugar !== undefined ? String(lugar).trim() : actual.lugar,
      direccion:
        direccion !== undefined
          ? String(direccion).trim()
          : actual.direccion,
      costoBase:
        costoBase !== undefined ? Number(costoBase) : actual.costoBase,
      estado:
        estado !== undefined ? String(estado).trim() : actual.estado,
      notas: notas !== undefined ? String(notas).trim() : actual.notas,
      flyerUrl:
        flyerUrl !== undefined
          ? String(flyerUrl).trim()
          : actual.flyerUrl,
      totalVentas:
        totalVentas !== undefined
          ? Number(totalVentas)
          : actual.totalVentas || 0,
      totalGastos:
        totalGastos !== undefined
          ? Number(totalGastos)
          : actual.totalGastos || 0,
      gananciaNeta:
        gananciaNeta !== undefined
          ? Number(gananciaNeta)
          : actual.gananciaNeta || 0,
      updatedAt: new Date().toISOString(),
    };

    ferias[idx] = actualizado;
    writeFerias(ferias);

    res.json(actualizado);
  } catch (err) {
    console.error("Error actualizando feria:", err);
    res.status(500).json({ error: "Error interno actualizando feria" });
  }
});

// DELETE /ferias/:id - (por si querés borrar)
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const ferias = readFerias();
    const idx = ferias.findIndex((f) => f.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Feria no encontrada" });
    }

    const eliminada = ferias.splice(idx, 1)[0];
    writeFerias(ferias);

    res.json({ ok: true, eliminada });
  } catch (err) {
    console.error("Error eliminando feria:", err);
    res.status(500).json({ error: "Error interno eliminando feria" });
  }
});

module.exports = router;
