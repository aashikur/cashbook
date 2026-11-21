const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSrc = path.join(__dirname, '../public/img/Blue Wallet Analytics Icon.png');
const ogSrc = path.join(__dirname, '../public/img/CashBook Finance App Dashboard.png');

function createIcoFromPng(pngBuffer, width = 32, height = 32) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(1, 4); // 1 image
  header.writeUInt8(width === 256 ? 0 : width, 6);
  header.writeUInt8(height === 256 ? 0 : height, 7);
  header.writeUInt8(0, 8); // color palette count
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bpp
  header.writeUInt32LE(pngBuffer.length, 14); // size
  header.writeUInt32LE(22, 18); // offset
  return Buffer.concat([header, pngBuffer]);
}

async function generate() {
  console.log('Generating social & icon assets...');

  // 1. OpenGraph / Meta share image: exactly 1200 x 630 (standard 1.91:1 ratio)
  await sharp(ogSrc)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(path.join(__dirname, '../public/og-image.png'));
  console.log('Created public/og-image.png (1200x630)');

  // Also in src/app/opengraph-image.png for Next.js file-based metadata
  await sharp(ogSrc)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .png({ quality: 90, compressionLevel: 8 })
    .toFile(path.join(__dirname, '../src/app/opengraph-image.png'));
  console.log('Created src/app/opengraph-image.png (1200x630)');

  // 2. High-res icon (512x512) for PWA & App
  await sharp(iconSrc)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, '../public/icon-512.png'));
  console.log('Created public/icon-512.png');

  await sharp(iconSrc)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, '../src/app/icon.png'));
  console.log('Created src/app/icon.png');

  // 3. Medium icon (192x192) for PWA
  await sharp(iconSrc)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, '../public/icon-192.png'));
  console.log('Created public/icon-192.png');

  // 4. Apple Touch Icon (180x180) for iOS Safari
  await sharp(iconSrc)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
  console.log('Created public/apple-touch-icon.png');

  await sharp(iconSrc)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '../src/app/apple-icon.png'));
  console.log('Created src/app/apple-icon.png');

  // 5. Standard 32x32 & 16x16 PNG favicons
  await sharp(iconSrc)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
  console.log('Created public/favicon-32x32.png');

  await sharp(iconSrc)
    .resize(16, 16)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-16x16.png'));
  console.log('Created public/favicon-16x16.png');

  // 6. Favicon.ico (32x32)
  const icoPng32 = await sharp(iconSrc).resize(32, 32).png().toBuffer();
  const icoBuf = createIcoFromPng(icoPng32, 32, 32);
  fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), icoBuf);
  fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), icoBuf);
  console.log('Created public/favicon.ico and src/app/favicon.ico');

  console.log('All image assets successfully generated!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
