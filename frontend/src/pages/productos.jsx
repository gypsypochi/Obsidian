// frontend/src/pages/productos.jsx
import { useEffect, useMemo, useState } from "react";
import { getProductosBase, createProducto, updateProducto, deleteProducto } from "../api";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../components/form/form.jsx";

/* Helper stock badge */
function getStockBadgeClass(stock) {
  const value = Number(stock ?? 0);
  if (value <= 0) return "stock-badge stock-badge-zero";
  if (value > 0 && value <= 5) return "stock-badge stock-badge-low";
  return "stock-badge";
}

/* Pretty labels: vinilo_blanco -> Vinilo blanco */
function prettyLabel(value) {
  if (value === undefined || value === null) return "";
  const s = String(value).trim();
  if (!s) return "";
  return s
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/^\w|\s\w/g, (m) => m.toUpperCase());
}

const TIPOS_BASE = [
  "CUADERNO",
  "AGENDA",
  "STICKER",
  "IMAN",
  "PIN",
  "CALENDARIO",
  "PELUCHE",
  "OTRO",
];

const ORIGENES = ["propio", "comprado", "tercerizado"];

const MEDIDAS_CUADERNO = ["A4", "A5", "A6", "OTRA"];
const TAPAS = ["dura", "blanda"];
const LAMINADOS = ["mate", "brillante", "holografico", "otro"];

const MEDIDAS_STICKER = ["5cm", "6cm", "OTRA"];
const MATERIALES_STICKER = [
  "vinilo_blanco",
  "holografico",
  "transparente_comprado",
  "dtf_uv_tercerizado",
  "otro",
];

const FORMATO_CAL = ["imantado", "escritorio", "escolar", "mensual", "anual", "otro"];
const PIN_TIPOS = ["metalico_comprado", "winky_propio"];

