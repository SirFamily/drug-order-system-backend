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

function buildSharePageHtml({ imageUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Shared Image Preview</title>
    <meta property="og:title" content="Shared Image" />
    <meta property="og:description" content="Tap to view the shared image." />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta http-equiv="refresh" content="5;url=${imageUrl}" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        background: #0f172a;
        color: #e2e8f0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      img {
        max-width: 90vw;
        max-height: 70vh;
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
      }
      a {
        color: #38bdf8;
        font-weight: 600;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <img src="${imageUrl}" alt="Shared preview" />
    <a href="${imageUrl}">Open full image</a>
  </body>
</html>`;
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

    const html = buildSharePageHtml({ imageUrl: absoluteImageUrl });
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
