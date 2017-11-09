import React from 'react';



export default function template(content) {
 return (
[((test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }})(content.a && content.a.b, 
		[React.createElement('div', {"key": 0}, 
				[content.a.b.c])], null)])
}