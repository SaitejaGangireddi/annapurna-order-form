import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  WidthType,
} from "docx";

function OrderForm() {
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

  // ✅ Load saved data
  useEffect(() => {
    const saved = localStorage.getItem("annapurnaOrderForm");
    if (saved) setFormData(JSON.parse(saved));
  }, []);

  // ✅ Save data automatically
  useEffect(() => {
    localStorage.setItem("annapurnaOrderForm", JSON.stringify(formData));
  }, [formData]);

  // ✅ Handle input changes
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
          items: Array(7)
            .fill(null)
            .map(() => ({ variety: "", packing: "", quantity: "" })),
        }));
      setFormData({ ...formData, numberOfLoadings: value, loadings: newLoadings });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // ✅ Generate PDF
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

  // ✅ Generate Word document
  const generateWord = async () => {
    try {
      const logoResponse = await fetch(`${process.env.PUBLIC_URL}/logo.png`);
      const logoBuffer = await logoResponse.arrayBuffer();

      const companyInfoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Company Name")], shading: { fill: "DCE6F1" } }),
              new TableCell({ children: [new Paragraph(formData.companyName)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Address")], shading: { fill: "DCE6F1" } }),
              new TableCell({ children: [new Paragraph(formData.address)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("GST No")], shading: { fill: "DCE6F1" } }),
              new TableCell({ children: [new Paragraph(formData.gst)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("State")], shading: { fill: "DCE6F1" } }),
              new TableCell({ children: [new Paragraph(formData.state)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Date")], shading: { fill: "DCE6F1" } }),
              new TableCell({ children: [new Paragraph(formData.date)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("TWB Order No")], shading: { fill: "DCE6F1" } }),
              new TableCell({ children: [new Paragraph(formData.twbOrder)] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Number of Loadings")], shading: { fill: "DCE6F1" } }),
              new TableCell({ children: [new Paragraph(formData.numberOfLoadings)] }),
            ],
          }),
        ],
      });

      const children = [
        // Header with Logo
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 140, height: 70 },
            }),
          ],
        }),
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Annapurna Seeds ORDER FORM",
              bold: true,
              size: 32,
              color: "0B5394",
            }),
          ],
        }),
        companyInfoTable,
      ];

      // Loadings
      formData.loadings.forEach((load, i) => {
        children.push(
          new Paragraph({
            text: `\nLoading ${i + 1}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            alignment: AlignmentType.LEFT,
          })
        );
        children.push(new Paragraph({ text: `Party Name: ${load.partyName}`, bold: true }));
        children.push(new Paragraph({ text: `Delivery Address: ${load.deliveryAddress}`, bold: true }));
        children.push(new Paragraph({ text: `Consignee Phone Number: ${load.phone}`, bold: true }));

        // Table for items
        const itemRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "S.No", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Variety", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Packing", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Quantity", bold: true })] }),
            ],
          }),
          ...load.items.map(
            (item, idx) =>
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

        children.push(
          new Table({
            rows: itemRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      });

      // Footer notes
      children.push(new Paragraph(`\nOther Requirements/Note: ${formData.otherRequirements}`));
      children.push(new Paragraph(`Note: ${formData.note}`));
      children.push(new Paragraph(`Signature: ${formData.signature}`));

      const doc = new Document({
        creator: "Annapurna Seeds",
        title: "Order Form",
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Annapurna_Order_Form.docx");
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Failed to generate Word document. Please check the console.");
    }
  };

  return (
    <div className="min-h-screen bg-brandGray p-6 flex justify-center">
      <div
        ref={formRef}
        className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-8 border border-brandGreen"
      >
        {/* Header */}
        <div className="flex items-center mb-6 bg-brandLightGreen p-4 rounded-lg shadow-md">
          <img
            src={`${process.env.PUBLIC_URL}/logo.png`}
            alt="Annapurna Seeds"
            className="h-16 mr-4 rounded"
          />
          <h1 className="text-3xl font-bold text-brandGreen">
            Annapurna Seeds ORDER FORM
          </h1>
        </div>

        {/* Company Info */}
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
              onChange={handleChange}
              className="border border-brandGreen p-2 rounded focus:ring-2 focus:ring-brandGreen bg-brandGray/30"
            />
          ))}

          <select
            name="numberOfLoadings"
            value={formData.numberOfLoadings}
            onChange={handleChange}
            className="border border-brandGreen p-2 rounded focus:ring-2 focus:ring-brandGreen bg-brandGray/30"
          >
            <option value="">Select Number of Loadings</option>
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        {/* Loadings */}
        {formData.loadings.map((load, i) => (
          <div
            key={i}
            className="mt-6 p-4 border border-brandGreen bg-brandLightGreen/10 rounded-lg"
          >
            <h2 className="font-bold mb-2 text-brandGreen">
              Loading {i + 1}
            </h2>
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

            <h3 className="font-semibold mt-2 mb-1 text-brandGreen">
              Items
            </h3>
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

        {/* Notes */}
        <textarea
          placeholder="Any Other Requirements / Note"
          value={formData.otherRequirements}
          onChange={(e) =>
            setFormData({ ...formData, otherRequirements: e.target.value })
          }
          className="border border-brandGreen p-2 rounded w-full mt-4 bg-white focus:ring-2 focus:ring-brandGreen"
        ></textarea>

        <textarea
          placeholder="Note"
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          className="border border-brandGreen p-2 rounded w-full mt-4 bg-white focus:ring-2 focus:ring-brandGreen"
        ></textarea>

        <input
          type="text"
          placeholder="Signature"
          value={formData.signature}
          onChange={(e) =>
            setFormData({ ...formData, signature: e.target.value })
          }
          className="border border-brandGreen p-2 rounded w-full mt-4 bg-white focus:ring-2 focus:ring-brandGreen"
        />

        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mt-6">
          <button
            onClick={generateWord}
            className="bg-brandYellow hover:bg-yellow-400 text-brandText font-bold p-3 rounded w-full shadow-md"
          >
            Download as Word
          </button>
          <button
            onClick={generatePDF}
            className="bg-brandGreen hover:bg-green-700 text-white font-bold p-3 rounded w-full shadow-md"
          >
            Download as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderForm;
