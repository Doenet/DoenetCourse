import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Angle extends DoenetRenderer {
  constructor(props) {
    super(props);

    if (props.board) {
      this.createGraphicalObject();

      this.doenetPropsForChildren = { board: this.props.board };
      this.initializeChildren();
    }
  }

  static initializeChildrenOnConstruction = false;

  createGraphicalObject() {
    if (
      this.doenetSvData.numericalPoints.length !== 3 ||
      this.doenetSvData.numericalPoints.some((x) => x.length !== 2) ||
      !(
        Number.isFinite(this.doenetSvData.numericalRadius) &&
        this.doenetSvData.numericalRadius > 0
      )
    ) {
      return;
    }

    let angleColor = '#FF7F00';

    var jsxAngleAttributes = {
      name: this.doenetSvData.label,
      visible: !this.doenetSvData.hidden,
      withLabel: this.doenetSvData.showLabel && this.doenetSvData.label !== '',
      fixed: true, //this.doenetSvData.draggable !== true,
      layer: 10 * this.doenetSvData.layer + 7,
      radius: this.doenetSvData.numericalRadius,
      fillColor: angleColor,
      strokeColor: angleColor,
      highlightFillColor: angleColor,
      highlightStrokeColor: angleColor,
    };

    let through;

    if (
      this.doenetSvData.renderAsAcuteAngle &&
      this.doenetSvData.degrees % 360 > 180
    ) {
      through = [
        [...this.doenetSvData.numericalPoints[2]],
        [...this.doenetSvData.numericalPoints[1]],
        [...this.doenetSvData.numericalPoints[0]],
      ];
    } else {
      through = [
        [...this.doenetSvData.numericalPoints[0]],
        [...this.doenetSvData.numericalPoints[1]],
        [...this.doenetSvData.numericalPoints[2]],
      ];
    }

    let jsxPointAttributes = {
      visible: false,
    };

    // create invisible points at through
    this.point1JXG = this.props.board.create(
      'point',
      through[0],
      jsxPointAttributes,
    );
    this.point2JXG = this.props.board.create(
      'point',
      through[1],
      jsxPointAttributes,
    );
    this.point3JXG = this.props.board.create(
      'point',
      through[2],
      jsxPointAttributes,
    );

    this.angleJXG = this.props.board.create(
      'angle',
      [this.point1JXG, this.point2JXG, this.point3JXG],
      jsxAngleAttributes,
    );

    this.previousWithLabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';

    return this.angleJXG;
  }

  deleteGraphicalObject() {
    this.props.board.removeObject(this.angleJXG);
    delete this.angleJXG;
    this.props.board.removeObject(this.point1JXG);
    delete this.point1JXG;
    this.props.board.removeObject(this.point2JXG);
    delete this.point2JXG;
    this.props.board.removeObject(this.point3JXG);
    delete this.point3JXG;
  }

  componentWillUnmount() {
    if (this.angleJXG) {
      this.deleteGraphicalObject();
    }
  }

  update({ sourceOfUpdate }) {
    if (!this.props.board) {
      this.forceUpdate();
      return;
    }

    if (this.angleJXG === undefined) {
      return this.createGraphicalObject();
    }

    if (
      this.doenetSvData.numericalPoints.length !== 3 ||
      this.doenetSvData.numericalPoints.some((x) => x.length !== 2) ||
      !(
        Number.isFinite(this.doenetSvData.numericalRadius) &&
        this.doenetSvData.numericalRadius > 0
      )
    ) {
      return this.deleteGraphicalObject();
    }

    let through;

    if (
      this.doenetSvData.renderAsAcuteAngle &&
      this.doenetSvData.degrees % 360 > 180
    ) {
      through = [
        [...this.doenetSvData.numericalPoints[2]],
        [...this.doenetSvData.numericalPoints[1]],
        [...this.doenetSvData.numericalPoints[0]],
      ];
    } else {
      through = [
        [...this.doenetSvData.numericalPoints[0]],
        [...this.doenetSvData.numericalPoints[1]],
        [...this.doenetSvData.numericalPoints[2]],
      ];
    }

    // in JSXgraph, point 1 and point 2 are switched
    this.angleJXG.point2.coords.setCoordinates(JXG.COORDS_BY_USER, through[0]);
    this.angleJXG.point1.coords.setCoordinates(JXG.COORDS_BY_USER, through[1]);
    this.angleJXG.point3.coords.setCoordinates(JXG.COORDS_BY_USER, through[2]);

    this.angleJXG.setAttribute({
      radius: this.doenetSvData.numericalRadius,
      visible: !this.doenetSvData.hidden,
    });

    this.angleJXG.name = this.doenetSvData.label;
    // this.lineJXG.visProp.withlabel = this.showlabel && this.label !== "";

    let withlabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';
    if (withlabel != this.previousWithLabel) {
      this.angleJXG.setAttribute({ withlabel: withlabel });
      this.previousWithLabel = withlabel;
    }

    this.angleJXG.needsUpdate = true;
    this.angleJXG.update();

    if (this.angleJXG.hasLabel) {
      this.angleJXG.label.needsUpdate = true;
      this.angleJXG.label.update();
    }
    this.props.board.updateRenderer();
  }

  componentDidMount() {
    if (!this.props.board) {
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
  }

  componentDidUpdate() {
    if (!this.props.board) {
      window.MathJax.Hub.Queue([
        'Typeset',
        window.MathJax.Hub,
        '#' + this.componentName,
      ]);
    }
  }

  render() {
    if (this.props.board) {
      return (
        <>
          <a name={this.componentName} />
          {this.children}
        </>
      );
    }

    if (this.doenetSvData.hidden) {
      return null;
    }

    let mathJaxify;
    if (this.doenetSvData.inDegrees) {
      mathJaxify = '\\(' + this.doenetSvData.degrees + '^\\circ \\)';
    } else {
      mathJaxify = '\\(' + this.doenetSvData.radians + '\\)';
    }

    return (
      <>
        <a name={this.componentName} />
        <span id={this.componentName}>{mathJaxify}</span>
      </>
    );
  }
}
