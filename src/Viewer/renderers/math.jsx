import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class MathRenderer extends DoenetRenderer {
  // static initializeChildrenOnConstruction = false;

  componentDidMount() {
    window.MathJax.Hub.Config({
      showProcessingMessages: false,
      'fast-preview': { disabled: true },
    });
    window.MathJax.Hub.processSectionDelay = 0;
    window.MathJax.Hub.Queue([
      'Typeset',
      window.MathJax.Hub,
      '#' + this.componentName,
    ]);
  }

  componentDidUpdate() {
    window.MathJax.Hub.Queue([
      'Typeset',
      window.MathJax.Hub,
      '#' + this.componentName,
    ]);
  }

  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    let beginDelim, endDelim;
    if (this.doenetSvData.renderMode === 'inline') {
      beginDelim = '\\(';
      endDelim = '\\)';
    } else if (this.doenetSvData.renderMode === 'display') {
      beginDelim = '\\[';
      endDelim = '\\]';
    } else if (this.doenetSvData.renderMode === 'numbered') {
      beginDelim = `\\begin{gather}\\tag{${this.doenetSvData.equationTag}}`;
      endDelim = '\\end{gather}';
    } else if (this.doenetSvData.renderMode === 'align') {
      beginDelim = '\\begin{align}';
      endDelim = '\\end{align}';
    } else {
      // treat as inline if have unrecognized renderMode
      beginDelim = '\\(';
      endDelim = '\\)';
    }

    // if element of latexOrInputChildren is a number,
    // then that element is an index of which child (a mathInput) to render
    // else, that element is a latex string

    // TODO: we don't want deliminers around each piece,
    // instead, we want to be able to put the mathInput inside mathjax
    // This is just a stopgap solution that works in a few simple cases!!!

    let latexOrInputChildren = this.doenetSvData.latexWithInputChildren.map(
      (x) =>
        typeof x === 'number' ? this.children[x] : beginDelim + x + endDelim,
    );

    let anchors = [
      React.createElement('a', {
        name: this.componentName,
        key: this.componentName,
      }),
    ];
    if (this.doenetSvData.mrowChildNames) {
      anchors.push(
        this.doenetSvData.mrowChildNames.map((x) =>
          React.createElement('a', { name: x, key: x }),
        ),
      );
    }

    // TODO: BADBADBAD
    // Don't understand why MathJax isn't updating when using {latexOrInputChildren}
    // so hard coded the only two cases using so far: with 1 or 2 entries

    if (latexOrInputChildren.length === 0) {
      return (
        <>
          {anchors}
          <span id={this.componentName}></span>
        </>
      );
    } else if (latexOrInputChildren.length === 1) {
      return (
        <>
          {anchors}
          <span id={this.componentName}>{latexOrInputChildren[0]}</span>
        </>
      );
    } else if (latexOrInputChildren.length === 2) {
      return (
        <>
          {anchors}
          <span id={this.componentName}>
            {latexOrInputChildren[0]}
            {latexOrInputChildren[1]}
          </span>
        </>
      );
    } else {
      return (
        <>
          {anchors}
          <span id={this.componentName}>{latexOrInputChildren[0]}</span>
        </>
      );
    }
  }
}
