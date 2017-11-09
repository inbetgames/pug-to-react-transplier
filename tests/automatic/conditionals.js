import React from 'react';



export default function template(content) {
 return ([React.createElement('div', {"id": "user", "key": 0}, [((content.user.description) ? function (){return [React.createElement('h2', {"className": "green", "key": 0}, ['Description']),				React.createElement('p', {"className": "description", "key": 1}, [content.user.description])];} : function (){return ((content.authorised) ? function (){return [React.createElement('h2', {"className": "blue", "key": 0}, ['Description']),					React.createElement('p', {"className": "description", "key": 1}, ['User has no description,',							'\n',							'why not add one...'])];} : function (){return [React.createElement('h2', {"className": "red", "key": 0}, ['Description']),					React.createElement('p', {"className": "description", "key": 1}, ['User has no description'])];})();})()])])
}