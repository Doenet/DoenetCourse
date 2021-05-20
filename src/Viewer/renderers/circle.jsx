import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Circle extends DoenetRenderer {
  constructor(props) {
    super(props);

    this.onDragHandler = this.onDragHandler.bind(this);

    if (props.board) {
      this.createGraphicalObject();

      this.doenetPropsForChildren = { board: this.props.board };
      this.initializeChildren();
    }
  }

  static initializeChildrenOnConstruction = false;

  createGraphicalObject() {
    if (
      !(
        Number.isFinite(this.doenetSvData.numericalCenter[0]) &&
        Number.isFinite(this.doenetSvData.numericalCenter[1]) &&
        this.doenetSvData.numericalRadius > 0
      )
    ) {
      return;
    }

    //things to be passed to JSXGraph as attributes
    var jsxCircleAttributes = {
      name: this.doenetSvData.label,
      visible: !this.doenetSvData.hidden,
      withLabel: this.doenetSvData.showLabel && this.doenetSvData.label !== '',
      fixed: !this.doenetSvData.draggable || this.doenetSvData.fixed,
      layer: 10 * this.doenetSvData.layer + 5,
      strokeColor: this.doenetSvData.selectedStyle.lineColor,
      highlightStrokeColor: this.doenetSvData.selectedStyle.lineColor,
      strokeWidth: this.doenetSvData.selectedStyle.lineWidth,
      dash: styleToDash(this.doenetSvData.selectedStyle.lineStyle),
    };

    if (!this.doenetSvData.draggable || this.doenetSvData.fixed) {
      jsxCircleAttributes.highlightStrokeWidth =
        this.doenetSvData.selectedStyle.lineWidth;
    }

    this.circleJXG = this.props.board.create(
      'circle',
      [
        [...this.doenetSvData.numericalCenter],
        this.doenetSvData.numericalRadius,
      ],
      jsxCircleAttributes,
    );

    this.circleJXG.on('drag', () => this.onDragHandler(true));
    this.circleJXG.on('up', () => this.onDragHandler(false));

    this.previousWithLabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';

    return this.circleJXG;
  }

  deleteGraphicalObject() {
    this.props.board.removeObject(this.circleJXG);
    delete this.circleJXG;
  }

  componentWillUnmount() {
    if (this.circleJXG) {
      this.deleteGraphicalObject();
    }
  }

  update({ sourceOfUpdate }) {
    if (!this.props.board) {
      this.forceUpdate();
      return;
    }

    if (this.circleJXG === undefined) {
      return this.createGraphicalObject();
    }

    if (
      !(
        Number.isFinite(this.doenetSvData.numericalCenter[0]) &&
        Number.isFinite(this.doenetSvData.numericalCenter[1]) &&
        this.doenetSvData.numericalRadius > 0
      )
    ) {
      // can't render circle
      return this.deleteGraphicalObject();
    }

    if (this.props.board.updateQuality === this.props.board.BOARD_QUALITY_LOW) {
      this.props.board.itemsRenderedLowQuality[this.componentName] =
        this.circleJXG;
    }

    let validCoords = this.doenetSvData.numericalCenter.every((x) =>
      Number.isFinite(x),
    );

    this.circleJXG.center.coords.setCoordinates(JXG.COORDS_BY_USER, [
      ...this.doenetSvData.numericalCenter,
    ]);
    this.circleJXG.setRadius(this.doenetSvData.numericalRadius);

    let visible = !this.doenetSvData.hidden;

    if (validCoords) {
      this.circleJXG.visProp['visible'] = visible;
      this.circleJXG.visPropCalc['visible'] = visible;
      // this.circleJXG.setAttribute({visible: visible})
    } else {
      this.circleJXG.visProp['visible'] = false;
      this.circleJXG.visPropCalc['visible'] = false;
      // this.circleJXG.setAttribute({visible: false})
    }

    this.circleJXG.name = this.doenetSvData.label;

    let withlabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';
    if (withlabel != this.previousWithLabel) {
      this.circleJXG.setAttribute({ withlabel: withlabel });
      this.previousWithLabel = withlabel;
    }

    this.circleJXG.needsUpdate = true;
    this.circleJXG.update();
    if (this.circleJXG.hasLabel) {
      this.circleJXG.label.needsUpdate = true;
      this.circleJXG.label.update();
    }
    this.props.board.updateRenderer();
  }

  onDragHandler(transient) {
    if (this.circleJXG !== undefined) {
      this.actions.moveCircle({
        center: [this.circleJXG.center.X(), this.circleJXG.center.Y()],
        transient,
      });
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

    // don't think we want to return anything if not in board
    return (
      <>
        <a name={this.componentName} />
      </>
    );
  }
}

function styleToDash(style) {
  if (style === 'solid') {
    return 0;
  } else if (style === 'dashed') {
    return 2;
  } else if (style === 'dotted') {
    return 1;
  } else {
    return 0;
  }
}
