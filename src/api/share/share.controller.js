const fs = require('fs/promises');
const path = require('path');
const {
  SHARED_IMAGE_DIR,
  SHARED_PAGE_DIR,
  ensureSharedAssets,
  createSharedImageFileName,
} = require('../../utils/sharedImageStorage');
const { SHARE_TTL_MS, SHARE_TTL_DAYS } = require('../../utils/sharedImageCleanup');

function resolveExtension(mimeType) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return '.jpg';
  return '.png';
}

function buildSharePageHtml({ imageUrl, wardName, shareTime, patientCount }) {
  // This HTML is primarily for social media crawlers (like LINE, Facebook)
  // The meta refresh tag will redirect actual users to the image directly.
  const title = wardName ? `คำสั่งจาก: ${wardName}` : "รูปภาพที่แชร์";
  
  let description = shareTime ? `แชร์เมื่อ: ${shareTime}` : "แตะเพื่อดูรูปภาพที่แชร์";
  if (patientCount) {
    description += ` • รวม ${patientCount} คน`;
  }

  return `<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>ดูรูปภาพ</title>

    <!-- Open Graph Meta Tags for Social Media Previews -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="1024" /> 
    <meta property="og:type" content="website" />

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />

    <!-- Immediate redirect for users -->
    <meta http-equiv="refresh" content="0;url=${imageUrl}" />
  </head>
  <body>
    <p>กำลังเปลี่ยนเส้นทางไปยังรูปภาพ...</p>
  </body>
</html>`;
}

exports.saveSharedImage = async (req, res) => {
  try {
    const { imageBase64, fileName, wardName, shareTime, patientCount } = req.body || {};

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

    await ensureSharedAssets();
    const storedFileName = createSharedImageFileName(fileName || 'shared-image', extension);
    const storedFilePath = path.join(SHARED_IMAGE_DIR, storedFileName);

    await fs.writeFile(storedFilePath, buffer, { encoding: 'binary' });

    const relativeImageUrl = `/public/shared-images/${storedFileName}`;
    const absoluteImageUrl = `${req.protocol}://${req.get('host')}${relativeImageUrl}`;

    const pageFileName = `${path.parse(storedFileName).name}.html`;
    const pageFilePath = path.join(SHARED_PAGE_DIR, pageFileName);
    const relativePageUrl = `/public/shared-pages/${pageFileName}`;
    const absolutePageUrl = `${req.protocol}://${req.get('host')}${relativePageUrl}`;

    const html = buildSharePageHtml({ 
      imageUrl: absoluteImageUrl, 
      wardName, 
      shareTime, 
      patientCount 
    });
    await fs.writeFile(pageFilePath, html, { encoding: 'utf8' });

    return res.status(201).json({
      imageUrl: relativeImageUrl,
      directImageUrl: absoluteImageUrl,
      shareUrl: absolutePageUrl,
      fileName: storedFileName,
      expiresAt: new Date(Date.now() + SHARE_TTL_MS).toISOString(),
      ttlDays: SHARE_TTL_DAYS,
    });
  } catch (error) {
    console.error('Failed to save shared image', error);
    return res.status(500).json({ message: 'Failed to save shared image' });
  }
};
