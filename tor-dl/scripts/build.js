const fs = require('fs');
const path = require('path');

fs.mkdirSync('dist/bin', { recursive: true });
fs.writeFileSync('dist/bin/tor-dl.js', `#!/usr/bin/env node
const { createParser } = require('../cli/parser');
const p = createParser();
p.parse(process.argv);
`);