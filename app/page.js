"use client";

import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    company: "",
    cif: "",
    address: "",
    orderNo: "NC-001",
    proformaNo: "PF-001",
    itemsJson: JSON.stringify(
      [
        { name: "Modul GPS", qty: 1, price: 49.9, currency: "EUR", vatPercent: 19 },
        { name: "Repetor", qty: 1, price: 49.9, currency: "EUR", vatPercent: 19 },
        { name: "Router WiFi", qty: 1, price: 170, currency: "RON", vatPercent: 0 }
      ],
      null,
      2
    ),
    advancePercent: 0,
    notes: "Produsele introduse se livrează acum."
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function downloadPdf(type) {
    let items;
    try {
      items = JSON.parse(form.itemsJson);
    } catch {
      alert("Produsele (JSON) nu sunt valide.");
      return;
    }

    const res = await fetch(`/api/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items })
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "proforma" ? "factura_proforma.pdf" : "nota_de_comanda.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", fontFamily: "Arial" }}>
      <h1>Generator Proformă / Notă de comandă</h1>

      {[
        ["Nume client", "clientName"],
        ["Email client", "clientEmail"],
        ["Firmă", "company"],
        ["CIF", "cif"],
        ["Adresă", "address"],
        ["Nr. Notă comandă", "orderNo"],
        ["Nr. Proformă", "proformaNo"],
        ["Avans (%)", "advancePercent"]
      ].map(([label, name]) => (
        <div key={name} style={{ marginBottom: 8 }}>
          <label>{label}</label>
          <input
            name={name}
            value={form[name]}
            onChange={onChange}
            style={{ width: "100%", padding: 6 }}
          />
        </div>
      ))}

      <label>Produse (JSON)</label>
      <textarea
        name="itemsJson"
        rows={8}
        value={form.itemsJson}
        onChange={onChange}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Observații</label>
      <textarea
        name="notes"
        rows={3}
        value={form.notes}
        onChange={onChange}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={() => downloadPdf("nota")}>Descarcă NOTĂ (PDF)</button>
      <button onClick={() => downloadPdf("proforma")} style={{ marginLeft: 10 }}>
        Descarcă PROFORMĂ (PDF)
      </button>
    </main>
  );
}
