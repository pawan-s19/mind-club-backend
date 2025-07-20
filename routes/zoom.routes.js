const express = require("express");
const router = express.Router();
const { getSignature } = require("../controllers/zoom.controller");

router.post("/get-signature", getSignature);

module.exports = router;
