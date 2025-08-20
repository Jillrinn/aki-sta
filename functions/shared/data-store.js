const DUMMY_DATA = {
  "2025-11-15": [
    {
      facilityName: "Ensemble Studio 本郷",
      timeSlots: { 
        "13-17": "available" 
      }
    },
    {
      facilityName: "Ensemble Studio 初台", 
      timeSlots: { 
        "13-17": "booked" 
      }
    }
  ]
};

module.exports = {
  getAvailabilityData: (date) => {
    return DUMMY_DATA[date] || [];
  }
};