import fs from 'fs';
const contents = fs.readFileSync('src/App.tsx', 'utf8');
const fixed = contents.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/App.tsx', fixed);
