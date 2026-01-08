// backend/src/routes/productos.js
const express = require("express");
const router = express.Router();
const { readProductos, writeProductos } = require("../utils/fileDB");

function cleanStr(v) {
  return String(v ?? "").trim();
}
function upper(v) {
  return cleanStr(v).toUpperCase();
}

function buildNombreAuto({ tipoBase, attrs }) {
  const t = upper(tipoBase);

  // helpers
  const parts = [];
  const push = (x) => {
    const s = cleanStr(x);
    if (s) parts.push(s);
  };

  if (t === "CUADERNO" || t === "AGENDA") {
    push(t === "CUADERNO" ? "Cuaderno" : "Agenda");
    push(attrs?.medida);
    push(attrs?.tapa);
    push(attrs?.laminado);
    if (attrs?.extra) push(attrs.extra);
    return parts.join(" · ");
  }

  if (t === "STICKER") {
    push("Sticker");
    push(attrs?.medida);
    push(attrs?.material);
    return parts.join(" · ");
  }

  if (t === "IMAN") {
    push("Imán");
    push(attrs?.medida);
    push(attrs?.laminado);
    return parts.join(" · ");
  }

  if (t === "PIN") {
    push("Pin");
    push(attrs?.tipo);
    if (attrs?.pack) push(attrs.pack);
    return parts.join(" · ");
  }

  if (t === "CALENDARIO") {
    push("Calendario");
    push(attrs?.formato);
    push(attrs?.medida);
    return parts.join(" · ");
  }

  if (t === "PELUCHE") {
    push("Peluche");
    push(attrs?.modelo);
    push(attrs?.medida);
    return parts.join(" · ");
  }

  push(t || "Producto");
  push(attrs?.medida);
  push(attrs?.material);
  return parts.join(" · ");
}

// GET /productos?base=1 -> solo productos base
router.get("/", (req, res) => {
  const productos = readProductos();
  const onlyBase = String(req.query.base || "") === "1";
  const result = onlyBase
    ? productos.filter((p) => p.esBase === true)
    : productos;

  res.json(result);
});

// POST /productos
router.post("/", (req, res) => {
  const {
    // legacy
    nombre,
    categoria,
    precio,
    unidad,
    proveedorId,

    // base
    esBase,
    tipoBase,
    activo,

    // v2
    attrs,
    origen,     // "propio" | "comprado" | "tercerizado"
    pricing,    // { unitario, promo: {cantidad, precioTotal}, modo: "fijo"|"variable" }
  } = req.body;

  const isBase = Boolean(esBase);
  const tBase = isBase ? upper(tipoBase) : "";

  // Validaciones mínimas
  if (isBase && !tBase) {
    return res.status(400).json({ error: "tipoBase es obligatorio para productos base" });
  }

  if (precio !== undefined && typeof precio !== "number") {
    return res.status(400).json({ error: "Precio debe ser numérico" });
  }

  // pricing unitario (si viene por pricing)
  const unitarioFromPricing =
    pricing && typeof pricing === "object" && typeof pricing.unitario === "number"
      ? pricing.unitario
      : undefined;

  const productos = readProductos();

  const attrsObj = attrs && typeof attrs === "object" ? attrs : {};

  // Nombre: si no viene, lo armamos
  const nombreFinal =
    cleanStr(nombre) ||
    (isBase ? buildNombreAuto({ tipoBase: tBase, attrs: attrsObj }) : "");

  if (!nombreFinal) {
    return res.status(400).json({ error: "El nombre es obligatorio (o faltan datos para autogenerarlo)" });
  }

  const nuevoProducto = {
    id: `prod-${Date.now()}`,
    nombre: nombreFinal,
    categoria: cleanStr(categoria),
    // mantenemos precio para compatibilidad, pero el “real” está en pricing.unitario
    precio: unitarioFromPricing ?? (typeof precio === "number" ? precio : 0),
    unidad: cleanStr(unidad),
    proveedorId: cleanStr(proveedorId),

    esBase: isBase,
    tipoBase: isBase ? tBase : "",
    activo: isBase ? (activo !== undefined ? Boolean(activo) : true) : true,

    // ✅ V2
    origen: isBase ? cleanStr(origen) : "",
    attrs: isBase ? attrsObj : {},
    pricing: isBase && pricing && typeof pricing === "object" ? pricing : { unitario: (unitarioFromPricing ?? (typeof precio === "number" ? precio : 0)) },

    // stock siempre existe
    stock: 0,
  };

  productos.push(nuevoProducto);
  writeProductos(productos);

  res.status(201).json(nuevoProducto);
});

// PUT /productos/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;

  const {
    nombre,
    categoria,
    precio,
    unidad,
    proveedorId,
    esBase,
    tipoBase,
    activo,
    attrs,
    origen,
    pricing,
  } = req.body;

  const productos = readProductos();
  const index = productos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  if (nombre !== undefined && cleanStr(nombre) === "") {
    return res.status(400).json({ error: "El nombre no puede ser vacío" });
  }

  if (precio !== undefined && typeof precio !== "number") {
    return res.status(400).json({ error: "Precio debe ser numérico" });
  }

  const actual = productos[index];

  const isBase =
    esBase !== undefined ? Boolean(esBase) : Boolean(actual.esBase);

  const tBase =
    tipoBase !== undefined
      ? (isBase ? upper(tipoBase) : "")
      : (actual.tipoBase || "");

  const attrsObj = attrs && typeof attrs === "object" ? attrs : actual.attrs || {};

  const unitarioFromPricing =
    pricing && typeof pricing === "object" && typeof pricing.unitario === "number"
      ? pricing.unitario
      : undefined;

  const nombreFinal =
    nombre !== undefined
      ? cleanStr(nombre)
      : (actual.nombre || "");

  const actualizado = {
    ...actual,

    nombre:
      nombreFinal ||
      (isBase ? buildNombreAuto({ tipoBase: tBase, attrs: attrsObj }) : actual.nombre),

    categoria: categoria !== undefined ? cleanStr(categoria) : actual.categoria,
    precio: precio !== undefined ? precio : (unitarioFromPricing ?? actual.precio ?? 0),
    unidad: unidad !== undefined ? cleanStr(unidad) : actual.unidad,
    proveedorId: proveedorId !== undefined ? cleanStr(proveedorId) : actual.proveedorId,

    esBase: isBase,
    tipoBase: isBase ? tBase : "",
    activo:
      activo !== undefined
        ? Boolean(activo)
        : (actual.activo !== undefined ? actual.activo : true),

    origen: isBase ? (origen !== undefined ? cleanStr(origen) : (actual.origen || "")) : "",
    attrs: isBase ? attrsObj : {},
    pricing:
      isBase
        ? (pricing && typeof pricing === "object" ? pricing : (actual.pricing || { unitario: actual.precio ?? 0 }))
        : {},

    stock: actual.stock ?? 0,
  };

  productos[index] = actualizado;
  writeProductos(productos);

  res.json(actualizado);
});

// DELETE /productos/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const productos = readProductos();
  const index = productos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const eliminado = productos.splice(index, 1)[0];
  writeProductos(productos);

  res.json({ ok: true, eliminado });
});

module.exports = router;
