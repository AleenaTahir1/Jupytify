import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, '../public/logo.svg');
const iconsDir = path.join(__dirname, '../src-tauri/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const { name, size } of sizes) {
    const outputPath = path.join(iconsDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${name}`);
  }

  // Generate ICO file (Windows icon) - use 256x256 as base
  const icoPath = path.join(iconsDir, 'icon.ico');
  const pngBuffer = await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toBuffer();
  
  // For ICO, we'll create a simple version using the PNG
  // Sharp doesn't directly support ICO, so we'll use png-to-ico approach
  // For now, copy the 256x256 PNG and rename - user can convert manually or we use a different approach
  
  // Actually, let's generate multiple sizes for ICO
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoBuffers = await Promise.all(
    icoSizes.map(size => 
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  
  // Create ICO file manually (ICO format)
  const icoBuffer = createIco(icoBuffers, icoSizes);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Generated: icon.ico');

  // Generate ICNS for macOS (just copy the largest PNG for now)
  const icnsPath = path.join(iconsDir, 'icon.icns');
  // ICNS is complex, for now we'll just note it needs manual conversion
  // or use a dedicated tool
  console.log('Note: icon.icns may need manual generation from icon.png');
  
  console.log('\nAll icons generated successfully!');
}

function createIco(pngBuffers, sizes) {
  // ICO file format:
  // Header (6 bytes) + Directory entries (16 bytes each) + Image data
  
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  
  // Calculate offsets
  let offset = headerSize + dirSize;
  const offsets = pngBuffers.map(buf => {
    const currentOffset = offset;
    offset += buf.length;
    return currentOffset;
  });
  
  // Total size
  const totalSize = offset;
  const buffer = Buffer.alloc(totalSize);
  
  // Write header
  buffer.writeUInt16LE(0, 0);      // Reserved
  buffer.writeUInt16LE(1, 2);      // Type (1 = ICO)
  buffer.writeUInt16LE(numImages, 4); // Number of images
  
  // Write directory entries
  for (let i = 0; i < numImages; i++) {
    const entryOffset = headerSize + (i * dirEntrySize);
    const size = sizes[i];
    const pngBuf = pngBuffers[i];
    
    buffer.writeUInt8(size >= 256 ? 0 : size, entryOffset);     // Width
    buffer.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1); // Height
    buffer.writeUInt8(0, entryOffset + 2);                       // Color palette
    buffer.writeUInt8(0, entryOffset + 3);                       // Reserved
    buffer.writeUInt16LE(1, entryOffset + 4);                    // Color planes
    buffer.writeUInt16LE(32, entryOffset + 6);                   // Bits per pixel
    buffer.writeUInt32LE(pngBuf.length, entryOffset + 8);        // Image size
    buffer.writeUInt32LE(offsets[i], entryOffset + 12);          // Image offset
  }
  
  // Write image data
  for (let i = 0; i < numImages; i++) {
    pngBuffers[i].copy(buffer, offsets[i]);
  }
  
  return buffer;
}

generateIcons().catch(console.error);
