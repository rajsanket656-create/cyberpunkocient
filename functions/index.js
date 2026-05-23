const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const axios = require("axios");

// This function proxies the request to hide the API Key
// Usage: GET <YOUR_FUNCTION_URL>?mobile=1234567890
exports.osintLookup = onRequest({ cors: true }, async (req, res) => {
  try {
    const mobile = req.query.mobile;
    if (!mobile) {
      res.status(400).send({ error: "Mobile number is required" });
      return;
    }

    const API_URL = `https://numinfo.eu.cc/api/check?apikey=freekeyhostmafia&number=${encodeURIComponent(mobile)}`;

    const response = await axios.get(API_URL);
    res.status(200).send(response.data);
    
  } catch (error) {
    logger.error("Error calling OSINT API", error);
    res.status(500).send({ error: "Failed to connect to OSINT backbone." });
  }
});
