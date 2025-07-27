const express = require('express');
const router = express.Router();
const { signup, signin, updateUserProfile, getUserProfile } = require('../controllers/user.controller');
const { protectUser } = require('../middleware/userAuth.middleware');

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/profile', protectUser, getUserProfile);
router.post('/profile', protectUser, updateUserProfile);

module.exports = router;            