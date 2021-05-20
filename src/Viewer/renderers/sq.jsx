import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Alert extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return (
      <>
        <a name={this.componentName} />
        &lsquo;{this.children}&rsquo;
      </>
    );
  }
}
