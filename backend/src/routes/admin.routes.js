const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');
const { getStats } = require('../controllers/admin.controller');

router.get('/stats', auth, role('admin'), getStats);

module.exports = router;
