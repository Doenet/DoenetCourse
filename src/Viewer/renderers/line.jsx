import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Line extends DoenetRenderer {
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
      this.doenetSvData.numericalPoints.length !== 2 ||
      this.doenetSvData.numericalPoints.some((x) => x.length !== 2)
    ) {
      return;
    }

    //things to be passed to JSXGraph as attributes
    var jsxLineAttributes = {
      name: this.doenetSvData.label,
      visible: !this.doenetSvData.hidden,
      withLabel: this.doenetSvData.showLabel && this.doenetSvData.label !== '',
      fixed: !this.doenetSvData.draggable || this.doenetSvData.fixed,
      layer: 10 * this.doenetSvData.layer + 7,
      strokeColor: this.doenetSvData.selectedStyle.lineColor,
      highlightStrokeColor: this.doenetSvData.selectedStyle.lineColor,
      strokeWidth: this.doenetSvData.selectedStyle.lineWidth,
      dash: styleToDash(this.doenetSvData.selectedStyle.lineStyle),
    };

    if (!this.doenetSvData.draggable || this.doenetSvData.fixed) {
      jsxLineAttributes.highlightStrokeWidth =
        this.doenetSvData.selectedStyle.lineWidth;
    }

    let through = [
      [...this.doenetSvData.numericalPoints[0]],
      [...this.doenetSvData.numericalPoints[1]],
    ];

    this.lineJXG = this.props.board.create('line', through, jsxLineAttributes);

    this.lineJXG.on(
      'drag',
      function (e) {
        this.dragged = true;

        //board.suspendUpdate();
        this.onDragHandler(e, true);
        //board.unsuspendUpdate();
      }.bind(this),
    );

    this.lineJXG.on(
      'up',
      function (e) {
        this.onDragHandler(e, false);
      }.bind(this),
    );

    this.lineJXG.on(
      'down',
      function (e) {
        this.dragged = false;
        this.pointerAtDown = [e.x, e.y];
        this.pointsAtDown = [
          [...this.lineJXG.point1.coords.scrCoords],
          [...this.lineJXG.point2.coords.scrCoords],
        ];
      }.bind(this),
    );

    this.previousWithLabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';

    return this.lineJXG;
  }

  deleteGraphicalObject() {
    this.props.board.removeObject(this.lineJXG);
    delete this.lineJXG;
  }

  componentWillUnmount() {
    if (this.lineJXG) {
      this.deleteGraphicalObject();
    }
  }

  update({ sourceOfUpdate }) {
    if (!this.props.board) {
      this.forceUpdate();
      return;
    }

    if (this.lineJXG === undefined) {
      return this.createGraphicalObject();
    }

    if (
      this.doenetSvData.numericalPoints.length !== 2 ||
      this.doenetSvData.numericalPoints.some((x) => x.length !== 2)
    ) {
      return this.deleteGraphicalObject();
    }

    let validCoords = true;

    for (let coords of [
      this.doenetSvData.numericalPoints[0],
      this.doenetSvData.numericalPoints[1],
    ]) {
      if (!Number.isFinite(coords[0])) {
        validCoords = false;
      }
      if (!Number.isFinite(coords[1])) {
        validCoords = false;
      }
    }

    this.lineJXG.point1.coords.setCoordinates(
      JXG.COORDS_BY_USER,
      this.doenetSvData.numericalPoints[0],
    );
    this.lineJXG.point2.coords.setCoordinates(
      JXG.COORDS_BY_USER,
      this.doenetSvData.numericalPoints[1],
    );

    let visible = !this.doenetSvData.hidden;

    if (validCoords) {
      let actuallyChangedVisibility =
        this.lineJXG.visProp['visible'] !== visible;
      this.lineJXG.visProp['visible'] = visible;
      this.lineJXG.visPropCalc['visible'] = visible;

      if (actuallyChangedVisibility) {
        // at least for point, this function is incredibly slow, so don't run it if not necessary
        // TODO: figure out how to make label disappear right away so don't need to run this function
        this.lineJXG.setAttribute({ visible: visible });
      }
    } else {
      this.lineJXG.visProp['visible'] = false;
      this.lineJXG.visPropCalc['visible'] = false;
      // this.lineJXG.setAttribute({visible: false})
    }

    this.lineJXG.name = this.doenetSvData.label;
    // this.lineJXG.visProp.withlabel = this.showlabel && this.label !== "";

    let withlabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';
    if (withlabel != this.previousWithLabel) {
      this.lineJXG.setAttribute({ withlabel: withlabel });
      this.previousWithLabel = withlabel;
    }

    this.lineJXG.needsUpdate = true;
    this.lineJXG.update();
    if (this.lineJXG.hasLabel) {
      this.lineJXG.label.needsUpdate = true;
      this.lineJXG.label.update();
    }
    this.props.board.updateRenderer();
  }

  onDragHandler(e, transient) {
    if (this.dragged) {
      let pointCoords = this.calculatePointPositions(e);

      this.actions.moveLine({
        point1coords: pointCoords[0],
        point2coords: pointCoords[1],
        transient,
      });
    }
  }

  calculatePointPositions(e) {
    // the reason we calculate point position with this algorithm,
    // rather than using .X() and .Y() directly
    // is so that points don't get trapped on an attracting object
    // if you move the mouse slowly.
    // The attributes .X() and .Y() are affected by
    // .setCoordinates functions called in update()
    // so will get modified to go back to the attracting object

    var o = this.props.board.origin.scrCoords;

    let pointCoords = [];

    for (let i = 0; i < 2; i++) {
      let calculatedX =
        (this.pointsAtDown[i][1] + e.x - this.pointerAtDown[0] - o[1]) /
        this.props.board.unitX;
      let calculatedY =
        (o[2] - (this.pointsAtDown[i][2] + e.y - this.pointerAtDown[1])) /
        this.props.board.unitY;
      pointCoords.push([calculatedX, calculatedY]);
    }
    return pointCoords;
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

    let mathJaxify = '\\(' + this.doenetSvData.equation + '\\)';
    return (
      <>
        <a name={this.componentName} />
        <span id={this.componentName}>{mathJaxify}</span>
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
