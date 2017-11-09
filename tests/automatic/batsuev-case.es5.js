'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = template;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function template(content) {
  return [(content.a && content.a.b ? function () {
    return [_react2.default.createElement('div', {
      "key": 0
    }, [content.a.b.c])];
  } : function () {
    return null;
  })()];
}
