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
