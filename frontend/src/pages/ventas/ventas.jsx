// frontend/src/pages/ventas/ventas.jsx
import { useEffect, useMemo, useState } from "react";
import { getProductos, getVentas, createVenta, getFerias, getModelos } from "../../api";

import LayoutCrud from "../../components/layout-crud/layout-crud.jsx";
import { FormSection } from "../../components/form/form.jsx";
import "./ventas.css";

const OPCIONES_CANAL = [
  { value: "feria", label: "Feria" },
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial / directo" },
];

function normTipoBase(v) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "_");
}

function humanTipo(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMonto(numero) {
  const n = Number(numero) || 0;
  return n.toLocaleString("es-AR");
}

function formatFecha(fechaStr) {
  const d = new Date(fechaStr);
  if (Number.isNaN(d.getTime())) return fechaStr;
  return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [modelos, setModelos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // tipo principal
  const [tipoBase, setTipoBase] = useState("");
  const tipoNorm = useMemo(() => normTipoBase(tipoBase), [tipoBase]);

  // NO-STICKER: producto real
  const [productoId, setProductoId] = useState("");
  const [modeloId, setModeloId] = useState("");

  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState("");

  // canal
  const [canal, setCanal] = useState("feria");
  const [feriaId, setFeriaId] = useState("");
  const [origen, setOrigen] = useState("");

  // detalle libre (ambos)
  const [detalle, setDetalle] = useState("");

  // STICKERS: modo
  const [stickerModo, setStickerModo] = useState("individual"); // "individual" | "promo"

  // STICKERS: promo
  const [promos, setPromos] = useState(1);
  const [unidadesPorPromo, setUnidadesPorPromo] = useState(5);
  const [precioPorPromo, setPrecioPorPromo] = useState(1000);

  // stock general sticker (si hay múltiples bases sticker)
  const [productoStockStickerId, setProductoStockStickerId] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);

      const [prodData, ventasData, feriasData, modelosData] = await Promise.all([
        getProductos(),
        getVentas(),
        getFerias(),
        getModelos(),
      ]);

      setProductos(prodData || []);
      setVentas(ventasData || []);

      const feriasOrdenadas = [...(feriasData || [])].sort((a, b) => {
        const fa = new Date(a.fecha).getTime();
        const fb = new Date(b.fecha).getTime();
        return fb - fa;
      });
      setFerias(feriasOrdenadas);

      setModelos(modelosData || []);
    } catch (e) {
      setError(e.message || "Error cargando datos de ventas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tiposUnicos = useMemo(() => {
    const set = new Set();
    (productos || []).forEach((p) => {
      const t = normTipoBase(p?.tipoBase);
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [productos]);

  const productosDelTipo = useMemo(() => {
    const t = normTipoBase(tipoBase);
    if (!t) return [];
    return (productos || []).filter((p) => normTipoBase(p.tipoBase) === t);
  }, [productos, tipoBase]);

  const modelosDelTipo = useMemo(() => {
    if (!tipoNorm) return [];
    return (modelos || []).filter((m) => normTipoBase(m.productoBaseTipo) === tipoNorm);
  }, [modelos, tipoNorm]);

  const stickerBases = useMemo(() => {
    return (productos || []).filter(
      (p) => p?.esBase === true && normTipoBase(p?.tipoBase) === "STICKER"
    );
  }, [productos]);

  const stickerBaseUnica = useMemo(() => {
    return stickerBases.length === 1 ? stickerBases[0] : null;
  }, [stickerBases]);

  // reset al cambiar tipo
  useEffect(() => {
    setProductoId("");
    setModeloId("");
    setCantidad(1);
    setPrecioUnitario("");
    setDetalle("");
    setMensaje("");
    setError("");

    // reset stickers
    setStickerModo("individual");
    setPromos(1);
    setUnidadesPorPromo(5);
    setPrecioPorPromo(1000);

    if (stickerBaseUnica) setProductoStockStickerId(stickerBaseUnica.id);
    else setProductoStockStickerId("");
  }, [tipoBase, stickerBaseUnica]);

  // stickers: no modelo
  useEffect(() => {
    if (tipoNorm === "STICKER") setModeloId("");
  }, [tipoNorm]);

  // defaults promo desde producto base sticker (si existe)
  useEffect(() => {
    if (tipoNorm !== "STICKER") return;
    const p = stickerBaseUnica || stickerBases.find((x) => x.id === productoStockStickerId);
    if (!p) return;

    const upu = Number(p?.unidadesPorPromo ?? p?.promoUnidades ?? p?.promoCantidad ?? 5) || 5;
    const ppp = Number(p?.precioPorPromo ?? p?.promoPrecio ?? 1000) || 1000;

    setUnidadesPorPromo(upu);
    setPrecioPorPromo(ppp);
  }, [tipoNorm, stickerBaseUnica, stickerBases, productoStockStickerId]);

  // autocomplete precio para no-stickers
  useEffect(() => {
    if (tipoNorm === "STICKER") return;
    if (!productoId) return;
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    setPrecioUnitario(p.precio ?? 0);
  }, [productoId, productos, tipoNorm]);

  const unidadesStickerPromo = useMemo(() => {
    const p = Number(promos) || 0;
    const u = Number(unidadesPorPromo) || 0;
    return p * u;
  }, [promos, unidadesPorPromo]);

  const totalStickerPromo = useMemo(() => {
    const p = Number(promos) || 0;
    const price = Number(precioPorPromo) || 0;
    return p * price;
  }, [promos, precioPorPromo]);

  const totalMontoVentas = useMemo(
    () => (ventas || []).reduce((acc, v) => acc + (v.montoTotal || 0), 0),
    [ventas]
  );

  const totalUnidadesVendidas = useMemo(
    () => (ventas || []).reduce((acc, v) => acc + (v.cantidad || 0), 0),
    [ventas]
  );

  const ventasEnriquecidas = useMemo(() => {
    const mapaProductos = new Map((productos || []).map((p) => [p.id, p]));
    const mapaFerias = new Map((ferias || []).map((f) => [f.id, f]));
    const mapaModelos = new Map((modelos || []).map((m) => [m.id, m]));

    const lista = (ventas || []).map((v) => {
      const prod = v.productoId ? mapaProductos.get(v.productoId) : null;
      const prodStock = v.productoStockId ? mapaProductos.get(v.productoStockId) : null;
      const feria = v.feriaId ? mapaFerias.get(v.feriaId) : null;
      const mod = v.modeloId ? mapaModelos.get(v.modeloId) : null;

      const tipo = v.tipoBase || normTipoBase(prod?.tipoBase) || normTipoBase(prodStock?.tipoBase) || null;

      return {
        ...v,
        tipoBase: tipo,
        nombreProducto: prod?.nombre || (tipo === "STICKER" ? "Stickers (stock general)" : (v.productoId || "—")),
        nombreProductoStock: prodStock?.nombre || null,
        nombreFeria: feria?.nombre || null,
        nombreModelo: mod?.nombreModelo || null,
      };
    });

    lista.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    return lista;
  }, [ventas, productos, ferias, modelos]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!tipoBase) {
      setError("Elegí el tipo base (Sticker / Cuaderno / Imán / ...)");
      return;
    }

    if (canal === "feria" && !feriaId) {
      setError("Elegí la feria en la que estás vendiendo");
      return;
    }

    // ✅ STICKERS
    if (tipoNorm === "STICKER") {
      // si hay varias bases sticker, hay que elegir una
      if (stickerBases.length > 1 && !productoStockStickerId) {
        setError("Tenés más de un producto base STICKER. Elegí cuál es el stock general a descontar.");
        return;
      }

      // modo individual
      if (stickerModo === "individual") {
        const cantNum = Number(cantidad);
        const precioNum = precioUnitario === "" ? 0 : Number(precioUnitario);

        if (Number.isNaN(cantNum) || cantNum <= 0) {
          setError("Cantidad debe ser un número mayor a 0");
          return;
        }
        if (Number.isNaN(precioNum) || precioNum < 0) {
          setError("Precio unitario inválido (>=0)");
          return;
        }

        // Usamos el flujo NO-STICKER en backend (productoId = base sticker)
        // Así descuenta stock general sin promos.
        const baseSticker = stickerBaseUnica || stickerBases.find((x) => x.id === productoStockStickerId);
        if (!baseSticker) {
          setError("No se pudo resolver el producto base STICKER para stock general.");
          return;
        }

        const payload = {
          productoId: baseSticker.id,
          cantidad: cantNum,
          precioUnitario: precioNum,
          detalle: String(detalle || "").trim() || null,
          canal,
          feriaId: canal === "feria" ? feriaId : null,
          origen: canal !== "feria" ? (origen || null) : null,
        };

        try {
          const resp = await createVenta(payload);
          const stock = resp?.productoStockActualizado?.stock;
          let msg = `Venta stickers registrada: ${cantNum} unidad(es). Total: $${formatMonto(resp?.venta?.montoTotal ?? (precioNum * cantNum))}.`;
          if (detalle) msg += ` · ${detalle}`;
          if (typeof stock === "number") msg += ` · Stock actual: ${stock}.`;
          setMensaje(msg);

          setCantidad(1);
          setDetalle("");
          await load();
        } catch (e2) {
          setError(e2.message || "Error registrando venta");
        }
        return;
      }

      // modo promo
      const promosNum = Number(promos);
      const upu = Number(unidadesPorPromo);
      const ppp = Number(precioPorPromo);

      if (Number.isNaN(promosNum) || promosNum <= 0) {
        setError("Promos debe ser un número mayor a 0");
        return;
      }
      if (Number.isNaN(upu) || upu <= 0) {
        setError("Unidades por promo debe ser un número mayor a 0");
        return;
      }
      if (Number.isNaN(ppp) || ppp < 0) {
        setError("Precio por promo inválido (>=0)");
        return;
      }

      const payload = {
        tipoBase: "STICKER",
        promos: promosNum,
        unidadesPorPromo: upu,
        precioPorPromo: ppp,
        detalle: String(detalle || "").trim() || null,

        canal,
        feriaId: canal === "feria" ? feriaId : null,
        origen: canal !== "feria" ? (origen || null) : null,

        productoStockId: stickerBases.length > 1 ? productoStockStickerId : null,
      };

      try {
        const resp = await createVenta(payload);
        const stock = resp?.productoStockActualizado?.stock;

        let msg = `Venta stickers (promo): ${promosNum} promo(s) = ${promosNum * upu} sticker(s). Total: $${formatMonto(promosNum * ppp)}.`;
        if (detalle) msg += ` · ${detalle}`;
        if (typeof stock === "number") msg += ` · Stock actual: ${stock}.`;

        setMensaje(msg);

        setPromos(1);
        setDetalle("");
        await load();
      } catch (e2) {
        setError(e2.message || "Error registrando venta");
      }
      return;
    }

    // ✅ NO-STICKERS
    if (!productoId) {
      setError("Elegí el producto (base o variante) a vender");
      return;
    }

    const cantNum = Number(cantidad);
    if (Number.isNaN(cantNum) || cantNum <= 0) {
      setError("Cantidad debe ser un número mayor a 0");
      return;
    }

    const precioNum = precioUnitario === "" ? 0 : Number(precioUnitario);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      setError("Precio unitario inválido (>=0)");
      return;
    }

    const payload = {
      productoId,
      cantidad: cantNum,
      precioUnitario: precioNum,

      canal,
      feriaId: canal === "feria" ? feriaId : null,
      origen: canal !== "feria" ? (origen || null) : null,

      detalle: String(detalle || "").trim() || null,
    };

    if (modeloId) payload.modeloId = modeloId;

    try {
      const resp = await createVenta(payload);

      const nombreProd = resp?.productoVendido?.nombre || "Producto";
      const stock = resp?.productoStockActualizado?.stock;

      let msg = `Venta registrada: ${cantNum} unidad(es) de "${nombreProd}". Total: $${formatMonto(resp?.venta?.montoTotal ?? (precioNum * cantNum))}.`;
      if (detalle) msg += ` · ${detalle}`;
      if (typeof stock === "number") msg += ` · Stock actual: ${stock}.`;

      setMensaje(msg);

      setCantidad(1);
      setDetalle("");
      setModeloId("");
      await load();
    } catch (e2) {
      setError(e2.message || "Error registrando venta");
    }
  }

  return (
    <LayoutCrud
      title="Ventas"
      description="STICKERS: individual o promo contra stock general. NO-STICKERS: producto (base o variante) + modelo opcional."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}
      {mensaje && <p className="text-sm badge-success">{mensaje}</p>}

      <FormSection
        title="Registrar venta"
        description="Elegí tipo base. Stickers: modo individual/promo. Otros: producto + (opcional) modelo."
        onSubmit={onSubmit}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Tipo base *</label>
            <select value={tipoBase} onChange={(e) => setTipoBase(e.target.value)} required>
              <option value="">-- elegir tipo --</option>
              {tiposUnicos.map((t) => (
                <option key={t} value={t}>
                  {humanTipo(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {tipoNorm === "STICKER" ? (
          <div className="card form-subsection">
            <h3>Stickers (stock general)</h3>

            {stickerBases.length > 1 && (
              <div className="form-grid">
                <div className="form-field">
                  <label>Stock general STICKER *</label>
                  <select value={productoStockStickerId} onChange={(e) => setProductoStockStickerId(e.target.value)}>
                    <option value="">-- elegir base sticker --</option>
                    {stickerBases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · stock: {p.stock ?? 0}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {stickerBaseUnica && (
              <p className="text-xs">
                Stock general: <strong>{stickerBaseUnica.nombre}</strong> · stock:{" "}
                <strong>{stickerBaseUnica.stock ?? 0}</strong>
              </p>
            )}

            <div className="form-grid">
              <div className="form-field">
                <label>Modo de venta *</label>
                <select value={stickerModo} onChange={(e) => setStickerModo(e.target.value)}>
                  <option value="individual">Individual</option>
                  <option value="promo">Promo</option>
                </select>
                <p className="text-xs">Así no te obliga a promo: solo aparece si la elegís.</p>
              </div>
            </div>

            {stickerModo === "promo" ? (
              <div className="form-grid">
                <div className="form-field">
                  <label>Promos *</label>
                  <input type="number" min="1" value={promos} onChange={(e) => setPromos(e.target.value)} />
                </div>

                <div className="form-field">
                  <label>Unidades por promo *</label>
                  <input type="number" min="1" value={unidadesPorPromo} onChange={(e) => setUnidadesPorPromo(e.target.value)} />
                </div>

                <div className="form-field">
                  <label>Precio por promo *</label>
                  <input type="number" min="0" value={precioPorPromo} onChange={(e) => setPrecioPorPromo(e.target.value)} />
                </div>

                <div className="form-field">
                  <label>Unidades totales</label>
                  <input type="text" value={unidadesStickerPromo} readOnly />
                </div>

                <div className="form-field">
                  <label>Total $</label>
                  <input type="text" value={totalStickerPromo} readOnly />
                </div>

                <div className="form-field">
                  <label>Detalle (opcional)</label>
                  <input
                    type="text"
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder='Ej: "mix", "vinilo + transparente"...'
                  />
                </div>
              </div>
            ) : (
              <div className="form-grid">
                <div className="form-field">
                  <label>Cantidad (stickers) *</label>
                  <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                </div>

                <div className="form-field">
                  <label>Precio unitario</label>
                  <input type="number" min="0" value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)} />
                  <p className="text-xs">Si no querés usar promo, cargás cantidad y precio directo.</p>
                </div>

                <div className="form-field">
                  <label>Detalle (opcional)</label>
                  <input
                    type="text"
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder='Ej: "pedido", "mix", "x unidad"...'
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="card form-subsection">
              <h3>Producto (base o variante)</h3>

              <div className="form-grid">
                <div className="form-field">
                  <label>Producto *</label>
                  <select value={productoId} onChange={(e) => setProductoId(e.target.value)} disabled={!tipoBase} required>
                    <option value="">-- elegir producto --</option>
                    {productosDelTipo.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.esBase ? "(BASE)" : "(VARIANTE)"} · stock: {p.stock ?? 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Cantidad *</label>
                  <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                </div>

                <div className="form-field">
                  <label>Precio unitario</label>
                  <input type="number" min="0" value={precioUnitario} onChange={(e) => setPrecioUnitario(e.target.value)} />
                </div>

                <div className="form-field">
                  <label>Detalle (opcional)</label>
                  <input type="text" value={detalle} onChange={(e) => setDetalle(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card form-subsection">
              <h3>Modelo / diseño (opcional)</h3>

              <div className="form-grid">
                <div className="form-field">
                  <label>Modelo</label>
                  <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} disabled={!tipoBase}>
                    <option value="">-- sin modelo --</option>
                    {modelosDelTipo.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombreModelo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="card form-subsection">
          <h3>Canal de venta</h3>

          <div className="form-grid">
            <div className="form-field">
              <label>Canal *</label>
              <select
                value={canal}
                onChange={(e) => {
                  setCanal(e.target.value);
                  if (e.target.value !== "feria") setFeriaId("");
                }}
              >
                {OPCIONES_CANAL.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {canal === "feria" ? (
              <div className="form-field">
                <label>Feria</label>
                <select value={feriaId} onChange={(e) => setFeriaId(e.target.value)}>
                  <option value="">-- elegir feria --</option>
                  {ferias.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} – {new Date(f.fecha).toLocaleDateString("es-AR")} ({f.estado})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-field">
                <label>Origen / detalle</label>
                <input
                  type="text"
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  placeholder={canal === "online" ? "Instagram, TikTok..." : "Conocido, pedido directo..."}
                />
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">Registrar venta</button>
        </div>
      </FormSection>

      <section className="crud-section">
        <div className="ventas-summary">
          <div className="card ventas-summary-card">
            <p className="text-xs text-muted">Monto total vendido</p>
            <p className="ventas-summary-main">${formatMonto(totalMontoVentas)} ARS</p>
            <p className="text-xs ventas-summary-sub">
              Unidades vendidas: <strong>{totalUnidadesVendidas}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Historial de ventas</h2>
        </header>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Modelo</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Total</th>
                <th>Canal</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {ventasEnriquecidas.map((v) => {
                let canalTexto = "-";
                if (v.canal === "feria") canalTexto = `Feria: ${v.nombreFeria || "–"}`;
                if (v.canal === "online") canalTexto = `Online${v.origen ? " – " + v.origen : ""}`;
                if (v.canal === "presencial") canalTexto = `Presencial${v.origen ? " – " + v.origen : ""}`;

                const esSticker = v.tipoBase === "STICKER";
                const promoTxt = esSticker && v.promos ? ` (${v.promos} promo)` : "";

                return (
                  <tr key={v.id}>
                    <td>{formatFecha(v.fecha)}</td>
                    <td>{humanTipo(v.tipoBase)}</td>
                    <td>{v.nombreProducto}</td>
                    <td>{v.nombreModelo || "—"}</td>
                    <td>{v.cantidad}{promoTxt}</td>
                    <td>{v.precioUnitario}</td>
                    <td>{v.montoTotal}</td>
                    <td>{canalTexto}</td>
                    <td>{v.detalle || "—"}</td>
                  </tr>
                );
              })}

              {!loading && ventasEnriquecidas.length === 0 && (
                <tr>
                  <td colSpan="9">No hay ventas registradas todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutCrud>
  );
}
