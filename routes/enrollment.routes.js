const express = require("express");
const router = express.Router();
const {
  // createEnrollmentOrder,
  // verifyAndEnroll,
  createEnrollment,
} = require("../controllers/enrollment.controller");
const { protectUser } = require("../middleware/userAuth.middleware");

router.post("/create-order", protectUser, createEnrollment);
// router.post('/verify', verifyAndEnroll);

module.exports = router;
