/*
Usage:
<Textinput id="someId" label="some label text" onChange={optionalFunction} />
this produces an empty text input with the label and id provided. It also does something when the content changes
or
<Textinput id="someId" label="some label text" onChange={optionalFunction}>Hello</Textinput>
this produces an input with an initial value
or
<Textinput id="someId" label="some label text" onChange={optionalFunction} value="I will override children">I am a child</Textinput>
the value prop overrides the children, the children will be ignored if there is a props.value set
Note: you can pass any additional properties if you wish, these props will be passed to the div that contains the input and label elements.
*/

import React, { useState, useEffect } from 'react';
import { useSpring, animated } from 'react-spring';
import styled from 'styled-components';
import { doenetComponentForegroundActive } from './temp/theme';

// PARAMETERS
const LABELCOLOR = '#1a5a99';
const FONTFAMILY = 'sans-serif';
const BACKGROUNDCOLOR = '#eee';
const FOCUSBACKGROUNDCOLOR = '#1a5a99';

function randomAlphaString(len) {
  let c = 'abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < len; i++) {
    str += c[Math.round(Math.random() * 25)];
  }
  return str;
}

const labelStyles = {
  baseline: {
    fontFamily: FONTFAMILY,
    position: 'absolute',
    top: '0.75em',
    fontSize: '1em',
    marginLeft: '0.7em',
    whiteSpace: 'nowrap',
    MozUserSelect: 'none' /* Firefox */,
    msUserSelect: 'none' /* Internet Explorer */,
    WebkitUserSelect: 'none' /* Chrome, Safari, and Opera */,
    WebkitTouchCallout: 'none' /* Disable Android and iOS callouts*/,
    config: {
      tension: 400,
    },
  },
  empty: {
    color: LABELCOLOR,
    position: 'absolute',
    top: '0.75em',
    fontSize: '1em',
  },
  inactive: {
    color: LABELCOLOR,
    position: 'absolute',
    top: '0.75em',
    fontSize: '1em',
  },
  notEmpty: {
    color: LABELCOLOR,
    top: '0.3em',
    fontSize: '0.7em',
  },
  active: {
    color: '#eee',
    top: '0.3em',
    fontSize: '0.7em',
  },
};

const inputStyles = {
  baseline: {
    fontSize: '1em',
    padding: '1em 0.5em 0.5em 0.5em',
    border: 'none',
    backgroundColor: BACKGROUNDCOLOR,
    borderRadius: '0.33em',
    outline: '0',
    width: 'calc(100% - 1em)',
  },
  inactive: {
    color: '#000',
    backgroundColor: BACKGROUNDCOLOR,
  },
  active: {
    color: '#eee',
    backgroundColor: FOCUSBACKGROUNDCOLOR,
  },
};

const AnimatedLabel = animated.label;
const AnimatedInput = animated.input;
const AnimatedTextarea = animated.textarea;

const StyledInputContainer = styled.div`
  all: initial;
  font-size: 1em;
  display: block;
  position: relative;
  margin: 1em;
  width: calc(100% - 2em);
  overflow: hidden;
`;

const LengthIndicator = styled.p`
  position: absolute;
  bottom: 0;
  right: 1em;
  color: ${LABELCOLOR};
  font-family: sans-serif;
`;

export default function Textinput(props) {
  // props
  let area = props.area || false;
  let name = props.name || props.id;
  let id = props.id;
  if (!id) {
    // we must have an id
    id = randomAlphaString(20); // a random name and id will be chosen if there is no id name is specified.
  }

  // Section: states
  let [value, setValue] = useState(props.value || props.children || ''); // will be undefined if not specified which will show up like an empty string.

  // Section: spring animations
  const [labelStyle, setLabelStyle] = useSpring(() => labelStyles.baseline);
  //const [update, setUpdate] = useState(0);

  useEffect(() => {
    if (value) {
      //console.log(">>> non-empty value: ", value);
      setLabelStyle(labelStyles.notEmpty);
      //setUpdate(update);
    }
  }, []);

  // allow specifying resize property for textarea
  let inputStylesWithResize = {
    ...inputStyles,
    baseline: {
      ...inputStyles.baseline,
      resize: props.resize || (area ? 'both' : 'none'),
    },
  };

  const [inputStyle, setInputStyle] = useSpring(
    () => inputStylesWithResize.baseline,
  );

  // Section: event handlers
  function handleFocus(e) {
    setInputStyle(inputStyles.active);
    setLabelStyle(labelStyles.active);
    //console.log(">>> focus");
  }

  function handleBlur(e) {
    // blur");
    setInputStyle(inputStyles.inactive);
    if (!value) {
      setLabelStyle(labelStyles.inactive);
    } else {
      setLabelStyle(labelStyles.notEmpty);
    }
  }

  if (area) {
    return (
      <StyledInputContainer
        {...props}
        style={props.style}
        className={props.className}
        key={id + '-doenet-textinput-container'}
      >
        <AnimatedLabel
          key={id + '-doenet-textinput-label'}
          style={labelStyle}
          htmlFor={id}
        >
          {props.label}
        </AnimatedLabel>
        <AnimatedTextarea
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => {
            setValue(e.target.value);
            props.onChange(e);
          }}
          style={inputStyle}
          id={id}
          name={name}
          value={value}
          key={id + '-doenet-input'}
          rows={props.rows}
          cols={props.cols}
          maxLength={props.maxlength}
        />
        <LengthIndicator>{`${value.length}/${props.maxlength}`}</LengthIndicator>
      </StyledInputContainer>
    );
  }

  return (
    <StyledInputContainer {...props} key={id + '-doenet-textinput-container'}>
      <AnimatedLabel
        key={id + '-doenet-textinput-label'}
        style={labelStyle}
        htmlFor={id}
      >
        {props.label}
      </AnimatedLabel>
      <AnimatedInput
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange(e);
        }}
        style={inputStyle}
        id={id}
        name={name}
        value={value}
        key={id + '-doenet-input'}
      />
    </StyledInputContainer>
  );
}

// separate out animatedinput??????
