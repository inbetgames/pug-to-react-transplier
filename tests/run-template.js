const pug = require('pug');
const path = require('path');

const currentPath = path.resolve(__dirname);
const templatePath = path.join(currentPath, 'templates', process.argv[2] + '.pug');
const data = {
    name: 'Roman',
    user: {
        description: "Description",
        authorised: true
    }
};
const pagHtml = pug.renderFile(templatePath, {content: data}, undefined);
console.log(pagHtml);