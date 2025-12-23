const fs = require("fs");
const path = require("path");

const materialesPath = path.join(__dirname, "../../../data/materiales.json");
const proveedoresPath = path.join(__dirname, "../../../data/proveedores.json");
const productosPath = path.join(__dirname, "../../../data/productos.json"); // NUEVO

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readMaterials() {
  return readJson(materialesPath);
}

function writeMaterials(materials) {
  writeJson(materialesPath, materials);
}

function readProveedores() {
  return readJson(proveedoresPath);
}

function writeProveedores(proveedores) {
  writeJson(proveedoresPath, proveedores);
}

// NUEVO
function readProductos() {
  return readJson(productosPath);
}

// NUEVO
function writeProductos(productos) {
  writeJson(productosPath, productos);
}

module.exports = {
  readMaterials,
  writeMaterials,
  readProveedores,
  writeProveedores,
  readProductos,     // NUEVO
  writeProductos,    // NUEVO
};
