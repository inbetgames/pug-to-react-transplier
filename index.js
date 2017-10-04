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
  let mixins = ["const f = React.createElement;",
                "const pugConditional = (test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }}"];
  const transformAttrs = (attrs, key) => {
    let attrsObject = {};
    for (let i = 0; i < attrs.length; i++) {
      if (typeof(attrs[i].val) === "string") {
        switch (attrs[i].name) {
          case "for":
            attrsObject["htmlFor"] = attrs[i].val.replace(/^'/, "").replace(/'$/, "");
            break;
          case "charset":
            attrsObject["charSet"] = attrs[i].val.replace(/^'/, "").replace(/'$/, "");
            break;
          case "http-equiv":
            attrsObject["httpEquiv"] = attrs[i].val.replace(/^'/, "").replace(/'$/, "");
            break;
          case "class":
              if (attrsObject["className"] !== undefined) {
                attrsObject["className"] = attrsObject["className"] + " " + attrs[i].val.replace(/^'/, "").replace(/'$/, "");
              } else {
                attrsObject["className"] = attrs[i].val.replace(/^'/, "").replace(/'$/, "");
              }
            break;
          case "style":
            let styles = {};
            attrs[i].val
              .replace(/^"/, "").replace(/"$/, "")
              .split(/,/).map((l) => l.split(/: /))
              .forEach((p) => {
                switch (p[0]) {
                  case "background-image":
                    styles["backgroundImage"] = p[1];
                    break;
                  default:
                    styles[p[0]] = p[1];
                }
              });
            attrsObject["style"] = styles;
            break;
          default:
              let value = attrs[i].val.replace(/^'/, "").replace(/'$/, "");
              if (value.match(/^"#{.*}$/)) {
                value = value.replace(/^"/, "").replace(/"$/, "");
                value = value.match(/^#{(.*)}$/)[1];
              }
              attrsObject[attrs[i].name] = value;
        }
      } else {
        attrsObject[attrs[i].name] = attrs[i].val;
      }
    }
    if (key !== undefined) {
      attrsObject.key = key;
    }
    return JSON.stringify(attrsObject);
  };

  const compiler = (node, opts) => {
    if (node === undefined) return "";
    if (node === null) return "null";
    let t = "";
    for (let i = 0; i < opts.depth; i++) { t = t + "   "; }
    switch (node.type) {
      case "Tag":
        let childs = compiler(node.block, {depth: opts.depth + 1, fname: opts.fname});
        if (childs !== "") {
          return "f('" + node.name + "', "
                                        + transformAttrs(node.attrs, opts.key) + ", "
                                        + compiler(node.block, {depth: opts.depth + 1, fname: opts.fname}) +  ")";
        } else {
          return "f('" + node.name + "', "
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
        return "pugConditional(" + node.test + ", "
                  + compiler(node.consequent, {depth: opts.depth + 1, fname: opts.fname}) + ", "
                  + compiler(node.alternate, {depth: opts.depth + 1, fname: opts.fname}) + ")";
      case "Each":
        let codeBlock = compiler(node.block, {depth: opts.depth + 2, fname: opts.fname, key: node.key});
        return "(() => { for (var " + node.key + " in " + node.obj + ") { var " + node.val + " = " + node.obj + "[" + node.key + "]; return (" + codeBlock + ");}})()"
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
          if (mixins_defined[node.name] === null) {
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
