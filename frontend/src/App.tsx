import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Modal from 'react-modal';
import AvailabilityPage from './pages/availability/AvailabilityPage';
import TargetDatesPage from './pages/target-dates/TargetDatesPage';
import HowToUsePage from './pages/how-to-use/HowToUsePage';

function App() {
  useEffect(() => {
    // Set app element for react-modal (accessibility)
    Modal.setAppElement('#root');
  }, []);
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
        <Routes>
          <Route path="/" element={<AvailabilityPage />} />
          <Route path="/target-dates" element={<TargetDatesPage />} />
          <Route path="/how-to-use" element={<HowToUsePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