function summarizeProducto(p) {
  const tipo = (p.tipoBase || "").toUpperCase();
  const a = p.attrs || {};
  const parts = [];

  if (tipo === "CUADERNO" || tipo === "AGENDA") {
    if (a.medida) parts.push(prettyLabel(a.medida));
    if (a.tapa) parts.push(`Tapa ${prettyLabel(a.tapa)}`);
    if (a.laminado) parts.push(prettyLabel(a.laminado));
    if (a.extra) parts.push(prettyLabel(a.extra));
  } else if (tipo === "STICKER") {
    if (a.medida) parts.push(prettyLabel(a.medida));
    if (a.material) parts.push(prettyLabel(a.material));
  } else if (tipo === "IMAN") {
    if (a.medida) parts.push(prettyLabel(a.medida));
    if (a.laminado) parts.push(prettyLabel(a.laminado));
    if (a.rendimientoPorHoja) parts.push(`Rinde x${a.rendimientoPorHoja}/A4`);
  } else if (tipo === "PIN") {
    if (a.tipo) parts.push(prettyLabel(a.tipo));
    if (a.pack) parts.push(prettyLabel(a.pack));
  } else if (tipo === "CALENDARIO") {
    if (a.formato) parts.push(prettyLabel(a.formato));
    if (a.medida) parts.push(prettyLabel(a.medida));
  } else if (tipo === "PELUCHE") {
    if (a.modelo) parts.push(prettyLabel(a.modelo));
    if (a.medida) parts.push(prettyLabel(a.medida));
  }

  return parts.join(" · ");
}

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filtros
  const [q, setQ] = useState("");

  // Alta
  const [tipoBase, setTipoBase] = useState("CUADERNO");
  const [origen, setOrigen] = useState("propio");
  const [proveedorId, setProveedorId] = useState("");

  // Pricing
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [promoOn, setPromoOn] = useState(false);
  const [promoCantidad, setPromoCantidad] = useState(5);
  const [promoPrecioTotal, setPromoPrecioTotal] = useState(1000);

  // Activo
  const [activo, setActivo] = useState(true);

  // attrs por tipo
  const [aMedidaCuaderno, setAMedidaCuaderno] = useState("A5");
  const [aMedidaCuadernoOtra, setAMedidaCuadernoOtra] = useState("");
  const [aTapa, setATapa] = useState("dura");
  const [aLaminado, setALaminado] = useState("mate");
  const [aLaminadoOtro, setALaminadoOtro] = useState("");
  const [aExtraCuaderno, setAExtraCuaderno] = useState("");

  const [aMedidaSticker, setAMedidaSticker] = useState("5cm");
  const [aMedidaStickerOtra, setAMedidaStickerOtra] = useState("");
  const [aMaterialSticker, setAMaterialSticker] = useState("vinilo_blanco");
  const [aMaterialStickerOtro, setAMaterialStickerOtro] = useState("");

  const [aMedidaImanOtra, setAMedidaImanOtra] = useState("5x5");
  const [aLaminadoIman, setALaminadoIman] = useState("transparente");
  const [aRendimientoIman, setARendimientoIman] = useState(9);

  const [aPinTipo, setAPinTipo] = useState("metalico_comprado");
  const [aPinPack, setAPinPack] = useState(""); // ej "pareja"

  const [aCalFormato, setACalFormato] = useState("imantado");
  const [aCalMedida, setACalMedida] = useState("A5");
  const [aCalMedidaOtra, setACalMedidaOtra] = useState("");

  const [aPelucheModelo, setAPelucheModelo] = useState("");
  const [aPelucheMedida, setAPelucheMedida] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getProductosBase();
      setProductos(data || []);
    } catch (e) {
      setError(e.message || "Error cargando productos base");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // reset proveedor cuando origen es propio
  useEffect(() => {
    if (origen === "propio") setProveedorId("");
  }, [origen]);

  function buildAttrs() {
    const t = String(tipoBase || "").toUpperCase();

    if (t === "CUADERNO" || t === "AGENDA") {
      const medida = aMedidaCuaderno === "OTRA" ? aMedidaCuadernoOtra : aMedidaCuaderno;
      const laminado = aLaminado === "otro" ? aLaminadoOtro : aLaminado;
      return {
        medida: (medida || "").toUpperCase(),
        tapa: aTapa,
        laminado,
        extra: aExtraCuaderno,
      };
    }

    if (t === "STICKER") {
      const medida = aMedidaSticker === "OTRA" ? aMedidaStickerOtra : aMedidaSticker;
      const material = aMaterialSticker === "otro" ? aMaterialStickerOtro : aMaterialSticker;
      return { medida, material };
    }

    if (t === "IMAN") {
      return {
        medida: aMedidaImanOtra,
        laminado: aLaminadoIman,
        produccion: "A4",
        rendimientoPorHoja: Number(aRendimientoIman || 0),
      };
    }

    if (t === "PIN") {
      return { tipo: aPinTipo, pack: aPinPack };
    }

    if (t === "CALENDARIO") {
      const medida = aCalMedida === "OTRA" ? aCalMedidaOtra : aCalMedida;
      return { formato: aCalFormato, medida };
    }

    if (t === "PELUCHE") {
      return { modelo: aPelucheModelo, medida: aPelucheMedida };
    }

    return {};
  }

  function buildPricing() {
    const p = { unitario: Number(precioUnitario || 0), modo: "fijo" };
    if (promoOn) {
      p.promo = {
        cantidad: Number(promoCantidad || 0),
        precioTotal: Number(promoPrecioTotal || 0),
      };
    }
    return p;
  }

  function validate() {
    const t = String(tipoBase || "").toUpperCase();

    if (!t) return "Tenés que elegir un tipo base";
    if (Number.isNaN(Number(precioUnitario)) || Number(precioUnitario) < 0) return "Precio unitario inválido";

    if ((origen === "comprado" || origen === "tercerizado") && !String(proveedorId || "").trim()) {
      return "Si el origen es comprado/tercerizado, indicá proveedor";
    }

    const attrs = buildAttrs();

    if (t === "CUADERNO" || t === "AGENDA") {
      if (!String(attrs.medida || "").trim()) return "Elegí la medida (A4/A5/A6 u otra)";
      if (!String(attrs.tapa || "").trim()) return "Elegí tapa dura/blanda";
      if (!String(attrs.laminado || "").trim()) return "Elegí el laminado";
      if (aMedidaCuaderno === "OTRA" && !String(aMedidaCuadernoOtra || "").trim()) return "Completá la medida (otra)";
      if (aLaminado === "otro" && !String(aLaminadoOtro || "").trim()) return "Completá el laminado (otro)";
    }

    if (t === "STICKER") {
      if (!String(attrs.medida || "").trim()) return "Elegí la medida del sticker";
      if (!String(attrs.material || "").trim()) return "Elegí el material del sticker";
      if (aMedidaSticker === "OTRA" && !String(aMedidaStickerOtra || "").trim()) return "Completá la medida (otra)";
      if (aMaterialSticker === "otro" && !String(aMaterialStickerOtro || "").trim()) return "Completá el material (otro)";
    }

    if (t === "IMAN") {
      if (!String(attrs.medida || "").trim()) return "Indicá la medida del imán";
      if (!String(attrs.laminado || "").trim()) return "Elegí el laminado del imán";
      if (!Number(attrs.rendimientoPorHoja || 0)) return "Rendimiento por hoja debe ser > 0";
    }

    if (t === "PIN") {
      if (!String(attrs.tipo || "").trim()) return "Elegí el tipo de pin";
    }

    if (t === "CALENDARIO") {
      if (!String(attrs.formato || "").trim()) return "Elegí el formato del calendario";
      if (!String(attrs.medida || "").trim()) return "Elegí la medida";
      if (aCalMedida === "OTRA" && !String(aCalMedidaOtra || "").trim()) return "Completá la medida (otra)";
    }

    if (t === "PELUCHE") {
      if (!String(attrs.modelo || "").trim()) return "Indicá el modelo/nombre del peluche";
    }

    if (promoOn) {
      if (Number(promoCantidad) <= 0) return "Promo: cantidad inválida";
      if (Number(promoPrecioTotal) <= 0) return "Promo: precio total inválido";
    }

    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const attrs = buildAttrs();
    const pricing = buildPricing();

    const payload = {
      esBase: true,
      tipoBase: String(tipoBase || "").toUpperCase(),
      activo: Boolean(activo),

      origen,
      proveedorId: String(proveedorId || "").trim(),

      attrs,
      pricing,

      // compat legacy (por si alguna pantalla usa precio/unidad)
      precio: Number(pricing.unitario || 0),
      unidad: "unidad",
      categoria: "",
      nombre: "", // backend lo autogenera
    };

    try {
      await createProducto(payload);

      // reset suave
      setPrecioUnitario(0);
      setPromoOn(false);
      setPromoCantidad(5);
      setPromoPrecioTotal(1000);
      setActivo(true);
      setProveedorId("");
      await load();
    } catch (e2) {
      setError(e2.message || "Error creando producto base");
    }
  }

  async function toggleActivo(p) {
    try {
      setError("");
      const nextActivo = !(p.activo === false);
      await updateProducto(p.id, { activo: !nextActivo, esBase: true });
      await load();
    } catch (e) {
      setError(e.message || "Error actualizando activo");
    }
  }

  async function onDelete(id) {
    const ok = window.confirm("¿Eliminar este producto base? (Usalo solo si fue un error)");
    if (!ok) return;

    try {
      setError("");
      await deleteProducto(id);
      await load();
    } catch (e) {
      setError(e.message || "Error eliminando producto base");
    }
  }

  const productosFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return productos;

    return productos.filter((p) => {
      const texto = `${p.nombre || ""} ${p.tipoBase || ""} ${summarizeProducto(p)} ${p.origen || ""} ${p.proveedorId || ""}`.toLowerCase();
      return texto.includes(term);
    });
  }, [productos, q]);

  return (
    <LayoutCrud
      title="Productos base (V2)"
      description="Creá variantes base por tipo (cuaderno/sticker/imán/pin/etc.) con atributos, origen y precios/promo. Se usan en Modelos y Operativa."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}

      {/* FORM ALTA */}
      <FormSection
        title="Crear variante de producto base"
        description="Elegí el tipo y completá sus características. Los textos se guardan prolijos y el nombre se autogenera."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Tipo base *</label>
            <select value={tipoBase} onChange={(e) => setTipoBase(e.target.value)} required>
              {TIPOS_BASE.map((t) => (
                <option key={t} value={t}>{prettyLabel(t)}</option>
              ))}
            </select>
          </div>

          {(tipoBase === "CUADERNO" || tipoBase === "AGENDA") && (
            <>
              <div className="form-field">
                <label>Medida *</label>
                <select value={aMedidaCuaderno} onChange={(e) => setAMedidaCuaderno(e.target.value)}>
                  {MEDIDAS_CUADERNO.map((m) => <option key={m} value={m}>{prettyLabel(m)}</option>)}
                </select>
              </div>

              {aMedidaCuaderno === "OTRA" && (
                <div className="form-field">
                  <label>Medida (otra) *</label>
                  <input value={aMedidaCuadernoOtra} onChange={(e) => setAMedidaCuadernoOtra(e.target.value)} placeholder="Ej: B5, 17x24..." />
                </div>
              )}

              <div className="form-field">
                <label>Tapa *</label>
                <select value={aTapa} onChange={(e) => setATapa(e.target.value)}>
                  {TAPAS.map((t) => <option key={t} value={t}>{prettyLabel(t)}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label>Laminado *</label>
                <select value={aLaminado} onChange={(e) => setALaminado(e.target.value)}>
                  {LAMINADOS.map((l) => <option key={l} value={l}>{prettyLabel(l)}</option>)}
                </select>
              </div>

              {aLaminado === "otro" && (
                <div className="form-field">
                  <label>Laminado (otro) *</label>
                  <input value={aLaminadoOtro} onChange={(e) => setALaminadoOtro(e.target.value)} placeholder="Ej: soft touch, glitter..." />
                </div>
              )}

              <div className="form-field">
                <label>Extra (opcional)</label>
                <input value={aExtraCuaderno} onChange={(e) => setAExtraCuaderno(e.target.value)} placeholder="Ej: calendario incorporado / planner..." />
              </div>
            </>
          )}

          {tipoBase === "STICKER" && (
            <>
              <div className="form-field">
                <label>Medida *</label>
                <select value={aMedidaSticker} onChange={(e) => setAMedidaSticker(e.target.value)}>
                  {MEDIDAS_STICKER.map((m) => <option key={m} value={m}>{prettyLabel(m)}</option>)}
                </select>
              </div>

              {aMedidaSticker === "OTRA" && (
                <div className="form-field">
                  <label>Medida (otra) *</label>
                  <input value={aMedidaStickerOtra} onChange={(e) => setAMedidaStickerOtra(e.target.value)} placeholder="Ej: 7cm, 10cm..." />
                </div>
              )}

              <div className="form-field">
                <label>Material *</label>
                <select value={aMaterialSticker} onChange={(e) => setAMaterialSticker(e.target.value)}>
                  {MATERIALES_STICKER.map((m) => <option key={m} value={m}>{prettyLabel(m)}</option>)}
                </select>
              </div>

              {aMaterialSticker === "otro" && (
                <div className="form-field">
                  <label>Material (otro) *</label>
                  <input value={aMaterialStickerOtro} onChange={(e) => setAMaterialStickerOtro(e.target.value)} placeholder="Ej: vinilo espejo..." />
                </div>
              )}
            </>
          )}

          {tipoBase === "IMAN" && (
            <>
              <div className="form-field">
                <label>Medida *</label>
                <input value={aMedidaImanOtra} onChange={(e) => setAMedidaImanOtra(e.target.value)} placeholder="Ej: 5x5, 6x6..." />
              </div>

              <div className="form-field">
                <label>Laminado *</label>
                <select value={aLaminadoIman} onChange={(e) => setALaminadoIman(e.target.value)}>
                  <option value="transparente">{prettyLabel("transparente")}</option>
                  <option value="holografico">{prettyLabel("holografico")}</option>
                  <option value="otro">{prettyLabel("otro")}</option>
                </select>
              </div>

              <div className="form-field">
                <label>Rinde por hoja A4 *</label>
                <input type="number" min="1" value={aRendimientoIman} onChange={(e) => setARendimientoIman(e.target.value)} />
              </div>
            </>
          )}

          {tipoBase === "PIN" && (
            <>
              <div className="form-field">
                <label>Tipo *</label>
                <select value={aPinTipo} onChange={(e) => setAPinTipo(e.target.value)}>
                  {PIN_TIPOS.map((t) => <option key={t} value={t}>{prettyLabel(t)}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label>Pack / promo (opcional)</label>
                <input value={aPinPack} onChange={(e) => setAPinPack(e.target.value)} placeholder="Ej: pareja / 2x..." />
              </div>
            </>
          )}

          {tipoBase === "CALENDARIO" && (
            <>
              <div className="form-field">
                <label>Formato *</label>
                <select value={aCalFormato} onChange={(e) => setACalFormato(e.target.value)}>
                  {FORMATO_CAL.map((f) => <option key={f} value={f}>{prettyLabel(f)}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label>Medida *</label>
                <select value={aCalMedida} onChange={(e) => setACalMedida(e.target.value)}>
                  <option value="A5">A5</option>
                  <option value="A4">A4</option>
                  <option value="OTRA">{prettyLabel("OTRA")}</option>
                </select>
              </div>

              {aCalMedida === "OTRA" && (
                <div className="form-field">
                  <label>Medida (otra) *</label>
                  <input value={aCalMedidaOtra} onChange={(e) => setACalMedidaOtra(e.target.value)} placeholder="Ej: horario escolar..." />
                </div>
              )}
            </>
          )}

          {tipoBase === "PELUCHE" && (
            <>
              <div className="form-field">
                <label>Modelo *</label>
                <input value={aPelucheModelo} onChange={(e) => setAPelucheModelo(e.target.value)} placeholder="Ej: Kuromi, Cinnamoroll..." />
              </div>

              <div className="form-field">
                <label>Medida (opcional)</label>
                <input value={aPelucheMedida} onChange={(e) => setAPelucheMedida(e.target.value)} placeholder="Ej: 20cm..." />
              </div>
            </>
          )}

          {/* Origen */}
          <div className="form-field">
            <label>Origen *</label>
            <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
              {ORIGENES.map((o) => <option key={o} value={o}>{prettyLabel(o)}</option>)}
            </select>
          </div>

          {(origen === "comprado" || origen === "tercerizado") && (
            <div className="form-field">
              <label>Proveedor *</label>
              <input value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} placeholder="Ej: Shein / Temu / Proveedor DTF UV..." />
            </div>
          )}

          {/* Pricing */}
          <div className="form-field">
            <label>Precio unitario</label>
            <input type="number" value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)} />
          </div>

          <div className="form-field">
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={promoOn} onChange={(e) => setPromoOn(e.target.checked)} />
              Activar promo (packs)
            </label>
            <p className="produccion-help-text">Ej: stickers 5x1000</p>
          </div>

          {promoOn && (
            <>
              <div className="form-field">
                <label>Promo: cantidad</label>
                <input type="number" min="1" value={promoCantidad} onChange={(e) => setPromoCantidad(e.target.value)} />
              </div>

              <div className="form-field">
                <label>Promo: precio total</label>
                <input type="number" min="1" value={promoPrecioTotal} onChange={(e) => setPromoPrecioTotal(e.target.value)} />
              </div>
            </>
          )}

          {/* Activo */}
          <div className="form-field">
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              Activo
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">Crear variante base</button>
          <button type="button" className="btn-secondary" onClick={load}>Recargar</button>
        </div>
      </FormSection>

      {/* LISTA */}
      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Lista de productos base</h2>
          <div className="crud-filters">
            <label className="crud-filter-label">
              <span>Buscar</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="tipo / atributos / origen..." />
            </label>
          </div>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Atributos</th>
                <th>Origen</th>
                <th>Precio</th>
                <th>Promo</th>
                <th>Stock</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((p) => {
                const stockValue = Number(p.stock ?? 0);
                const pr = p.pricing || {};
                const promo = pr.promo;

                return (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{prettyLabel(p.tipoBase || "-")}</td>
                    <td>
                      {summarizeProducto(p) ? (
                        <span>{summarizeProducto(p)}</span>
                      ) : (
                        <span style={{ opacity: 0.7 }}>—</span>
                      )}
                    </td>
                    <td>
                      {prettyLabel(p.origen || "-")}
                      {p.proveedorId ? <span style={{ opacity: 0.8 }}> · {p.proveedorId}</span> : ""}
                    </td>
                    <td>{Number(pr.unitario ?? p.precio ?? 0)}</td>
                    <td>{promo ? `${promo.cantidad}x${promo.precioTotal}` : "—"}</td>
                    <td>
                      <span className={getStockBadgeClass(stockValue)}>{stockValue}</span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.activo !== false}
                        onChange={() => toggleActivo(p)}
                        title="Activar / desactivar"
                      />
                    </td>
                    <td>
                      <div className="crud-actions">
                        <button type="button" className="icon-btn delete" onClick={() => onDelete(p.id)} title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && productosFiltrados.length === 0 && (
                <tr><td colSpan="9">No hay productos base.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="produccion-help-text" style={{ marginTop: 10 }}>
          Tip: si necesitás cambiar atributos (medida/tapa/material), lo más prolijo es crear una nueva variante y desactivar la vieja.
        </p>
      </section>
    </LayoutCrud>
  );
}
