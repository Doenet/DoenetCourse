import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class P extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return (
      <p id={this.componentName}>
        <a name={this.componentName} />
        {this.children}
      </p>
    );
  }
}
