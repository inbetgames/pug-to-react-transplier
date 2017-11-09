import React from 'react';



export default function template(content) {
 return (
[React.createElement('div', {"id": "user", "key": 0}, 
		[((test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }})(content.user.description, 
				[React.createElement('h2', {"className": "green", "key": 0}, ['Header']),
				React.createElement('p', {"className": "description", "key": 1}, 
						[content.user.description])], null)])])
}