import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class CobwebPolyline extends DoenetRenderer {
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
      this.doenetSvData.numericalVertices.length !==
        this.doenetSvData.nPoints ||
      this.doenetSvData.numericalVertices.some((x) => x.length !== 2)
    ) {
      return;
    }

    let functionAttributes = {
      visible: !this.doenetSvData.hidden,
      withLabel: false,
      fixed: true, //this.doenetSvData.draggable !== true,
      layer: 10 * this.doenetSvData.layer + 5,
      strokeColor: 'green',
      highlightStrokeColor: 'green',
      strokeWidth: 3,
      dash: styleToDash('solid'),
    };

    this.curveJXG = this.props.board.create(
      'functiongraph',
      [this.doenetSvData.f],
      functionAttributes,
    );

    let diagonalAttributes = {
      visible: !this.doenetSvData.hidden,
      withLabel: false,
      fixed: true, //this.doenetSvData.draggable !== true,
      layer: 10 * this.doenetSvData.layer + 5,
      strokeColor: 'gray',
      highlightStrokeColor: 'gray',
      strokeWidth: 2,
      dash: styleToDash('solid'),
    };
    this.diagonalJXG = this.props.board.create(
      'line',
      [
        [0, 0],
        [1, 1],
      ],
      diagonalAttributes,
    );

    let validCoords = true;

    for (let coords of this.doenetSvData.numericalVertices) {
      if (!Number.isFinite(coords[0])) {
        validCoords = false;
      }
      if (!Number.isFinite(coords[1])) {
        validCoords = false;
      }
    }

    //things to be passed to JSXGraph as attributes
    this.jsxPolylineAttributes = {
      name: this.doenetSvData.label,
      visible: !this.doenetSvData.hidden && validCoords,
      withLabel: this.doenetSvData.showLabel && this.doenetSvData.label !== '',
      fixed: true,
      layer: 10 * this.doenetSvData.layer + 7,
      strokeColor: this.doenetSvData.selectedStyle.lineColor,
      highlightStrokeColor: this.doenetSvData.selectedStyle.lineColor,
      strokeWidth: this.doenetSvData.selectedStyle.lineWidth,
      dash: styleToDash(this.doenetSvData.selectedStyle.lineStyle),
    };

    if (!this.doenetSvData.draggable) {
      jsxPolylineAttributes.highlightStrokeWidth =
        this.doenetSvData.selectedStyle.lineWidth;
    }

    this.jsxPointAttributes = {
      fixed: !this.doenetSvData.draggable || this.doenetSvData.fixed,
      visible: !this.doenetSvData.hidden && validCoords,
      withLabel: true,
      name: 'A',
      layer: 10 * this.doenetSvData.layer + 9,
      fillColor: this.doenetSvData.selectedStyle.markerColor,
      strokeColor: this.doenetSvData.selectedStyle.markerColor,
      size: this.doenetSvData.selectedStyle.markerSize,
      face: normalizeStyle(this.doenetSvData.selectedStyle.markerStyle),
    };

    if (this.doenetSvData.draggable) {
      this.jsxPointAttributes.highlightFillColor = '#EEEEEE';
      this.jsxPointAttributes.highlightStrokeColor = '#C3D9FF';
      this.jsxPointAttributes.showInfoBox = true;
    } else {
      this.jsxPointAttributes.highlightFillColor =
        this.doenetSvData.selectedStyle.markerColor;
      this.jsxPointAttributes.highlightStrokeColor =
        this.doenetSvData.selectedStyle.markerColor;
      this.jsxPointAttributes.showInfoBox = false;
    }

    this.pointsJXG = [];
    let varName = this.doenetSvData.variable.toString();

    for (let i = 0; i < this.doenetSvData.nPoints; i++) {
      let pointAttributes = Object.assign({}, this.jsxPointAttributes);
      if (i === 0) {
        pointAttributes.name = `(${varName}_0,0)`;
      } else if (i % 2 === 1) {
        pointAttributes.name = `(${varName}_${(i - 1) / 2}, ${varName}_${
          (i + 1) / 2
        })`;
      } else {
        pointAttributes.name = `(${varName}_${i / 2}, ${varName}_${i / 2})`;
      }
      if (i !== this.doenetSvData.nPoints - 1) {
        pointAttributes.visible = false;
      }
      this.pointsJXG.push(
        this.props.board.create(
          'point',
          [...this.doenetSvData.numericalVertices[i]],
          pointAttributes,
        ),
      );
    }

    let x = [],
      y = [];
    this.doenetSvData.numericalVertices.forEach((z) => {
      x.push(z[0]);
      y.push(z[1]);
    });

    this.polylineJXG = this.props.board.create(
      'curve',
      [x, y],
      this.jsxPolylineAttributes,
    );

    for (let i = 0; i < this.doenetSvData.nPoints; i++) {
      this.pointsJXG[i].on('drag', (x) => this.onDragHandler(i, true));
      this.pointsJXG[i].on('up', (x) => this.onDragHandler(i, false));
      this.pointsJXG[i].on('down', (x) => (this.draggedPoint = null));
    }

    // this.polylineJXG.on('drag', x => this.onDragHandler(-1, true));
    // this.polylineJXG.on('up', x => this.onDragHandler(-1, false));
    // this.polylineJXG.on('down', x => this.draggedPoint = null);

    this.previousWithLabel =
      this.doenetSvData.showLabel && this.doenetSvData.label !== '';
    this.previousNPoints = this.doenetSvData.nPoints;

    return this.polylineJXG;
  }

  deleteGraphicalObject() {
    this.props.board.removeObject(this.polylineJXG);
    delete this.polylineJXG;

    for (let i = 0; i < this.doenetSvData.nPoints; i++) {
      this.props.board.removeObject(this.pointsJXG[i]);
      delete this.pointsJXG[i];
    }
  }

  componentWillUnmount() {
    if (this.polylineJXG) {
      this.deleteGraphicalObject();
    }
  }

  update({ sourceOfUpdate }) {
    if (!this.props.board) {
      this.forceUpdate();
      return;
    }

    if (this.polylineJXG === undefined) {
      return this.createGraphicalObject();
    }

    let validCoords = true;

    for (let coords of this.doenetSvData.numericalVertices) {
      if (!Number.isFinite(coords[0])) {
        validCoords = false;
      }
      if (!Number.isFinite(coords[1])) {
        validCoords = false;
      }
    }

    let varName = this.doenetSvData.variable.toString();

    // add or delete points as required and change data array size
    if (this.doenetSvData.nPoints > this.previousNPoints) {
      for (let i = this.previousNPoints; i < this.doenetSvData.nPoints; i++) {
        let pointAttributes = Object.assign({}, this.jsxPointAttributes);
        if (i === 0) {
          pointAttributes.name = `(${varName}_0,0)`;
        } else if (i % 2 === 1) {
          pointAttributes.name = `(${varName}_${(i - 1) / 2}, ${varName}_${
            (i + 1) / 2
          })`;
        } else {
          pointAttributes.name = `(${varName}_${i / 2}, ${varName}_${i / 2})`;
        }
        if (i !== this.doenetSvData.nPoints - 1) {
          pointAttributes.visible = false;
        }
        this.pointsJXG.push(
          this.props.board.create(
            'point',
            [...this.doenetSvData.numericalVertices[i]],
            pointAttributes,
          ),
        );

        this.pointsJXG[i].on('drag', (x) => this.onDragHandler(i, true));
        this.pointsJXG[i].on('up', (x) => this.onDragHandler(i, false));
        this.pointsJXG[i].on('down', (x) => (this.draggedPoint = null));
      }
    } else if (this.doenetSvData.nPoints < this.previousNPoints) {
      for (let i = this.doenetSvData.nPoints; i < this.previousNPoints; i++) {
        this.props.board.removeObject(this.pointsJXG.pop());
      }
      this.polylineJXG.dataX.length = this.doenetSvData.nPoints;
    }

    this.previousNPoints = this.doenetSvData.nPoints;

    let shiftX = this.polylineJXG.transformMat[1][0];
    let shiftY = this.polylineJXG.transformMat[2][0];

    for (let i = 0; i < this.doenetSvData.nPoints; i++) {
      this.pointsJXG[i].coords.setCoordinates(JXG.COORDS_BY_USER, [
        ...this.doenetSvData.numericalVertices[i],
      ]);
      this.polylineJXG.dataX[i] =
        this.doenetSvData.numericalVertices[i][0] - shiftX;
      this.polylineJXG.dataY[i] =
        this.doenetSvData.numericalVertices[i][1] - shiftY;
    }

    let visible = !this.doenetSvData.hidden;

    if (validCoords) {
      this.polylineJXG.visProp['visible'] = visible;
      this.polylineJXG.visPropCalc['visible'] = visible;
      // this.polylineJXG.setAttribute({visible: visible})

      for (let i = 0; i < this.doenetSvData.nPoints - 1; i++) {
        this.pointsJXG[i].visProp['visible'] = false;
        this.pointsJXG[i].visPropCalc['visible'] = false;
      }
      this.pointsJXG[this.doenetSvData.nPoints - 1].visProp['visible'] =
        visible;
      this.pointsJXG[this.doenetSvData.nPoints - 1].visPropCalc['visible'] =
        visible;
    } else {
      this.polylineJXG.visProp['visible'] = false;
      this.polylineJXG.visPropCalc['visible'] = false;
      // this.polylineJXG.setAttribute({visible: false})

      for (let i = 0; i < this.doenetSvData.nPoints; i++) {
        this.pointsJXG[i].visProp['visible'] = false;
        this.pointsJXG[i].visPropCalc['visible'] = false;
      }
    }

    if (this.componentName in sourceOfUpdate.sourceInformation) {
      let vertexUpdated =
        sourceOfUpdate.sourceInformation[this.componentName].vertex;

      if (Number.isFinite(vertexUpdated)) {
        this.props.board.updateInfobox(this.pointsJXG[vertexUpdated]);
      }
    }

    this.polylineJXG.needsUpdate = true;
    this.polylineJXG.update().updateVisibility();
    this.pointsJXG[this.doenetSvData.nPoints - 1].setAttribute({
      withlabel: true,
    });
    for (let i = 0; i < this.doenetSvData.nPoints; i++) {
      this.pointsJXG[i].needsUpdate = true;
      this.pointsJXG[i].update();
    }
    this.pointsJXG[this.doenetSvData.nPoints - 1].label.needsUpdate = true;
    this.pointsJXG[this.doenetSvData.nPoints - 1].label.update();

    this.props.board.updateRenderer();
  }

  onDragHandler(i, transient) {
    if (transient) {
      this.draggedPoint = i;
    } else if (this.draggedPoint !== i) {
      return;
    }

    if (i === -1) {
      let newPointcoords = {};
      this.polylineJXG.points.forEach(
        (z, i) => (newPointcoords[i] = [z.usrCoords[1], z.usrCoords[2]]),
      );
      this.actions.movePolyline(newPointcoords, transient);
    } else {
      let newCoords = {};
      newCoords[i] = [this.pointsJXG[i].X(), this.pointsJXG[i].Y()];
      this.actions.movePolyline(newCoords, transient, { vertex: i });
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

function normalizeStyle(style) {
  if (style === 'triangle') {
    return 'triangleup';
  } else {
    return style;
  }
}
