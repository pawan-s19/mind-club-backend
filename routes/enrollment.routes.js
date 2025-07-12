const express = require('express');
const router = express.Router();
const {
  // createEnrollmentOrder,
  // verifyAndEnroll,
  createEnrollment
} = require('../controllers/enrollment.controller');

router.post('/create-order', createEnrollment);
// router.post('/verify', verifyAndEnroll);

module.exports = router;
