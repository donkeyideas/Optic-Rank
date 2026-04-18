const sharp = require("sharp");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "..", "assets");

// Colors from the editorial design
const BG_COLOR = "#1a1a1a";
const BORDER_COLOR = "#f5f2ed";
const LETTER_COLOR = "#f5f2ed";

async function generateIcon(size, filename) {
  // Create the "O" logo icon: dark background with bordered square and "O" letter
  // Using SVG to render the icon
  const borderSize = Math.round(size * 0.04);
  const squareSize = Math.round(size * 0.42);
  const squareX = Math.round((size - squareSize) / 2);
  const squareY = Math.round((size - squareSize) / 2);
  const letterSize = Math.round(size * 0.28);
  const letterX = size / 2;
  const letterY = size / 2 + letterSize * 0.35;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG_COLOR}" />
      <rect
        x="${squareX}" y="${squareY}"
        width="${squareSize}" height="${squareSize}"
        fill="none"
        stroke="${BORDER_COLOR}"
        stroke-width="${borderSize}"
      />
      <text
        x="${letterX}" y="${letterY}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${letterSize}"
        font-weight="900"
        fill="${LETTER_COLOR}"
        text-anchor="middle"
      >O</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, filename));

  console.log(`Generated ${filename} (${size}x${size})`);
}

async function generateSplashIcon(size, filename) {
  // Splash icon is just the O mark, smaller centered on transparent
  const squareSize = Math.round(size * 0.3);
  const borderSize = Math.round(size * 0.015);
  const squareX = Math.round((size - squareSize) / 2);
  const squareY = Math.round((size - squareSize) / 2);
  const letterSize = Math.round(size * 0.18);
  const letterX = size / 2;
  const letterY = size / 2 + letterSize * 0.35;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG_COLOR}" />
      <rect
        x="${squareX}" y="${squareY}"
        width="${squareSize}" height="${squareSize}"
        fill="none"
        stroke="${BORDER_COLOR}"
        stroke-width="${borderSize}"
      />
      <text
        x="${letterX}" y="${letterY}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${letterSize}"
        font-weight="900"
        fill="${LETTER_COLOR}"
        text-anchor="middle"
      >O</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, filename));

  console.log(`Generated ${filename} (${size}x${size})`);
}

async function generateAdaptiveIcons(size) {
  // Android adaptive icon foreground: just the O mark on transparent bg
  const squareSize = Math.round(size * 0.32);
  const borderSize = Math.round(size * 0.02);
  const squareX = Math.round((size - squareSize) / 2);
  const squareY = Math.round((size - squareSize) / 2);
  const letterSize = Math.round(size * 0.2);
  const letterX = size / 2;
  const letterY = size / 2 + letterSize * 0.35;

  // Foreground (transparent with O mark)
  const fgSvg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${squareX}" y="${squareY}"
        width="${squareSize}" height="${squareSize}"
        fill="none"
        stroke="${BORDER_COLOR}"
        stroke-width="${borderSize}"
      />
      <text
        x="${letterX}" y="${letterY}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${letterSize}"
        font-weight="900"
        fill="${LETTER_COLOR}"
        text-anchor="middle"
      >O</text>
    </svg>
  `;

  await sharp(Buffer.from(fgSvg))
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, "android-icon-foreground.png"));
  console.log(`Generated android-icon-foreground.png (${size}x${size})`);

  // Background (solid dark)
  const bgSvg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG_COLOR}" />
    </svg>
  `;

  await sharp(Buffer.from(bgSvg))
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, "android-icon-background.png"));
  console.log(`Generated android-icon-background.png (${size}x${size})`);

  // Monochrome (white O on transparent)
  const monoSvg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${squareX}" y="${squareY}"
        width="${squareSize}" height="${squareSize}"
        fill="none"
        stroke="#ffffff"
        stroke-width="${borderSize}"
      />
      <text
        x="${letterX}" y="${letterY}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${letterSize}"
        font-weight="900"
        fill="#ffffff"
        text-anchor="middle"
      >O</text>
    </svg>
  `;

  await sharp(Buffer.from(monoSvg))
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, "android-icon-monochrome.png"));
  console.log(`Generated android-icon-monochrome.png (${size}x${size})`);
}

async function generateFavicon(size, filename) {
  const squareSize = Math.round(size * 0.5);
  const borderSize = Math.round(size * 0.04);
  const squareX = Math.round((size - squareSize) / 2);
  const squareY = Math.round((size - squareSize) / 2);
  const letterSize = Math.round(size * 0.32);
  const letterX = size / 2;
  const letterY = size / 2 + letterSize * 0.35;

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG_COLOR}" />
      <rect
        x="${squareX}" y="${squareY}"
        width="${squareSize}" height="${squareSize}"
        fill="none"
        stroke="${BORDER_COLOR}"
        stroke-width="${borderSize}"
      />
      <text
        x="${letterX}" y="${letterY}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${letterSize}"
        font-weight="900"
        fill="${LETTER_COLOR}"
        text-anchor="middle"
      >O</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, filename));

  console.log(`Generated ${filename} (${size}x${size})`);
}

async function main() {
  console.log("Generating Optic Rank app icons...\n");

  // Main app icon (1024x1024)
  await generateIcon(1024, "icon.png");

  // Splash icon (200x200 centered on splash bg)
  await generateSplashIcon(200, "splash-icon.png");

  // Android adaptive icons (1024x1024)
  await generateAdaptiveIcons(1024);

  // Favicon (48x48)
  await generateFavicon(48, "favicon.png");

  console.log("\nAll icons generated successfully!");
}

main().catch(console.error);
