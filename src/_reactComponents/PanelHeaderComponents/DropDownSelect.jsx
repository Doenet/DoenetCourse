import React from 'react';
import SelectBox from './SelectBox';

import './selectbox.css';

export default function DropDownSelect(props) {
  return (
    <div className="drop-down-select">
      <div style={{ margin: '1px' }} />
      <SelectBox items={props.data} />
    </div>
  );
}
