const fs = require("fs");
const path = require("path");

const materialesPath = path.join(__dirname, "../../../data/materiales.json");
const proveedoresPath = path.join(__dirname, "../../../data/proveedores.json");

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

module.exports = {
  readMaterials,
  writeMaterials,
  readProveedores,
  writeProveedores,
};
