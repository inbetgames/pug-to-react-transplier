import React from 'react';



export default function template(content) {
 return (
[React.createElement('div', {"key": 0}, 
		[((test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }})(content.condition, 
				[React.createElement('div', {"key": 0}, 
						[content.getA()])], 
				[React.createElement('div', {"key": 0}, 
						[content.getB()])])])])
}