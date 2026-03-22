const fs = require('fs');
const path = require('path');

const directoriesToScan = [
  path.join(__dirname, 'frontend', 'src'),
  path.join(__dirname, 'frontend', 'public'), // Only text files
  path.join(__dirname, 'backend')
];

const skipDirs = ['node_modules', '.git', 'build', 'dist', 'apk', '.vscode', '.idea'];

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (skipDirs.includes(f)) return;
    
    let isDirectory;
    try {
      isDirectory = fs.statSync(dirPath).isDirectory();
    } catch (e) {
      return;
    }
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const replacePaths = {
  '/scw-logo.png': '/extrede-logo.png',
  'scw.com': 'extrede.com',
  'SCW.apk': 'Extrede.apk',
  'scw.apk': 'extrede.apk',
  '/DiosDerivativewithslogapng.png': '/extrede-logo.png',
  '/DiosDerivativewithoutsloganwhite.png': '/extrede-logo.png',
  '/DiosDerivativewithoutsloganblack.png': '/extrede-logo.png',
  '/DiosDerivativeswhite.png': '/extrede-logo.png',
  '/DiosDerivativewhite.png': '/extrede-logo.png',
  '/Tablogo.png': '/extrede-logo.png',
};

const replaceMapCaseInsensitive = {
  'scw derivative': 'Extrede',
  'scw derivatives': 'Extrede',
  'diosderivative': 'extrede',
  'dios derivative': 'Extrede',
  'dios derivatives': 'Extrede'
};

function processFile(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.css') || filePath.endsWith('.html') || filePath.endsWith('.json') || filePath.endsWith('.env') || filePath.endsWith('.cjs')) {
    let originalContent;
    try {
      originalContent = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      return;
    }
    let content = originalContent;

    for (const [key, value] of Object.entries(replacePaths)) {
      content = content.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    for (const [key, value] of Object.entries(replaceMapCaseInsensitive)) {
      content = content.replace(new RegExp(key, 'gi'), value);
    }
    
    // Text replacements using regex matching whole words or inside strings
    content = content.replace(/\bSCW\b/g, 'Extrede');
    content = content.replace(/\bscw\b/g, 'extrede');
    content = content.replace(/\bDios\b/g, 'Extrede');
    content = content.replace(/\bdios\b/g, 'extrede');
    content = content.replace(/\bDIOS\b/g, 'Extrede');
    
    // Specific title tags
    content = content.replace(/SCW - Next Gen Trading/g, 'Extrede - Next Gen Trading');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
}

directoriesToScan.forEach(dir => walkDir(dir, processFile));

const indexHtml = path.join(__dirname, 'frontend', 'index.html');
if (fs.existsSync(indexHtml)) processFile(indexHtml);

console.log('Replacement complete.');
