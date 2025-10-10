import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import OrderForm from "./OrderForm";
import PackingDataAnalyzer from "./PackingDataAnalyzer";

function App() {
  return (
    <Router basename="/annapurna-order-form">
      <div className="min-h-screen bg-brandGray font-body text-brandText">
        {/* Navbar */}
        <nav className="bg-brandGreen text-white p-4 shadow-md flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt="Logo"
              className="h-10 w-auto rounded"
            />
            <h1 className="font-bold text-xl tracking-wide">Annapurna Seeds</h1>
          </div>
          <div className="space-x-6 font-semibold">
            <Link to="/" className="hover:text-brandYellow transition">
              📝 Order Form
            </Link>
            <Link to="/analyzer" className="hover:text-brandYellow transition">
              📊 Data Analyzer
            </Link>
          </div>
        </nav>

        {/* Routes */}
        <div className="p-6">
          <Routes>
            <Route path="/" element={<OrderForm />} />
            <Route path="/analyzer" element={<PackingDataAnalyzer />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
