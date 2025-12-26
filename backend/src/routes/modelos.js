// backend/src/routes/modelos.js
const express = require("express");
const router = express.Router();

const {
  readModelos,
  writeModelos,
  readProductos,
} = require("../utils/fileDB");

// GET /modelos - listar todos
router.get("/", (req, res) => {
  try {
    const modelos = readModelos();
    res.json(modelos);
  } catch (err) {
    console.error("Error leyendo modelos:", err);
    res.status(500).json({ error: "Error leyendo modelos" });
  }
});

// POST /modelos - crear nuevo modelo/diseño
router.post("/", (req, res) => {
  try {
    const {
      productoId,
      categoria,
      subcategoria,
      nombreModelo,
      codigoInterno,
      imagenRef,
      archivoPlancha,
      notas,
    } = req.body;

    if (!productoId) {
      return res.status(400).json({ error: "productoId es obligatorio" });
    }

    if (!nombreModelo || String(nombreModelo).trim() === "") {
      return res
        .status(400)
        .json({ error: "nombreModelo es obligatorio" });
    }

    const productos = readProductos();
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) {
      return res
        .status(404)
        .json({ error: "Producto asociado no encontrado" });
    }

    const modelos = readModelos();

    const nuevoModelo = {
      id: `mod-${Date.now()}`,
      productoId,
      categoria: (categoria || "").toString().trim(),
      subcategoria: (subcategoria || "").toString().trim(),
      nombreModelo: (nombreModelo || "").toString().trim(),
      codigoInterno: (codigoInterno || "").toString().trim(), // opcional
      imagenRef: (imagenRef || "").toString().trim(), // preview (jpg/png)
      archivoPlancha: (archivoPlancha || "").toString().trim(), // PDF o archivo imprimible
      notas: (notas || "").toString().trim(),
      fechaCreacion: new Date().toISOString(),
    };

    modelos.push(nuevoModelo);
    writeModelos(modelos);

    res.status(201).json(nuevoModelo);
  } catch (err) {
    console.error("Error creando modelo:", err);
    res.status(500).json({ error: "Error interno creando modelo" });
  }
});

// PUT /modelos/:id - editar modelo
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const {
      productoId,
      categoria,
      subcategoria,
      nombreModelo,
      codigoInterno,
      imagenRef,
      archivoPlancha,
      notas,
    } = req.body;

    const modelos = readModelos();
    const idx = modelos.findIndex((m) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Modelo no encontrado" });
    }

    const actual = modelos[idx];

    // si viene nombreModelo vacío => error
    if (
      nombreModelo !== undefined &&
      String(nombreModelo).trim() === ""
    ) {
      return res
        .status(400)
        .json({ error: "nombreModelo no puede estar vacío" });
    }

    // si se cambia productoId, validar que exista
    let nuevoProductoId = actual.productoId;
    if (productoId !== undefined) {
      const productos = readProductos();
      const prod = productos.find((p) => p.id === productoId);
      if (!prod) {
        return res
          .status(404)
          .json({ error: "Producto asociado no encontrado" });
      }
      nuevoProductoId = productoId;
    }

    const actualizado = {
      ...actual,
      productoId: nuevoProductoId,
      categoria:
        categoria !== undefined
          ? String(categoria).trim()
          : actual.categoria,
      subcategoria:
        subcategoria !== undefined
          ? String(subcategoria).trim()
          : actual.subcategoria,
      nombreModelo:
        nombreModelo !== undefined
          ? String(nombreModelo).trim()
          : actual.nombreModelo,
      codigoInterno:
        codigoInterno !== undefined
          ? String(codigoInterno).trim()
          : actual.codigoInterno,
      imagenRef:
        imagenRef !== undefined ? String(imagenRef).trim() : actual.imagenRef,
      archivoPlancha:
        archivoPlancha !== undefined
          ? String(archivoPlancha).trim()
          : actual.archivoPlancha,
      notas: notas !== undefined ? String(notas).trim() : actual.notas,
    };

    modelos[idx] = actualizado;
    writeModelos(modelos);

    res.json(actualizado);
  } catch (err) {
    console.error("Error actualizando modelo:", err);
    res.status(500).json({ error: "Error interno actualizando modelo" });
  }
});

// DELETE /modelos/:id
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const modelos = readModelos();
    const idx = modelos.findIndex((m) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Modelo no encontrado" });
    }

    const eliminado = modelos.splice(idx, 1)[0];
    writeModelos(modelos);

    res.json({ ok: true, eliminado });
  } catch (err) {
    console.error("Error eliminando modelo:", err);
    res.status(500).json({ error: "Error interno eliminando modelo" });
  }
});

module.exports = router;
