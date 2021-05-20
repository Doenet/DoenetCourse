import Polyline from './Polyline';

export default class Polygon extends Polyline {
  static componentType = 'polygon';

  actions = {
    movePolygon: this.movePolygon.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
  };

  get movePolygon() {
    return this.movePolyline;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    // overwrite nearestPoint so that it includes
    // segement between first and last vertex
    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
        vertices: {
          dependencyType: 'stateVariable',
          variableName: 'vertices',
        },
        nVertices: {
          dependencyType: 'stateVariable',
          variableName: 'nVertices',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          nearestPoint: function (variables) {
            // only implemented in 2D for now
            if (dependencyValues.nDimensions !== 2) {
              return {};
            }

            let closestDistance2 = Infinity;
            let closestResult = {};

            let x1 = variables.x1.evaluate_to_constant();
            let x2 = variables.x2.evaluate_to_constant();

            let prevPtx, prevPty;
            let nextPtx =
              dependencyValues.vertices[
                dependencyValues.nVertices - 1
              ][0].evaluate_to_constant();
            let nextPty =
              dependencyValues.vertices[
                dependencyValues.nVertices - 1
              ][1].evaluate_to_constant();

            for (let i = 0; i < dependencyValues.nVertices; i++) {
              prevPtx = nextPtx;
              prevPty = nextPty;

              nextPtx = dependencyValues.vertices[i][0].evaluate_to_constant();
              nextPty = dependencyValues.vertices[i][1].evaluate_to_constant();

              // only implement for constants
              if (
                !(
                  Number.isFinite(prevPtx) &&
                  Number.isFinite(prevPty) &&
                  Number.isFinite(nextPtx) &&
                  Number.isFinite(nextPty)
                )
              ) {
                continue;
              }

              let BA1 = nextPtx - prevPtx;
              let BA2 = nextPty - prevPty;
              let denom = BA1 * BA1 + BA2 * BA2;

              if (denom === 0) {
                continue;
              }

              let t = ((x1 - prevPtx) * BA1 + (x2 - prevPty) * BA2) / denom;

              let result;

              if (t <= 0) {
                result = { x1: prevPtx, x2: prevPty };
              } else if (t >= 1) {
                result = { x1: nextPtx, x2: nextPty };
              } else {
                result = {
                  x1: prevPtx + t * BA1,
                  x2: prevPty + t * BA2,
                };
              }

              let distance2 =
                Math.pow(x1 - result.x1, 2) + Math.pow(x2 - result.x2, 2);

              if (distance2 < closestDistance2) {
                closestDistance2 = distance2;
                closestResult = result;
              }
            }

            if (
              variables.x3 !== undefined &&
              Object.keys(closestResult).length > 0
            ) {
              closestResult.x3 = 0;
            }

            return closestResult;
          },
        },
      }),
    };
    return stateVariableDefinitions;
  }
}
