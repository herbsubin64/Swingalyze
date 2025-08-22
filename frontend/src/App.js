import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SwingAnalysisPage from "./components/SwingAnalysisPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SwingAnalysisPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;