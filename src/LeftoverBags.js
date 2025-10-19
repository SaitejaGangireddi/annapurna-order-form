import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function LeftoverBags() {
  const [purchaseData, setPurchaseData] = useState([]);
  const [usageData, setUsageData] = useState([]);
  const [result, setResult] = useState([]);
  const [filters, setFilters] = useState({ variety: "", size: "" });
  const [varietyOptions, setVarietyOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);

  const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

  // ---------- Helper: header detection ----------
  const findHeaderKey = (headers, patterns) => {
    if (!headers) return null;
    const norm = (s) => (s || "").toString().trim().toLowerCase();
    for (const h of headers) {
      const nh = norm(h);
      for (const p of patterns) if (nh.includes(p)) return h;
    }
    return null;
  };

  // ---------- Read Sheet ----------
  const readSheetWithHeaderDetect = (file, setData) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (!rows.length) return setData([]);

      // detect header row
      const headerRowIndex = (() => {
        const max = Math.min(6, rows.length);
        for (let i = 0; i < max; i++) {
          const joined = rows[i].join(" ").toLowerCase();
          if (joined.includes("description") || joined.includes("variety")) return i;
        }
        return 0;
      })();

      const headers = rows[headerRowIndex].map((h) => (h ?? "").toString());
      const json = XLSX.utils.sheet_to_json(sheet, { header: headers, range: headerRowIndex, defval: "" });
      setData(json);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readSheetWithHeaderDetect(file, type === "purchase" ? setPurchaseData : setUsageData);
  };

  // ---------- Auto-populate filter dropdowns ----------
  useEffect(() => {
    if (!usageData.length) return;

    const headers = Object.keys(usageData[0] || {});
    const varietyKey = findHeaderKey(headers, ["variety", "description"]);
    const packingKey = findHeaderKey(headers, ["packing size", "packing"]);

    const vset = new Set();
    const pset = new Set();

    usageData.forEach((row) => {
      if (row[varietyKey]) vset.add(row[varietyKey].toString().trim());
      if (row[packingKey]) pset.add(row[packingKey].toString().trim());
    });

    setVarietyOptions([...vset].sort());
    setSizeOptions([...pset].sort());
  }, [usageData]);

  // ---------- Calculate Leftovers (same logic as before) ----------
  const calculateLeftovers = () => {
    if (!purchaseData.length || !usageData.length) {
      alert("Please upload both sheets first!");
      return;
    }

    const purchaseHeaders = Object.keys(purchaseData[0]);
    const purchaseDescKey = findHeaderKey(purchaseHeaders, ["description", "descrption"]);
    const purchasePackKey = findHeaderKey(purchaseHeaders, ["packing size", "packing"]);
    const purchaseQtyKey = findHeaderKey(purchaseHeaders, ["quantity", "qty"]);

    const usageHeaders = Object.keys(usageData[0]);
    const usageVarKey = findHeaderKey(usageHeaders, ["variety", "description"]);
    const usagePackKey = findHeaderKey(usageHeaders, ["packing size", "packing"]);
    const usageUsedKey = findHeaderKey(usageHeaders, ["no of bags used", "bags used", "used"]);

    const makeKey = (v, p) => `${normalize(v)}___${normalize(p)}`;
    const purchaseMap = {};
    const usedMap = {};

    purchaseData.forEach((r) => {
      const k = makeKey(r[purchaseDescKey], r[purchasePackKey]);
      const qty = Number((r[purchaseQtyKey] || "").toString().replace(/[^\d.]/g, "")) || 0;
      if (!purchaseMap[k]) purchaseMap[k] = { variety: r[purchaseDescKey], pack: r[purchasePackKey], qty: 0 };
      purchaseMap[k].qty += qty;
    });

    usageData.forEach((r) => {
      const k = makeKey(r[usageVarKey], r[usagePackKey]);
      const used = Number((r[usageUsedKey] || "").toString().replace(/[^\d.]/g, "")) || 0;
      usedMap[k] = (usedMap[k] || 0) + used;
    });

    const allKeys = new Set([...Object.keys(purchaseMap), ...Object.keys(usedMap)]);
    const combined = [...allKeys].map((k) => {
      const [vn, pn] = k.split("___");
      const purchased = purchaseMap[k]?.qty || 0;
      const used = usedMap[k] || 0;
      return {
        key: k,
        variety: purchaseMap[k]?.variety || usageData.find((r) => normalize(r[usageVarKey]) === vn)?.[usageVarKey] || vn,
        packingSize: purchaseMap[k]?.pack || usageData.find((r) => normalize(r[usagePackKey]) === pn)?.[usagePackKey] || pn,
        purchased,
        used,
        leftover: purchased - used,
      };
    });

    combined.sort((a, b) => a.variety.localeCompare(b.variety));
    setResult(combined);
  };

  // ---------- Filtered view ----------
  const filteredResults = result.filter(
    (r) =>
      (!filters.variety || r.variety === filters.variety) &&
      (!filters.size || r.packingSize === filters.size)
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-heading font-semibold mb-6 text-primary flex items-center gap-2">
        📦 Leftover Bags Calculator
      </h2>

      <div className="bg-white rounded-2xl p-6 shadow-soft border border-cardBorder mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Upload Purchase Data (Sheet 1)</label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, "purchase")} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Upload Used Bags Data (Sheet 2)</label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, "usage")} className="border p-2 rounded w-full" />
          </div>
        </div>

        <button onClick={calculateLeftovers} className="mt-4 bg-primary text-white px-4 py-2 rounded">
          Calculate Leftovers
        </button>

        {result.length > 0 && (
          <div className="mt-4 flex gap-4">
            {/* Variety dropdown */}
            <select
              value={filters.variety}
              onChange={(e) => setFilters({ ...filters, variety: e.target.value })}
              className="border rounded-md px-3 py-2 w-1/3"
            >
              <option value="">Filter by Variety</option>
              {varietyOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {/* Packing size dropdown */}
            <select
              value={filters.size}
              onChange={(e) => setFilters({ ...filters, size: e.target.value })}
              className="border rounded-md px-3 py-2 w-1/3"
            >
              <option value="">Filter by Packing Size</option>
              {sizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredResults.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-soft border overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-stripe">
              <tr>
                <th className="px-3 py-2 text-left">Variety</th>
                <th className="px-3 py-2 text-left">Packing Size</th>
                <th className="px-3 py-2 text-right">Purchased</th>
                <th className="px-3 py-2 text-right">Used</th>
                <th className="px-3 py-2 text-right">Leftover</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, i) => (
                <tr key={r.key} className={i % 2 ? "bg-stripe" : "bg-white"}>
                  <td className="px-3 py-2">{r.variety}</td>
                  <td className="px-3 py-2">{r.packingSize}</td>
                  <td className="px-3 py-2 text-right">{r.purchased}</td>
                  <td className="px-3 py-2 text-right">{r.used}</td>
                  <td className="px-3 py-2 text-right font-semibold">{r.leftover}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-muted">No data yet — upload both sheets and click Calculate.</div>
      )}
    </div>
  );
}
