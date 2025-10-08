// src/App.js
import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  ImageRun,
} from "docx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const defaultItem = () => ({ variety: "", packing: "", quantity: "" });
const defaultLoading = () => ({
  partyName: "",
  deliveryAddress: "",
  phone: "",
  items: Array.from({ length: 7 }, () => defaultItem()),
});

function App() {
  const formRef = useRef();

  const [formData, setFormData] = useState({
    companyName: "Tiyasa Agro PVT.LTD",
    address: "Amodpur, West Bengal 721126",
    gst: "19AAJCT6448D1Z1",
    state: "West Bengal",
    date: new Date().toISOString().split("T")[0],
    twbOrder: "",
    numberOfLoadings: "", // keep as string for select control
    loadings: [],
    note: "",
    signature: "",
    otherRequirements: "",
  });

  // Load saved data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("annapurnaOrderForm");
      if (saved) {
        const parsed = JSON.parse(saved);

        // ensure items arrays are correct shape (defensive)
        if (Array.isArray(parsed.loadings)) {
          parsed.loadings = parsed.loadings.map((l) => ({
            partyName: l.partyName ?? "",
            deliveryAddress: l.deliveryAddress ?? "",
            phone: l.phone ?? "",
            items:
              Array.isArray(l.items) && l.items.length > 0
                ? l.items.map((it) => ({
                    variety: it.variety ?? "",
                    packing: it.packing ?? "",
                    quantity: it.quantity ?? "",
                  }))
                : Array.from({ length: 7 }, () => defaultItem()),
          }));
        } else {
          parsed.loadings = [];
        }

        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.warn("Failed to restore saved form:", err);
    }
  }, []);

  // Auto-save progress
  useEffect(() => {
    try {
      localStorage.setItem("annapurnaOrderForm", JSON.stringify(formData));
    } catch (err) {
      console.warn("Failed to save form:", err);
    }
  }, [formData]);

  // Deep-updating handler (safe, no direct mutation)
  const handleChange = (e, loadingIndex = null, itemIndex = null, field = null) => {
    const { name, value } = e.target;

    // update item field (variety/packing/quantity)
    if (loadingIndex !== null && itemIndex !== null && field) {
      setFormData((prev) => {
        const newLoadings = prev.loadings.map((l, li) => {
          if (li !== loadingIndex) return l;
          const newItems = l.items.map((it, ii) => (ii === itemIndex ? { ...it, [field]: value } : it));
          return { ...l, items: newItems };
        });
        return { ...prev, loadings: newLoadings };
      });
      return;
    }

    // update a loading-level field (partyName, deliveryAddress, phone)
    if (loadingIndex !== null) {
      setFormData((prev) => {
        const newLoadings = prev.loadings.map((l, li) => (li === loadingIndex ? { ...l, [name]: value } : l));
        return { ...prev, loadings: newLoadings };
      });
      return;
    }

    // handle numberOfLoadings select
    if (name === "numberOfLoadings") {
      const num = parseInt(value, 10);
      if (!num || num < 1) {
        // clear
        setFormData((prev) => ({ ...prev, numberOfLoadings: "", loadings: [] }));
        return;
      }

      setFormData((prev) => {
        // preserve existing loadings where possible
        const newLoadings = Array.from({ length: num }, (_, idx) => {
          return prev.loadings[idx] ? prev.loadings[idx] : defaultLoading();
        });
        return { ...prev, numberOfLoadings: String(num), loadings: newLoadings };
      });
      return;
    }

    // top-level fields
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Generate Word document with logo and item tables
  const generateWord = async () => {
    try {
      // load logo from public
      let logoBuffer = null;
      try {
        const logoResponse = await fetch(`${process.env.PUBLIC_URL}/logo.png`);
        logoBuffer = await logoResponse.arrayBuffer();
      } catch (err) {
        console.warn("Logo fetch failed — proceeding without logo:", err);
      }

      const children = [];

      // optional logo
      if (logoBuffer) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: { width: 120, height: 60 },
              }),
            ],
          })
        );
      }

      children.push(
        new Paragraph({
          text: "Annapurna Seeds ORDER FORM",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );

      // Company block
      children.push(new Paragraph({ children: [new TextRun(`Company Name: ${formData.companyName}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`Address: ${formData.address}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`GST No: ${formData.gst}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`State: ${formData.state}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`Date: ${formData.date}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`TWB Order No: ${formData.twbOrder}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`Number of Loadings: ${formData.numberOfLoadings}`)] }));

      // Per-loading sections with tables
      formData.loadings.forEach((load, i) => {
        children.push(
          new Paragraph({
            text: `\nDrop ${i + 1}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );

        children.push(new Paragraph({ children: [new TextRun(`Party Name: ${load.partyName}`)] }));
        children.push(new Paragraph({ children: [new TextRun(`Delivery Address: ${load.deliveryAddress}`)] }));
        children.push(new Paragraph({ children: [new TextRun(`Consignee Phone Number: ${load.phone}`)] }));

        const itemRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "S.No", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Variety", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Packing", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Quantity", bold: true })] })] }),
            ],
          }),
          ...load.items.map((item, idx) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(String(idx + 1))] }),
                new TableCell({ children: [new Paragraph(item.variety || "")] }),
                new TableCell({ children: [new Paragraph(item.packing || "")] }),
                new TableCell({ children: [new Paragraph(item.quantity || "")] }),
              ],
            })
          ),
        ];

        children.push(new Table({ rows: itemRows, width: { size: 100, type: "pct" } }));
      });

      // Footer info
      children.push(new Paragraph({ children: [new TextRun(`\nOther Requirements/Note: ${formData.otherRequirements}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`Note: ${formData.note}`)] }));
      children.push(new Paragraph({ children: [new TextRun(`Signature: ${formData.signature}`)] }));

      const doc = new Document({
        creator: "Annapurna Seeds",
        title: "Order Form",
        description: "Generated Order Form Document",
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Annapurna_Order_Form.docx");
    } catch (error) {
      console.error("Error generating Word doc:", error);
      alert("Failed to generate Word document. Check console.");
    }
  };

  // Generate PDF by rendering the formRef element (single/multi page capture)
  const generatePDF = async () => {
    try {
      if (!formRef.current) throw new Error("Form not available");

      // html2canvas the element
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content longer than one page, split into pages:
      if (pdfHeight <= pdf.internal.pageSize.getHeight()) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      } else {
        // multi-page handling
        let remainingHeight = canvas.height;
        const pageHeightPx = Math.floor((canvas.width * pdf.internal.pageSize.getHeight()) / pdfWidth);
        let offsetY = 0;
        while (remainingHeight > 0) {
          const canvasPage = document.createElement("canvas");
          canvasPage.width = canvas.width;
          canvasPage.height = Math.min(pageHeightPx, remainingHeight);
          const ctx = canvasPage.getContext("2d");
          ctx.drawImage(canvas, 0, offsetY, canvas.width, canvasPage.height, 0, 0, canvas.width, canvasPage.height);
          const pageData = canvasPage.toDataURL("image/png");
          const pagePdfHeight = (canvasPage.height * pdfWidth) / canvas.width;
          if (offsetY > 0) pdf.addPage();
          pdf.addImage(pageData, "PNG", 0, 0, pdfWidth, pagePdfHeight);
          remainingHeight -= canvasPage.height;
          offsetY += canvasPage.height;
        }
      }

      pdf.save("Annapurna_Order_Form.pdf");
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF generation failed. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-brandGray p-6 flex justify-center">
      <div ref={formRef} className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-8 border border-brandGreen">
        {/* Header */}
        <div className="flex items-center mb-6 bg-brandLightGreen p-4 rounded-lg shadow-md">
          <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Annapurna Seeds" className="h-16 mr-4 rounded" onError={(e)=> (e.target.style.display='none')} />
          <h1 className="text-3xl font-bold text-brandGreen">Annapurna Seeds ORDER FORM</h1>
        </div>

        {/* Company info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Company Name", name: "companyName", type: "text" },
            { label: "Address", name: "address", type: "text" },
            { label: "GST No", name: "gst", type: "text" },
            { label: "State", name: "state", type: "text" },
            { label: "Date", name: "date", type: "date" },
            { label: "TWB Order No", name: "twbOrder", type: "text" },
          ].map((field, i) => (
            <input
              key={i}
              type={field.type}
              name={field.name}
              placeholder={field.label}
              value={formData[field.name]}
              onChange={(e) => handleChange(e)}
              className="border border-brandGreen p-2 rounded focus:ring-2 focus:ring-brandGreen bg-brandGray/30"
            />
          ))}

          {/* Number of Loadings */}
          <select
            name="numberOfLoadings"
            value={formData.numberOfLoadings}
            onChange={handleChange}
            className="border border-brandGreen p-2 rounded focus:ring-2 focus:ring-brandGreen bg-brandGray/30"
          >
            <option value="">Select Number of Loadings</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        {/* Drops (only after selection) */}
        {formData.numberOfLoadings &&
          formData.loadings.map((load, i) => (
            <div key={i} className="mt-6 p-4 border border-brandGreen bg-brandLightGreen/10 rounded-lg">
              <h2 className="font-bold mb-2 text-brandGreen">Drop {i + 1}</h2>

              <input
                type="text"
                name="partyName"
                placeholder="Party Name"
                value={load.partyName}
                onChange={(e) => handleChange(e, i)}
                className="border border-brandGreen p-2 rounded mb-2 w-full bg-white focus:ring-2 focus:ring-brandGreen"
              />
              <input
                type="text"
                name="deliveryAddress"
                placeholder="Delivery Address"
                value={load.deliveryAddress}
                onChange={(e) => handleChange(e, i)}
                className="border border-brandGreen p-2 rounded mb-2 w-full bg-white focus:ring-2 focus:ring-brandGreen"
              />
              <input
                type="text"
                name="phone"
                placeholder="Consignee Phone Number"
                value={load.phone}
                onChange={(e) => handleChange(e, i)}
                className="border border-brandGreen p-2 rounded mb-2 w-full bg-white focus:ring-2 focus:ring-brandGreen"
              />

              <h3 className="font-semibold mt-2 mb-1 text-brandGreen">Items</h3>
              {load.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Variety"
                    value={item.variety}
                    onChange={(e) => handleChange(e, i, idx, "variety")}
                    className="border border-brandGreen p-2 rounded bg-white focus:ring-2 focus:ring-brandGreen"
                  />
                  <input
                    type="text"
                    placeholder="Packing Size"
                    value={item.packing}
                    onChange={(e) => handleChange(e, i, idx, "packing")}
                    className="border border-brandGreen p-2 rounded bg-white focus:ring-2 focus:ring-brandGreen"
                  />
                  <input
                    type="text"
                    placeholder="Required Quantity"
                    value={item.quantity}
                    onChange={(e) => handleChange(e, i, idx, "quantity")}
                    className="border border-brandGreen p-2 rounded bg-white focus:ring-2 focus:ring-brandGreen"
                  />
                </div>
              ))}
            </div>
          ))}

        {/* Notes and Signature */}
        <textarea
          placeholder="Any Other Requirements / Note"
          value={formData.otherRequirements}
          onChange={(e) => setFormData((prev) => ({ ...prev, otherRequirements: e.target.value }))}
          className="border border-brandGreen p-2 rounded w-full mt-4 bg-white focus:ring-2 focus:ring-brandGreen"
        />

        <textarea
          placeholder="Note"
          value={formData.note}
          onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
          className="border border-brandGreen p-2 rounded w-full mt-4 bg-white focus:ring-2 focus:ring-brandGreen"
        />

        <input
          type="text"
          placeholder="Signature"
          value={formData.signature}
          onChange={(e) => setFormData((prev) => ({ ...prev, signature: e.target.value }))}
          className="border border-brandGreen p-2 rounded w-full mt-4 bg-white focus:ring-2 focus:ring-brandGreen"
        />

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button onClick={generatePDF} className="bg-green-700 hover:bg-green-800 text-white font-bold p-3 rounded shadow-md">
            Download as PDF
          </button>
          <button onClick={generateWord} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold p-3 rounded shadow-md">
            Download as Word
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
