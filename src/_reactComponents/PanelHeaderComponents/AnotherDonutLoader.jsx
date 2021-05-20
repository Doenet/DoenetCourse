import React from 'react';
import './ProgressBar.css';

//In progress
export default function ScaleDonut() {
  return (
    <div>
      <svg viewBox="0 0 500 500" className="align">
        <g className="donut-scale">
          <circle id="donut" fill="rgb(238,161,119)" cx="50" cy="50" r="50" />
          <circle
            id="donut-topping"
            cx="50"
            cy="50"
            r="40"
            fill="rgb(109,68,69)"
          />
          <circle id="donut-hole" cx="50" cy="50" r="18" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
