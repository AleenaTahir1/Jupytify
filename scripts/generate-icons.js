import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

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

  // Generate ICO file (Windows icon) using png-to-ico for proper format
  const icoPath = path.join(iconsDir, 'icon.ico');
  
  // Generate multiple PNG sizes for ICO
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const tempPngPaths = [];
  
  for (const size of icoSizes) {
    const tempPath = path.join(iconsDir, `temp_${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(tempPath);
    tempPngPaths.push(tempPath);
  }
  
  // Use png-to-ico to create proper ICO file
  const icoBuffer = await pngToIco(tempPngPaths);
  fs.writeFileSync(icoPath, icoBuffer);
  
  // Clean up temp files
  for (const tempPath of tempPngPaths) {
    fs.unlinkSync(tempPath);
  }
  
  console.log('Generated: icon.ico (with proper multi-resolution)');

  // Generate ICNS for macOS (just copy the largest PNG for now)
  const icnsPath = path.join(iconsDir, 'icon.icns');
  // ICNS is complex, for now we'll just note it needs manual conversion
  // or use a dedicated tool
  console.log('Note: icon.icns may need manual generation from icon.png');
  
  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
