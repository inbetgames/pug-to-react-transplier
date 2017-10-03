const lex = require('pug-lexer');
const parse = require('pug-parser');
const walk = require('pug-walk');
const pug = require('pug');
const fs = require('fs');
const path = require('path');

const rootfname = "../../javascript/azartcasino/src/app/views/index.jade";
//const rootfname = "test.jade";

var mixins_defined = {};
var mixins = ["const f = React.createElement;",
              "const pugConditional = (test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }}"];
const transformAttrs = (attrs, key) => {
  var attrsObject = {};
  for (var i = 0; i < attrs.length; i++) {
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
          var lexemes = attrs[i].val.split(/,/).map((l) => l.split(/: /));
          console.log(lexemes);
          break;
        default:
            attrsObject[attrs[i].name] = attrs[i].val.replace(/^'/, "").replace(/'$/, "");
      }
    } else {
      attrsObject[attrs[i].name] = attrs[i].val;
    }
  }
  if (key !== undefined) {
    attrsObject.key = key;
  }
  return JSON.stringify(attrsObject);
}

const compiler = (node, opts) => {
  if (node === undefined) return "";
  if (node === null) return "null";
  var t = "";
  for (var i = 0; i < opts.depth; i++) { t = t + "   "; }
  switch (node.type) {
    case "Tag":
      var childs = compiler(node.block, {depth: opts.depth + 1, fname: opts.fname});
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
      var blockResult = node.nodes.map((n, i) => compiler(n, {depth: opts.depth + 1, fname: opts.fname, key: i})).filter((l) => l != "").join(",\n" + t);
      if (blockResult != "") {
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
      var codeBlock = compiler(node.block, {depth: opts.depth + 2, fname: opts.fname, key: node.key});
      return "(() => { for (var " + node.key + " in " + node.obj + ") { var " + node.val + " = " + node.obj + "[" + node.key + "]; return (" + codeBlock + ");}})()"
    case "RawInclude":
      const basepath = path.parse(opts.fname).dir + "/" + node.file.path + ".jade";
      return compiler(parse(lex(fs.readFileSync(basepath).toString())), {depth: opts.depth + 1, fname: basepath});
    case "Comment":
      return "";
    case "Mixin":
      if (node.call) {
        return node.name + "(" + node.args + ")";
      } else {
        var mixin =
          "// " + node.name + "\n" +
          "const " + node.name + " = (" + (node.args===null?"":node.args) + ") => [" + compiler(node.block, {depth: 1, fname: opts.fname}) + "]";
        if (mixins_defined[node.name] == null) {
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
}

const transform = (rootfname) => {
  var text = fs.readFileSync(rootfname).toString();
  var ast = parse(lex(text));

  return "export default function template(content) {\n return (" + compiler(ast, {depth: 0, fname: rootfname}) + ")\n}";
}
var transformed = transform(rootfname);
var compiled = mixins.join("\n") + "\n" + transformed;

fs.writeFileSync("output.js", "import React from 'react';\n\n\n" + compiled);
