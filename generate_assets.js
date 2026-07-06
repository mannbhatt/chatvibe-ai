const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  const baseLogo = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 500 500">
    <rect width="400" height="400" rx="90" fill="#635BFF" />
    <rect x="108" y="160" width="24" height="80" rx="12" fill="#0A84FF" />
    <rect x="148" y="120" width="24" height="160" rx="12" fill="#FF4D8D" />
    <rect x="188" y="80" width="24" height="240" rx="12" fill="#FFFFFF" />
    <rect x="228" y="140" width="24" height="120" rx="12" fill="#FF4D8D" />
    <rect x="268" y="170" width="24" height="60" rx="12" fill="#0A84FF" />
  </svg>
  `;

  const splashLogo = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-312 -312 1024 1024">
    <rect width="400" height="400" rx="90" fill="#635BFF" />
    <rect x="108" y="160" width="24" height="80" rx="12" fill="#0A84FF" />
    <rect x="148" y="120" width="24" height="160" rx="12" fill="#FF4D8D" />
    <rect x="188" y="80" width="24" height="240" rx="12" fill="#FFFFFF" />
    <rect x="228" y="140" width="24" height="120" rx="12" fill="#FF4D8D" />
    <rect x="268" y="170" width="24" height="60" rx="12" fill="#0A84FF" />
  </svg>
  `;

  const fgLogo = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432">
    <rect x="124" y="176" width="24" height="80" rx="12" fill="#0A84FF" />
    <rect x="164" y="136" width="24" height="160" rx="12" fill="#FF4D8D" />
    <rect x="204" y="96" width="24" height="240" rx="12" fill="#FFFFFF" />
    <rect x="244" y="156" width="24" height="120" rx="12" fill="#FF4D8D" />
    <rect x="284" y="186" width="24" height="60" rx="12" fill="#0A84FF" />
  </svg>
  `;

  const bgLogo = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432">
    <rect width="432" height="432" fill="#635BFF" />
  </svg>
  `;

  const monoLogo = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432">
    <rect x="124" y="176" width="24" height="80" rx="12" fill="#FFFFFF" />
    <rect x="164" y="136" width="24" height="160" rx="12" fill="#FFFFFF" />
    <rect x="204" y="96" width="24" height="240" rx="12" fill="#FFFFFF" />
    <rect x="244" y="156" width="24" height="120" rx="12" fill="#FFFFFF" />
    <rect x="284" y="186" width="24" height="60" rx="12" fill="#FFFFFF" />
  </svg>
  `;

  await sharp(Buffer.from(baseLogo)).resize(1024, 1024).png().toFile('assets/icon.png');
  console.log('icon.png created');

  await sharp(Buffer.from(splashLogo)).resize(1024, 1024).png().toFile('assets/splash-icon.png');
  console.log('splash-icon.png created');

  await sharp(Buffer.from(baseLogo)).resize(48, 48).png().toFile('assets/favicon.png');
  console.log('favicon.png created');

  await sharp(Buffer.from(fgLogo)).resize(432, 432).png().toFile('assets/android-icon-foreground.png');
  console.log('android-icon-foreground.png created');

  await sharp(Buffer.from(bgLogo)).resize(432, 432).png().toFile('assets/android-icon-background.png');
  console.log('android-icon-background.png created');

  await sharp(Buffer.from(monoLogo)).resize(432, 432).png().toFile('assets/android-icon-monochrome.png');
  console.log('android-icon-monochrome.png created');
  
  fs.writeFileSync('components/branding/logo.svg', baseLogo);
  console.log('logo.svg created');
}

generate().catch(console.error);
