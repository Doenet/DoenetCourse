import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Em extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return (
      <code id={this.componentName}>
        <a name={this.componentName} />
        {this.children}
      </code>
    );
  }
}
