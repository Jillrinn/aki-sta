import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AvailabilityTable from './components/AvailabilityTable';
import TargetDatesList from './components/TargetDatesList';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
        <Routes>
          <Route path="/" element={<AvailabilityTable />} />
          <Route path="/target-dates" element={<TargetDatesList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
