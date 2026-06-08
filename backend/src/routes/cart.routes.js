const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const ctrl   = require('../controllers/cart.controller');

router.get('/',        auth, ctrl.getCart);
router.post('/',       auth, ctrl.addToCart);
router.delete('/clear',auth, ctrl.clearCart);   // must be before /:id
router.put('/:id',     auth, ctrl.updateCart);
router.delete('/:id',  auth, ctrl.removeItem);

module.exports = router;
