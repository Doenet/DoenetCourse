import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Nbsp extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return <>&ndash;</>;
  }
}
