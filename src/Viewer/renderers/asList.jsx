import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class AsList extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    // BADBADBAD: what is the best way to filter out the hidden children?
    // This approach doesn't seem like a good idea.
    let children = this.children.filter(
      (x) => !x.props.componentInstructions.stateValues.hidden,
    );

    if (children.length === 0) {
      return <React.Fragment key={this.componentName} />;
    }

    let withCommas = children
      .slice(1)
      .reduce((a, b) => [...a, ', ', b], [children[0]]);

    return (
      <React.Fragment key={this.componentName}>
        <a name={this.componentName} />
        {withCommas}
      </React.Fragment>
    );
  }
}
