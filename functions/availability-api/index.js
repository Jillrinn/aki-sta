module.exports = async function (context, req) {
  const date = context.bindingData.date;
  
  if (!date) {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Date parameter is required"
      }
    };
    return;
  }

  const dataStore = require('../shared/data-store');
  const data = dataStore.getAvailabilityData(date);
  
  context.res = {
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: {
      date: date,
      facilities: data,
      dataSource: "dummy"
    }
  };
};