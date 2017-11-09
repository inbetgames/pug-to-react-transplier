'use strict';

Object.defineProperty(exports, "__esModule", {
		value: true
});
exports.default = template;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function template(content) {
		return [_react2.default.createElement('div', { "id": "user", "key": 0 }, [function (test, consequent, alternate) {
				if (test) {
						return consequent;
				} else {
						return alternate;
				}
		}(content.user.description, [_react2.default.createElement('h2', { "className": "green", "key": 0 }, ['Description']), _react2.default.createElement('p', { "className": "description", "key": 1 }, [content.user.description])], function (test, consequent, alternate) {
				if (test) {
						return consequent;
				} else {
						return alternate;
				}
		}(content.authorised, [_react2.default.createElement('h2', { "className": "blue", "key": 0 }, ['Description']), _react2.default.createElement('p', { "className": "description", "key": 1 }, ['User has no description,', '\n', 'why not add one...'])], [_react2.default.createElement('h2', { "className": "red", "key": 0 }, ['Description']), _react2.default.createElement('p', { "className": "description", "key": 1 }, ['User has no description'])]))])];
}
