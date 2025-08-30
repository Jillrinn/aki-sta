import React from 'react';
import AvailabilityTable from './components/AvailabilityTable';
import ActionButtons from './components/ActionButtons';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-5">
      <ActionButtons />
      <AvailabilityTable />
    </div>
  );
}

export default App;
