import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, ImageRun, WidthType,
} from "docx";
import { motion } from "framer-motion";

export default function OrderForm() {
  const [formData, setFormData] = useState({
    companyName: "Tiyasa Agro PVT.LTD",
    address: "Amodpur, West Bengal 721126",
    gst: "19AAJCT6448D1Z1",
    state: "West Bengal",
    date: new Date().toISOString().split("T")[0],
    twbOrder: "",
    numberOfLoadings: "",
    loadings: [],
    note: "",
    signature: "",
    otherRequirements: "",
  });

  const formRef = useRef();

  useEffect(() => {
    const saved = localStorage.getItem("annapurnaOrderForm");
    if (saved) setFormData(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("annapurnaOrderForm", JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e, loadingIndex = null, itemIndex = null, field = null) => {
    const { name, value } = e.target;
    if (loadingIndex !== null && itemIndex !== null && field) {
      const newData = { ...formData };
      newData.loadings[loadingIndex].items[itemIndex] = {
        ...newData.loadings[loadingIndex].items[itemIndex],
        [field]: value,
      };
      setFormData(newData);
    } else if (loadingIndex !== null) {
      const newData = { ...formData };
      newData.loadings[loadingIndex][name] = value;
      setFormData(newData);
    } else if (name === "numberOfLoadings") {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        setFormData({ ...formData, numberOfLoadings: "", loadings: [] });
        return;
      }
      const newLoadings = Array(num)
        .fill(null)
        .map(() => ({
          partyName: "",
          deliveryAddress: "",
          phone: "",
          items: Array(7).fill(null).map(() => ({ variety: "", packing: "", quantity: "" })),
        }));
      setFormData({ ...formData, numberOfLoadings: value, loadings: newLoadings });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const generatePDF = async () => {
    const input = formRef.current;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("Annapurna_Order_Form.pdf");
  };

  const generateWord = async () => {
    try {
      // fetch logo from public and convert to arrayBuffer
      const logoResponse = await fetch(`${process.env.PUBLIC_URL}/logo.png`);
      if (!logoResponse.ok) throw new Error("Logo not found in public folder");
      const logoBuffer = await logoResponse.arrayBuffer();

      const companyInfoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [ new TableCell({ children: [new Paragraph("Company Name")], shading: { fill: "E6F8EF" } }), new TableCell({ children: [new Paragraph(formData.companyName)] }) ] }),
          new TableRow({ children: [ new TableCell({ children: [new Paragraph("Address")], shading: { fill: "E6F8EF" } }), new TableCell({ children: [new Paragraph(formData.address)] }) ] }),
          new TableRow({ children: [ new TableCell({ children: [new Paragraph("GST No")], shading: { fill: "E6F8EF" } }), new TableCell({ children: [new Paragraph(formData.gst)] }) ] }),
          new TableRow({ children: [ new TableCell({ children: [new Paragraph("State")], shading: { fill: "E6F8EF" } }), new TableCell({ children: [new Paragraph(formData.state)] }) ] }),
          new TableRow({ children: [ new TableCell({ children: [new Paragraph("Date")], shading: { fill: "E6F8EF" } }), new TableCell({ children: [new Paragraph(formData.date)] }) ] }),
          new TableRow({ children: [ new TableCell({ children: [new Paragraph("TWB Order No")], shading: { fill: "E6F8EF" } }), new TableCell({ children: [new Paragraph(formData.twbOrder)] }) ] }),
          new TableRow({ children: [ new TableCell({ children: [new Paragraph("Number of Loadings")], shading: { fill: "E6F8EF" } }), new TableCell({ children: [new Paragraph(formData.numberOfLoadings)] }) ] }),
        ],
      });

      const children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [ new ImageRun({ data: logoBuffer, transformation: { width: 140, height: 70 } }) ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [ new TextRun({ text: "Annapurna Seeds ORDER FORM", bold: true, size: 32, color: "2F855A" }) ],
        }),
        companyInfoTable,
      ];

      formData.loadings.forEach((load, i) => {
        children.push(new Paragraph({ text: `\nLoading ${i + 1}`, heading: HeadingLevel.HEADING_2 }));
        children.push(new Paragraph({ text: `Party Name: ${load.partyName}`, bold: true }));
        children.push(new Paragraph({ text: `Delivery Address: ${load.deliveryAddress}`, bold: true }));
        children.push(new Paragraph({ text: `Consignee Phone Number: ${load.phone}`, bold: true }));

        const itemRows = [
          new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: "S.No", bold: true })] }), new TableCell({ children: [new Paragraph({ text: "Variety", bold: true })] }), new TableCell({ children: [new Paragraph({ text: "Packing", bold: true })] }), new TableCell({ children: [new Paragraph({ text: "Quantity", bold: true })] }) ] }),
          ...load.items.map((item, idx) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(idx + 1))] }),
              new TableCell({ children: [new Paragraph(item.variety || "")] }),
              new TableCell({ children: [new Paragraph(item.packing || "")] }),
              new TableCell({ children: [new Paragraph(item.quantity || "")] }),
            ],
          })),
        ];

        children.push(new Table({ rows: itemRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      });

      children.push(new Paragraph(`\nOther Requirements/Note: ${formData.otherRequirements}`));
      children.push(new Paragraph(`Note: ${formData.note}`));
      children.push(new Paragraph(`Signature: ${formData.signature}`));

      const doc = new Document({ creator: "Annapurna Seeds", title: "Order Form", sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Annapurna_Order_Form.docx");
    } catch (err) {
      console.error("Word generation error:", err);
      alert("Failed to generate Word document. Check console for details.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
      <div className="max-w-4xl mx-auto">
        <motion.div className="bg-white rounded-2xl shadow-soft p-8 border border-cardBorder animate-floatIn"
          initial={{ scale: 0.995, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45 }}>
          {/* header */}
          <div className="flex items-center gap-4 mb-6">
            <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="logo" className="h-14 w-auto rounded" />
            <div>
              <h2 className="text-2xl font-heading font-semibold text-textDark">Annapurna Seeds</h2>
              <p className="text-sm text-muted">Order Form</p>
            </div>
          </div>

          {/* company grid */}
          <div ref={formRef}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "companyName", placeholder: "Company Name", type: "text" },
                { name: "address", placeholder: "Address", type: "text" },
                { name: "gst", placeholder: "GST No", type: "text" },
                { name: "state", placeholder: "State", type: "text" },
                { name: "date", placeholder: "Date", type: "date" },
                { name: "twbOrder", placeholder: "TWB Order No", type: "text" },
              ].map((f) => (
                <input key={f.name}
                  name={f.name}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={formData[f.name]}
                  onChange={handleChange}
                  className="border p-2 rounded-lg bg-gray-50 border-cardBorder focus:ring-2 focus:ring-accent"
                />
              ))}

              <select name="numberOfLoadings" value={formData.numberOfLoadings} onChange={handleChange}
                className="border p-2 rounded-lg bg-gray-50 border-cardBorder focus:ring-2 focus:ring-accent">
                <option value="">Select Number of Loadings</option>
                {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>

            {/* loadings */}
            {formData.loadings.map((load, li) => (
              <motion.div key={li} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: li * 0.07 }} className="mt-6 p-4 bg-stripe border border-cardBorder rounded-lg">
                <h3 className="text-lg font-semibold text-primary mb-3">Loading {li + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input name="partyName" placeholder="Party Name" value={load.partyName} onChange={(e) => handleChange(e, li)} className="border p-2 rounded" />
                  <input name="deliveryAddress" placeholder="Delivery Address" value={load.deliveryAddress} onChange={(e) => handleChange(e, li)} className="border p-2 rounded" />
                  <input name="phone" placeholder="Consignee Phone Number" value={load.phone} onChange={(e) => handleChange(e, li)} className="border p-2 rounded" />
                </div>

                <div className="space-y-2">
                  {load.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2">
                      <input placeholder="Variety" value={item.variety} onChange={(e) => handleChange(e, li, idx, "variety")} className="border p-2 rounded" />
                      <input placeholder="Packing" value={item.packing} onChange={(e) => handleChange(e, li, idx, "packing")} className="border p-2 rounded" />
                      <input placeholder="Quantity" type="number" value={item.quantity} onChange={(e) => handleChange(e, li, idx, "quantity")} className="border p-2 rounded" />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            <textarea name="otherRequirements" placeholder="Other Requirements / Note" value={formData.otherRequirements} onChange={handleChange} className="mt-4 w-full border p-2 rounded" />

            <div className="mt-6 flex gap-3">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={generatePDF} className="bg-primary text-white px-5 py-2 rounded shadow">Download PDF</motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={generateWord} className="bg-earth text-white px-5 py-2 rounded shadow">Download Word</motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
