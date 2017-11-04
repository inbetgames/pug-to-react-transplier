const pug = require('pug');
const path = require('path');
const {exec} = require('child_process');

const currentPath = path.resolve(__dirname);
const templatePath = path.join(currentPath, 'templates', process.argv[2] + '.pug');
const pagHtml = pug.renderFile(templatePath, {content: data}, undefined);
const command = 'node index.js --in ' + pubPath + ' --out ' + reactPath +
    ' && ' +
    'babel ' + reactPath + ' --out-file ' + es5Path + ' --presets=es2015,react';
