import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Container extends DoenetRenderer {
  constructor(props) {
    super(props);

    if (this.props.board) {
      this.doenetPropsForChildren = { board: this.props.board };
    }
    this.initializeChildren();
  }

  static initializeChildrenOnConstruction = false;

  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return (
      <>
        <a name={this.componentName} />
        {this.children}
      </>
    );
  }
}
