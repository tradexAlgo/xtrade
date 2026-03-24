const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, 'src', 'index.css');
let code = fs.readFileSync(targetFilePath, 'utf8');

if (!code.includes('/* Mobile Light Mode Text Overrides */')) {
  code += `\n
/* Mobile Light Mode Text Overrides */
/* When in light mode, force "text-white" and "text-gray-*" to dark variables unless inside colored backgrounds */
html.light .text-white {
  color: var(--theme-textPrimary) !important;
}
html.light .text-gray-400 {
  color: var(--theme-textSecondary) !important;
}
html.light .text-gray-500 {
  color: var(--theme-textMuted) !important;
}

/* Preserve white text on primary buttons and colored tags */
html.light .bg-green-500 .text-white,
html.light .bg-red-500 .text-white,
html.light .bg-blue-500 .text-white,
html.light .bg-accent-green .text-white {
  color: #ffffff !important;
}

/* Ensure mobile active tab icons don't disappear */
html.light nav.fixed .text-gray-500 {
  color: var(--theme-textMuted) !important;
}
`;
  fs.writeFileSync(targetFilePath, code, 'utf8');
  console.log('index.css updated');
} else {
  console.log('Already updated index.css');
}
