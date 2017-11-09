import React from 'react';



export default function template(content) {
 return (
[React.createElement('div', {"id": "user", "key": 0}, 
		[((test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }})(content.user.description, 
				[React.createElement('h2', {"className": "green", "key": 0}, ['Description']),
				React.createElement('p', {"className": "description", "key": 1}, 
						[content.user.description])], ((test, consequent, alternate) => {if (test) { return consequent; } else { return alternate; }})(content.authorised, 
					[React.createElement('h2', {"className": "blue", "key": 0}, ['Description']),
					React.createElement('p', {"className": "description", "key": 1}, ['User has no description,',
							'\n',
							'why not add one...'])], 
					[React.createElement('h2', {"className": "red", "key": 0}, ['Description']),
					React.createElement('p', {"className": "description", "key": 1}, ['User has no description'])]))])])
}