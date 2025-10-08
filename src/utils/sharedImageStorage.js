const path = require('path');
const fs = require('fs/promises');

const SHARED_IMAGE_DIR = path.join(__dirname, '../../public/shared-images');
const SHARED_PAGE_DIR = path.join(__dirname, '../../public/shared-pages');

async function ensureSharedImageDir() {
  await fs.mkdir(SHARED_IMAGE_DIR, { recursive: true });
}

async function ensureSharedAssets() {
  await Promise.all([
    fs.mkdir(SHARED_IMAGE_DIR, { recursive: true }),
    fs.mkdir(SHARED_PAGE_DIR, { recursive: true }),
  ]);
}

function createSharedImageFileName(baseName = 'shared-image', extension = '.png') {
  const sanitizedBase = baseName.toString().replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'shared-image';
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `${sanitizedBase}-${uniqueSuffix}${extension}`;
}

module.exports = {
  SHARED_IMAGE_DIR,
  SHARED_PAGE_DIR,
  ensureSharedAssets,
  ensureSharedImageDir,
  createSharedImageFileName,
};
