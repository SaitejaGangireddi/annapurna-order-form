import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import OrderForm from "./OrderForm";
import PackingDataAnalyzer from "./PackingDataAnalyzer";
import LeftoverBags from "./LeftoverBags"; // 👈 new file we'll add

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45 }}
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<OrderForm />} />
          <Route path="/analyzer" element={<PackingDataAnalyzer />} />
          <Route path="/leftover" element={<LeftoverBags />} /> {/* 👈 new route */}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router basename="/annapurna-order-form">
      <div className="min-h-screen">
        <nav className="bg-headerDark text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <img
                  src={`${process.env.PUBLIC_URL}/logo.png`}
                  alt="Annapurna"
                  className="h-9 w-auto rounded-md shadow-sm"
                />
                <span className="text-lg font-heading font-semibold">
                  Annapurna Seeds
                </span>
              </div>
              <div className="flex items-center space-x-6">
                <Link
                  to="/"
                  className="flex items-center gap-2 text-sm hover:text-accent transition"
                >
                  <span>📝</span> <span>Order Form</span>
                </Link>
                <Link
                  to="/analyzer"
                  className="flex items-center gap-2 text-sm hover:text-accent transition"
                >
                  <span>📊</span> <span>Data Analyzer</span>
                </Link>
                <Link
                  to="/leftover"
                  className="flex items-center gap-2 text-sm hover:text-accent transition"
                >
                  <span>📦</span> <span>Leftover Bags</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <AnimatedRoutes />
          </div>
        </main>
      </div>
    </Router>
  );
}
