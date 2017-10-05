#!/usr/bin/env node

const lex = require('pug-lexer');
const parse = require('pug-parser');
const fs = require('fs');
const path = require('path');
const optimist = require('optimist');
const lodash = require('lodash');
const watch = require('node-watch');

const transplier = (fname) => {
  let mixins_defined = {};
  let files = [];
  let mixins = [];

  const stringifyBetter = (obj) => {
    let result = []
    for (k in obj) {
        switch (k) {
            case "className":
                result.push('"' + k.toString() + '": "' + obj[k].toString() + '"');
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
      } else
      if (inTemplate && example[i] === "}") {
          inTemplate = false;
          result = result + '" +' + templateBody + ' + "';
      } else
      if (inTemplate) {
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

  const unquote= v => v.replace(/['"](.*)['"]/, '$1');

  const transformAttrs = (attrs, key) => {
    let attrsObject = {};
    for (let i = 0; i < attrs.length; i++) {
      if (typeof(attrs[i].val) === "string") {
        const name = attrs[i].name;
        var value = unquote(attrs[i].val);
        const quoted = value != attrs[i].val;
        const pattern = quoted ? `"${value}"` : value;

        switch (name) {
          case "checked":
            if (value === 'checked') {
              attrsObject["defaultChecked"] = pattern;
            } else {
              // FIXME: same as in default case
              if (value.match(/^"#{.*}"$/)) {
                attrsObject[attrs[i].name] = unquote(value).match(/^#{(.*)}$/);
              } else {
                attrsObject[attrs[i].name] = pattern;
              }
            }
            break;
          case "for":
            attrsObject["htmlFor"] = pattern;
            break;
          case "charset":
            attrsObject["charSet"] = pattern;
            break;
          case "http-equiv":
            attrsObject["httpEquiv"] = pattern;
            break;
          case "class":
              if (attrsObject["className"] !== undefined) {
                attrsObject["className"] = attrsObject["className"] + " " + value;
              } else {
                attrsObject["className"] = value;
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
                attrsObject[attrs[i].name] = pattern;
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
    for (let i = 0; i < opts.depth; i++) { t = t + "   "; }
    switch (node.type) {
      case "Tag":
        let name = "'" + node.name + "'";
        if (node.name === "a") {
          let href = node.attrs.filter(attr => (attr.name == "href" || attr.name == "to"))[0];
          let external = node.attrs.filter(attr => attr.name == "external")[0];
          if (href && !external && href.val !== '"#"') {
              name = "content.Link";
              href.name = "to";
          }
        }
        let childs = compiler(node.block, {depth: opts.depth + 1, fname: opts.fname});
        if (childs !== "") {
          return "React.createElement(" + name + ", "
                                        + transformAttrs(node.attrs, opts.key) + ", "
                                        + compiler(node.block, {depth: opts.depth + 1, fname: opts.fname}) +  ")";
        } else {
          return "React.createElement(" + name + ", "
                                        + transformAttrs(node.attrs, opts.key) + ")";
        }
        break;
      case "Block":
        let blockResult = node.nodes.map((n, i) => compiler(n, {depth: opts.depth + 1, fname: opts.fname, key: i})).filter((l) => l != "").join(",\n" + t);
        if (blockResult !== "") {
          return ((blockResult[0] !== "'")?"\n" + t:"") + "[" + blockResult + "]";
        }
        return "";
      case "Text":
        return "'" + node.val.replace("'", "\\'") + "'";
      case "Doctype":
        return "";
      case "Conditional":
        return "((test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }})(" + node.test + ", "
                  + compiler(node.consequent, {depth: opts.depth + 1, fname: opts.fname}) + ", "
                  + compiler(node.alternate, {depth: opts.depth + 1, fname: opts.fname}) + ")";

      case "Each":
        let codeBlock = compiler(node.block, {depth: opts.depth + 2, fname: opts.fname, key: node.key});

        if (node.key)
          return "(() => { for (var " + node.key + " in " + node.obj + ") { var " + node.val + " = " + node.obj + "[" + node.key + "]; return (" + codeBlock + ");}})()";
        else
          return "(() => { if (!" +node.obj+ ") return null; return "+node.obj+".map(("+node.val+") => { return "+codeBlock.trim()+"; });})()";

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
            "const " + node.name + " = (" + (node.args===null?"":node.args) + ") => [" + compiler(node.block, {depth: 1, fname: opts.fname}) + "]";
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

    return "export default function template(content) {\n return (" + compiler(ast, {depth: 0, fname: rootfname}) + ")\n}";
  };

  const transform_result = transform(fname);
  const result = "import React from 'react';\n\n\n" + mixins.join("\n") + "\n" + transform_result;
  return {result: result, files: lodash.uniq(files)}
};


const argv = optimist
    .usage('Usage: $0 --in=inputfile --out=outfile')
    .demand(['in'])
    .describe('in', 'input file')
    .describe('out', 'file to write output to, or stdout if skipped')
    .describe('watch', 'if given will start watching for changes... out should be set!!!')
    .argv;

let watches = {};

const recompile = () => {
  if (argv.in !== undefined) {
    const result = transplier(argv.in);
    if (argv.out !== undefined) {
      fs.writeFileSync(argv.out, result.result);
      console.log("saved " + argv.out);

      if (argv.watch) {
        result.files.map((el, i) => {
          if (watches[el] === undefined) {
            watches[el] = watch(el, (evt, name) => {
                console.log(evt, name);
                recompile();
            })
          }
        })
      }
    } else {
      console.log(result.result);
    }
  } else {
    console.log("no input file given.");
  }
};

recompile();
