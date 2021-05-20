import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Ref extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    let linkContent = this.children;
    if (this.children.length === 0) {
      linkContent = this.doenetSvData.linkText;
    }
    if (this.doenetSvData.uri) {
      // if(this is a doenet content id) {
      //   return <a id={this.componentName} name={this.componentName} href={}>{linkContent}</a>
      // }
      return (
        <a
          id={this.componentName}
          name={this.componentName}
          href={this.doenetSvData.uri}
        >
          {linkContent}
        </a>
      );
    } else {
      return (
        <a
          id={this.componentName}
          name={this.componentName}
          href={'#' + this.doenetSvData.targetName}
        >
          {linkContent}
        </a>
      );
    }
  }
}
