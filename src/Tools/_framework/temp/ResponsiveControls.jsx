import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const ControlGroupParent = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const CtrlGroup = styled.div`
  display: flex;
  flex-direction: row;
`;

export default function ControlGroup(props) {
  // var elementsArray = [];
  var ctrlGrpRef = useRef();
  var minimizedIcon = props.icon;

  useEffect(() => {
    if (ctrlGrpRef.current) {
      if (props.fromMaximize === undefined && props.getControlGroupsWidth) {
        props.getControlGroupsWidth(
          ctrlGrpRef.current.getBoundingClientRect().width,
        );
      }
    }
  }, []);

  // props.children.forEach(grpElement=> {
  //   elementsArray.push(grpElement)
  // });

  return (
    <React.Fragment>
      <ControlGroupParent ref={ctrlGrpRef}>
        <CtrlGroup>{props.children}</CtrlGroup>
      </ControlGroupParent>
    </React.Fragment>
  );
}
