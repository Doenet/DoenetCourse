import React, { useState } from 'react';

import './Switch.css';

function randomAlphaString(len) {
  let c = 'abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < len; i++) {
    str += c[Math.round(Math.random() * 25)];
  }
  return str;
}

export default function Switch(props) {
  // props
  let id = props.id;
  if (!id) {
    // we must (should) have an id
    id = randomAlphaString(20); // a random name and id will be chosen if there is no id name is specified.
  }

  if (props.size === 'Small') {
  }

  let propsChecked = false;
  if (
    props.checked === true ||
    props.checked === 'true' ||
    props.checked === '1' ||
    props.checked === 1
  ) {
    propsChecked = true;
  }
  // Section: states
  let [checked, setChecked] = useState(propsChecked || false); // will be undefined if not specified which will show up like an empty string.

  return (
    <div className={(props.className || '') + ' switch'} key={id + 'container'}>
      <label key={id + 'label'} htmlFor={id}>
        <input
          type="checkbox"
          onChange={(e) => {
            setChecked(e.target.checked);
            props.onChange(e);
          }}
          id={id}
          name={props.name}
          key={id}
          checked={checked}
        />
        <span className={'switch-visual'} />
        <span className={'switch-text'}>{props.children}</span>
      </label>
    </div>
  );
}
