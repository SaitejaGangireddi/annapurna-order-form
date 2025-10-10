import React, { useState } from "react";
import * as XLSX from "xlsx";

/**
 * PackingDataAnalyzer
 *
 * - Reads uploaded .xlsx
 * - Handles grouped rows (S.No row followed by continuation rows)
 * - Produces flattened rows with parent fields repeated for each item
 * - Auto-populates dropdowns for Packing (weight) and Description of Goods
 * - Filters by weight, description, or BOTH
 * - Shows total quantity for filtered rows
 */

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
  const cleaned = ("" + v).toString().replace(/[₹,]/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

export default function PackingDataAnalyzer() {
  const [rawRows, setRawRows] = useState([]); // raw sheet rows (arrays)
  const [flattened, setFlattened] = useState([]); // flattened items rows
  const [weights, setWeights] = useState([]); // unique packing values
  const [descriptions, setDescriptions] = useState([]); // unique descriptions
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

        // read as array of arrays (header:1 preserves empty cells)
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

        console.log("Normalized flattened rows:", flatRows);
      } catch (err) {
        console.error("Failed to parse file:", err);
        alert("Failed to read Excel file - check console for details.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Core normalization & grouping function
  const normalizeAndFlatten = (rows) => {
    // 1) find header row index (search first 6 rows)
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

    const headerRow = (rows[headerRowIndex] || []).map((h) =>
      (h ?? "").toString().trim()
    );

    // If no header found, try to take first row as header
    if (!headerRow || headerRow.length === 0) {
      headerRowIndex = 0;
    }

    // helper patterns for keys
    const headerLower = headerRow.map((h) => normalize(h));
    // Determine header keys (the original header text)
    const keySNo =
      findHeaderKey(headerRow, ["s.no", "sno", "s no", "s.no.", "sno."]) ||
      headerRow[0] ||
      "s.no";
    const keyDate =
      findHeaderKey(headerRow, ["date", "dt"]) || headerRow[1] || "date";
    const keyCompany =
      findHeaderKey(headerRow, ["company", "company name", "companyname"]) ||
      headerRow[2] ||
      "company";
    const keyRef =
      findHeaderKey(headerRow, ["reference", "ref", "ref no", "reference no"]) ||
      headerRow[3] ||
      "reference";
    const keyDesc =
      findHeaderKey(headerRow, [
        "description of goods",
        "description",
        "desc",
        "descrip",
        "descripton",
        "descr",
        "descripton of goods",
        "description goods",
      ]) || headerRow[4] || "description";
    const keyPacking =
      findHeaderKey(headerRow, ["packing size", "packing", "pack", "size", "weight", "kg"]) ||
      headerRow[5] ||
      "packing";
    const keyQty =
      findHeaderKey(headerRow, ["quantity", "qty", "qnty"]) || headerRow[6] || "quantity";
    const keyRate =
      findHeaderKey(headerRow, ["rate", "rate per unit", "rate/unit"]) || headerRow[7] || "rate";
    const keyAmount =
      findHeaderKey(headerRow, ["amount", "amt", "total"]) || headerRow[8] || "amount";

    // iterate rows after header
    const groups = [];
    let current = null;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const rowArr = rows[r];
      if (!rowArr || rowArr.length === 0) continue;

      // build mapping using headerRow length
      const rowObj = {};
      for (let c = 0; c < headerRow.length; c++) {
        const key = headerRow[c] || `col${c}`;
        const cell = rowArr[c] !== undefined ? rowArr[c] : "";
        rowObj[key] = (cell === null ? "" : cell).toString().trim();
      }

      const sNoVal = (rowObj[keySNo] ?? "").toString().trim();

      // Determine if this row starts a new group: sNo cell not empty
      const isNewGroup = sNoVal !== "";

      // Helper: extract item fields (only if any meaningful data present)
      const itemDesc = rowObj[keyDesc] ?? "";
      const itemPacking = rowObj[keyPacking] ?? "";
      const itemQtyRaw = rowObj[keyQty] ?? "";
      const itemQty = tryNumber(itemQtyRaw);
      const itemRate = tryNumber(rowObj[keyRate] ?? "");
      const itemAmount = tryNumber(rowObj[keyAmount] ?? "");

      const hasItemData =
        (itemDesc && itemDesc !== "") ||
        (itemPacking && itemPacking !== "") ||
        !Number.isNaN(itemQty) ||
        !Number.isNaN(itemRate) ||
        !Number.isNaN(itemAmount);

      if (isNewGroup) {
        // Start new group
        current = {
          sNo: sNoVal,
          date: rowObj[keyDate] ?? "",
          company: rowObj[keyCompany] ?? "",
          reference: rowObj[keyRef] ?? "",
          items: [],
        };

        // If first row also contains item columns, push that item
        if (hasItemData) {
          current.items.push({
            description: itemDesc,
            packing: itemPacking,
            quantity: Number.isNaN(itemQty) ? "" : itemQty,
            rate: Number.isNaN(itemRate) ? "" : itemRate,
            amount: Number.isNaN(itemAmount) ? "" : itemAmount,
          });
        }

        groups.push(current);
      } else {
        // continuation row -> belongs to current group (if any)
        if (!current) {
          // weird case: continuation row before any group; skip
          continue;
        }

        if (hasItemData) {
          current.items.push({
            description: itemDesc,
            packing: itemPacking,
            quantity: Number.isNaN(itemQty) ? "" : itemQty,
            rate: Number.isNaN(itemRate) ? "" : itemRate,
            amount: Number.isNaN(itemAmount) ? "" : itemAmount,
          });
        } else {
          // No item data: maybe it's a group total row (single cell amount). Skip.
          // We choose to skip such rows so they don't pollute item list.
        }
      }
    } // end for rows

    // Now flatten groups -> per-item rows with parent fields repeated
    const flatRows = [];
    for (const g of groups) {
      if (!g.items || g.items.length === 0) {
        // If group had no items, add an empty placeholder row
        flatRows.push({
          sNo: g.sNo,
          date: g.date,
          company: g.company,
          reference: g.reference,
          description: "",
          packing: "",
          quantity: "",
          rate: "",
          amount: "",
        });
      } else {
        for (const item of g.items) {
          flatRows.push({
            sNo: g.sNo,
            date: g.date,
            company: g.company,
            reference: g.reference,
            description: item.description || "",
            packing: item.packing || "",
            quantity: item.quantity === "" ? "" : Number(item.quantity),
            rate: item.rate === "" ? "" : Number(item.rate),
            amount: item.amount === "" ? "" : Number(item.amount),
          });
        }
      }
    }

    // Derive unique weights and descriptions from flattened rows
    const uniqWeights = Array.from(
      new Set(flatRows.map((r) => (r.packing ? String(r.packing).trim() : "")).filter(Boolean))
    ).sort();
    const uniqDesc = Array.from(
      new Set(flatRows.map((r) => (r.description ? String(r.description).trim() : "")).filter(Boolean))
    ).sort();

    return { flatRows, uniqueWeights: uniqWeights, uniqueDescriptions: uniqDesc };
  };

  // apply filters (weight and/or description); both combined if both set
  const applyFilter = () => {
    let result = [...flattened];
    if (filterWeight) {
      result = result.filter((r) =>
        (r.packing ?? "").toString().toLowerCase().includes(filterWeight.toLowerCase())
      );
    }
    if (filterDescription) {
      result = result.filter((r) =>
        (r.description ?? "").toString().toLowerCase().includes(filterDescription.toLowerCase())
      );
    }
    setFiltered(result);
  };

  // totals
  const totalQuantity = filtered.reduce((acc, r) => {
    const q = Number.isFinite(Number(r.quantity)) ? Number(r.quantity) : 0;
    return acc + q;
  }, 0);

  // update flattened whenever loaded (helper hook not used here, call applyFilter after handleFile)
  React.useEffect(() => {
    // When flattened changes (first load), show all by default
    setFiltered(flattened);
  }, [flattened]);

  return (
    <div className="min-h-screen bg-brandGray p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-brandGreen">
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
                {weights.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm">Filter by Description of Goods</label>
              <select className="border p-2 rounded w-full" value={filterDescription} onChange={(e) => setFilterDescription(e.target.value)}>
                <option value="">-- All descriptions --</option>
                {descriptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={applyFilter} className="bg-brandGreen text-white px-4 py-2 rounded">Apply Filter</button>
            <button
              onClick={() => {
                setFilterWeight("");
                setFilterDescription("");
                setFiltered(flattened);
              }}
              className="border px-4 py-2 rounded"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white p-4 rounded-lg shadow border border-brandGreen">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-brandGreen text-white">
                <tr>
                  <th className="px-3 py-2 text-left">S.No</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-left">Reference</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Packing</th>
                  <th className="px-3 py-2 text-right">Quantity</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-4 text-center text-gray-500">No rows to show</td></tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-brandLightGreen/20"}>
                      <td className="px-3 py-2">{r.sNo}</td>
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2">{r.company}</td>
                      <td className="px-3 py-2">{r.reference}</td>
                      <td className="px-3 py-2">{r.description}</td>
                      <td className="px-3 py-2">{r.packing}</td>
                      <td className="px-3 py-2 text-right">{r.quantity !== "" ? r.quantity : ""}</td>
                      <td className="px-3 py-2 text-right">{r.rate !== "" ? r.rate : ""}</td>
                      <td className="px-3 py-2 text-right">{r.amount !== "" ? Number(r.amount).toLocaleString() : ""}</td>
                    </tr>
                  ))
                )}
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
          </div>
        </div>
      </div>
    </div>
  );
}
