const express = require('express');
const router = express.Router();
const auth = require("..//middlewares/auth.js")
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist
} = require('../controllers/wishlist.js');

router.post('/add', auth, addToWishlist);
router.get('/:userId', auth, getWishlist);
router.delete('/remove', auth, removeFromWishlist);
router.delete('/clear/:userId', auth, clearWishlist);

module.exports = router;
