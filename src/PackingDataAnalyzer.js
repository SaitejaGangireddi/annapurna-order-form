import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

const normalize = (s) =>
  (s ?? "")
    .toString()
    .trim()
    .replace(/\r?\n|\t/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

const findHeaderKey = (headers, patterns) => {
  if (!headers || !headers.length) return null;
  for (const h of headers) {
    const nh = normalize(h);
    for (const p of patterns) {
      if (nh.includes(p)) return h;
    }
  }
  return null;
};

const tryNumber = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  if (typeof v === "number") return v;
  const cleaned = ("" + v).replace(/[₹,]/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

export default function PackingDataAnalyzer() {
  const [rawRows, setRawRows] = useState([]);
  const [flattened, setFlattened] = useState([]);
  const [weights, setWeights] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const [filterWeight, setFilterWeight] = useState("");
  const [filterDescription, setFilterDescription] = useState("");
  const [filtered, setFiltered] = useState([]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const bstr = ev.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (!rows || rows.length === 0) {
          alert("No data found in the sheet.");
          return;
        }

        setRawRows(rows);
        const { flatRows, uniqueWeights, uniqueDescriptions } = normalizeAndFlatten(rows);
        setFlattened(flatRows);
        setWeights(uniqueWeights);
        setDescriptions(uniqueDescriptions);
        setFiltered(flatRows);
      } catch (err) {
        console.error("Failed to parse file:", err);
        alert("Failed to read Excel file - check console for details.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const normalizeAndFlatten = (rows) => {
    let headerRowIndex = 0;
    const maxSearch = Math.min(6, rows.length);
    for (let i = 0; i < maxSearch; i++) {
      const row = rows[i] || [];
      const joined = (row || []).join(" ").toLowerCase();
      if (
        joined.includes("company") ||
        joined.includes("description") ||
        joined.includes("s.no") ||
        joined.includes("reference") ||
        joined.includes("packing")
      ) {
        headerRowIndex = i;
        break;
      }
    }

    const headerRow = (rows[headerRowIndex] || []).map((h) => (h ?? "").toString().trim());

    const keySNo =
      findHeaderKey(headerRow, ["s.no", "sno", "s no"]) || headerRow[0] || "s.no";
    const keyDate = findHeaderKey(headerRow, ["date", "dt"]) || headerRow[1] || "date";
    const keyCompany = findHeaderKey(headerRow, ["company", "company name"]) || headerRow[2] || "company";
    const keyRef = findHeaderKey(headerRow, ["reference", "ref"]) || headerRow[3] || "reference";
    const keyDesc = findHeaderKey(headerRow, ["description of goods", "description"]) || headerRow[4] || "description";
    const keyPacking = findHeaderKey(headerRow, ["packing", "weight", "kg"]) || headerRow[5] || "packing";
    const keyQty = findHeaderKey(headerRow, ["quantity", "qty"]) || headerRow[6] || "quantity";
    const keyRate = findHeaderKey(headerRow, ["rate"]) || headerRow[7] || "rate";
    const keyAmount = findHeaderKey(headerRow, ["amount", "total"]) || headerRow[8] || "amount";

    const groups = [];
    let current = null;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const rowArr = rows[r];
      if (!rowArr || rowArr.length === 0) continue;

      const rowObj = {};
      for (let c = 0; c < headerRow.length; c++) {
        const key = headerRow[c] || `col${c}`;
        rowObj[key] = (rowArr[c] ?? "").toString().trim();
      }

      const sNoVal = rowObj[keySNo] ?? "";
      const isNewGroup = sNoVal !== "";
      const itemDesc = rowObj[keyDesc] ?? "";
      const itemPacking = rowObj[keyPacking] ?? "";
      const itemQtyRaw = rowObj[keyQty] ?? "";
      const itemQty = tryNumber(itemQtyRaw);
      const itemRate = tryNumber(rowObj[keyRate] ?? "");
      const itemAmount = tryNumber(rowObj[keyAmount] ?? "");
      const hasItemData = itemDesc || itemPacking || !Number.isNaN(itemQty) || !Number.isNaN(itemRate) || !Number.isNaN(itemAmount);

      if (isNewGroup) {
        current = { sNo: sNoVal, date: rowObj[keyDate] ?? "", company: rowObj[keyCompany] ?? "", reference: rowObj[keyRef] ?? "", items: [] };
        if (hasItemData) current.items.push({ description: itemDesc, packing: itemPacking, quantity: Number.isNaN(itemQty) ? "" : itemQty, rate: Number.isNaN(itemRate) ? "" : itemRate, amount: Number.isNaN(itemAmount) ? "" : itemAmount });
        groups.push(current);
      } else if (current && hasItemData) {
        current.items.push({ description: itemDesc, packing: itemPacking, quantity: Number.isNaN(itemQty) ? "" : itemQty, rate: Number.isNaN(itemRate) ? "" : itemRate, amount: Number.isNaN(itemAmount) ? "" : itemAmount });
      }
    }

    const flatRows = [];
    for (const g of groups) {
      if (!g.items.length) flatRows.push({ sNo: g.sNo, date: g.date, company: g.company, reference: g.reference, description: "", packing: "", quantity: "", rate: "", amount: "" });
      else g.items.forEach(item => flatRows.push({ sNo: g.sNo, date: g.date, company: g.company, reference: g.reference, description: item.description, packing: item.packing, quantity: item.quantity, rate: item.rate, amount: item.amount }));
    }

    const uniqWeights = Array.from(new Set(flatRows.map(r => r.packing).filter(Boolean))).sort();
    const uniqDesc = Array.from(new Set(flatRows.map(r => r.description).filter(Boolean))).sort();

    return { flatRows, uniqueWeights: uniqWeights, uniqueDescriptions: uniqDesc };
  };

  const applyFilter = () => {
    let result = [...flattened];
    if (filterWeight) result = result.filter(r => (r.packing ?? "").toLowerCase().includes(filterWeight.toLowerCase()));
    if (filterDescription) result = result.filter(r => (r.description ?? "").toLowerCase().includes(filterDescription.toLowerCase()));
    setFiltered(result);
  };

  const totalQuantity = filtered.reduce((acc, r) => acc + (Number.isFinite(Number(r.quantity)) ? Number(r.quantity) : 0), 0);

  useEffect(() => { setFiltered(flattened); }, [flattened]);

  return (
    <div className="min-h-screen bg-brandGray p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div className="bg-white p-6 rounded-lg shadow mb-6 border border-brandGreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <h2 className="text-2xl font-semibold text-brandGreen mb-4">Packing Data Analyzer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm">Upload .xlsx</label>
              <input type="file" accept=".xlsx, .xls" onChange={handleFile} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block mb-1 text-sm">Filter by Weight (Packing)</label>
              <select className="border p-2 rounded w-full" value={filterWeight} onChange={(e) => setFilterWeight(e.target.value)}>
                <option value="">-- All weights --</option>
                {weights.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm">Filter by Description of Goods</label>
              <select className="border p-2 rounded w-full" value={filterDescription} onChange={(e) => setFilterDescription(e.target.value)}>
                <option value="">-- All descriptions --</option>
                {descriptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <motion.button onClick={applyFilter} whileHover={{ scale: 1.05 }} className="bg-brandGreen text-white px-4 py-2 rounded">Apply Filter</motion.button>
            <motion.button onClick={() => { setFilterWeight(""); setFilterDescription(""); setFiltered(flattened); }} whileHover={{ scale: 1.05 }} className="border px-4 py-2 rounded">Reset</motion.button>
          </div>
        </motion.div>

        <motion.div className="bg-white p-4 rounded-lg shadow border border-brandGreen overflow-x-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <table className="min-w-full divide-y">
            <thead className="bg-brandGreen text-white">
              <tr>
                {["S.No","Date","Company","Reference","Description","Packing","Quantity","Rate","Amount"].map((h,i)=><th key={i} className="px-3 py-2 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={9} className="p-4 text-center text-gray-500">No rows to show</td></tr> :
                filtered.map((r,i) => (
                  <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }} className={i%2===0?"bg-white":"bg-brandLightGreen/20"}>
                    <td className="px-3 py-2">{r.sNo}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.company}</td>
                    <td className="px-3 py-2">{r.reference}</td>
                    <td className="px-3 py-2">{r.description}</td>
                    <td className="px-3 py-2">{r.packing}</td>
                    <td className="px-3 py-2 text-right">{r.quantity !== "" ? r.quantity : ""}</td>
                    <td className="px-3 py-2 text-right">{r.rate !== "" ? r.rate : ""}</td>
                    <td className="px-3 py-2 text-right">{r.amount !== "" ? Number(r.amount).toLocaleString() : ""}</td>
                  </motion.tr>
                ))
              }
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-brandGray font-semibold">
                  <td colSpan={6} className="px-3 py-2 text-right">Total Quantity:</td>
                  <td className="px-3 py-2 text-right">{totalQuantity}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </motion.div>
      </div>
    </div>
  );
}
