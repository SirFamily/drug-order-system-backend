const fs = require('fs/promises');
const path = require('path');
const {
  SHARED_IMAGE_DIR,
  ensureSharedImageDir,
  createSharedImageFileName,
} = require('../../utils/sharedImageStorage');
const { SHARE_TTL_MS, SHARE_TTL_DAYS } = require('../../utils/sharedImageCleanup');

function resolveExtension(mimeType) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return '.jpg';
  return '.png';
}

exports.saveSharedImage = async (req, res) => {
  try {
    const { imageBase64, fileName } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ message: 'imageBase64 is required' });
    }

    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid image data' });
    }

    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = resolveExtension(mimeType);

    await ensureSharedImageDir();
    const storedFileName = createSharedImageFileName(fileName || 'shared-image', extension);
    const storedFilePath = path.join(SHARED_IMAGE_DIR, storedFileName);

    await fs.writeFile(storedFilePath, buffer, { encoding: 'binary' });

    const relativeUrl = `/public/shared-images/${storedFileName}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

    return res.status(201).json({
      imageUrl: relativeUrl,
      shareUrl: absoluteUrl,
      fileName: storedFileName,
      expiresAt: new Date(Date.now() + SHARE_TTL_MS).toISOString(),
      ttlDays: SHARE_TTL_DAYS,
    });
  } catch (error) {
    console.error('Failed to save shared image', error);
    return res.status(500).json({ message: 'Failed to save shared image' });
  }
};
