import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Alert extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return (
      <strong id={this.componentName}>
        <a name={this.componentName} />
        {this.children}
      </strong>
    );
  }
}
