import React from 'react';
import styled, { ThemeProvider, css } from 'styled-components';

const Button = styled.button`
  margin: ${(props) => props.theme.margin};
  height: 24px;
  border-style: solid;
  border-color: black;
  border-width: 2px;
  color: black;
  background-color: #fff;
  border-radius: ${(props) => props.theme.borderRadius};
  padding: ${(props) => props.theme.padding};
  cursor: pointer;
  font-size: 12px;
`;

Button.defaultProps = {
  theme: {
    margin: '0',
    borderRadius: '5px',
    padding: '0px 10px 0px 10px',
  },
};

export default function ActionButton(props) {
  //Assume small
  var actionButton = {
    value: 'Action Button',
  };
  if (props.size === 'medium') {
    (actionButton.height = '36px'), (actionButton.fontSize = '18px');
  }
  if (props.value) {
    actionButton.value = props.value;
  }
  if (props.num === 'first') {
    actionButton.borderRadius = '5px 0px 0px 5px';
  }
  if (props.num === 'last') {
    actionButton.borderRadius = '0px 5px 5px 0px';
  }
  function handleClick() {
    if (props.callback) props.callback();
  }
  //TODO handleClick() is not defined
  return (
    <>
      <Button
        id="actionButton"
        style={actionButton}
        onClick={() => {
          handleClick();
        }}
      >
        {actionButton.value}
      </Button>
    </>
  );
}
