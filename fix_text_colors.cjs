const fs = require('fs');
const path = require('path');

const directoryToScan = path.join(__dirname, 'frontend', 'src');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory;
    try {
      isDirectory = fs.statSync(dirPath).isDirectory();
    } catch (e) {
      return;
    }
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function processFile(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let originalContent;
    try {
      originalContent = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      return;
    }
    let content = originalContent;

    // Fix white text on yellow buttons to be black
    content = content.replace(/from-burgundy to-crimson text-white/g, 'from-burgundy to-crimson text-black');
    content = content.replace(/from-burgundy\s+to-crimson\s+text-white/g, 'from-burgundy to-crimson text-black');
    content = content.replace(/bg-gradient-to-r from-burgundy to-crimson text-white/g, 'bg-gradient-to-r from-burgundy to-crimson text-black');
    
    // Specifically handle active tab text in Login/Signup
    // "activeTab === 'signin' ? 'bg-gradient-to-r from-burgundy to-crimson text-white'"
    // -> "text-black"
    content = content.replace(/'bg-gradient-to-r from-burgundy to-crimson text-white'/g, "'bg-gradient-to-r from-burgundy to-crimson text-black'");
    content = content.replace(/"bg-gradient-to-r from-burgundy to-crimson text-white"/g, '"bg-gradient-to-r from-burgundy to-crimson text-black"');

    // Handle account Popular card text white
    content = content.replace(/text-white shadow-2xl scale-105/g, 'text-black shadow-2xl scale-105');

    // Handle Step circles text white
    content = content.replace(/text-white font-bold text-sm/g, 'text-black font-bold text-sm');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
}

walkDir(directoryToScan, processFile);

console.log('Text color on yellow background replacement complete.');
