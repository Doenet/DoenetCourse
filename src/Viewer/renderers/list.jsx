import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class List extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    // TODO: incorporate label
    if (this.doenetSvData.item) {
      return (
        <li id={this.componentName}>
          <a name={this.componentName} />
          {this.children}
        </li>
      );
    } else if (this.doenetSvData.numbered) {
      return (
        <ol id={this.componentName}>
          <a name={this.componentName} />
          {this.children}
        </ol>
      );
    } else {
      return (
        <ul id={this.componentName}>
          <a name={this.componentName} />
          {this.children}
        </ul>
      );
    }
  }
}
