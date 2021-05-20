import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class TextOrInline extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return (
      <span id={this.componentName}>
        <a name={this.componentName} />
        {this.children}
      </span>
    );
  }
}
