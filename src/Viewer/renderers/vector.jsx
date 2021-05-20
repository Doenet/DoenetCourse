import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Vector extends DoenetRenderer {
  constructor(props) {
    super(props);

    this.onDragHandler = this.onDragHandler.bind(this);

    if (props.board) {
      this.createGraphicalObject();

      this.doenetPropsForChildren = { board: this.props.board };
      this.initializeChildren();
    }

    this.vectorBeingDragged = false;
    this.headBeingDragged = false;
    this.tailBeingDragged = false;
  }

  static initializeChildrenOnConstruction = false;

  createGraphicalObject() {
    if (
      this.doenetSvData.numericalEndpoints.length !== 2 ||
      this.doenetSvData.numericalEndpoints.some((x) => x.length !== 2)
    ) {
      return;
    }

    let layer = 10 * this.doenetSvData.layer + 7;

    //things to be passed to JSXGraph as attributes
    var jsxVectorAttributes = {
      name: this.doenetSvData.label,
      visible: !this.doenetSvData.hidden,
      withLabel: this.doenetSvData.showLabel && this.doenetSvData.label !== '',
      fixed: !this.doenetSvData.draggable || this.doenetSvData.fixed,
      layer,
      strokeColor: this.doenetSvData.selectedStyle.markerColor,
      highlightStrokeColor: this.doenetSvData.selectedStyle.markerColor,
      strokeWidth: this.doenetSvData.selectedStyle.lineWidth,
      dash: styleToDash(this.doenetSvData.selectedStyle.lineStyle),
    };

    if (!this.doenetSvData.draggable || this.doenetSvData.fixed) {
      jsxVectorAttributes.highlightStrokeWidth =
        this.doenetSvData.selectedStyle.lineWidth;
    }

    let endpoints = [
      [...this.doenetSvData.numericalEndpoints[0]],
      [...this.doenetSvData.numericalEndpoints[1]],
    ];

    let jsxPointAttributes = Object.assign({}, jsxVectorAttributes);
    Object.assign(jsxPointAttributes, {
      withLabel: false,
      fillColor: 'none',
      strokeColor: 'none',
      highlightStrokeColor: 'none',
      highlightFillColor: 'lightgray',
      layer: layer + 1,
    });
    if (!this.doenetSvData.draggable || this.doenetSvData.fixed) {
      jsxPointAttributes.visible = false;
    }

    // create invisible points at endpoints
    let tailPointAttributes = Object.assign({}, jsxPointAttributes);
    if (!this.doenetSvData.tailDraggable) {
      tailPointAttributes.visible = false;
    }
    this.point1JXG = this.props.board.create(
      'point',
      endpoints[0],
      tailPointAttributes,
    );
    let headPointAttributes = Object.assign({}, jsxPointAttributes);
    if (!this.doenetSvData.headDraggable) {
      headPointAttributes.visible = false;
    }
    this.point2JXG = this.props.board.create(
      'point',
      endpoints[1],
      headPointAttributes,
    );

    this.vectorJXG = this.props.board.create(
      'arrow',
      [this.point1JXG, this.point2JXG],
      jsxVectorAttributes,
    );

    this.point1JXG.on('drag', (e) => this.onDragHandler(e, 0, true));
    this.point2JXG.on('drag', (e) => this.onDragHandler(e, 1, true));
    this.vectorJXG.on('drag', (e) => this.onDragHandler(e, -1, true));
    this.point1JXG.on('up', (e) => this.onDragHandler(e, 0, false));
    this.point2JXG.on('up', (e) => this.onDragHandler(e, 1, false));
    this.vectorJXG.on('up', (e) => this.onDragHandler(e, -1, false));

    this.point1JXG.on('down', function (e) {
      this.headBeingDragged = false;
      this.tailBeingDragged = false;
    });
    this.point2JXG.on('down', function (e) {
      this.headBeingDragged = false;
      this.tailBeingDragged = false;
    });

    // if drag vector, need to keep track of original point positions
    // so that they won't get stuck in an attractor
    this.vectorJXG.on(
      'down',
      function (e) {
        this.headBeingDragged = false;
        this.tailBeingDragged = false;
        this.pointerAtDown = [e.x, e.y];
        this.pointsAtDown = [
          [...this.vectorJXG.point1.coords.scrCoords],
          [...this.vectorJXG.point2.coords.scrCoords],
        ];
      }.bind(this),
    );

    return this.vectorJXG;
  }

  deleteGraphicalObject() {
    this.props.board.removeObject(this.vectorJXG);
    delete this.vectorJXG;
    this.props.board.removeObject(this.point1JXG);
    delete this.point1JXG;
    this.props.board.removeObject(this.point2JXG);
    delete this.point2JXG;
  }

  componentWillUnmount() {
    if (this.vectorJXG) {
      this.deleteGraphicalObject();
    }
  }

  update({ sourceOfUpdate }) {
    if (!this.props.board) {
      this.forceUpdate();
      return;
    }

    if (this.vectorJXG === undefined) {
      return this.createGraphicalObject();
    }

    if (
      this.doenetSvData.numericalEndpoints.length !== 2 ||
      this.doenetSvData.numericalEndpoints.some((x) => x.length !== 2)
    ) {
      return this.deleteGraphicalObject();
    }

    let validPoints = true;

    for (let coords of [
      this.doenetSvData.numericalEndpoints[0],
      this.doenetSvData.numericalEndpoints[1],
    ]) {
      if (!Number.isFinite(coords[0])) {
        validPoints = false;
      }
      if (!Number.isFinite(coords[1])) {
        validPoints = false;
      }
    }

    this.vectorJXG.point1.coords.setCoordinates(
      JXG.COORDS_BY_USER,
      this.doenetSvData.numericalEndpoints[0],
    );
    this.vectorJXG.point2.coords.setCoordinates(
      JXG.COORDS_BY_USER,
      this.doenetSvData.numericalEndpoints[1],
    );

    let visible = !this.doenetSvData.hidden;

    if (validPoints) {
      this.vectorJXG.visProp['visible'] = visible;
      this.vectorJXG.visPropCalc['visible'] = visible;
      // this.vectorJXG.setAttribute({visible: visible})

      if (this.doenetSvData.draggable && !this.doenetSvData.fixed) {
        this.vectorJXG.visProp['fixed'] = false;

        if (this.doenetSvData.tailDraggable) {
          this.point1JXG.visProp['visible'] = visible;
          this.point1JXG.visPropCalc['visible'] = visible;
          this.point1JXG.visProp['fixed'] = false;
        } else {
          this.point1JXG.visProp['visible'] = false;
          this.point1JXG.visPropCalc['visible'] = false;
          this.point1JXG.visProp['fixed'] = true;
        }

        if (this.doenetSvData.headDraggable) {
          this.point2JXG.visProp['visible'] = visible;
          this.point2JXG.visPropCalc['visible'] = visible;
          this.point2JXG.visProp['fixed'] = false;
        } else {
          this.point2JXG.visProp['visible'] = false;
          this.point2JXG.visPropCalc['visible'] = false;
          this.point2JXG.visProp['fixed'] = true;
        }
      } else {
        this.vectorJXG.visProp['fixed'] = true;

        this.point1JXG.visProp['visible'] = false;
        this.point1JXG.visPropCalc['visible'] = false;
        this.point1JXG.visProp['fixed'] = true;

        this.point2JXG.visProp['visible'] = false;
        this.point2JXG.visPropCalc['visible'] = false;
        this.point2JXG.visProp['fixed'] = true;
      }
    } else {
      this.vectorJXG.visProp['visible'] = false;
      this.vectorJXG.visPropCalc['visible'] = false;
      // this.vectorJXG.setAttribute({visible: false})

      this.point1JXG.visProp['visible'] = false;
      this.point1JXG.visPropCalc['visible'] = false;

      this.point2JXG.visProp['visible'] = false;
      this.point2JXG.visPropCalc['visible'] = false;
    }

    if (this.componentName in sourceOfUpdate.sourceInformation) {
      let sourceInfo = sourceOfUpdate.sourceInformation[this.componentName];
      if (sourceInfo.vertex === 0) {
        this.props.board.updateInfobox(this.point1JXG);
      } else if (sourceInfo.vertex === 1) {
        this.props.board.updateInfobox(this.point2JXG);
      }
    }

    this.vectorJXG.name = this.doenetSvData.label;
    // this.vectorJXG.visProp.withlabel = this.showlabel && this.label !== "";

    let withlabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';
    if (withlabel != this.previousWithLabel) {
      this.vectorJXG.setAttribute({ withlabel: withlabel });
      this.previousWithLabel = withlabel;
    }

    this.vectorJXG.needsUpdate = true;
    this.vectorJXG.update();
    if (this.vectorJXG.hasLabel) {
      this.vectorJXG.label.needsUpdate = true;
      this.vectorJXG.label.update();
    }

    this.point1JXG.needsUpdate = true;
    this.point1JXG.update();
    this.point2JXG.needsUpdate = true;
    this.point2JXG.update();

    this.props.board.updateRenderer();
  }

  onDragHandler(e, i, transient) {
    if (transient) {
      if (i === 0) {
        this.tailBeingDragged = true;
      } else if (i === 1) {
        this.headBeingDragged = true;
      } else {
        this.headBeingDragged = true;
        this.tailBeingDragged = true;
      }
    }

    let instructions = { transient };

    let performMove = false;

    if (this.headBeingDragged) {
      performMove = true;
      if (i === -1) {
        instructions.headcoords = this.calculatePointPosition(e, 1);
      } else {
        instructions.headcoords = [
          this.vectorJXG.point2.X(),
          this.vectorJXG.point2.Y(),
        ];
      }
    }
    if (this.tailBeingDragged) {
      performMove = true;
      if (i === -1) {
        instructions.tailcoords = this.calculatePointPosition(e, 0);
      } else {
        instructions.tailcoords = [
          this.vectorJXG.point1.X(),
          this.vectorJXG.point1.Y(),
        ];
      }
    }

    if (i === 0 || i === 1) {
      instructions.sourceInformation = { vertex: i };
    }

    if (performMove) {
      this.actions.moveVector(instructions);
    }
  }

  calculatePointPosition(e, i) {
    var o = this.props.board.origin.scrCoords;

    let calculatedX =
      (this.pointsAtDown[i][1] + e.x - this.pointerAtDown[0] - o[1]) /
      this.props.board.unitX;
    let calculatedY =
      (o[2] - (this.pointsAtDown[i][2] + e.y - this.pointerAtDown[1])) /
      this.props.board.unitY;
    let pointCoords = [calculatedX, calculatedY];

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

    let mathJaxify = '\\(' + this.doenetSvData.displacementCoords + '\\)';
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
