// frontend/src/pages/admin.jsx
import { useMemo, useState } from "react";
import LayoutCrud from "../components/layout-crud/layout-crud.jsx";

const API_URL = "http://localhost:3001";

function downloadJsonFile(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // preview backup
  const [backup, setBackup] = useState(null);

  // restore
  const [restoreText, setRestoreText] = useState("");

  // reset
  const [resetMotivo, setResetMotivo] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const resumenBackup = useMemo(() => {
    const data = backup?.data;
    if (!data) return null;

    const keys = Object.keys(data);
    const items = keys.map((k) => ({
      key: k,
      count: Array.isArray(data[k]) ? data[k].length : 0,
    }));
    const total = items.reduce((acc, x) => acc + x.count, 0);

    return { items, total, createdAt: backup?.createdAt };
  }, [backup]);

  async function cargarPreview() {
    try {
      setError("");
      setMensaje("");
      setLoading(true);

      const res = await fetch(`${API_URL}/admin/backup`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Error cargando backup");

      setBackup(data);
      setMensaje("✅ Preview cargado.");
    } catch (e) {
      setError(e.message || "Error cargando preview");
    } finally {
      setLoading(false);
    }
  }

  async function descargarBackup() {
    try {
      setError("");
      setMensaje("");
      setLoading(true);

      const res = await fetch(`${API_URL}/admin/backup`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Error creando backup");

      const stamp = new Date().toISOString().replaceAll(":", "-");
      downloadJsonFile(data, `obsidian-backup-${stamp}.json`);

      setBackup(data);
      setMensaje("✅ Backup descargado.");
    } catch (e) {
      setError(e.message || "Error descargando backup");
    } finally {
      setLoading(false);
    }
  }

  async function restaurar() {
    try {
      setError("");
      setMensaje("");

      const raw = String(restoreText || "").trim();
      if (!raw) return setError("Pegá el JSON del backup para restaurar.");

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return setError("El texto pegado no es un JSON válido.");
      }

      const data = parsed?.data;
      if (!data || typeof data !== "object") {
        return setError("El backup no tiene el formato esperado (falta 'data').");
      }

      setLoading(true);

      const res = await fetch(`${API_URL}/admin/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESTAURAR", data }),
      });

      const resp = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resp?.error || "Error restaurando");

      setMensaje("✅ Datos restaurados correctamente.");
      setBackup(parsed);
      setRestoreText("");
    } catch (e) {
      setError(e.message || "Error restaurando");
    } finally {
      setLoading(false);
    }
  }

  async function borrarTodo() {
    try {
      setError("");
      setMensaje("");

      const mot = String(resetMotivo || "").trim();
      if (!mot) return setError("Motivo obligatorio para borrar todo.");

      if (String(resetConfirm || "").trim().toUpperCase() !== "BORRAR") {
        return setError('Para confirmar, escribí "BORRAR" (sin comillas).');
      }

      setLoading(true);

      const res = await fetch(`${API_URL}/admin/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "BORRAR_TODO", motivo: mot }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Error borrando todo");

      setMensaje("✅ Reset completo hecho. Todos los JSON quedaron vacíos.");
      setBackup(null);
      setResetMotivo("");
      setResetConfirm("");
    } catch (e) {
      setError(e.message || "Error borrando todo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LayoutCrud
      title="Admin"
      description="Backup, restauración y limpieza total de datos. Usar con cuidado."
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="crud-error">{error}</p>}
      {mensaje && <p className="produccion-mensaje-ok">{mensaje}</p>}

      {/* BACKUP */}
      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Backup</h2>
        </header>

        <div className="form-actions" style={{ justifyContent: "flex-start", gap: 8 }}>
          <button className="btn-primary" type="button" onClick={descargarBackup} disabled={loading}>
            Descargar backup
          </button>
          <button className="btn-secondary" type="button" onClick={cargarPreview} disabled={loading}>
            Cargar preview
          </button>
        </div>

        {resumenBackup && (
          <div className="card" style={{ marginTop: 12, padding: 12, display: "grid", gap: 10 }}>
            <div className="text-xs">
              Backup: <b>{resumenBackup.createdAt}</b> · Total items: <b>{resumenBackup.total}</b>
            </div>

            <div className="crud-table-wrapper">
              <table className="crud-table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenBackup.items.map((x) => (
                    <tr key={x.key}>
                      <td>{x.key}</td>
                      <td>{x.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-muted">
              Recomendación: descargá un backup antes de cambios grandes.
            </div>
          </div>
        )}
      </section>

      {/* RESTAURAR */}
      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Restaurar</h2>
        </header>

        <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <div className="text-xs text-muted">
            Pegá el JSON de un backup y restaurá. Esto pisa los datos actuales.
          </div>

          <div className="form-field">
            <label>Backup JSON (pegar aquí)</label>
            <textarea
              value={restoreText}
              onChange={(e) => setRestoreText(e.target.value)}
              rows={8}
              placeholder='Pegá el contenido del archivo "obsidian-backup-....json"'
            />
          </div>

          <div className="form-actions" style={{ justifyContent: "flex-end" }}>
            <button className="btn-primary" type="button" onClick={restaurar} disabled={loading}>
              Restaurar
            </button>
          </div>
        </div>
      </section>

      {/* RESET */}
      <section className="crud-section">
        <header className="crud-section-header">
          <h2>Borrar todo</h2>
        </header>

        <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <div className="text-xs text-muted">
            Esto deja todos los JSON vacíos. No se puede deshacer salvo restaurando un backup.
          </div>

          <div className="form-field">
            <label>Motivo (obligatorio)</label>
            <input
              value={resetMotivo}
              onChange={(e) => setResetMotivo(e.target.value)}
              placeholder='Ej: "Voy a usar datos reales"'
            />
          </div>

          <div className="form-field">
            <label>Confirmación (escribí BORRAR)</label>
            <input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="BORRAR"
            />
          </div>

          <div className="form-actions" style={{ justifyContent: "flex-end" }}>
            <button className="btn-secondary" type="button" onClick={borrarTodo} disabled={loading}>
              Borrar todo
            </button>
          </div>
        </div>
      </section>
    </LayoutCrud>
  );
}
