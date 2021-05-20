import React from 'react';
import styled from 'styled-components';

export default function SectionDivider(props) {
  let divStyle = {
    display: 'grid',
    gridAutoFlow: 'row',
    gridGap: 8,
    padding: 8,
    width: 240,
    boxSizing: 'border-box',
  };
  switch (props.type) {
    case 1:
    case 'single':
      divStyle.gridTemplate = 'repeat(1, 1fr) / repeat(1, 1fr)';
      break;
    case 2:
    case 'double':
      divStyle.gridTemplate = 'repeat(1 , 1fr) / repeat(2, 1fr)';
      break;
    default:
      divStyle.gridTemplate =
        'repeat(' + props.rows + ', 1fr) / repeat(' + props.columns + ', 1fr)';
      divStyle.gridGap = props.gap;
  }

  return <div style={divStyle}>{props.children}</div>;
}
