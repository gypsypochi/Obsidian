// backend/src/utils/fileDB.js
const fs = require("fs");
const path = require("path");

const materialesPath = path.join(__dirname, "../../../data/materiales.json");
const proveedoresPath = path.join(__dirname, "../../../data/proveedores.json");
const productosPath = path.join(__dirname, "../../../data/productos.json");
const recetasPath = path.join(__dirname, "../../../data/recetas.json");
const produccionesPath = path.join(__dirname, "../../../data/producciones.json");
const historialStockPath = path.join(__dirname, "../../../data/historial-stock.json");
const modelosPath = path.join(__dirname, "../../../data/modelos.json");
const ventasPath = path.join(__dirname, "../../../data/ventas.json");
const pedidosPath = path.join(__dirname, "../../../data/pedidos.json");
const feriasPath = path.join(__dirname, "../../../data/ferias.json");
const gastosPath = path.join(__dirname, "../../../data/gastos.json");

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Materiales
function readMaterials() {
  return readJson(materialesPath);
}
function writeMaterials(materials) {
  writeJson(materialesPath, materials);
}

// Proveedores
function readProveedores() {
  return readJson(proveedoresPath);
}
function writeProveedores(proveedores) {
  writeJson(proveedoresPath, proveedores);
}

// Productos
function readProductos() {
  return readJson(productosPath);
}
function writeProductos(productos) {
  writeJson(productosPath, productos);
}

// Recetas
function readRecetas() {
  return readJson(recetasPath);
}
function writeRecetas(recetas) {
  writeJson(recetasPath, recetas);
}

// Producciones
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

// Historial stock
function readHistorialStock() {
  try {
    return readJson(historialStockPath);
  } catch (err) {
    console.error("Error leyendo historial-stock.json, devolviendo []:", err.message);
    return [];
  }
}
function writeHistorialStock(historial) {
  writeJson(historialStockPath, historial || []);
}

// Ventas
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

// Pedidos
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

// Modelos
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

// Ferias
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

// Gastos
function readGastos() {
  try {
    return readJson(gastosPath);
  } catch (err) {
    console.error("Error leyendo gastos.json, devolviendo []:", err.message);
    return [];
  }
}
function writeGastos(gastos) {
  writeJson(gastosPath, gastos || []);
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
  readFerias,
  writeFerias,
  readGastos,
  writeGastos,
};
