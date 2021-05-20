import React from 'react';
import DoenetRenderer from './DoenetRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment as thoughtBubble } from '@fortawesome/free-regular-svg-icons';
// import { faComment as thoughtBubble } from '@fortawesome/free-solid-svg-icons';

export default class Feedback extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }
    let icon = <FontAwesomeIcon icon={thoughtBubble} />;

    return (
      <>
        <span
          style={{
            display: 'block',
            margin: '0px 4px 0px 4px',
            padding: '6px',
            border: '1px solid #C9C9C9',
            backgroundColor: '#ebebeb',
          }}
        >
          {icon} Feedback
        </span>
        <aside
          id={this.componentName}
          style={{
            backgroundColor: 'white',
            margin: '0px 4px 0px 4px',
            padding: '1em',
            border: '1px solid #C9C9C9',
          }}
        >
          <a name={this.componentName} />

          {this.doenetSvData.feedbackText}
          {this.children}
        </aside>
      </>
    );
  }
}
