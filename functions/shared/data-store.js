const DUMMY_DATA = {
  "2025-11-15": [
    {
      facilityName: "Ensemble Studio 本郷",
      timeSlots: { 
        "13-17": "available" 
      },
      lastUpdated: "2025-08-20T08:00:00Z"
    },
    {
      facilityName: "Ensemble Studio 初台", 
      timeSlots: { 
        "13-17": "booked" 
      },
      lastUpdated: "2025-08-20T08:30:00Z"
    }
  ]
};

module.exports = {
  getAvailabilityData: (date) => {
    return DUMMY_DATA[date] || [];
  }
};