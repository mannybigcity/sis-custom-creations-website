// Live SIS party availability.
// GET  {apiBase}{availabilityPath}?month=YYYY-MM
// POST {apiBase}{availabilityPath}  with a tentative inquiry.
// Reads return date + AM/PM only. Writes hold the whole block.
// If the endpoint is missing, the calendar stays in a labeled preview sample.
window.SIS_PARTY_CALENDAR_CONFIG = {
  apiBase: "https://atlasforentrepreneurs.com",
  availabilityPath: "/api/sis/party-availability",
};
