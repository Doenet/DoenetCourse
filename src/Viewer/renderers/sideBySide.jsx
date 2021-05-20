import React, { useRef, useState, useEffect } from 'react';

// import styled from "styled-components";
import useDoenetRender from './useDoenetRenderer';

export default function sideBySide(props) {
  let [name, SVs, _, children] = useDoenetRender(props);
  // console.log(">>>name: ", name, " value: ", SVs);
  // console.log(">>>children",children)

  if (SVs.hidden) {
    return null;
  }

  let styledChildren = [];
  const marginLeft = SVs.margins[0];
  const marginRight = SVs.margins[1];

  const nCols = children.length;

  for (let [i, child] of children.entries()) {
    let width = SVs.widths[i];
    // console.log(">>>marginLeft",marginLeft)
    // console.log(">>>width",width)
    // console.log(">>>marginRight",marginRight)
    // console.log(">>>gap",SVs.gapWidth)

    let thisMarginLeft = marginLeft;
    let thisMarginRight = marginRight;

    if (i > 0) {
      thisMarginLeft += SVs.gapWidth / 2;
    }
    if (i < nCols - 1) {
      thisMarginRight += SVs.gapWidth / 2;
    }

    styledChildren.push(
      <span
        style={{
          marginLeft: `${thisMarginLeft}%`,
          marginRight: `${thisMarginRight}%`,
          width: `${width}%`,
        }}
        key={child.key}
      >
        {child}
      </span>,
    );
  }

  return (
    <div id={name} style={{ display: 'flex', maxWidth: '800px' }}>
      <a name={name} />
      {styledChildren}
    </div>
  );
}
