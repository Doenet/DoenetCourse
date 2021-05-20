import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class UpdateValue extends DoenetRenderer {
  static initializeChildrenOnConstruction = false;

  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    return (
      <span id={this.componentName}>
        <a name={this.componentName} />
        <button
          id={this.componentName + '_button'}
          onClick={this.actions.updateValue}
          disabled={this.doenetSvData.disabled}
        >
          {this.doenetSvData.label}
        </button>
      </span>
    );
  }
}
