import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function ButtonGroup(props) {
  const defaultValue = props.data.filter((d) => d.default)[0].value;
  let [currentValue, setCurrentValue] = useState(defaultValue);
  const handleClick = function (value) {
    setCurrentValue(value);
    props.clickCallBack(value);
  };

  return (
    <div
      style={{
        border: '1px solid grey',
        width: '55px',
        height: '23px',
        borderRadius: '5px',
        padding: '1px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {props.data.map((d, i) => (
        <button
          key={i}
          style={{
            backroundColor: 'transperant',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
            outline: 'none',
            width: '50%',
            height: '18px',
            backgroundColor: currentValue === d.value ? '#E2E2E2' : 'white',
          }}
        >
          <FontAwesomeIcon
            onClick={() => {
              handleClick(d.value);
            }}
            icon={d.icon}
            style={{ fontSize: '15px' }}
          />
        </button>
      ))}
    </div>
  );
}
