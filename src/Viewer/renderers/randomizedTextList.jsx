import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class RandomizedTextList extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }
    return (
      <>
        <a name={this.componentName} />
        <span id={this.componentName}>{this.children}</span>
      </>
    );
  }
}
