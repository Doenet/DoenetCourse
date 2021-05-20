import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class StringRenderer extends DoenetRenderer {
  static initializeChildrenOnConstruction = false;

  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return <>{this.doenetSvData.value}</>;
  }
}
