const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const files = [
  './assets/icon.png',
  './assets/android-icon-foreground.png',
  './assets/android-icon-background.png',
  './assets/android-icon-monochrome.png',
  './assets/splash-icon.png'
];

async function run() {
  for (const file of files) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;
    const tempPath = fullPath + '.tmp.png';
    try {
      await sharp(fullPath).toFormat('png').toFile(tempPath);
      fs.renameSync(tempPath, fullPath);
      console.log(`Converted ${file}`);
    } catch (e) {
      console.error(`Error converting ${file}:`, e);
    }
  }
}

run();
