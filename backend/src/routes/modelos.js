// backend/src/routes/modelos.js
const express = require("express");
const router = express.Router();

const { readModelos, writeModelos, readProductos } = require("../utils/fileDB");

function normTipoBase(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function isBaseProduct(p) {
  return p?.esBase === true || typeof p?.tipoBase === "string";
}

function parseUnidadesPorPlancha(v) {
  // ✅ IMPORTANTE: si viene undefined/null/"" => "no enviado" (no tocar)
  if (v === undefined) return undefined;
  if (v === null || v === "") return 0;

  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return null; // inválido
  return n;
}

// GET /modelos
router.get("/", (req, res) => {
  try {
    let modelos = readModelos();

    const productoBaseTipo = req.query.productoBaseTipo
      ? normTipoBase(req.query.productoBaseTipo)
      : "";

    const categoria = req.query.categoria ? String(req.query.categoria).trim() : "";
    const subcategoria = req.query.subcategoria ? String(req.query.subcategoria).trim() : "";
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : "";

    if (productoBaseTipo) {
      modelos = modelos.filter((m) => normTipoBase(m.productoBaseTipo) === productoBaseTipo);
    }
    if (categoria) {
      modelos = modelos.filter((m) => String(m.categoria || "").trim() === categoria);
    }
    if (subcategoria) {
      modelos = modelos.filter((m) => String(m.subcategoria || "").trim() === subcategoria);
    }
    if (q) {
      modelos = modelos.filter((m) => {
        const txt = [
          m.nombreModelo,
          m.codigoInterno,
          m.categoria,
          m.subcategoria,
          ...(Array.isArray(m.tags) ? m.tags : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return txt.includes(q);
      });
    }

    res.json(modelos);
  } catch (err) {
    console.error("Error leyendo modelos:", err);
    res.status(500).json({ error: "Error leyendo modelos" });
  }
});

// POST /modelos
router.post("/", (req, res) => {
  try {
    const {
      productoBaseTipo,
      productoId, // legacy
      categoria,
      subcategoria,
      nombreModelo,
      codigoInterno,
      imagenPreview,
      imagenRef, // legacy
      archivos,
      archivoPlancha, // legacy
      tags,
      notas,
      unidadesPorPlancha, // ✅ nuevo
    } = req.body;

    if (!nombreModelo || String(nombreModelo).trim() === "") {
      return res.status(400).json({ error: "nombreModelo es obligatorio" });
    }

    let baseTipoFinal = "";
    let productoIdLegacy = null;

    if (productoBaseTipo) {
      baseTipoFinal = normTipoBase(productoBaseTipo);
    } else if (productoId) {
      const productos = readProductos();
      const prod = productos.find((p) => p.id === productoId);
      if (!prod) {
        return res.status(404).json({ error: "Producto asociado no encontrado" });
      }
      productoIdLegacy = productoId;

      if (isBaseProduct(prod)) {
        baseTipoFinal = normTipoBase(prod.tipoBase);
      } else {
        baseTipoFinal = normTipoBase(prod.categoria || "OTROS");
      }
    } else {
      return res.status(400).json({
        error: "productoBaseTipo es obligatorio (o productoId legacy para compatibilidad)",
      });
    }

    const upp = parseUnidadesPorPlancha(unidadesPorPlancha);
    if (upp === null) {
      return res.status(400).json({ error: "unidadesPorPlancha inválido" });
    }

    // Si NO es STICKER, lo guardamos en 0 por prolijidad
    const uppFinal = baseTipoFinal === "STICKER" ? (upp ?? 0) : 0;

    const archivosFinal = Array.isArray(archivos) ? archivos : [];
    const archivosCompat = [];

    if (archivoPlancha && String(archivoPlancha).trim() !== "") {
      archivosCompat.push({
        id: `file-${Date.now()}`,
        label: "Plancha",
        tipo: "pdf",
        url: String(archivoPlancha).trim(),
      });
    }

    const nuevoModelo = {
      id: `mod-${Date.now()}`,
      productoBaseTipo: baseTipoFinal,

      // legacy (opcional)
      productoId: productoIdLegacy,

      categoria: (categoria || "").toString().trim(),
      subcategoria: (subcategoria || "").toString().trim(),
      nombreModelo: String(nombreModelo).trim(),
      codigoInterno: (codigoInterno || "").toString().trim(),

      imagenPreview: (imagenPreview || imagenRef || "").toString().trim(),

      archivos: [
        ...archivosCompat,
        ...archivosFinal.map((a, idx) => ({
          id: a?.id ? String(a.id) : `file-${Date.now()}-${idx}`,
          label: a?.label ? String(a.label) : "Archivo",
          tipo: a?.tipo ? String(a.tipo) : "file",
          url: a?.url ? String(a.url) : "",
        })),
      ].filter((a) => a.url && String(a.url).trim() !== ""),

      // ✅ nuevo
      unidadesPorPlancha: uppFinal,

      tags: Array.isArray(tags) ? tags.map((t) => String(t)) : [],
      notas: (notas || "").toString().trim(),

      stockModelo: 0,

      fechaCreacion: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const modelos = readModelos();
    modelos.push(nuevoModelo);
    writeModelos(modelos);

    res.status(201).json(nuevoModelo);
  } catch (err) {
    console.error("Error creando modelo:", err);
    res.status(500).json({ error: "Error interno creando modelo" });
  }
});

// PUT /modelos/:id
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;

    const modelos = readModelos();
    const idx = modelos.findIndex((m) => m.id === id);
    if (idx === -1) return res.status(404).json({ error: "Modelo no encontrado" });

    const actual = modelos[idx];

    const {
      productoBaseTipo,
      categoria,
      subcategoria,
      nombreModelo,
      codigoInterno,
      imagenPreview,
      archivos,
      tags,
      notas,
      unidadesPorPlancha, // ✅ nuevo
    } = req.body;

    if (nombreModelo !== undefined && String(nombreModelo).trim() === "") {
      return res.status(400).json({ error: "nombreModelo no puede estar vacío" });
    }

    const tipoFinal =
      productoBaseTipo !== undefined ? normTipoBase(productoBaseTipo) : actual.productoBaseTipo;

    // ✅ SOLO validar si vino el campo (para no pisar el valor sin querer)
    const uppParsed = parseUnidadesPorPlancha(unidadesPorPlancha);
    if (uppParsed === null) {
      return res.status(400).json({ error: "unidadesPorPlancha inválido" });
    }

    let uppFinal = Number(actual.unidadesPorPlancha || 0);

    if (tipoFinal === "STICKER") {
      // si mandan el campo, actualizamos; si no, lo dejamos como estaba
      if (uppParsed !== undefined) uppFinal = uppParsed;
    } else {
      // si deja de ser sticker, lo forzamos a 0
      uppFinal = 0;
    }

    const actualizado = {
      ...actual,
      productoBaseTipo: tipoFinal,

      categoria: categoria !== undefined ? String(categoria).trim() : actual.categoria,
      subcategoria: subcategoria !== undefined ? String(subcategoria).trim() : actual.subcategoria,
      nombreModelo: nombreModelo !== undefined ? String(nombreModelo).trim() : actual.nombreModelo,
      codigoInterno: codigoInterno !== undefined ? String(codigoInterno).trim() : actual.codigoInterno,

      imagenPreview:
        imagenPreview !== undefined ? String(imagenPreview).trim() : (actual.imagenPreview || ""),

      archivos:
        archivos !== undefined
          ? (Array.isArray(archivos)
              ? archivos.map((a, i) => ({
                  id: a?.id ? String(a.id) : `file-${Date.now()}-${i}`,
                  label: a?.label ? String(a.label) : "Archivo",
                  tipo: a?.tipo ? String(a.tipo) : "file",
                  url: a?.url ? String(a.url) : "",
                }))
              : []
            ).filter((a) => a.url && String(a.url).trim() !== "")
          : actual.archivos,

      tags: tags !== undefined ? (Array.isArray(tags) ? tags.map(String) : []) : actual.tags,
      notas: notas !== undefined ? String(notas).trim() : actual.notas,

      // ✅ nuevo
      unidadesPorPlancha: uppFinal,

      updatedAt: new Date().toISOString(),
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
    if (idx === -1) return res.status(404).json({ error: "Modelo no encontrado" });

    const eliminado = modelos.splice(idx, 1)[0];
    writeModelos(modelos);

    res.json({ ok: true, eliminado });
  } catch (err) {
    console.error("Error eliminando modelo:", err);
    res.status(500).json({ error: "Error interno eliminando modelo" });
  }
});

module.exports = router;
