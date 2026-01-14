"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STORAGE_KEY = "app.clients.v1";

// --- produse (fixe) ---
const PRODUCTS = [
  { key: "gps", name: "Module GPS", unitPrice: 49.9, currency: "EUR", vatPercent: 19 },
  { key: "repetor", name: "Repetor", unitPrice: 49.9, currency: "EUR", vatPercent: 19 },
  // Router WiFi: 170 lei "inclus TVA" -> îl tratăm ca TVA inclus (vatPercent 0 + notă)
  { key: "wifi", name: "Router WI-FI", unitPrice: 170, currency: "RON", vatPercent: 0, note: "TVA inclus" },
];

function safeParseJSON(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ---------- Storage helpers ----------
function getClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? safeParseJSON(raw, []) : [];
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

function fmtMoney(val) {
  const n = Number(val || 0);
  return n.toFixed(2);
}

function todayRO() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

export default function Page() {
  // --- mode ---
  const [clientMode, setClientMode] = useState("existing"); // existing | new

  // --- client dropdown ---
  const [clients, setClients] = useState([]);
  const [clientSelectId, setClientSelectId] = useState("");
  const [clientMsg, setClientMsg] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  // --- client fields ---
  const [clientCompanyName, setClientCompanyName] = useState("");
  const [clientCompanyAddress, setClientCompanyAddress] = useState("");
  const [clientCui, setClientCui] = useState("");
  const [clientBank, setClientBank] = useState("");
  const [clientIban, setClientIban] = useState("");

  // --- order fields ---
  const [qtyGps, setQtyGps] = useState(0);
  const [qtyRepetor, setQtyRepetor] = useState(0);
  const [qtyWifi, setQtyWifi] = useState(0);
  const [adresaLivrare, setAdresaLivrare] = useState("");

  // optional (util pentru proformă)
  const [advancePercent, setAdvancePercent] = useState(0);

  // --- contact ---
  const [contactNume, setContactNume] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelefon, setContactTelefon] = useState("");

  // init clients
  useEffect(() => {
    const list = getClients();
    setClients(list);
  }, []);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => (a.companyName || "").localeCompare(b.companyName || ""));
  }, [clients]);

  function renderRefreshClients() {
    const list = getClients();
    setClients(list);
  }

  function setMode(mode) {
    setClientMode(mode);
    setClientMsg("");
    setSaveMsg("");
    if (mode === "new") {
      setClientSelectId("");
    }
  }

  function clearClientForm() {
    setClientCompanyName("");
    setClientCompanyAddress("");
    setClientCui("");
    setClientBank("");
    setClientIban("");
    setSaveMsg("");
  }

  function fillClientForm(client) {
    setClientCompanyName(client.companyName || "");
    setClientCompanyAddress(client.address || "");
    setClientCui(client.cui || "");
    setClientBank(client.bank || "");
    setClientIban(client.iban || "");
  }

  function readClientForm() {
    return {
      companyName: (clientCompanyName || "").trim(),
      address: (clientCompanyAddress || "").trim(),
      cui: (clientCui || "").trim().toUpperCase(),
      bank: (clientBank || "").trim(),
      iban: (clientIban || "").trim().toUpperCase().replace(/\s+/g, ""),
    };
  }

  function validateClient(c) {
    if (!c.companyName) return "Denumire firmă (client) este obligatorie.";
    if (!c.address) return "Adresă firmă (client) este obligatorie.";
    if (c.iban && !/^RO[A-Z0-9]{22}$/.test(c.iban)) return "IBAN invalid (format RO + 22 caractere).";
    return "";
  }

  // ---------- Actions ----------
  function handleSaveClient() {
    const data = readClientForm();
    const err = validateClient(data);
    if (err) {
      setSaveMsg(`⚠ ${err}`);
      return;
    }

    const list = getClients();
    const selectedId = clientSelectId;

    // update selected
    if (selectedId) {
      const idx = list.findIndex((x) => x.id === selectedId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data };
        saveClients(list);
        renderRefreshClients();
        setSaveMsg("✅ Client actualizat.");
        return;
      }
    }

    // create (ID după CUI dacă există)
    const id = makeClientId(data.cui, data.companyName);
    const existsSameId = list.some((x) => x.id === id);

    if (existsSameId) {
      const idx = list.findIndex((x) => x.id === id);
      list[idx] = { ...list[idx], ...data, id };
      saveClients(list);
      renderRefreshClients();
      setClientSelectId(id);
      setSaveMsg("✅ Client actualizat (CUI existent).");
      return;
    }

    list.push({ id, ...data });
    saveClients(list);
    renderRefreshClients();
    setClientSelectId(id);
    setSaveMsg("✅ Client salvat.");
  }

  function handleLoadClient() {
    if (!clientSelectId) {
      setClientMsg("⚠ Alege un client din listă.");
      return;
    }
    const c = getClients().find((x) => x.id === clientSelectId);
    if (!c) {
      setClientMsg("⚠ Clientul nu a fost găsit.");
      return;
    }
    fillClientForm(c);
    setClientMsg("✅ Client încărcat.");
  }

  function handleDeleteClient() {
    if (!clientSelectId) {
      setClientMsg("⚠ Alege un client din listă.");
      return;
    }
    const list = getClients().filter((x) => x.id !== clientSelectId);
    saveClients(list);
    setClientSelectId("");
    renderRefreshClients();
    clearClientForm();
    setClientMsg("✅ Client șters.");
  }

  // ---------- Order helpers ----------
  const orderItems = useMemo(() => {
    const map = {
      gps: Number(qtyGps || 0),
      repetor: Number(qtyRepetor || 0),
      wifi: Number(qtyWifi || 0),
    };

    return PRODUCTS.map((p) => {
      const qty = map[p.key] || 0;
      return {
        ...p,
        qty,
        lineNet: qty * p.unitPrice,
        lineVat: p.vatPercent ? (qty * p.unitPrice * p.vatPercent) / 100 : 0,
        lineGross: qty * p.unitPrice + (p.vatPercent ? (qty * p.unitPrice * p.vatPercent) / 100 : 0),
      };
    }).filter((x) => x.qty > 0);
  }, [qtyGps, qtyRepetor, qtyWifi]);

  const totalsByCurrency = useMemo(() => {
    const acc = {};
    for (const it of orderItems) {
      if (!acc[it.currency]) {
        acc[it.currency] = { net: 0, vat: 0, gross: 0 };
      }
      acc[it.currency].net += it.lineNet;
      acc[it.currency].vat += it.lineVat;
      acc[it.currency].gross += it.lineGross;
    }
    return acc;
  }, [orderItems]);

  // ---------- PDF ----------
  function addHeader(doc, title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Data: ${todayRO()}`, 14, 25);

    doc.setDrawColor(220);
    doc.line(14, 28, 196, 28);
  }

  function addClientBlock(doc, yStart) {
    const lines = [
      ["Denumire firmă:", clientCompanyName || "-"],
      ["Adresă:", clientCompanyAddress || "-"],
      ["CUI:", clientCui || "-"],
      ["Banca:", clientBank || "-"],
      ["IBAN:", clientIban || "-"],
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Client", 14, yStart);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = yStart + 6;
    for (const [k, v] of lines) {
      doc.text(`${k} ${v}`, 14, y);
      y += 5;
    }
    return y + 2;
  }

  function addDeliveryContact(doc, yStart) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Livrare & Contact", 14, yStart);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const lines = [
      ["Adresă livrare:", adresaLivrare || "-"],
      ["Contact:", contactNume || "-"],
      ["E-mail:", contactEmail || "-"],
      ["Telefon:", contactTelefon || "-"],
    ];

    let y = yStart + 6;
    for (const [k, v] of lines) {
      doc.text(`${k} ${v}`, 14, y);
      y += 5;
    }
    return y + 2;
  }

  function ensureHasItemsOrWarn() {
    if (!orderItems.length) {
      alert("Adaugă cel puțin o cantitate (mai mare ca 0) la produse.");
      return false;
    }
    return true;
  }

  function downloadNota() {
    if (!ensureHasItemsOrWarn()) return;

    const doc = new jsPDF();
    addHeader(doc, "Notă de comandă");

    let y = 34;
    y = addClientBlock(doc, y);
    y = addDeliveryContact(doc, y + 4);

    // Tabel produse
    const body = orderItems.map((it) => [
      it.name,
      String(it.qty),
      `${fmtMoney(it.unitPrice)} ${it.currency}`,
      it.vatPercent ? `${it.vatPercent}%` : (it.note || "—"),
      `${fmtMoney(it.lineGross)} ${it.currency}`,
    ]);

    autoTable(doc, {
      startY: y + 4,
      head: [["Produs", "Cant.", "Preț unitar", "TVA", "Total"]],
      body,
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: { fillColor: [240, 240, 240], textColor: 20 },
      theme: "grid",
    });

    let yAfter = doc.lastAutoTable.finalY + 8;

    // Totaluri pe monedă
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Totaluri", 14, yAfter);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    yAfter += 6;

    Object.entries(totalsByCurrency).forEach(([cur, t]) => {
      doc.text(
        `${cur}: Net ${fmtMoney(t.net)} | TVA ${fmtMoney(t.vat)} | Total ${fmtMoney(t.gross)}`,
        14,
        yAfter
      );
      yAfter += 5;
    });

    doc.save(`nota-comanda_${todayRO().replaceAll(".", "-")}.pdf`);
  }

  function downloadProforma() {
    if (!ensureHasItemsOrWarn()) return;

    const doc = new jsPDF();
    addHeader(doc, "Factură proformă");

    let y = 34;
    y = addClientBlock(doc, y);
    y = addDeliveryContact(doc, y + 4);

    // Tabel produse (cu net, TVA, total)
    const body = orderItems.map((it) => [
      it.name,
      String(it.qty),
      `${fmtMoney(it.unitPrice)} ${it.currency}`,
      it.vatPercent ? `${it.vatPercent}%` : (it.note || "—"),
      `${fmtMoney(it.lineNet)} ${it.currency}`,
      `${fmtMoney(it.lineVat)} ${it.currency}`,
      `${fmtMoney(it.lineGross)} ${it.currency}`,
    ]);

    autoTable(doc, {
      startY: y + 4,
      head: [["Produs", "Cant.", "Preț unitar", "TVA", "Net", "TVA", "Total"]],
      body,
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240], textColor: 20 },
      theme: "grid",
    });

    let yAfter = doc.lastAutoTable.finalY + 8;

    // Totaluri + avans
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Totaluri & Avans", 14, yAfter);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    yAfter += 6;

    const adv = Math.max(0, Math.min(100, Number(advancePercent || 0)));

    Object.entries(totalsByCurrency).forEach(([cur, t]) => {
      const avansVal = (t.gross * adv) / 100;
      const restVal = t.gross - avansVal;

      doc.text(
        `${cur}: Net ${fmtMoney(t.net)} | TVA ${fmtMoney(t.vat)} | Total ${fmtMoney(t.gross)}`,
        14,
        yAfter
      );
      yAfter += 5;
      doc.text(
        `Avans (${adv}%): ${fmtMoney(avansVal)} ${cur} | Rest de plată: ${fmtMoney(restVal)} ${cur}`,
        14,
        yAfter
      );
      yAfter += 6;
    });

    doc.setFontSize(9);
    doc.text("Notă: aceasta este o factură proformă (nu este document fiscal).", 14, yAfter + 4);

    doc.save(`proforma_${todayRO().replaceAll(".", "-")}.pdf`);
  }

  // ---------- UI ----------
  const css = `
    body { font-family: Arial, sans-serif; background:#f5f6f8; padding:20px; }
    .container { max-width: 900px; margin:auto; background:#fff; padding:24px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,.08); }
    h1 { margin: 0 0 10px 0; }
    h2 { margin-top: 26px; margin-bottom: 12px; font-size: 20px; border-bottom:2px solid #eee; padding-bottom: 6px; }
    .row-1 { margin-bottom: 14px; }
    label { font-weight: 700; font-size: 14px; margin-bottom: 5px; display:block; }
    input, select { width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-size:14px; }
    .muted { color:#666; font-size: 13px; }
    .controls { display:flex; gap:10px; flex-wrap: wrap; align-items:center; margin: 10px 0 14px; }
    .pill { display:flex; gap:8px; align-items:center; padding:8px 10px; border:1px solid #ddd; border-radius: 999px; background:#fafafa; }
    .btn { padding:10px 14px; border-radius:10px; border:1px solid #ccc; background:#fff; cursor:pointer; font-weight:700; }
    .btn-primary { background:#2563eb; color:#fff; border-color:#2563eb; }
    .btn-danger { background:#fff; color:#b91c1c; border-color:#fca5a5; }
    .btn:disabled { opacity:.6; cursor:not-allowed; }
    .ok { color:#15803d; font-weight:700; }
    .warn { color:#b45309; font-weight:700; }
    .hidden { display:none; }

    .order-table { width:100%; border-collapse: collapse; margin-top:10px; }
    .order-table th, .order-table td { border:1px solid #ddd; padding:10px; text-align:left; }
    .order-table th { background:#f0f0f0; }
    .qty { width: 90px; }
  `;

  return (
    <>
      <style>{css}</style>

      <div className="container">
        <h1>Formular comandă</h1>
        <div className="muted">Include selecție client existent sau introducere client nou (cu salvare).</div>

        {/* CLIENT */}
        <h2>Client</h2>

        <div className="controls">
          <div className="pill">
            <input
              type="radio"
              id="clientModeExisting"
              name="clientMode"
              value="existing"
              checked={clientMode === "existing"}
              onChange={() => setMode("existing")}
            />
            <label htmlFor="clientModeExisting" style={{ margin: 0, fontWeight: 700 }}>
              Client existent
            </label>
          </div>

          <div className="pill">
            <input
              type="radio"
              id="clientModeNew"
              name="clientMode"
              value="new"
              checked={clientMode === "new"}
              onChange={() => setMode("new")}
            />
            <label htmlFor="clientModeNew" style={{ margin: 0, fontWeight: 700 }}>
              Client nou
            </label>
          </div>
        </div>

        {/* EXISTENT */}
        <div id="existingClientBlock" className={clientMode === "existing" ? "row-1" : "row-1 hidden"}>
          <label>Selectează client</label>
          <select value={clientSelectId} onChange={(e) => setClientSelectId(e.target.value)}>
            <option value="">— Alege un client —</option>
            {sortedClients.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.companyName || "(fără nume)") + (c.cui ? " • " + c.cui : "")}
              </option>
            ))}
          </select>

          <div className="controls" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={handleLoadClient}>
              Încarcă client
            </button>
            <button className="btn btn-danger" type="button" onClick={handleDeleteClient}>
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
              value={clientCompanyName}
              onChange={(e) => setClientCompanyName(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>Adresă firmă (client)</label>
            <input
              type="text"
              placeholder="Ex: Oraș, Stradă, Nr."
              value={clientCompanyAddress}
              onChange={(e) => setClientCompanyAddress(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>CUI (client)</label>
            <input
              type="text"
              placeholder="Ex: RO123456"
              value={clientCui}
              onChange={(e) => setClientCui(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>Banca (client)</label>
            <input
              type="text"
              placeholder="Ex: Banca Transilvania"
              value={clientBank}
              onChange={(e) => setClientBank(e.target.value)}
            />
          </div>

          <div className="row-1">
            <label>Cont bancar (IBAN) (client)</label>
            <input
              type="text"
              placeholder="Ex: RO49AAAA1B31007593840000"
              value={clientIban}
              onChange={(e) => setClientIban(e.target.value)}
            />
          </div>

          <div className="controls">
            <button className="btn btn-primary" type="button" onClick={handleSaveClient}>
              Salvează client
            </button>
            <button className="btn" type="button" onClick={clearClientForm}>
              Golește câmpurile
            </button>
            <span className="muted">{saveMsg ? <span className={saveMsg.startsWith("✅") ? "ok" : "warn"}>{saveMsg}</span> : null}</span>
          </div>

          <div className="muted">
            Notă: clienții sunt salvați în acest browser (localStorage). Pentru multi-user sau acces de pe mai multe PC-uri, trebuie DB pe server.
          </div>
        </div>

        {/* COMANDA */}
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
                <input className="qty" type="number" min="0" value={qtyGps} onChange={(e) => setQtyGps(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td>Repetor</td>
              <td>
                <input className="qty" type="number" min="0" value={qtyRepetor} onChange={(e) => setQtyRepetor(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td>Router WI-FI</td>
              <td>
                <input className="qty" type="number" min="0" value={qtyWifi} onChange={(e) => setQtyWifi(e.target.value)} />
              </td>
            </tr>
          </tbody>
        </table>

        <div className="row-1" style={{ marginTop: 14 }}>
          <label>Adresă de livrare</label>
          <input
            type="text"
            placeholder="Ex: punct de lucru / depozit / șantier"
            value={adresaLivrare}
            onChange={(e) => setAdresaLivrare(e.target.value)}
          />
        </div>

        <div className="row-1">
          <label>Avans (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={advancePercent}
            onChange={(e) => setAdvancePercent(e.target.value)}
          />
          <div className="muted">Opțional. Este folosit în PDF-ul de PROFORMĂ.</div>
        </div>

        {/* CONTACT */}
        <h2>Persoană de contact</h2>
        <div className="row-1">
          <label>Nume / Prenume</label>
          <input type="text" value={contactNume} onChange={(e) => setContactNume(e.target.value)} />
        </div>
        <div className="row-1">
          <label>E-mail</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <div className="row-1">
          <label>Telefon</label>
          <input type="tel" value={contactTelefon} onChange={(e) => setContactTelefon(e.target.value)} />
        </div>

        {/* ✅ BUTOANE PDF (în afara row-1 ca să nu fie ascunse) */}
        <div className="controls" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-primary" onClick={downloadNota}>
            Descarcă NOTĂ (PDF)
          </button>

          <button type="button" className="btn" onClick={downloadProforma}>
            Descarcă PROFORMĂ (PDF)
          </button>

          <span className="muted">
            {orderItems.length ? `Produse selectate: ${orderItems.length}` : "Adaugă cantități > 0 ca să generezi PDF."}
          </span>
        </div>
      </div>
    </>
  );
}
