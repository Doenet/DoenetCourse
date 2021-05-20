import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Point extends DoenetRenderer {
  constructor(props) {
    super(props);

    if (props.board) {
      this.createGraphicalObject();
    }
  }

  static initializeChildrenOnConstruction = false;

  createGraphicalObject() {
    //things to be passed to JSXGraph as attributes
    var jsxPointAttributes = {
      name: this.doenetSvData.label,
      visible: !this.doenetSvData.hidden,
      withLabel: this.doenetSvData.showLabel && this.doenetSvData.label !== '',
      fixed: !this.doenetSvData.draggable || this.doenetSvData.fixed,
      layer: 10 * this.doenetSvData.layer + 9,
      fillColor: this.doenetSvData.selectedStyle.markerColor,
      strokeColor: this.doenetSvData.selectedStyle.markerColor,
      // highlightFillColor: this.doenetSvData.selectedStyle.markerColor,
      // highlightStrokeColor: this.doenetSvData.selectedStyle.markerColor,
      size: this.doenetSvData.selectedStyle.markerSize,
      face: normalizeStyle(this.doenetSvData.selectedStyle.markerStyle),
    };

    if (this.doenetSvData.draggable && !this.doenetSvData.fixed) {
      jsxPointAttributes.highlightFillColor = '#EEEEEE';
      jsxPointAttributes.highlightStrokeColor = '#C3D9FF';
      jsxPointAttributes.showInfoBox = true;
    } else {
      jsxPointAttributes.highlightFillColor =
        this.doenetSvData.selectedStyle.markerColor;
      jsxPointAttributes.highlightStrokeColor =
        this.doenetSvData.selectedStyle.markerColor;
      jsxPointAttributes.showInfoBox = false;
    }

    let coords = [
      this.doenetSvData.numericalXs[0],
      this.doenetSvData.numericalXs[1],
    ];

    if (!Number.isFinite(coords[0])) {
      coords[0] = 0;
      jsxPointAttributes['visible'] = false;
    }
    if (!Number.isFinite(coords[1])) {
      coords[1] = 0;
      jsxPointAttributes['visible'] = false;
    }

    this.pointJXG = this.props.board.create(
      'point',
      coords,
      jsxPointAttributes,
    );

    this.pointJXG.on(
      'drag',
      function (e) {
        this.dragged = true;
        //board.suspendUpdate();
        this.onDragHandler(e, true);
        //board.unsuspendUpdate();
      }.bind(this),
    );

    this.pointJXG.on(
      'up',
      function (e) {
        this.onDragHandler(e, false);
      }.bind(this),
    );

    // this.pointJXG.on('down', function () {
    //   this.dragged = false;
    // }.bind(this));

    this.pointJXG.on(
      'down',
      function (e) {
        this.dragged = false;
        this.pointerAtDown = [e.x, e.y];
        this.pointAtDown = [...this.pointJXG.coords.scrCoords];
      }.bind(this),
    );

    this.previousWithLabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';

    return this.pointJXG;
  }

  deleteGraphicalObject() {
    this.props.board.removeObject(this.pointJXG);
    delete this.pointJXG;
  }

  componentWillUnmount() {
    if (this.pointJXG) {
      this.deleteGraphicalObject();
    }
  }

  // update({ x, y, changeInitiatedWithPoint, label, visible, draggable, showlabel }) {
  update({ sourceOfUpdate }) {
    if (!this.props.board) {
      this.forceUpdate();
      return;
    }

    // even points that are hidden have renderers
    // (or this could be called before createGraphicalObject
    // for dynamically added components)
    // so this could be called even for points that don't have a JXG point created
    if (this.pointJXG === undefined) {
      return;
    }

    let x = this.doenetSvData.numericalXs[0];
    let y = this.doenetSvData.numericalXs[1];

    this.pointJXG.coords.setCoordinates(JXG.COORDS_BY_USER, [x, y]);

    let visible = !this.doenetSvData.hidden;

    if (Number.isFinite(x) && Number.isFinite(y)) {
      let actuallyChangedVisibility =
        this.pointJXG.visProp['visible'] !== visible;
      this.pointJXG.visProp['visible'] = visible;
      this.pointJXG.visPropCalc['visible'] = visible;

      if (actuallyChangedVisibility) {
        // this function is incredibly slow, so don't run it if not necessary
        // TODO: figure out how to make label disappear right away so don't need to run this function
        this.pointJXG.setAttribute({ visible: visible });
      }
    } else {
      this.pointJXG.visProp['visible'] = false;
      this.pointJXG.visPropCalc['visible'] = false;
      // this.pointJXG.setAttribute({visible: false})
    }

    if (this.doenetSvData.draggable && !this.doenetSvData.fixed) {
      this.pointJXG.visProp.highlightfillcolor = '#EEEEEE';
      this.pointJXG.visProp.highlightstrokecolor = '#C3D9FF';
      this.pointJXG.visProp.showinfobox = true;
      this.pointJXG.visProp.fixed = false;
    } else {
      this.pointJXG.visProp.highlightfillcolor =
        this.doenetSvData.selectedStyle.markerColor;
      this.pointJXG.visProp.highlightstrokecolor =
        this.doenetSvData.selectedStyle.markerColor;
      this.pointJXG.visProp.showinfobox = false;
      this.pointJXG.visProp.fixed = true;
    }

    if (this.componentName in sourceOfUpdate.sourceInformation) {
      this.props.board.updateInfobox(this.pointJXG);
    }

    this.pointJXG.name = this.doenetSvData.label;
    // this.pointJXG.visProp.withlabel = this.showlabel && this.label !== "";

    let withlabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';
    if (withlabel != this.previousWithLabel) {
      this.pointJXG.setAttribute({ withlabel: withlabel });
      this.previousWithLabel = withlabel;
    }

    this.pointJXG.needsUpdate = true;
    this.pointJXG.update();
    if (this.pointJXG.hasLabel) {
      this.pointJXG.label.needsUpdate = true;
      this.pointJXG.label.update();
    }
    this.props.board.updateRenderer();
  }

  onDragHandler(e, transient) {
    if (this.dragged) {
      let pointCoords = this.calculatePointPosition(e);

      this.actions.movePoint({
        x: pointCoords[0],
        y: pointCoords[1],
        transient,
      });
      // this.actions.movePoint({ x: this.pointJXG.X(), y: this.pointJXG.Y(), transient });
    }
  }

  calculatePointPosition(e) {
    // the reason we calculate point position with this algorithm,
    // rather than using .X() and .Y() directly
    // is that attributes .X() and .Y() are affected by the
    // .setCoordinates function called in update(),
    // for the .up event.
    // Due to this dependence, the location of .X() and .Y()
    // can be affected by constaints of objects that the points depends on,
    // leading to a different location on up than on drag
    // (as dragging uses the mouse location)

    var o = this.props.board.origin.scrCoords;

    let calculatedX =
      (this.pointAtDown[1] + e.x - this.pointerAtDown[0] - o[1]) /
      this.props.board.unitX;
    let calculatedY =
      (o[2] - (this.pointAtDown[2] + e.y - this.pointerAtDown[1])) /
      this.props.board.unitY;

    return [calculatedX, calculatedY];
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
      return <a name={this.componentName} />;
    }

    if (this.doenetSvData.hidden) {
      return null;
    }

    let mathJaxify =
      '\\(' + this.doenetSvData.coordsForDisplay.toLatex() + '\\)';
    return (
      <>
        <a name={this.componentName} />
        <span id={this.componentName}>{mathJaxify}</span>
      </>
    );
  }
}

function normalizeStyle(style) {
  if (style === 'triangle') {
    return 'triangleup';
  } else {
    return style;
  }
}
