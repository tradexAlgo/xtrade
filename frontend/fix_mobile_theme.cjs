const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, 'src', 'pages', 'MobileTradingApp.jsx');
let code = fs.readFileSync(targetFilePath, 'utf8');

// 1. Add useTheme import if not exists
if (!code.includes('useTheme')) {
  code = code.replace(
    "import { API_URL } from '../config/api'",
    "import { API_URL } from '../config/api'\nimport { useTheme } from '../context/ThemeContext'"
  );
  code = code.replace(
    "  const [searchParams] = useSearchParams()",
    "  const { isDarkMode, toggleDarkMode } = useTheme()\n  const [searchParams] = useSearchParams()"
  );
}

// 2. Replace hardcoded classes with theme context variables using AST-like regex.
// To do this safely, we will wrap string literals with JS ternaries.
// For example: className="text-white ..." -> className={`text-white ... ${isDarkMode ? '' : '!text-gray-900'}`}

// Actually, an easier way is to just define a component-level CSS wrapper, but let's replace "bg-dark-X" and "text-white" with standard ternary logic where possible.
// Wait, doing this via regex is very brittle.

// Let's implement the CSS override method:
// We just add a custom class "mobile-theme-wrapper" to the outer div.
code = code.replace('<div className="min-h-screen bg-dark-900 flex flex-col">', '<div className="min-h-screen bg-dark-900 flex flex-col mobile-theme-wrapper">');
code = code.replace('<div className="p-4 pb-20">', '<div className="p-4 pb-20 mobile-theme-wrapper">');
code = code.replace('<div className="flex flex-col h-full pb-16">', '<div className="flex flex-col h-full pb-16 mobile-theme-wrapper">');
code = code.replace('<div className="flex flex-col h-full bg-dark-900">', '<div className="flex flex-col h-full bg-dark-900 mobile-theme-wrapper">');

// Also inject the Theme toggle in the mobile menu (which is in MobileLayout, handled separately)

fs.writeFileSync(targetFilePath, code, 'utf8');
console.log('MobileTradingApp updated successfully.');

