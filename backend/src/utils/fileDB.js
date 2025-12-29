// backend/src/utils/fileDB.js
const fs = require("fs");
const path = require("path");

const materialesPath = path.join(__dirname, "../../../data/materiales.json");
const proveedoresPath = path.join(__dirname, "../../../data/proveedores.json");
const productosPath = path.join(__dirname, "../../../data/productos.json");
const recetasPath = path.join(__dirname, "../../../data/recetas.json");
const produccionesPath = path.join(__dirname, "../../../data/producciones.json");
const historialStockPath = path.join(
  __dirname,
  "../../../data/historial-stock.json"
);

// NUEVO: modelos (diseños/plancha/cuadernos)
const modelosPath = path.join(__dirname, "../../../data/modelos.json");

// NUEVO: rutas de archivos extra
const ventasPath = path.join(__dirname, "../../../data/ventas.json");
const pedidosPath = path.join(__dirname, "../../../data/pedidos.json");

// NUEVO: ferias
const feriasPath = path.join(__dirname, "../../../data/ferias.json");

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

// --- PRODUCCIONES (BLINDADO) ---
function readProducciones() {
  try {
    return readJson(produccionesPath);
  } catch (err) {
    console.error(
      "Error leyendo producciones.json, devolviendo []:",
      err.message
    );
    return [];
  }
}

function writeProducciones(producciones) {
  writeJson(produccionesPath, producciones || []);
}

// --- HISTORIAL DE STOCK ---
function readHistorialStock() {
  try {
    return readJson(historialStockPath);
  } catch (err) {
    console.error(
      "Error leyendo historial-stock.json, devolviendo []:",
      err.message
    );
    return [];
  }
}

function writeHistorialStock(historial) {
  writeJson(historialStockPath, historial || []);
}

// --- VENTAS ---
function readVentas() {
  try {
    return readJson(ventasPath);
  } catch (err) {
    console.error("Error leyendo ventas.json, devolviendo []:", err.message);
    return [];
  }
}

function writeVentas(ventas) {
  writeJson(ventasPath, ventas || []);
}

// --- PEDIDOS ---
function readPedidos() {
  try {
    return readJson(pedidosPath);
  } catch (err) {
    console.error("Error leyendo pedidos.json, devolviendo []:", err.message);
    return [];
  }
}

function writePedidos(pedidos) {
  writeJson(pedidosPath, pedidos || []);
}

// --- MODELOS / DISEÑOS ---
function readModelos() {
  try {
    return readJson(modelosPath);
  } catch (err) {
    console.error("Error leyendo modelos.json, devolviendo []:", err.message);
    return [];
  }
}

function writeModelos(modelos) {
  writeJson(modelosPath, modelos || []);
}

// --- FERIAS (NUEVO) ---
function readFerias() {
  try {
    return readJson(feriasPath);
  } catch (err) {
    console.error("Error leyendo ferias.json, devolviendo []:", err.message);
    return [];
  }
}

function writeFerias(ferias) {
  writeJson(feriasPath, ferias || []);
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
  readHistorialStock,
  writeHistorialStock,
  readVentas,
  writeVentas,
  readPedidos,
  writePedidos,
  readModelos,
  writeModelos,
  // NUEVO
  readFerias,
  writeFerias,
};
