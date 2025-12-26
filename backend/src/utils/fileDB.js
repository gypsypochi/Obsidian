// backend/src/utils/fileDB.js
const fs = require("fs");
const path = require("path");

const materialesPath = path.join(__dirname, "../../../data/materiales.json");
const proveedoresPath = path.join(__dirname, "../../../data/proveedores.json");
const productosPath = path.join(__dirname, "../../../data/productos.json");
const recetasPath = path.join(__dirname, "../../../data/recetas.json");
const produccionesPath = path.join(__dirname, "../../../data/producciones.json");

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// --- MATERIALES ---
function readMaterials() {
  return readJson(materialesPath);
}

function writeMaterials(materials) {
  writeJson(materialesPath, materials);
}

// --- PROVEEDORES ---
function readProveedores() {
  return readJson(proveedoresPath);
}

function writeProveedores(proveedores) {
  writeJson(proveedoresPath, proveedores);
}

// --- PRODUCTOS ---
function readProductos() {
  return readJson(productosPath);
}

function writeProductos(productos) {
  writeJson(productosPath, productos);
}

// --- RECETAS ---
function readRecetas() {
  return readJson(recetasPath);
}

function writeRecetas(recetas) {
  writeJson(recetasPath, recetas);
}

// --- PRODUCCIONES (NUEVO, BLINDADO) ---
function readProducciones() {
  try {
    return readJson(produccionesPath);
  } catch (err) {
    console.error("Error leyendo producciones.json, devolviendo []:", err.message);
    return [];
  }
}

function writeProducciones(producciones) {
  writeJson(produccionesPath, producciones || []);
}

module.exports = {
  readMaterials,
  writeMaterials,
  readProveedores,
  writeProveedores,
  readProductos,
  writeProductos,
  readRecetas,
  writeRecetas,
  readProducciones,
  writeProducciones,
};
