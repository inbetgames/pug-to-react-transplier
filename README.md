# Pug Musings
Pug Musings - is a console utility to convert Pug templates to ready to use React components.

## Installation
To install Pug Musings as global package run following command:

### Yarn  
```
yarn global add pug-musings
```

### npm  
```
npm install pug-musings -g
```

## Usage 
Now you can use global name pug-musings to run transpiler: 
```
pug-musings --in = path_to_pug_template --out = path_to_output_file

Options:
  --in     Path to the target Pug template                                  
  --out    Path to the output file, stdout will be used if missing
  --watch  If given will start watching for changes, out param is required
```

## Tests
Tests are organized in pairs Pug template + template data in `tests/templates` folder and can be run as follows: 
```
npm test
```

## License
[MIT License](https://github.com/inbetgames/pug-to-react-transplier/blob/master/LICENSE)