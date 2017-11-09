import React from 'react';



export default function template(content) {
  return ([((content.a && content.a.b) ? function() {
    return [React.createElement('div', {
      "key": 0
    }, [content.a.b.c])];
  } : function() {
    return null;
  })()])
}