import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VideoUploadPage from "./components/VideoUploadPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VideoUploadPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;