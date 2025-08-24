const express = require('express');
const router = express.Router();
const { generateInvoicePDF } = require("../controllers/InvoicePDF");

router.get('/invoice/:id/pdf', (req, res) => {
  generateInvoicePDF(req.params.id, res);
});

module.exports = router;
