const API_URL = "http://localhost:3001";

export async function getMateriales() {
  const res = await fetch(`${API_URL}/materiales`);
  if (!res.ok) throw new Error("Error al cargar materiales");
  return res.json();
}

export async function createMaterial(material) {
  const res = await fetch(`${API_URL}/materiales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(material),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al crear material");
  return data;
}

export async function updateMaterial(id, updates) {
  const res = await fetch(`${API_URL}/materiales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al actualizar material");
  return data;
}

export async function deleteMaterial(id) {
  const res = await fetch(`${API_URL}/materiales/${id}`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al eliminar material");
  return data;
}

export async function getProveedores() {
  const res = await fetch(`${API_URL}/proveedores`);
  if (!res.ok) throw new Error("Error al cargar proveedores");
  return res.json();
}

export async function createProveedor(proveedor) {
  const res = await fetch(`${API_URL}/proveedores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proveedor),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al crear proveedor");
  return data;
}

export async function updateProveedor(id, updates) {
  const res = await fetch(`${API_URL}/proveedores/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al actualizar proveedor");
  return data;
}

export async function deleteProveedor(id) {
  const res = await fetch(`${API_URL}/proveedores/${id}`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al eliminar proveedor");
  return data;
}

export async function getProductos() {
  const res = await fetch(`${API_URL}/productos`);
  if (!res.ok) throw new Error("Error al cargar productos");
  return res.json();
}

export async function createProducto(producto) {
  const res = await fetch(`${API_URL}/productos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(producto),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al crear producto");
  return data;
}

export async function updateProducto(id, updates) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al actualizar producto");
  return data;
}

export async function deleteProducto(id) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al eliminar producto");
  return data;
}

export async function getRecetas() {
  const res = await fetch(`${API_URL}/recetas`);
  if (!res.ok) throw new Error("Error al cargar recetas");
  return res.json();
}

export async function createReceta(receta) {
  const res = await fetch(`${API_URL}/recetas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receta),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al crear receta");
  return data;
}

export async function updateReceta(id, updates) {
  const res = await fetch(`${API_URL}/recetas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al actualizar receta");
  return data;
}

export async function deleteReceta(id) {
  const res = await fetch(`${API_URL}/recetas/${id}`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error al eliminar receta");
  return data;
}

export async function createProduccion(produccion) {
  const res = await fetch(`${API_URL}/producciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(produccion),
  });

  const text = await res.text();
  let data = null;

  // Intentamos parsear JSON si se puede
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // si no es JSON, lo dejamos como texto
  }

  if (!res.ok) {
    if (data && data.error) {
      throw new Error(data.error);
    }
    if (text) {
      throw new Error(text);
    }
    throw new Error("Error al registrar producción");
  }

  return data;
}

// 🔹 AGREGAR ESTO:
export async function getProducciones() {
  const res = await fetch(`${API_URL}/producciones`);

  if (!res.ok) {
    throw new Error("Error al cargar producciones");
  }

  return res.json();
}

export async function getHistorialStock() {
  const res = await fetch(`${API_URL}/historial`);
  if (!res.ok) throw new Error("Error al cargar historial de stock");
  return res.json();
}

export async function getVentas() {
  const res = await fetch(`${API_URL}/ventas`);
  if (!res.ok) throw new Error("Error al cargar ventas");
  return res.json();
}

export async function createVenta(venta) {
  const res = await fetch(`${API_URL}/ventas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(venta),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) {
      throw new Error(data.error);
    }
    throw new Error("Error al registrar venta");
  }

  return data;
}

export async function getPedidos() {
  const res = await fetch(`${API_URL}/pedidos`);
  if (!res.ok) throw new Error("Error al cargar pedidos");
  return res.json();
}

export async function createPedido(pedido) {
  const res = await fetch(`${API_URL}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    throw new Error("Error al crear pedido");
  }

  return data;
}

export async function updatePedido(id, updates) {
  const res = await fetch(`${API_URL}/pedidos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    throw new Error("Error al actualizar pedido");
  }

  return data;
}

// --- MODELOS / DISEÑOS (NUEVO) ---
export async function getModelos() {
  const res = await fetch(`${API_URL}/modelos`);
  if (!res.ok) throw new Error("Error al cargar modelos");
  return res.json();
}

export async function createModelo(modelo) {
  const res = await fetch(`${API_URL}/modelos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modelo),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    throw new Error("Error al crear modelo");
  }

  return data;
}

export async function updateModelo(id, updates) {
  const res = await fetch(`${API_URL}/modelos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    throw new Error("Error al actualizar modelo");
  }

  return data;
}

export async function deleteModelo(id) {
  const res = await fetch(`${API_URL}/modelos/${id}`, {
    method: "DELETE",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    throw new Error("Error al eliminar modelo");
  }

  return data;
}

// ...

export async function uploadImagen(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload/imagen`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    throw new Error("Error subiendo imagen");
  }

  return data; // { url }
}

export async function uploadPlancha(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload/plancha`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (data && data.error) throw new Error(data.error);
    throw new Error("Error subiendo plancha");
  }

  return data; // { url }
}
