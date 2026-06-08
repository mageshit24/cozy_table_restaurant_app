const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');
const ctrl   = require('../controllers/menu.controller');

// Absolute path to uploads — works regardless of where node is started from
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/',       ctrl.getMenu);
router.post('/',      auth, role('admin'), upload.single('image'), ctrl.createMenu);
router.put('/:id',    auth, role('admin'), upload.single('image'), ctrl.updateMenu);
router.delete('/:id', auth, role('admin'), ctrl.deleteMenu);

module.exports = router;
