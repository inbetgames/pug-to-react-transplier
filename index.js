#!/usr/bin/env node

const lex = require('pug-lexer');
const parse = require('pug-parser');
const fs = require('fs');
const path = require('path');
const optimist = require('optimist');
const lodash = require('lodash');
const beautify = require('js-beautify').js_beautify
const watch = require('node-watch');

/**
 * @param {*} arg
 * @returns {boolean}
 */
function isArray(arg) {
    return 'function' === typeof Array.isArray
        ? Array.isArray(arg)
        : '[object Array]' === Object.prototype.toString.call(arg);
}

/**
 * @param  {string} template
 * @param  {Array.<string>} values
 * @return {string}
 */
function subs(template, values) {
  return template.replace(/%s/g, function() {
    return values.shift();
  });
}

const transplier = (fname) => {
    let mixins_defined = {};
    let files = [];
    let mixins = [];
    let error = false;

    const stringifyBetter = (obj) => {
        let result = [];
        for (let k in obj) {
            switch (k) {
                case 'className':
                    if (isArray(obj[k])) {
                        result.push('"' + k.toString() + '": [' + obj[k].join(',') + '].join(" ")');
                    } else {
                        result.push('"' + k.toString() + '": ' + obj[k].toString());
                    }
                    break;
                case "style":
                    result.push('"' + k.toString() + '":' + stringifyBetter(obj[k]));
                    break;
                default:
                    result.push('"' + k.toString() + '": ' + obj[k].toString());
            }
        }

        return "{" + result.join(", ") + "}";
    };

    const interpolation = (example) => {
        example = example.replace(/^"/, "").replace(/"$/, "");
        let inTemplate = false;
        let templateBody = "";
        let result = "";
        for (var i = 0; i < example.length; i++) {
            if (example[i] === "#" && example[i + 1] === "{" && !inTemplate) {
                inTemplate = true;
                templateBody = "";
            } else if (inTemplate && example[i] === "}") {
                inTemplate = false;
                result = result + '" +' + templateBody + ' + "';
            } else if (inTemplate) {
                if (templateBody !== "") {
                    templateBody = templateBody + example[i];
                } else {
                    templateBody = " ";
                }
            } else {
                result = result + example[i];
            }
        }
        return '"' + result + '"';
    }

    const unquote = v => v.replace(/['"](.*)['"]/, '$1');

    const renameSpecificAttrs = attrs => {
        const renameMap = {
            for: 'htmlFor',
            charset: 'charSet',
            'http-equiv': 'httpEquiv',
            class: 'className',
        };
        return attrs.map(attr => {
            let name = renameMap[attr.name];
            let val = attr.val;
            if (name === undefined) {
                name = attr.name;
                // handle 'checked'='checked' or true case, it should be 'defaultChecked'
                // note that react warns about defaultChecked only on uncontrolled inputs
                if (name === 'checked') {
                    if ((typeof(val) === 'string' && unquote(val) === 'checked') || val === true) {
                        name = 'defaultChecked';
                    }
                }
            }
            attr['name'] = name;
            return attr;
        }, {});
    };

    const transformAttrs = (attrs, key) => {
        let attrsObject = {};

        attrs = renameSpecificAttrs(attrs);

        for (let i = 0; i < attrs.length; i++) {
            if (typeof(attrs[i].val) === "string") {
                const name = attrs[i].name;
                const value = unquote(attrs[i].val);

                switch (name) {
                    case "className":
                        if (attrs[i].val.charAt(0) != "\"" && attrs[i].val.charAt(0) != "'") {
                            // expressions?
                            if (attrsObject["className"] === undefined) {
                                // just one non-string value
                                attrsObject["className"] = attrs[i].val;
                            } else {
                                // some value is already in className, we must make array
                                if (isArray(attrsObject["className"])) {
                                    attrsObject["className"] = attrsObject["className"].concat([attrs[i].val]);
                                } else {
                                    attrsObject["className"] = [attrsObject["className"]].concat([attrs[i].val]);
                                }
                            }
                        } else {
                            // simple string values
                            if (attrsObject["className"] === undefined) {
                                attrsObject["className"] = unquote(interpolation(value));
                            } else {
                                attrsObject["className"] = unquote(attrsObject["className"]) + " " + unquote(interpolation(value));
                            }
                            attrsObject["className"] = "\"" + attrsObject["className"] + "\"";
                        }
                        break;
                    case "style":
                        let styles = {};
                        value
                            .split(/,/).map((l) => l.split(/: /))
                            .forEach((p) => {
                                switch (p[0]) {
                                    case "background-image":
                                        styles["backgroundImage"] = interpolation(p[1]).replace(';', '');
                                        break;
                                    default:
                                        styles[p[0]] = p[1];
                                }
                            });
                        attrsObject["style"] = styles;
                        break;
                    default:
                        if (value.match(/#{.*}/)) {
                            attrsObject[attrs[i].name] = interpolation(value);
                        } else {
                            const wasQuoted = value !== attrs[i].val;
                            if (attrs[i].val.charAt(0) != "\"" && attrs[i].val.charAt(0) != "'") {
                                attrsObject[attrs[i].name] = attrs[i].val;
                            } else {
                                attrsObject[attrs[i].name] = wasQuoted ? `"${value}"` : value;
                            }
                        }
                }
            } else {
                attrsObject[attrs[i].name] = attrs[i].val;
            }
        }
        if (key !== undefined && attrsObject.key === undefined) {
            attrsObject.key = key;
        }
        return stringifyBetter(attrsObject);
    };

    const compiler = (node, opts) => {
        if (node === undefined) return "";
        if (node === null) return "null";
        let t = "";
        for (let i = 0; i < opts.depth; i++) {
            t = t + "\t";
        }
        switch (node.type) {
            case "Tag":
                let name = "'" + node.name + "'";
                if (node.name === "a") {
                    let href = node.attrs.filter(attr => (attr.name === "href" || attr.name === "to"))[0];
                    let external = node.attrs.filter(attr => attr.name === "external")[0];
                    if (href && !external && href.val !== '"#"') {
                        name = "content.Link";
                        href.name = "to";
                    }
                } else if (node.name.charAt(0) === node.name.charAt(0).toUpperCase()) {
                    name = "content." + node.name;
                }
                let childs = compiler(node.block, {depth: opts.depth + 1, fname: opts.fname});
                if (childs !== "") {
                    return "React.createElement(" + name + ", "
                        + transformAttrs(node.attrs, opts.key) + ", "
                        + compiler(node.block, {depth: opts.depth + 1, fname: opts.fname}) + ")";
                } else {
                    return "React.createElement(" + name + ", "
                        + transformAttrs(node.attrs, opts.key) + ")";
                }
                break;
            case "Block":
                let blockResult = node.nodes.map((n, i) => compiler(n, {depth: opts.depth + 1, fname: opts.fname, key: i})).filter((l) => l != "").join("," + t);
                if (blockResult.length) {
                    return ((blockResult[0] !== "'") ? "" : "") + "[" + blockResult + "]";
                }
                return "";
            case "Text":
                return "'" + node.val.replace("'", "\\'").replace('\n', '\\n') + "'";
            case "Doctype":
                return "";
            case "Conditional":
                return subs("((%s) ? function (){return %s;} : function (){return %s;})()", [
                      node.test,
                      compiler(node.consequent, {depth: opts.depth + 1, fname: opts.fname}),
                      compiler(node.alternate, {depth: opts.depth + 1, fname: opts.fname})
                  ]);
            case "Each":
                let codeBlock = compiler(node.block, {depth: opts.depth + 2, fname: opts.fname, key: node.key});
                if (node.key)
                    return `
          (() => {
            let items = [];
            try { items = ${node.obj}; } catch (e) { return null; }
            if (!items) { return null; }
            return Object.keys(${node.obj}).map(${node.key} => {
              let ${node.val} = ${node.obj}[${node.key}];
              return ${codeBlock.trim()};
            });
          })()`;
                else
                    return `
          (() => {
            let items = [];
           try { items = ${node.obj}; } catch (e) { return null; }
            if (!items) { return null; }
            return items.map(${node.val} => ${codeBlock.trim()});
          })()`;
            case "RawInclude":
                const basepath = path.parse(opts.fname).dir + "/" + node.file.path + ".jade";
                files.push(basepath);
                return compiler(parse(lex(fs.readFileSync(basepath).toString())), {depth: opts.depth + 1, fname: basepath});
            case "Comment":
                return "";
            case "Mixin":
                if (node.call) {
                    return node.name + "(" + node.args + ")";
                } else {
                    let mixin =
                        "// " + node.name + "\n" +
                        "const " + node.name + " = (" + (node.args === null ? "" : node.args) + ") => [" + compiler(node.block, {depth: 1, fname: opts.fname}) + "]";
                    if (mixins_defined[node.name] === undefined) {
                        mixins.push(mixin);
                        mixins_defined[node.name] = true;
                    }
                    return "";
                }
            case "Code":
                return node.val;
            default:
                console.log("unknown node type: ", node);
                process.exit(-1);
        }
    };

    const transform = (rootfname) => {
        files.push(rootfname);
        let text = fs.readFileSync(rootfname).toString();
        let ast = parse(lex(text));

        return "export default function template(content) {return (" + compiler(ast, {depth: 0, fname: rootfname}) + ")}";
    };

    let transformResult = null;
    try {
        transformResult = transform(fname);
    } catch (e) {
        console.log(e.toString());
        error = true;
    }

    let result = transformResult ? "import React from 'react';\n\n\n" + mixins.join("\n") + "\n" + transformResult : null;

    if (!argv['no_beautify']) {
      result = beautify(result, { indent_size: 2 });
    }

    return {
        result: result,
        files: lodash.uniq(files),
        error: error
    }
};


const argv = optimist
    .usage('Usage: $0 --in=input file --out=outfile')
    .demand(['in'])
    .describe('in', 'Path to the target Pug template')
    .describe('out', 'Path to the output file, stdout will be used if missing')
    .describe('watch', 'If given will start watching for changes, out param is required')
    .boolean('no_beautify', 'Prevent to beautify result')
    .argv;

let watches = {};

const recompile = () => {
    if (argv.in !== undefined) {
        const result = transplier(argv.in);
        if (result.result) {
            if (argv.out !== undefined) {
                fs.writeFileSync(argv.out, result.result);
                console.log("saved " + argv.out);
            } else {
                console.log(result.result);
            }
        }
        if (argv.watch) {
            result.files.map((el, i) => {
                if (watches[el] === undefined) {
                    watches[el] = watch(el, (evt, name) => {
                        console.log(evt, name);
                        recompile();
                    })
                }
            })
        } else if (result.error) {
            process.exit(1);
        }
    } else {
        console.log("no input file given.");
    }
};

recompile();
