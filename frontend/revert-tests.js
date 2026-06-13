const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/features/chat/hooks/__tests__/use-consultation-trigger.test.ts',
  'src/features/upload/hooks/__tests__/use-image-analysis.test.ts',
  'src/features/upload/screens/__tests__/analysis-screen.test.tsx',
  'src/features/upload/screens/__tests__/eye-crop-screen.test.tsx',
  'src/features/upload/screens/__tests__/result-screen.test.tsx',
  'src/features/upload/screens/__tests__/upload-screen.test.tsx',
  'src/features/chat/__tests__/chat-handoff.integration.test.tsx'
];

filesToFix.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Revert await renderHook()
  content = content.replace(/=\s*await\s+renderHook\(/g, '= renderHook(');
  
  // Revert await render()
  content = content.replace(/=\s*await\s+render\(/g, '= render(');
  
  fs.writeFileSync(fullPath, content);
  console.log('Reverted', relPath);
});
