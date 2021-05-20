import React from 'react';
import DoenetRenderer from './DoenetRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb as lightOff } from '@fortawesome/free-solid-svg-icons';
import { faLightbulb as lightOn } from '@fortawesome/free-regular-svg-icons';
import { faCaretRight as twirlIsClosed } from '@fortawesome/free-solid-svg-icons';
import { faCaretDown as twirlIsOpen } from '@fortawesome/free-solid-svg-icons';

export default class Hint extends DoenetRenderer {
  render() {
    if (!this.doenetSvData.showHints) {
      return null;
    }

    let childrenToRender = this.children;

    let title;
    if (this.doenetSvData.titleDefinedByChildren) {
      title = this.children[0];
      childrenToRender = this.children.slice(1); // remove title
    } else {
      title = this.doenetSvData.title;
    }

    let twirlIcon = <FontAwesomeIcon icon={twirlIsClosed} />;
    let icon = <FontAwesomeIcon icon={lightOff} />;
    let info = null;
    let infoBlockStyle = { display: 'none' };
    let onClickFunction;

    let openCloseText = 'open';

    if (this.doenetSvData.open) {
      twirlIcon = <FontAwesomeIcon icon={twirlIsOpen} />;
      openCloseText = 'close';
      icon = <FontAwesomeIcon icon={lightOn} />;
      info = childrenToRender;
      infoBlockStyle = {
        display: 'block',
        margin: '0px 4px 4px 4px',
        padding: '6px',
        border: '1px solid #C9C9C9',
        backgroundColor: '#fcfcfc',
      };
      onClickFunction = this.actions.closeHint;
    } else {
      onClickFunction = this.actions.revealHint;
    }
    return (
      <aside id={this.componentName} key={this.componentName}>
        <a name={this.componentName} />
        <span
          style={{
            display: 'block',
            margin: '4px 4px 0px 4px',
            padding: '6px',
            border: '1px solid #C9C9C9',
            backgroundColor: '#ebebeb',
            cursor: 'pointer',
          }}
          onClick={onClickFunction}
        >
          {twirlIcon} {icon} {title} (click to {openCloseText})
        </span>
        <span style={infoBlockStyle}>{info}</span>
      </aside>
    );
  }
}
