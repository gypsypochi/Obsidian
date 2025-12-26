// backend/src/routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Carpeta base: backend/uploads  (OJO: subimos dos niveles)
const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
const imagenesDir = path.join(uploadsRoot, "imagenes");
const planchasDir = path.join(uploadsRoot, "planchas");

// Crear carpetas si no existen
for (const dir of [uploadsRoot, imagenesDir, planchasDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---- Storage para IMÁGENES ----
const storageImagen = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagenesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now();
    cb(null, `${base}-${unique}${ext}`);
  },
});

// ---- Storage para PDF / PLANCHAS ----
const storagePlancha = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, planchasDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now();
    cb(null, `${base}-${unique}${ext}`);
  },
});

const uploadImagen = multer({ storage: storageImagen });

const uploadPlancha = multer({
  storage: storagePlancha,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"));
    }
    cb(null, true);
  },
});

// POST /upload/imagen
router.post("/imagen", uploadImagen.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    const url = `${req.protocol}://${req.get("host")}/uploads/imagenes/${req.file.filename}`;
    return res.json({ url });
  } catch (err) {
    console.error("Error subiendo imagen:", err);
    res.status(500).json({ error: "Error subiendo imagen" });
  }
});

// POST /upload/plancha
router.post("/plancha", uploadPlancha.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    const url = `${req.protocol}://${req.get("host")}/uploads/planchas/${req.file.filename}`;
    return res.json({ url });
  } catch (err) {
    console.error("Error subiendo plancha:", err);
    res.status(500).json({ error: "Error subiendo plancha" });
  }
});

module.exports = router;
