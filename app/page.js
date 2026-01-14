"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "app.clients.v1";

function getClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveClients(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function makeClientId(cui, name) {
  const c = (cui || "").trim().toUpperCase().replace(/\s+/g, "");
  if (c) return "CUI_" + c;
  return (
    "NAME_" +
    (name || "client")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_") +
    "_" +
    Date.now()
  );
}

export default function Page() {
  const [mode, setMode] = useState("existing"); // existing | new
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const [clientMsg, setClientMsg] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [cui, setCui] = useState("");
  const [bank, setBank] = useState("");
  const [iban, setIban] = useState("");

  // Init clients din localStorage
  useEffect(() => {
    const list = getClients();
    setClients(list);
  }, []);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) =>
      (a.companyName || "").localeCompare(b.companyName || "")
    );
  }, [clients]);

  function clearClientForm() {
    setCompanyName("");
    setCompanyAddress("");
    setCui("");
    setBank("");
    setIban("");
    setSaveMsg("");
  }

  function fillClientForm(c) {
    setCompanyName(c.companyName || "");
    setCompanyAddress(c.address || "");
    setCui(c.cui || "");
    setBank(c.bank || "");
    setIban(c.iban || "");
  }

  function readClientForm() {
    return {
      companyName: (companyName || "").trim(),
      address: (companyAddress || "").trim(),
      cui: (cui || "").trim().toUpperCase(),
      bank: (bank || "").trim(),
      iban: (iban || "").trim().toUpperCase().replace(/\s+/g, ""),
    };
  }

  function validateClient(c) {
    if (!c.companyName) return "Denumire firmă (client) este obligatorie.";
    if (!c.address) return "Adresă firmă (client) este obligatorie.";
    if (c.iban && !/^RO[A-Z0-9]{22}$/.test(c.iban))
      return "IBAN invalid (format RO + 22 caractere).";
    return "";
  }

  function onSaveClient() {
    const data = readClientForm();
    const err = validateClient(data);
    if (err) {
      setSaveMsg("⚠ " + err);
      return;
    }

    const list = getClients();

    // update dacă e selectat
    if (selectedId) {
      const idx = list.findIndex((x) => x.id === selectedId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data };
        saveClients(list);
        setClients(list);
        setSaveMsg("✅ Client actualizat.");
        return;
      }
    }

    // create / upsert după CUI
    const id = makeClientId(data.cui, data.companyName);
    const existsSameId = list.some((x) => x.id === id);

    if (existsSameId) {
      const idx = list.findIndex((x) => x.id === id);
      list[idx] = { ...list[idx], ...data, id };
      saveClients(list);
      setClients(list);
      setSelectedId(id);
      setSaveMsg("✅ Client actualizat (CUI existent).");
      return;
    }

    list.push({ id, ...data });
    saveClients(list);
    setClients(list);
    setSelectedId(id);
    setSaveMsg("✅ Client salvat.");
  }

  function onLoadClient() {
    if (!selectedId) {
      setClientMsg("⚠ Alege un client din listă.");
      return;
    }
    const c = getClients().find((x) => x.id === selectedId);
    if (!c) {
      setClientMsg("⚠ Clientul nu a fost găsit.");
      return;
    }
    fillClientForm(c);
    setClientMsg("✅ Client încărcat.");
  }

  function onDeleteClient() {
    if (!selectedId) {
      setClientMsg("⚠ Alege un client din listă.");
      return;
    }
    const list = getClients().filter((x) => x.id !== selectedId);
    saveClients(list);
    setClients(list);
    setSelectedId("");
    clearClientForm();
    setClientMsg("✅ Client șters.");
  }

  function setModeSafe(nextMode) {
    setMode(nextMode);
    if (nextMode === "new") {
      setSelectedId("");
      setClientMsg("");
    }
  }

  return (
    <>
      <style jsx global>{`
        body {
          font-family: Arial, sans-serif;
          background: #f5f6f8;
          padding: 20px;
        }
        .container {
          max-width: 900px;
          margin: auto;
          background: #fff;
          padding: 24px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }
        h1 {
          margin: 0 0 10px 0;
        }
        h2 {
          margin-top: 26px;
          margin-bottom: 12px;
          font-size: 20px;
          border-bottom: 2px solid #eee;
          padding-bottom: 6px;
        }
        .row-1 {
          margin-bottom: 14px;
        }
        label {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 5px;
          display: block;
        }
        input,
        select {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ccc;
          font-size: 14px;
          box-sizing: border-box;
        }
        .muted {
          color: #666;
          font-size: 13px;
        }
        .controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin: 10px 0 14px;
        }
        .pill {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 8px 10px;
          border: 1px solid #ddd;
          border-radius: 999px;
          background: #fafafa;
        }
        .btn {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #ccc;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
        }
        .btn-primary {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
        .btn-danger {
          background: #fff;
          color: #b91c1c;
          border-color: #fca5a5;
        }
        .ok {
          color: #15803d;
          font-weight: 700;
        }
        .warn {
          color: #b45309;
          font-weight: 700;
        }
        .hidden {
          display: none;
        }
        .order-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .order-table th,
        .order-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        .order-table th {
          background: #f0f0f0;
        }
        .qty {
          width: 90px;
        }
      `}</style>

      <div className="container">
        <h1>Formular comandă</h1>
        <div className="muted">
          Include selecție client existent sau introducere client nou (cu salvare).
        </div>

        <h2>Client</h2>

        <div className="controls">
          <div className="pill">
            <input
              type="radio"
              id="clientModeExisting"
              name="clientMode"
              value="existing"
              checked={mode === "existing"}
              onChange={() => setModeSafe("existing")}
            />
            <label
              htmlFor="clientModeExisting"
              style={{ margin: 0, fontWeight: 700 }}
            >
              Client existent
            </label>
          </div>

          <div className="pill">
            <input
              type="radio"
              id="clientModeNew"
              name="clientMode"
              value="new"
              checked={mode === "new"}
              onChange={() => setModeSafe("new")}
            />
            <label
              htmlFor="clientModeNew"
              style={{ margin: 0, fontWeight: 700 }}
            >
              Client nou
            </label>
          </div>
        </div>

        {/* EXISTENT */}
        <div className={mode === "existing" ? "row-1" : "row-1 hidden"}>
          <label>Selectează client</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">— Alege un client —</option>
            {sortedClients.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.companyName || "(fără nume)") + (c.cui ? " • " + c.cui : "")}
              </option>
            ))}
          </select>

          <div className="controls" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={onLoadClient}>
              Încarcă client
            </button>
            <button className="btn btn-danger" type="button" onClick={onDeleteClient}>
              Șterge client
            </button>
            <span className="muted">{clientMsg}</span>
          </div>
        </div>

        {/* DATE CLIENT */}
        <div id="clientFormBlock">
          <div className="row-1">
            <label>Denumire firmă (client)</label>
            <input
              type="text"
              placeholder="Ex: SC Client SRL"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>Adresă firmă (client)</label>
            <input
              type="text"
              placeholder="Ex: Oraș, Stradă, Nr."
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>CUI (client)</label>
            <input
              type="text"
              placeholder="Ex: RO123456"
              value={cui}
              onChange={(e) => setCui(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>Banca (client)</label>
            <input
              type="text"
              placeholder="Ex: Banca Transilvania"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>Cont bancar (IBAN) (client)</label>
            <input
              type="text"
              placeholder="Ex: RO49AAAA1B31007593840000"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
            />
          </div>

          <div className="controls">
            <button className="btn btn-primary" type="button" onClick={onSaveClient}>
              Salvează client
            </button>
            <button className="btn" type="button" onClick={clearClientForm}>
              Golește câmpurile
            </button>
            <span className="muted">
              {saveMsg.startsWith("✅") ? <span className="ok">{saveMsg}</span> : saveMsg ? <span className="warn">{saveMsg}</span> : ""}
            </span>
          </div>

          <div className="muted">
            Notă: clienții sunt salvați în acest browser (localStorage). Pentru
            multi-user sau acces de pe mai multe PC-uri, trebuie DB pe server.
          </div>
        </div>

        <h2>Comandă</h2>
        <table className="order-table">
          <thead>
            <tr>
              <th>Produs</th>
              <th>Cantitate (buc)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Module GPS</td>
              <td>
                <input className="qty" type="number" min="0" defaultValue="0" name="qty_gps" />
              </td>
            </tr>
            <tr>
              <td>Repetor</td>
              <td>
                <input className="qty" type="number" min="0" defaultValue="0" name="qty_repetor" />
              </td>
            </tr>
            <tr>
              <td>Router WI-FI</td>
              <td>
                <input className="qty" type="number" min="0" defaultValue="0" name="qty_wifi" />
              </td>
            </tr>
          </tbody>
        </table>

        <div className="row-1" style={{ marginTop: 14 }}>
          <label>Adresă de livrare</label>
          <input type="text" name="adresa_livrare" placeholder="Ex: punct de lucru / depozit / șantier" />
        </div>

        <h2>Persoană de contact</h2>
        <div className="row-1">
          <label>Nume / Prenume</label>
          <input type="text" name="contact_nume" />
        </div>
        <div className="row-1">
          <label>E-mail</label>
          <input type="email" name="contact_email" />
        </div>
        <div className="row-1">
          <label>Telefon</label>
          <input type="tel" name="contact_telefon" />
        </div>
      </div>
    </>
  );
}
