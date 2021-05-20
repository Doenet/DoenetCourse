import GraphicalComponent from './abstract/GraphicalComponent';
import me from 'math-expressions';
import { convertValueToMathExpression } from '../utils/math';

export default class LineSegment extends GraphicalComponent {
  static componentType = 'lineSegment';

  actions = {
    moveLineSegment: this.moveLineSegment.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
  };

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['endpoints'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.draggable = {
      createComponentOfType: 'boolean',
      createStateVariable: 'draggable',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };

    attributes.endpoints = {
      createComponentOfType: '_pointListComponent',
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.styleDescription = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        selectedStyle: {
          dependencyType: 'stateVariable',
          variableName: 'selectedStyle',
        },
      }),
      definition: function ({ dependencyValues }) {
        let lineDescription = '';
        if (dependencyValues.selectedStyle.lineWidth >= 4) {
          lineDescription += 'thick ';
        } else if (dependencyValues.selectedStyle.lineWidth <= 1) {
          lineDescription += 'thin ';
        }
        if (dependencyValues.selectedStyle.lineStyle === 'dashed') {
          lineDescription += 'dashed ';
        } else if (dependencyValues.selectedStyle.lineStyle === 'dotted') {
          lineDescription += 'dotted ';
        }

        lineDescription += dependencyValues.selectedStyle.lineColor;

        return { newValues: { styleDescription: lineDescription } };
      },
    };

    stateVariableDefinitions.nDimensions = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        endpointsAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'endpoints',
          variableNames: ['nDimensions'],
        },
      }),
      definition: function ({ dependencyValues }) {
        // console.log('definition of nDimensions')
        // console.log(dependencyValues)

        if (dependencyValues.endpointsAttr !== null) {
          let nDimensions =
            dependencyValues.endpointsAttr.stateValues.nDimensions;
          return {
            newValues: { nDimensions },
            checkForActualChange: { nDimensions: true },
          };
        } else {
          // line segment through zero points
          return { newValues: { nDimensions: 2 } };
        }
      },
    };

    stateVariableDefinitions.endpoints = {
      public: true,
      componentType: 'math',
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['endpointX', 'endpoint'],
      returnWrappingComponents(prefix) {
        if (prefix === 'endpointX') {
          return [];
        } else {
          // endpoint or entire array
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'endpointX') {
          // pointX1_2 is the 2nd component of the first point
          let indices = varEnding.split('_').map((x) => Number(x) - 1);
          if (
            indices.length === 2 &&
            indices.every((x, i) => Number.isInteger(x) && x >= 0)
          ) {
            if (arraySize) {
              if (indices.every((x, i) => x < arraySize[i])) {
                return [String(indices)];
              } else {
                return [];
              }
            } else {
              // if don't know array size, just guess that the entry is OK
              // It will get corrected once array size is known.
              // TODO: better to return empty array?
              return [String(indices)];
            }
          } else {
            return [];
          }
        } else {
          // endpoint3 is all components of the third point
          if (!arraySize) {
            return [];
          }
          let pointInd = Number(varEnding) - 1;
          if (
            Number.isInteger(pointInd) &&
            pointInd >= 0 &&
            pointInd < arraySize[0]
          ) {
            // array of "pointInd,i", where i=0, ..., arraySize[1]-1
            return Array.from(
              Array(arraySize[1]),
              (_, i) => pointInd + ',' + i,
            );
          } else {
            return [];
          }
        }
      },
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [2, dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          dependenciesByKey[arrayKey] = {
            endpointsAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'endpoints',
              variableNames: ['pointX' + varEnding],
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys, arraySize }) {
        // console.log('array definition of linesegment endpoints');
        // console.log(dependencyValuesByKey)
        // console.log(arrayKeys);

        let endpoints = {};
        let essentialPoints = {};

        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          if (
            dependencyValuesByKey[arrayKey].endpointsAttr !== null &&
            dependencyValuesByKey[arrayKey].endpointsAttr.stateValues[
              'pointX' + varEnding
            ]
          ) {
            endpoints[arrayKey] =
              dependencyValuesByKey[arrayKey].endpointsAttr.stateValues[
                'pointX' + varEnding
              ];
          } else {
            if (arrayKey === '0,0') {
              essentialPoints[arrayKey] = { defaultValue: me.fromAst(1) };
            } else {
              essentialPoints[arrayKey] = { defaultValue: me.fromAst(0) };
            }
          }
        }

        let result = {};

        if (Object.keys(endpoints).length > 0) {
          result.newValues = { endpoints };
        }
        if (Object.keys(essentialPoints).length > 0) {
          result.useEssentialOrDefaultValue = { endpoints: essentialPoints };
        }
        return result;
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        initialChange,
        stateValues,
      }) {
        // console.log(`inverse array definition of endpoints of linesegment`);
        // console.log(desiredStateVariableValues)
        // console.log(JSON.parse(JSON.stringify(stateValues)))
        // console.log(dependencyValuesByKey);

        // if not draggable, then disallow initial change
        if (initialChange && !stateValues.draggable) {
          return { success: false };
        }

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.endpoints) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          if (
            dependencyValuesByKey[arrayKey].endpointsAttr !== null &&
            dependencyValuesByKey[arrayKey].endpointsAttr.stateValues[
              'pointX' + varEnding
            ]
          ) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].endpointsAttr,
              desiredValue: desiredStateVariableValues.endpoints[arrayKey],
              childIndex: 0,
              variableIndex: 0,
            });
          } else {
            instructions.push({
              setStateVariable: 'endpoints',
              value: {
                [arrayKey]: convertValueToMathExpression(
                  desiredStateVariableValues.endpoints[arrayKey],
                ),
              },
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.numericalEndpoints = {
      isArray: true,
      entryPrefixes: ['numericalEndpoint'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        if (Number.isNaN(dependencyValues.nDimensions)) {
          return [0];
        }
        return [2];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          nDimensions: {
            dependencyType: 'stateVariable',
            variableName: 'nDimensions',
          },
        };
        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            endpoint: {
              dependencyType: 'stateVariable',
              variableName: 'endpoint' + (Number(arrayKey) + 1),
            },
          };
        }

        return { globalDependencies, dependenciesByKey };
      },

      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        if (Number.isNaN(globalDependencyValues.nDimensions)) {
          return {};
        }

        let numericalEndpoints = {};
        for (let arrayKey of arrayKeys) {
          let endpoint = dependencyValuesByKey[arrayKey].endpoint;
          let numericalP = [];
          for (let ind = 0; ind < globalDependencyValues.nDimensions; ind++) {
            let val = endpoint[ind].evaluate_to_constant();
            if (!Number.isFinite(val)) {
              val = NaN;
            }
            numericalP.push(val);
          }
          numericalEndpoints[arrayKey] = numericalP;
        }

        return { newValues: { numericalEndpoints } };
      },
    };

    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
        endpoints: {
          dependencyType: 'stateVariable',
          variableName: 'endpoints',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          nearestPoint: function (variables) {
            // only implemented in 2D for now
            if (dependencyValues.nDimensions !== 2) {
              return {};
            }

            let A1 = dependencyValues.endpoints[0][0].evaluate_to_constant();
            let A2 = dependencyValues.endpoints[0][1].evaluate_to_constant();
            let B1 = dependencyValues.endpoints[1][0].evaluate_to_constant();
            let B2 = dependencyValues.endpoints[1][1].evaluate_to_constant();

            // only implement for constants
            if (
              !(
                Number.isFinite(A1) &&
                Number.isFinite(A2) &&
                Number.isFinite(B1) &&
                Number.isFinite(B2)
              )
            ) {
              return {};
            }

            let BA1 = B1 - A1;
            let BA2 = B2 - A2;
            let denom = BA1 * BA1 + BA2 * BA2;

            if (denom === 0) {
              return {};
            }

            let t =
              ((variables.x1 - A1) * BA1 + (variables.x2 - A2) * BA2) / denom;

            let result = {};

            if (t <= 0) {
              result = { x1: A1, x2: A2 };
            } else if (t >= 1) {
              result = { x1: B1, x2: B2 };
            } else {
              result = {
                x1: A1 + t * BA1,
                x2: A2 + t * BA2,
              };
            }

            if (variables.x3 !== undefined) {
              result.x3 = 0;
            }

            return result;
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }

  moveLineSegment({ point1coords, point2coords, transient }) {
    let newComponents = {};

    if (point1coords !== undefined) {
      newComponents['0,0'] = me.fromAst(point1coords[0]);
      newComponents['0,1'] = me.fromAst(point1coords[1]);
    }
    if (point2coords !== undefined) {
      newComponents['1,0'] = me.fromAst(point2coords[0]);
      newComponents['1,1'] = me.fromAst(point2coords[1]);
    }

    if (transient) {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            componentName: this.componentName,
            updateType: 'updateValue',
            stateVariable: 'endpoints',
            value: newComponents,
          },
        ],
        transient,
      });
    } else {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            componentName: this.componentName,
            updateType: 'updateValue',
            stateVariable: 'endpoints',
            value: newComponents,
          },
        ],
        event: {
          verb: 'interacted',
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          result: {
            point1: point1coords,
            point2: point2coords,
          },
        },
      });
    }
  }
}
