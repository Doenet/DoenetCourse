import React from 'react';
import { doenetComponentForegroundActive } from './theme';

export default function Button(props) {
  //Assume small
  var button = {
    margin: '0px',
    height: '24px',
    border: `hidden`,
    backgroundColor: `${doenetComponentForegroundActive}`,
    fontFamily: 'Arial',
    color: '#FFFFFF',
    borderRadius: '20px',
    value: 'Button',
    padding: '0px 10px 0px 10px',
    cursor: 'pointer',
    fontSize: '12px',
  };
  if (props.size === 'medium') {
    (button.height = '36px'), (button.fontSize = '18px');
  }
  if (button.width < button.height) {
    button.width = '85px';
  }
  if (props.value) {
    button.value = props.value;
  }
  function handleClick(e) {
    if (props.callback) props.callback(e);
  }
  return (
    <>
      <button
        style={button}
        {...props}
        onClick={(e) => {
          handleClick(e);
        }}
      >
        {button.value}
      </button>
    </>
  );
}
