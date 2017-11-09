const path = require('path');
const pug = require('pug');
const fs = require('fs');

const template = process.argv[2];
const currentPath = path.resolve(__dirname);
const templatePath = path.join(currentPath, 'templates', template + '.pug');
const dataPath = path.join(currentPath, 'templates', template + '.json');

const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : null;

// this hack allows to pass functions through json
if (data) {
    for (let key in data) {
        let value = data[key];
        if (value.startsWith && value.startsWith('(function(){')) {
            data[key] = eval(value);
        }
    }
}

const html = pug.renderFile(templatePath, {content: data}, undefined);
console.log(html);