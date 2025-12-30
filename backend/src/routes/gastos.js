// backend/src/routes/gastos.js
const express = require("express");
const router = express.Router();

const {
  readGastos,
  writeGastos,
  readMaterials,
  writeMaterials,   // 🔹 NUEVO
  readFerias,
} = require("../utils/fileDB");

// Genera IDs tipo g-0001, g-0002, ...
function generarNuevoId(gastos) {
  const prefix = "g-";
  let max = 0;

  for (const g of gastos) {
    if (g && typeof g.id === "string" && g.id.startsWith(prefix)) {
      const num = parseInt(g.id.slice(prefix.length), 10);
      if (!Number.isNaN(num) && num > max) {
        max = num;
      }
    }
  }

  const next = max + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function completarDesdeMaterialYFeria(opts) {
  const { tipo, materialId, feriaId, descripcion, categoria } = opts;

  let descFinal = descripcion ? descripcion.trim() : "";
  let catFinal = categoria || null;

  if (tipo === "materiales" && materialId) {
    try {
      const materiales = readMaterials();
      const mat = materiales.find((m) => m.id === materialId);
      if (mat) {
        if (!descFinal) {
          descFinal = mat.nombre || "Gasto material";
        }
        if (!catFinal && mat.categoria) {
          catFinal = mat.categoria;
        }
      }
    } catch (err) {
      console.error("Error leyendo materiales para gasto:", err.message);
    }
  }

  if (tipo === "feria" && feriaId) {
    try {
      const ferias = readFerias();
      const feria = ferias.find((f) => f.id === feriaId);
      if (feria) {
        if (!descFinal) {
          descFinal = `Costo feria ${feria.nombre || feria.id}`;
        }
        if (!catFinal) {
          catFinal = "feria";
        }
      }
    } catch (err) {
      console.error("Error leyendo ferias para gasto:", err.message);
    }
  }

  return { descFinal, catFinal };
}

// GET /gastos -> lista todos
router.get("/", (req, res) => {
  try {
    const gastos = readGastos();
    res.json(gastos);
  } catch (err) {
    console.error("Error GET /gastos:", err);
    res.status(500).json({ error: "Error al leer gastos" });
  }
});

// POST /gastos -> crear gasto
router.post("/", (req, res) => {
  try {
    const body = req.body || {};
    const {
      tipo: tipoRaw,
      categoria,
      descripcion,
      monto,
      medioPago,
      proveedorId,
      feriaId,
      materialId,
      notas,
      cantidadMaterial, // 🔹 NUEVO: cantidad comprada para sumar al stock
    } = body;

    const tipo = tipoRaw || "otro";

    const montoNum = Number(monto);
    if (Number.isNaN(montoNum) || montoNum <= 0) {
      return res
        .status(400)
        .json({ error: "El monto debe ser un número mayor a 0" });
    }

    // 🔹 Validación específica para tipo "materiales"
    let cantidadMaterialNum = 0;
    if (tipo === "materiales") {
      if (!materialId) {
        return res.status(400).json({
          error: "Para gastos de materiales tenés que elegir el material",
        });
      }

      if (cantidadMaterial === undefined || cantidadMaterial === null) {
        return res.status(400).json({
          error:
            "Para gastos de materiales tenés que indicar la cantidad comprada (cantidadMaterial)",
        });
      }

      cantidadMaterialNum = Number(cantidadMaterial);
      if (Number.isNaN(cantidadMaterialNum) || cantidadMaterialNum <= 0) {
        return res.status(400).json({
          error:
            "cantidadMaterial debe ser un número mayor a 0 para gastos de materiales",
        });
      }
    }

    let descManual = descripcion || "";
    let catManual = categoria || null;

    const { descFinal, catFinal } = completarDesdeMaterialYFeria({
      tipo,
      materialId,
      feriaId,
      descripcion: descManual,
      categoria: catManual,
    });

    let descripcionGasto = descFinal;
    let categoriaGasto = catFinal;

    if (tipo === "otro") {
      if (!descripcionGasto || descripcionGasto.trim() === "") {
        return res.status(400).json({
          error: "La descripción del gasto es obligatoria para tipo 'otro'",
        });
      }
    }

    if (!descripcionGasto || descripcionGasto.trim() === "") {
      descripcionGasto = "(sin descripción)";
    }

    const gastos = readGastos();
    const nuevo = {
      id: generarNuevoId(gastos),
      fecha: new Date().toISOString(),
      tipo,
      categoria: categoriaGasto,
      descripcion: descripcionGasto.trim(),
      monto: montoNum,
      moneda: "ARS",
      medioPago: medioPago || "efectivo",
      proveedorId: proveedorId || null,
      feriaId: tipo === "feria" ? feriaId || null : null,
      materialId: tipo === "materiales" ? materialId || null : null,
      notas: notas || "",
      // guardamos también la cantidad ligada a este gasto (por si la querés ver en el futuro)
      cantidadMaterial:
        tipo === "materiales" && cantidadMaterialNum > 0
          ? cantidadMaterialNum
          : null,
    };

    const actualizados = [...gastos, nuevo];
    writeGastos(actualizados);

    // 🔹 Actualizar stock del material si corresponde
    if (tipo === "materiales" && materialId && cantidadMaterialNum > 0) {
      try {
        const materiales = readMaterials();
        const idxMat = materiales.findIndex((m) => m.id === materialId);
        if (idxMat !== -1) {
          const actual = Number(materiales[idxMat].stock || 0);
          materiales[idxMat].stock = actual + cantidadMaterialNum;
          writeMaterials(materiales);
        }
      } catch (err) {
        console.error(
          "Error actualizando stock de material desde gasto:",
          err.message
        );
      }
    }

    res.status(201).json({ gasto: nuevo });
  } catch (err) {
    console.error("Error POST /gastos:", err);
    res.status(500).json({ error: "Error al crear gasto" });
  }
});

// PUT /gastos/:id -> editar gasto
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const gastos = readGastos();
    const idx = gastos.findIndex((g) => g.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }

    const original = gastos[idx];

    if (body.monto !== undefined) {
      const m = Number(body.monto);
      if (Number.isNaN(m) || m <= 0) {
        return res
          .status(400)
          .json({ error: "El monto debe ser un número mayor a 0" });
      }
    }

    let merged = {
      ...original,
      ...body,
    };

    const tipoFinal = merged.tipo || "otro";

    const { descFinal, catFinal } = completarDesdeMaterialYFeria({
      tipo: tipoFinal,
      materialId: merged.materialId,
      feriaId: merged.feriaId,
      descripcion: merged.descripcion,
      categoria: merged.categoria,
    });

    merged.descripcion = descFinal || merged.descripcion || "(sin descripción)";
    merged.categoria = catFinal || merged.categoria || null;

    if (tipoFinal === "otro") {
      if (!merged.descripcion || merged.descripcion.trim() === "") {
        return res.status(400).json({
          error: "La descripción no puede quedar vacía para tipo 'otro'",
        });
      }
    }

    merged.moneda = "ARS";

    // 🔹 IMPORTANTE:
    // Por simplicidad, la edición NO vuelve a tocar el stock de materiales.
    // Si cambiaste cantidad/material en un gasto viejo, el stock no se recalcula.
    // (Si un día querés, hacemos una sub-etapa para eso.)

    gastos[idx] = merged;
    writeGastos(gastos);

    res.json({ gasto: merged });
  } catch (err) {
    console.error("Error PUT /gastos/:id:", err);
    res.status(500).json({ error: "Error al actualizar gasto" });
  }
});

// DELETE /gastos/:id -> eliminar gasto
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const gastos = readGastos();
    const idx = gastos.findIndex((g) => g.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }

    const [eliminado] = gastos.splice(idx, 1);
    writeGastos(gastos);

    // Igual que en PUT: por ahora, eliminar un gasto NO toca stock de materiales.
    // (Sería otra mini-etapa si quisieras que al borrar también se descuente stock.)

    res.json({ ok: true, eliminado });
  } catch (err) {
    console.error("Error DELETE /gastos/:id:", err);
    res.status(500).json({ error: "Error al eliminar gasto" });
  }
});

module.exports = router;
