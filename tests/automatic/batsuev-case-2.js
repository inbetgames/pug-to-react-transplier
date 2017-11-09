import React from 'react';



export default function template(content) {
 return ([React.createElement('div', {"key": 0}, [((content.condition) ? function (){return [React.createElement('div', {"key": 0}, [content.getA()])];} : function (){return [React.createElement('div', {"key": 0}, [content.getB()])];})()])])
}