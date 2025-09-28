const multer = require('multer');
const path = require('path');

// Configure disk storage for uploads
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename(req, file, cb) {
    const fileType = file.mimetype.startsWith('image') ? 'image' : 'pdf';
    const timestamp = Date.now();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    cb(null, `${fileType}-${timestamp}-${randomSuffix}${path.extname(file.originalname)}`);
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb('Error: PDFs and Images Only!');
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
});

module.exports = upload;
