import React from 'react';
import './ProgressBar.css';

export default function ProgressBar(props) {
  //Takes percentage without symbol and updates length of loaded bar
  //Any number from 0-100 inclusive
  //Needs to be called when you want the length to update
  function convert() {
    var elem = document.getElementById('moving');
    var width = elem.width.animVal.value;
    var decimalPercent = percent / 100;
    width = decimalPercent * 1000;
    elem.setAttribute('width', width);
    return width;
  }
  // if (props.percent) {
  //   var percent = (props.percent)/100;
  //   // var elem = document.getElementById("moving");
  //   // var length = elem.width.animVal.value;
  //   // if (length == 1000) {
  //   //   length = 0;
  //   // } else {
  //   //   length = percent * 1000;
  //   // }
  //   // elem.setAttribute("width", length);
  //   // return(length)
  //   load(percent)
  // }
  function load(percent) {
    var elem = document.getElementById('moving');
    var length = elem.width.animVal.value;
    if (length == 1000) {
      length = 0;
    } else {
      length = percent * 1000;
    }
    elem.setAttribute('width', length);
    return length;
  }

  function submit() {
    var percent = document.getElementById('percent').value / 100;
    load(percent);
  }
  return (
    <div>
      <svg viewBox="0 -200 1500 500">
        <rect
          id="main"
          x="50"
          y="150"
          rx="25"
          fill="#E2E2E2"
          stroke="none"
          strokeWidth="0"
          width="1000"
          height="50"
        />
        <rect
          id="moving"
          x="50"
          y="150"
          rx="25"
          fill="#1A5A99"
          stroke="none"
          strokeWidth="0"
          width="0"
          height="50"
        />
        <g className="donut-main">
          <circle id="donut" fill="rgb(238,161,119)" cx="100" cy="100" r="50" />
          <circle
            id="donut-topping"
            cx="100"
            cy="100"
            r="40"
            fill="rgb(109,68,69)"
          />
          {/* <rect 
              id="sprinkle"
              x="125"
              y="22"
              rx="3"
              fill="pink"
              stroke="none"
              width="15"
              height="6"
              transform='rotate(45)'
            /> */}
          <circle id="donut-hole" cx="100" cy="100" r="15" fill="#FFFFFF" />
        </g>
      </svg>
      <input type="text" id="percent"></input>
      <p>%</p>
      <button
        className="button"
        onClick={() => {
          submit();
        }}
      >
        Submit
      </button>
    </div>
  );
}
