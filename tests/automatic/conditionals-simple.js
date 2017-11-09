import React from 'react';



export default function template(content) {
 return ([React.createElement('div', {"id": "user", "key": 0}, [((content.user.description) ? function (){return [React.createElement('h2', {"className": "green", "key": 0}, ['Header']),				React.createElement('p', {"className": "description", "key": 1}, [content.user.description])];} : function (){return null;})()])])
}