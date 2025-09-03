import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Modal from 'react-modal';
import AvailabilityTable from './components/AvailabilityTable';
import TargetDatesList from './components/TargetDatesList';
import HowToUsePage from './pages/HowToUsePage';

function App() {
  useEffect(() => {
    // Set app element for react-modal (accessibility)
    Modal.setAppElement('#root');
  }, []);
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
        <Routes>
          <Route path="/" element={<AvailabilityTable />} />
          <Route path="/target-dates" element={<TargetDatesList />} />
          <Route path="/how-to-use" element={<HowToUsePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
