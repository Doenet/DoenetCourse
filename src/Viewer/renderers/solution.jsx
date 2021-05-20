import React from 'react';
import DoenetRenderer from './DoenetRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPuzzlePiece as puzzle } from '@fortawesome/free-solid-svg-icons';

export default class Solution extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    let icon;
    let childrenToRender = null;
    let infoBlockStyle = { display: 'none' };

    let onClickFunction;
    let cursorStyle;

    if (this.doenetSvData.open) {
      icon = <FontAwesomeIcon icon={puzzle} />;

      childrenToRender = this.children;
      infoBlockStyle = {
        display: 'block',
        margin: '0px 4px 4px 4px',
        padding: '6px',
        border: '1px solid #ebebeb',
        backgroundColor: '#fcfcfc',
      };

      if (this.doenetSvData.canBeClosed) {
        cursorStyle = 'pointer';
        onClickFunction = this.actions.closeSolution;
      } else {
        onClickFunction = null;
      }
    } else {
      icon = <FontAwesomeIcon icon={puzzle} rotation={90} />;
      cursorStyle = 'pointer';
      onClickFunction = this.actions.revealSolution;
    }

    return (
      <aside id={this.componentName}>
        <a name={this.componentName} />
        <span
          style={{
            display: 'block',
            margin: '4px 4px 0px 4px',
            padding: '6px',
            border: '1px solid #ebebeb',
            backgroundColor: '#ebebeb',
            cursor: cursorStyle,
          }}
          onClick={onClickFunction}
        >
          {icon} Solution {this.doenetSvData.message}
        </span>
        <span style={infoBlockStyle}>{childrenToRender}</span>
      </aside>
    );
  }
}
