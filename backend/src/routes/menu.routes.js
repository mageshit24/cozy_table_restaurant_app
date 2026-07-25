/**
 * menu.routes.js
 * Uploaded images now go straight into the database (see menu.model.js) —
 * switched multer from `diskStorage` (wrote files to backend/uploads/) to
 * `memoryStorage`, which hands the controller the raw bytes via
 * `req.file.buffer` instead of writing to disk and handing back a filename.
 */
const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const ctrl = require('../controllers/menu.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', ctrl.getMenu);
router.post('/', auth, role('admin'), upload.single('image'), ctrl.createMenu);
router.put('/:id', auth, role('admin'), upload.single('image'), ctrl.updateMenu);
router.delete('/:id', auth, role('admin'), ctrl.deleteMenu);

module.exports = router;
