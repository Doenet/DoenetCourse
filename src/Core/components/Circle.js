import Curve from './Curve';
import GraphicalComponent from './abstract/GraphicalComponent';

import me from 'math-expressions';

export default class Circle extends Curve {
  static componentType = 'circle';
  static rendererType = 'circle';

  actions = {
    moveCircle: this.moveCircle.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
  };

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return [
      'throughPoints',
      'nThroughPoints',
      'prescribedCenter',
      'prescribedRadius',
      'havePrescribedCenter',
      'havePrescribedRadius',
    ];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.through = {
      createComponentOfType: '_pointListComponent',
    };
    attributes.center = {
      createComponentOfType: 'point',
    };
    attributes.radius = {
      createComponentOfType: 'math',
    };

    delete attributes.parMin;
    delete attributes.parMax;
    delete attributes.variable;

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.deleteAllLogic();

    return childLogic;
  }

  static returnStateVariableDefinitions(args) {
    let stateVariableDefinitions =
      GraphicalComponent.returnStateVariableDefinitions(args);

    let curveStateVariableDefinitions = super.returnStateVariableDefinitions(
      args,
    );

    stateVariableDefinitions.styleDescription =
      curveStateVariableDefinitions.styleDescription;

    stateVariableDefinitions.curveType = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { curveType: 'circle' } }),
    };

    stateVariableDefinitions.parMax = {
      public: true,
      componentType: 'number',
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { parMax: NaN } }),
    };

    stateVariableDefinitions.parMin = {
      public: true,
      componentType: 'number',
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { parMin: NaN } }),
    };

    stateVariableDefinitions.fs = {
      forRenderer: true,
      isArray: true,
      entryPrefixes: ['f'],
      defaultEntryValue: () => 0,
      returnArraySizeDependencies: () => ({}),
      returnArraySize: () => [0],
      returnArrayDependenciesByKey: () => ({}),
      arrayDefinitionByKey: () => ({ newValues: { fs: {} } }),
    };

    stateVariableDefinitions.nThroughPoints = {
      returnDependencies: () => ({
        throughAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'through',
          variableNames: ['nPoints'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.throughAttr !== null) {
          return {
            newValues: {
              nThroughPoints: dependencyValues.throughAttr.stateValues.nPoints,
            },
          };
        } else {
          return { newValues: { nThroughPoints: 0 } };
        }
      },
    };

    stateVariableDefinitions.throughPoints = {
      public: true,
      componentType: 'math',
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['throughPointX', 'throughPoint'],
      returnWrappingComponents(prefix) {
        if (prefix === 'throughPointX') {
          return [];
        } else {
          // point or entire array
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'throughPointX') {
          // throughPointX1_2 is the 2nd component of the first point
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
          // throughPoint3 is all components of the third vertex
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
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nThroughPoints, 2];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          dependenciesByKey[arrayKey] = {
            throughAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'through',
              variableNames: ['pointX' + varEnding],
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log('definition of circle throughPoints');
        // console.log(dependencyValuesByKey)
        // console.log(arrayKeys);

        let throughPoints = {};

        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          let throughAttr = dependencyValuesByKey[arrayKey].throughAttr;
          if (
            throughAttr !== null &&
            throughAttr.stateValues['pointX' + varEnding]
          ) {
            throughPoints[arrayKey] =
              throughAttr.stateValues['pointX' + varEnding];
          } else {
            throughPoints[arrayKey] = me.fromAst('\uff3f');
          }
        }

        return { newValues: { throughPoints } };
      },

      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        initialChange,
        stateValues,
      }) {
        // console.log(`inverseDefinition of throughPoints of circle`);
        // console.log(desiredStateVariableValues)
        // console.log(JSON.parse(JSON.stringify(stateValues)))
        // console.log(dependencyValuesByKey);

        // if not draggable, then disallow initial change
        if (initialChange && !stateValues.draggable) {
          return { success: false };
        }

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.throughPoints) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          if (
            dependencyValuesByKey[arrayKey].throughAttr !== null &&
            dependencyValuesByKey[arrayKey].throughAttr.stateValues[
              'pointX' + varEnding
            ]
          ) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].throughAttr,
              desiredValue: desiredStateVariableValues.throughPoints[arrayKey],
              variableIndex: 0,
            });
          } else {
            return { success: false };
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    // radiusShadow will be null unless circle was created
    // from serialized state with radius value
    stateVariableDefinitions.radiusShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          radiusShadow: { variablesToCheck: ['radius', 'radiusShadow'] },
        },
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'radiusShadow',
              value: desiredStateVariableValues.radiusShadow,
            },
          ],
        };
      },
    };

    // centerShadow will be null unless circle was created
    // from serialized state with center value
    stateVariableDefinitions.centerShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          centerShadow: { variablesToCheck: ['center', 'centerShadow'] },
        },
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'centerShadow',
              value: desiredStateVariableValues.centerShadow,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.havePrescribedCenter = {
      returnDependencies: () => ({
        centerAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'center',
        },
        centerShadow: {
          dependencyType: 'stateVariable',
          variableName: 'centerShadow',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          havePrescribedCenter:
            dependencyValues.centerAttr !== null ||
            dependencyValues.centerShadow !== null,
        },
        checkForActualChange: { havePrescribedCenter: true },
      }),
    };

    stateVariableDefinitions.prescribedCenter = {
      isArray: true,
      entryPrefixes: ['prescribedCenterX'],
      returnArraySizeDependencies: () => ({
        havePrescribedCenter: {
          dependencyType: 'stateVariable',
          variableName: 'havePrescribedCenter',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.havePrescribedCenter ? 2 : 0];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          centerShadow: {
            dependencyType: 'stateVariable',
            variableName: 'centerShadow',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            centerAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'center',
              variableNames: ['x' + varEnding],
            },
          };
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey: function ({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        let prescribedCenter = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (dependencyValuesByKey[arrayKey].centerAttr !== null) {
            prescribedCenter[arrayKey] =
              dependencyValuesByKey[arrayKey].centerAttr.stateValues[
                'x' + varEnding
              ];
          } else if (globalDependencyValues.centerShadow !== null) {
            prescribedCenter[arrayKey] =
              globalDependencyValues.centerShadow.get_component(
                Number(arrayKey),
              );
          }
        }

        return { newValues: { prescribedCenter } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        arraySize,
      }) {
        // console.log(`inverse definition of prescribed center of circle`)
        // console.log(desiredStateVariableValues)
        // console.log(globalDependencyValues)
        // console.log(dependencyValuesByKey)

        let instructions = [];

        let updateCenterShadow = false;

        // process instructions in reverse order
        // so that the x-coordinates is processed last and takes precedence
        for (let arrayKey of Object.keys(
          desiredStateVariableValues.prescribedCenter,
        ).reverse()) {
          if (dependencyValuesByKey[arrayKey].centerAttr !== null) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].centerAttr,
              desiredValue:
                desiredStateVariableValues.prescribedCenter[arrayKey],
              variableIndex: 0,
            });
          } else if (globalDependencyValues.centerShadow !== null) {
            updateCenterShadow = true;
          }
        }

        if (updateCenterShadow) {
          if (arraySize[0] > 1) {
            let desiredCenter = ['vector'];
            for (let arrayKey in desiredStateVariableValues.prescribedCenter) {
              desiredCenter[Number(arrayKey) + 1] =
                desiredStateVariableValues.prescribedCenter[arrayKey].tree;
            }
            desiredCenter.length = arraySize[0] + 1;
            instructions.push({
              setDependency: 'centerShadow',
              desiredValue: me.fromAst(desiredCenter),
            });
          } else if (
            arraySize[0] === 1 &&
            '0' in desiredStateVariableValues.prescribedCenter
          ) {
            instructions.push({
              setDependency: 'centerShadow',
              desiredValue: desiredStateVariableValues.prescribedCenter[0],
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.prescribedRadius = {
      defaultValue: null,
      returnDependencies: () => ({
        radiusAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'radius',
          variableNames: ['value'],
        },
        radiusShadow: {
          dependencyType: 'stateVariable',
          variableName: 'radiusShadow',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.radiusAttr !== null) {
          return {
            newValues: {
              prescribedRadius: dependencyValues.radiusAttr.stateValues.value,
            },
          };
        } else {
          return {
            newValues: {
              prescribedRadius: dependencyValues.radiusShadow,
            },
          };
        }
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
      }) {
        if (dependencyValues.radiusAttr !== null) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'radiusAttr',
                desiredValue: desiredStateVariableValues.prescribedRadius,
                childIndex: 0,
                variableIndex: 0,
              },
            ],
          };
        } else {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'radiusShadow',
                desiredValue: desiredStateVariableValues.prescribedRadius,
              },
            ],
          };
        }
      },
    };

    stateVariableDefinitions.havePrescribedRadius = {
      returnDependencies: () => ({
        radiusAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'radius',
        },
        radiusShadow: {
          dependencyType: 'stateVariable',
          variableName: 'radiusShadow',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          havePrescribedRadius:
            dependencyValues.radiusAttr !== null ||
            dependencyValues.radiusShadow !== null,
        },
        checkForActualChange: { havePrescribedRadius: true },
      }),
    };

    stateVariableDefinitions.numericalPrescribedRadius = {
      returnDependencies: () => ({
        prescribedRadius: {
          dependencyType: 'stateVariable',
          variableName: 'prescribedRadius',
        },
      }),
      additionalStateVariablesDefined: ['haveNonNumericalPrescribedRadius'],
      definition: function ({ dependencyValues }) {
        let haveNonNumericalPrescribedRadius = false;
        let numericalPrescribedRadius;

        if (dependencyValues.prescribedRadius === null) {
          numericalPrescribedRadius = null;
        } else {
          numericalPrescribedRadius =
            dependencyValues.prescribedRadius.evaluate_to_constant();
          if (!Number.isFinite(numericalPrescribedRadius)) {
            numericalPrescribedRadius = NaN;
            haveNonNumericalPrescribedRadius = true;
          }
        }

        return {
          newValues: {
            haveNonNumericalPrescribedRadius,
            numericalPrescribedRadius,
          },
          checkForActualChange: {
            haveNonNumericalEntriesNumericalRadius: true,
          },
        };
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
      }) {
        // console.log('inverse definition of numerical prescribed radius of circle')
        // console.log(desiredStateVariableValues)
        // console.log(dependencyValues)

        if (stateValues.haveNonNumericalPrescribedRadius) {
          return { success: false };
        }

        if (
          desiredStateVariableValues.numericalPrescribedRadius !== undefined
        ) {
          if (dependencyValues.prescribedRadius === null) {
            return { success: false };
          }

          return {
            success: true,
            instructions: [
              {
                setDependency: 'prescribedRadius',
                desiredValue: me.fromAst(
                  desiredStateVariableValues.numericalPrescribedRadius,
                ),
              },
            ],
          };
        }

        return { success: false };
      },
    };

    stateVariableDefinitions.numericalPrescribedCenter = {
      isArray: true,
      entryPrefixes: ['numericalPrescribedCenterX'],
      returnArraySizeDependencies: () => ({
        havePrescribedCenter: {
          dependencyType: 'stateVariable',
          variableName: 'havePrescribedCenter',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.havePrescribedCenter ? 2 : 0];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            prescribedCenterX: {
              dependencyType: 'stateVariable',
              variableName: 'prescribedCenterX' + varEnding,
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey: function ({ dependencyValuesByKey, arrayKeys }) {
        let numericalPrescribedCenter = {};
        for (let arrayKey of arrayKeys) {
          numericalPrescribedCenter[arrayKey] =
            dependencyValuesByKey[
              arrayKey
            ].prescribedCenterX.evaluate_to_constant();
          if (!Number.isFinite(numericalPrescribedCenter[arrayKey])) {
            numericalPrescribedCenter[arrayKey] = NaN;
          }
        }

        return { newValues: { numericalPrescribedCenter } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
      }) {
        // console.log('inverse definition of numerical prescribed center of circle')
        // console.log(desiredStateVariableValues)
        // console.log(dependencyValuesByKey)

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.numericalPrescribedCenter) {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].prescribedCenterX,
            desiredValue: me.fromAst(
              desiredStateVariableValues.numericalPrescribedCenter[arrayKey],
            ),
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.haveNonNumericalPrescribedCenter = {
      returnDependencies: () => ({
        numericalPrescribedCenter: {
          dependencyType: 'stateVariable',
          variableName: 'numericalPrescribedCenter',
        },
      }),
      definition({ dependencyValues }) {
        let haveNonNumericalPrescribedCenter =
          dependencyValues.numericalPrescribedCenter.some(
            (x) => !Number.isFinite(x),
          );

        return {
          newValues: {
            haveNonNumericalPrescribedCenter,
          },
          checkForActualChange: { haveNonNumericalPrescribedCenter: true },
        };
      },
    };

    stateVariableDefinitions.numericalThroughPoints = {
      returnDependencies: () => ({
        throughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'throughPoints',
        },
      }),
      additionalStateVariablesDefined: ['haveNonNumericalThroughPoints'],
      definition: function ({ dependencyValues }) {
        let haveNonNumericalThroughPoints = false;
        let numericalThroughPoints = [];

        for (let point of dependencyValues.throughPoints) {
          let numericalPoint = [];
          for (let dim = 0; dim < 2; dim++) {
            let numericalValue;
            try {
              numericalValue = point[dim].evaluate_to_constant();
            } catch (e) {
              console.warn('Invalid point of circle');
              haveNonNumericalThroughPoints = true;
              numericalPoint = [];
              break;
            }
            if (Number.isFinite(numericalValue)) {
              numericalPoint.push(numericalValue);
            } else {
              haveNonNumericalThroughPoints = true;
              numericalPoint = [];
              break;
            }
          }
          if (numericalPoint.length > 0) {
            numericalThroughPoints.push(numericalPoint);
          } else {
            numericalThroughPoints = [];
            break;
          }
        }

        return {
          newValues: {
            haveNonNumericalThroughPoints,
            numericalThroughPoints,
          },
          checkForActualChange: { haveNonNumericalThroughPoints: true },
        };
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
      }) {
        // console.log('inverse definition of numerical throughpoints of circle')
        // console.log(desiredStateVariableValues)
        // console.log(dependencyValues)

        if (stateValues.haveNonNumericalThroughPoints) {
          return { success: false };
        }

        if (desiredStateVariableValues.numericalThroughPoints !== undefined) {
          let desiredThroughPoints = {};
          for (let [
            ind,
            pt,
          ] of desiredStateVariableValues.numericalThroughPoints.entries()) {
            desiredThroughPoints[ind + ',0'] = me.fromAst(pt[0]);
            desiredThroughPoints[ind + ',1'] = me.fromAst(pt[1]);
          }
          return {
            success: true,
            instructions: [
              {
                setDependency: 'throughPoints',
                desiredValue: desiredThroughPoints,
              },
            ],
          };
        }

        return { success: false };
      },
    };

    stateVariableDefinitions.haveNumericalEntries = {
      returnDependencies: () => ({
        haveNonNumericalPrescribedCenter: {
          dependencyType: 'stateVariable',
          variableName: 'haveNonNumericalPrescribedCenter',
        },
        haveNonNumericalPrescribedRadius: {
          dependencyType: 'stateVariable',
          variableName: 'haveNonNumericalPrescribedRadius',
        },
        haveNonNumericalThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'haveNonNumericalThroughPoints',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          haveNumericalEntries: !(
            dependencyValues.haveNonNumericalPrescribedCenter ||
            dependencyValues.haveNonNumericalPrescribedRadius ||
            dependencyValues.haveNonNumericalThroughPoints
          ),
        },
      }),
    };

    // When circle is based on two or three points
    // radius and center are more efficently calculated simultaneously.
    // This state variable doesn't check that radius and center
    // are not prescribed, but it is used in just those cases
    stateVariableDefinitions.numericalRadiusCalculatedWithCenter = {
      additionalStateVariablesDefined: ['numericalCenterCalculatedWithRadius'],
      returnDependencies: () => ({
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
        numericalThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'numericalThroughPoints',
        },
        haveNumericalEntries: {
          dependencyType: 'stateVariable',
          variableName: 'haveNonNumericalThroughPoints',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.haveNonNumericalThroughPoints) {
          let message =
            "Haven't implemented circle through " +
            dependencyValues.nThroughPoints +
            ' points';
          message += " in case where don't have numerical values.";
          console.warn(message);
          return {
            newValues: {
              numericalRadiusCalculatedWithCenter: null,
              numericalCenterCalculatedWithRadius: null,
            },
          };
        }

        if (dependencyValues.nThroughPoints === 2) {
          let { numericalCenter, numericalRadius } =
            circleFromTwoNumericalPoints({
              point1: dependencyValues.numericalThroughPoints[0],
              point2: dependencyValues.numericalThroughPoints[1],
            });

          return {
            newValues: {
              numericalCenterCalculatedWithRadius: numericalCenter,
              numericalRadiusCalculatedWithCenter: numericalRadius,
            },
          };
        } else if (dependencyValues.nThroughPoints === 3) {
          let x1 = dependencyValues.numericalThroughPoints[0][0];
          let x2 = dependencyValues.numericalThroughPoints[1][0];
          let x3 = dependencyValues.numericalThroughPoints[2][0];
          let y1 = dependencyValues.numericalThroughPoints[0][1];
          let y2 = dependencyValues.numericalThroughPoints[1][1];
          let y3 = dependencyValues.numericalThroughPoints[2][1];

          let numericalCenter, numericalRadius;

          if (x1 === x2 && y1 === y2) {
            if (x1 === x3 && y1 === y3) {
              // if all points are identical, it's a circle with radius zero
              numericalCenter = [x1, y1];
              numericalRadius = 0;
            } else {
              // if point 1 and 2 are identical, treat it as circle through two points
              let result = circleFromTwoNumericalPoints({
                point1: [x1, y1],
                point2: [x3, y3],
              });
              numericalCenter = result.numericalCenter;
              numericalRadius = result.numericalRadius;
            }
          } else if ((x1 === x3 && y1 === y3) || (x2 === x3 && y2 === y3)) {
            // if point 1 and 3 are identical,
            // or if point 2 and 3 are identical,
            // treat it as circle through two points
            let result = circleFromTwoNumericalPoints({
              point1: [x1, y1],
              point2: [x2, y2],
            });
            numericalCenter = result.numericalCenter;
            numericalRadius = result.numericalRadius;
          } else {
            // all distinct points

            let mag1 = x1 * x1 + y1 * y1;
            let mag2 = x2 * x2 + y2 * y2;
            let mag3 = x3 * x3 + y3 * y3;

            let A = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2;
            let B = mag1 * (y3 - y2) + mag2 * (y1 - y3) + mag3 * (y2 - y1);
            let C = mag1 * (x2 - x3) + mag2 * (x3 - x1) + mag3 * (x1 - x2);
            let D =
              mag1 * (x3 * y2 - x2 * y3) +
              mag2 * (x1 * y3 - x3 * y1) +
              mag3 * (x2 * y1 - x1 * y2);

            if (A !== 0) {
              numericalCenter = [-B / (2 * A), -C / (2 * A)];
              numericalRadius = Math.sqrt(
                (B * B + C * C - 4 * A * D) / (4 * A * A),
              );
            } else {
              // collinear non-identical points, can't make a circle
              numericalCenter = [NaN, NaN];
              numericalRadius = NaN;
            }
          }

          return {
            newValues: {
              numericalCenterCalculatedWithRadius: numericalCenter,
              numericalRadiusCalculatedWithCenter: numericalRadius,
            },
          };
        } else if (dependencyValues.nThroughPoints > 3) {
          console.warn("Can't calculate circle through more than 3 points");
          return {
            newValues: {
              numericalRadiusCalculatedWithCenter: null,
              numericalCenterCalculatedWithRadius: null,
            },
          };
        } else {
          // these variables aren't used with fewer than 2 points
          return {
            newValues: {
              numericalRadiusCalculatedWithCenter: null,
              numericalCenterCalculatedWithRadius: null,
            },
          };
        }
      },
    };

    stateVariableDefinitions.numericalRadius = {
      forRenderer: true,
      stateVariablesDeterminingDependencies: [
        'nThroughPoints',
        'havePrescribedCenter',
        'havePrescribedRadius',
      ],
      defaultValue: 1,
      returnDependencies: function ({ stateValues }) {
        let dependencies = {
          haveNonNumericalPrescribedRadius: {
            dependencyType: 'stateVariable',
            variableName: 'haveNonNumericalPrescribedRadius',
          },
          nThroughPoints: {
            dependencyType: 'stateVariable',
            variableName: 'nThroughPoints',
          },
        };

        if (stateValues.havePrescribedRadius) {
          dependencies.numericalPrescribedRadius = {
            dependencyType: 'stateVariable',
            variableName: 'numericalPrescribedRadius',
          };
          if (
            stateValues.havePrescribedCenter &&
            stateValues.nThroughPoints > 0
          ) {
            dependencies.haveCenterRadiusPoints = {
              dependencyType: 'value',
              value: true,
            };
          }
        } else {
          if (stateValues.havePrescribedCenter) {
            if (stateValues.nThroughPoints === 1) {
              dependencies.haveNonNumericalPrescribedCenter = {
                dependencyType: 'stateVariable',
                variableName: 'haveNonNumericalPrescribedCenter',
              };
              dependencies.numericalPrescribedCenter = {
                dependencyType: 'stateVariable',
                variableName: 'numericalPrescribedCenter',
              };
              dependencies.haveNonNumericalThroughPoints = {
                dependencyType: 'stateVariable',
                variableName: 'haveNonNumericalThroughPoints',
              };
              dependencies.numericalThroughPoints = {
                dependencyType: 'stateVariable',
                variableName: 'numericalThroughPoints',
              };
            }
          } else if (stateValues.nThroughPoints > 1) {
            dependencies.numericalRadiusCalculatedWithCenter = {
              dependencyType: 'stateVariable',
              variableName: 'numericalRadiusCalculatedWithCenter',
            };
            // need numericalThroughPoints for inverse definition
            // as skip numericalRadiusCalculatedWithCenter
            dependencies.numericalThroughPoints = {
              dependencyType: 'stateVariable',
              variableName: 'numericalThroughPoints',
            };
          }
        }

        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        // console.log(`definition of numericalRadius of circle`);
        // console.log(dependencyValues);

        if (
          dependencyValues.haveNonNumericalPrescribedRadius ||
          dependencyValues.haveNonNumericalPrescribedCenter ||
          dependencyValues.haveNonNumericalThroughPoints
        ) {
          return {
            newValues: {
              numericalRadius: NaN,
            },
          };
        }

        if (dependencyValues.numericalPrescribedRadius !== undefined) {
          if (dependencyValues.haveCenterRadiusPoints) {
            console.warn(
              "Can't calculate circle with specified radius and center and through points",
            );
            return { newValues: { numericalRadius: NaN } };
          }

          return {
            newValues: {
              numericalRadius: Math.max(
                0,
                dependencyValues.numericalPrescribedRadius,
              ),
            },
          };
        }

        if (dependencyValues.numericalPrescribedCenter !== undefined) {
          if (dependencyValues.nThroughPoints === 0) {
            return {
              useEssentialOrDefaultValue: {
                numericalRadius: {
                  variablesToCheck: 'numericalRadius',
                },
              },
            };
          } else if (dependencyValues.nThroughPoints === 1) {
            // center and one point specified.
            // Radius is distance from center to point.
            let pt = dependencyValues.numericalThroughPoints[0];
            if (pt === undefined) {
              // if dependencies haven't been updated,
              // it is possible to temporarility have fewer numericalThroughPoints
              // than nThroughPOints
              return { newValues: { numericalRadius: NaN } };
            }
            let numericalRadius = Math.sqrt(
              Math.pow(
                pt[0] - dependencyValues.numericalPrescribedCenter[0],
                2,
              ) +
                Math.pow(
                  pt[1] - dependencyValues.numericalPrescribedCenter[1],
                  2,
                ),
            );
            return { newValues: { numericalRadius } };
          } else {
            console.warn(
              "Can't calculate circle with specified center through more than 1 point",
            );
            return { newValues: { numericalRadius: NaN } };
          }
        }

        // don't have prescribed center
        if (dependencyValues.nThroughPoints < 2) {
          return {
            useEssentialOrDefaultValue: {
              numericalRadius: {
                variablesToCheck: 'numericalRadius',
              },
            },
          };
        } else {
          // having two or three through points
          // with no prescribed radius or center
          // is case where calculated radius and center together.
          return {
            newValues: {
              numericalRadius:
                dependencyValues.numericalRadiusCalculatedWithCenter,
            },
          };
        }
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
      }) {
        // console.log('inverse definition of numericalRadius of circle')
        // console.log(desiredStateVariableValues)
        // console.log(dependencyValues)

        if (dependencyValues.numericalPrescribedRadius !== undefined) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'numericalPrescribedRadius',
                desiredValue: Math.max(
                  0,
                  desiredStateVariableValues.numericalRadius,
                ),
              },
            ],
          };
        }

        if (dependencyValues.numericalPrescribedCenter !== undefined) {
          if (dependencyValues.nThroughPoints === 0) {
            return {
              success: true,
              instructions: [
                {
                  setStateVariable: 'numericalRadius',
                  value: Math.max(
                    0,
                    desiredStateVariableValues.numericalRadius,
                  ),
                },
              ],
            };
          } else if (dependencyValues.nThroughPoints === 1) {
            let numericalRadius = Math.max(
              0,
              desiredStateVariableValues.numericalRadius,
            );

            let theta = stateValues.throughAngles[0];
            if (!Number.isFinite(theta)) {
              return { success: false };
            }
            let pt = [
              stateValues.numericalCenter[0] +
                numericalRadius * Math.cos(theta),
              stateValues.numericalCenter[1] +
                numericalRadius * Math.sin(theta),
            ];

            return {
              success: true,
              instructions: [
                {
                  setDependency: 'numericalThroughPoints',
                  desiredValue: [pt],
                },
              ],
            };
          } else {
            return { success: false };
          }
        }

        // don't have prescribed center
        if (dependencyValues.nThroughPoints < 2) {
          return {
            success: true,
            instructions: [
              {
                setStateVariable: 'numericalRadius',
                value: Math.max(0, desiredStateVariableValues.numericalRadius),
              },
            ],
          };
        } else {
          let newThroughPoints = [];

          let numericalRadius = Math.max(
            0,
            desiredStateVariableValues.numericalRadius,
          );

          for (let i = 0; i < dependencyValues.nThroughPoints; i++) {
            let theta = stateValues.throughAngles[i];
            if (!Number.isFinite(theta)) {
              return { success: false };
            }
            let pt = [
              stateValues.numericalCenter[0] +
                numericalRadius * Math.cos(theta),
              stateValues.numericalCenter[1] +
                numericalRadius * Math.sin(theta),
            ];

            newThroughPoints.push(pt);
          }

          return {
            success: true,
            instructions: [
              {
                setDependency: 'numericalThroughPoints',
                desiredValue: newThroughPoints,
              },
            ],
          };
        }
      },
    };

    stateVariableDefinitions.numericalCenter = {
      forRenderer: true,
      isArray: true,
      entryPrefixes: ['numericalCenterX'],
      defaultEntryValue: 0,
      stateVariablesDeterminingDependencies: [
        'nThroughPoints',
        'havePrescribedCenter',
        'havePrescribedRadius',
      ],
      returnArraySizeDependencies: () => ({}),
      returnArraySize() {
        return [2];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let globalDependencies = {};

        let dependenciesByKey = {};

        if (stateValues.havePrescribedCenter) {
          for (let arrayKey of arrayKeys) {
            let varEnding = Number(arrayKey) + 1;
            dependenciesByKey[arrayKey] = {
              numericalPrescribedCenterX: {
                dependencyType: 'stateVariable',
                variableName: 'numericalPrescribedCenterX' + varEnding,
              },
            };
          }
          if (
            stateValues.havePrescribedRadius &&
            stateValues.nThroughPoints > 0
          ) {
            globalDependencies.haveCenterRadiusPoints = {
              dependencyType: 'value',
              value: true,
            };
          }
        } else {
          globalDependencies.nThroughPoints = {
            dependencyType: 'stateVariable',
            variableName: 'nThroughPoints',
          };
          globalDependencies.numericalThroughPoints = {
            dependencyType: 'stateVariable',
            variableName: 'numericalThroughPoints',
          };
          globalDependencies.haveNonNumericalThroughPoints = {
            dependencyType: 'stateVariable',
            variableName: 'haveNonNumericalThroughPoints',
          };

          if (stateValues.havePrescribedRadius) {
            // still used numericalRadius, rather than numericalPrescribedRadius
            // as numericalRadius becomes zero if have negative numericalPrescribedRadius
            globalDependencies.numericalRadius = {
              dependencyType: 'stateVariable',
              variableName: 'numericalRadius',
            };
          } else if (stateValues.nThroughPoints == 1) {
            // if didn't have prescribed radius but just one point
            // we treat the radius calculated above as prescribed
            globalDependencies.numericalRadius = {
              dependencyType: 'stateVariable',
              variableName: 'numericalRadius',
            };
          } else if (stateValues.nThroughPoints > 1) {
            globalDependencies.numericalCenterCalculatedWithRadius = {
              dependencyType: 'stateVariable',
              variableName: 'numericalCenterCalculatedWithRadius',
            };
          }
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey: function ({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        // console.log(`definition of numericalCenter of circle`);
        // console.log(globalDependencyValues);
        // console.log(dependencyValuesByKey);
        // console.log(arrayKeys)

        let numericalCenter = {};

        for (let arrayKey of arrayKeys) {
          if (
            dependencyValuesByKey[arrayKey].numericalPrescribedCenterX !==
            undefined
          ) {
            if (globalDependencyValues.haveCenterRadiusPoints) {
              console.warn(
                "Can't calculate circle with specified radius and center and through points",
              );
              return { newValues: { numericalCenter: [NaN, NaN] } };
            }
            numericalCenter[arrayKey] =
              dependencyValuesByKey[arrayKey].numericalPrescribedCenterX;
          }
        }
        if (Object.keys(numericalCenter).length > 0) {
          return { newValues: { numericalCenter } };
        }

        if (
          globalDependencyValues.haveNonNumericalPrescribedRadius ||
          globalDependencyValues.haveNonNumericalThroughPoints
        ) {
          return {
            newValues: {
              numericalCenter: [NaN, NaN],
            },
          };
        }

        if (globalDependencyValues.numericalRadius !== undefined) {
          // have a radius defined and no center
          if (globalDependencyValues.nThroughPoints === 0) {
            // only radius specified.  Create centered at origin as a default.
            let essentialCenter = {};
            for (let arrayKey of arrayKeys) {
              essentialCenter[arrayKey] = {
                variablesToCheck: 'numericalCenterX' + arrayKey,
              };
            }
            return {
              useEssentialOrDefaultValue: { numericalCenter: essentialCenter },
            };
          } else if (globalDependencyValues.nThroughPoints === 1) {
            // radius and one through point
            // create a circle with top being the point

            if (globalDependencyValues.numericalThroughPoints.length < 1) {
              // if dependencies haven't been updated,
              // it is possible to temporarility have fewer numericalThroughPoints
              // than nThroughPOints
              return { newValues: { numericalCenter: [NaN, NaN] } };
            }

            let numericalCenter = [
              globalDependencyValues.numericalThroughPoints[0][0],
              globalDependencyValues.numericalThroughPoints[0][1] -
                globalDependencyValues.numericalRadius,
            ];

            return { newValues: { numericalCenter } };
          } else if (globalDependencyValues.nThroughPoints === 2) {
            if (globalDependencyValues.numericalThroughPoints.length < 2) {
              // if dependencies haven't been updated,
              // it is possible to temporarility have fewer numericalThroughPoints
              // than nThroughPOints
              return { newValues: { numericalCenter: [NaN, NaN] } };
            }

            // find circle through two points with given radius
            let r = globalDependencyValues.numericalRadius;

            let x1 = globalDependencyValues.numericalThroughPoints[0][0];
            let x2 = globalDependencyValues.numericalThroughPoints[1][0];
            let y1 = globalDependencyValues.numericalThroughPoints[0][1];
            let y2 = globalDependencyValues.numericalThroughPoints[1][1];

            let dist2 = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
            let r2 = r * r;

            if (r < 0 || 4 * r2 < dist2) {
              console.warn(
                "Can't find circle through given radius and two points",
              );
              return { newValues: { numericalCenter: [NaN, NaN] } };
            }

            if (dist2 === 0) {
              // points are equal to each other, treat as through single point
              return { newValues: { numericalCenter: [x1, y1 - r] } };
            }

            let centerx =
              (0.5 *
                (dist2 * (x1 + x2) +
                  (y1 - y2) * Math.sqrt((4 * r2 - dist2) * dist2))) /
              dist2;

            let centery =
              (0.5 *
                (dist2 * (y1 + y2) +
                  (x2 - x1) * Math.sqrt((4 * r2 - dist2) * dist2))) /
              dist2;

            return { newValues: { numericalCenter: [centerx, centery] } };
          } else {
            console.warn(
              "Can't create circle through more than two points with given radius",
            );
            return { newValues: { numericalCenter: [NaN, NaN] } };
          }
        }

        // don't have prescribed radius
        if (globalDependencyValues.nThroughPoints === 0) {
          let essentialCenter = {};
          for (let arrayKey of arrayKeys) {
            essentialCenter[arrayKey] = {
              variablesToCheck: 'numericalCenterX' + arrayKey,
            };
          }
          return {
            useEssentialOrDefaultValue: { numericalCenter: essentialCenter },
          };
        } else {
          // Must have at least two points, as case with one through point
          // used calculated radius

          // having two or three through points
          // with no prescribed radius or center
          // is case where calculated radius and center together.

          if (
            globalDependencyValues.numericalCenterCalculatedWithRadius ===
            undefined
          ) {
            // if nThroughPoints changed, but dependencies haven't been recalculated yet
            // could get to here where don't have numericalCenterCalculatedWithRadius
            return {
              newValues: {
                numericalCenter: [NaN, NaN],
              },
            };
          } else {
            return {
              newValues: {
                numericalCenter:
                  globalDependencyValues.numericalCenterCalculatedWithRadius,
              },
            };
          }
        }
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        stateValues,
        workspace,
      }) {
        // console.log('inverse definition of numericalCenter of circle')
        // console.log(desiredStateVariableValues)
        // console.log(globalDependencyValues)
        // console.log(dependencyValuesByKey)

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.numericalCenter) {
          if (
            dependencyValuesByKey[arrayKey].numericalPrescribedCenterX !==
            undefined
          ) {
            instructions.push({
              setDependency:
                dependencyNamesByKey[arrayKey].numericalPrescribedCenterX,
              desiredValue:
                desiredStateVariableValues.numericalCenter[arrayKey],
            });
          }
        }

        if (instructions.length > 0) {
          return {
            success: true,
            instructions,
          };
        }

        if (globalDependencyValues.nThroughPoints === 0) {
          // just change essential value of numericalCenter
          for (let arrayKey in desiredStateVariableValues.numericalCenter) {
            instructions.push({
              setStateVariable: 'numericalCenter',
              value: {
                [arrayKey]:
                  desiredStateVariableValues.numericalCenter[arrayKey],
              },
            });
          }
          return {
            success: true,
            instructions,
          };
        } else {
          // in case just one key specified, merge with previous values
          if (!workspace.desiredCenter) {
            workspace.desiredCenter = {};
          }
          for (let key = 0; key < 2; key++) {
            if (desiredStateVariableValues.numericalCenter[key] !== undefined) {
              workspace.desiredCenter[key] =
                desiredStateVariableValues.numericalCenter[key];
            } else if (workspace.desiredCenter[key] === undefined) {
              workspace.desiredCenter[key] = stateValues.numericalCenter[key];
            }
          }

          let newThroughPoints = [];

          for (let i = 0; i < globalDependencyValues.nThroughPoints; i++) {
            let theta = stateValues.throughAngles[i];
            if (!Number.isFinite(theta)) {
              return { success: false };
            }
            let pt = [
              workspace.desiredCenter[0] +
                stateValues.numericalRadius * Math.cos(theta),
              workspace.desiredCenter[1] +
                stateValues.numericalRadius * Math.sin(theta),
            ];

            newThroughPoints.push(pt);
          }

          return {
            success: true,
            instructions: [
              {
                setDependency: 'numericalThroughPoints',
                desiredValue: newThroughPoints,
              },
            ],
          };
        }
      },
    };

    stateVariableDefinitions.throughAngles = {
      defaultValue: [],
      returnDependencies: () => ({
        haveNumericalEntries: {
          dependencyType: 'stateVariable',
          variableName: 'haveNumericalEntries',
        },
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
        numericalThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'numericalThroughPoints',
        },
        numericalRadius: {
          dependencyType: 'stateVariable',
          variableName: 'numericalRadius',
        },
        numericalCenter: {
          dependencyType: 'stateVariable',
          variableName: 'numericalCenter',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (
          !(
            dependencyValues.haveNumericalEntries &&
            dependencyValues.nThroughPoints > 0 &&
            dependencyValues.numericalRadius > 0 &&
            dependencyValues.numericalCenter.every((x) => Number.isFinite(x))
          )
        ) {
          return {
            useEssentialOrDefaultValue: {
              throughAngles: {
                variablesToCheck: ['throughAngles'],
              },
            },
          };
        }

        // if have through points, numeric entries and positive radius
        // calculate angles
        let throughAngles = [];
        for (let pt of dependencyValues.numericalThroughPoints) {
          throughAngles.push(
            Math.atan2(
              pt[1] - dependencyValues.numericalCenter[1],
              pt[0] - dependencyValues.numericalCenter[0],
            ),
          );
        }

        // make throughAngles essential so that can save their values
        // even if values become invalid (such as radius becoming zero)
        return {
          newValues: { throughAngles },
          makeEssential: { throughAngles: true },
        };
      },
    };

    stateVariableDefinitions.radius = {
      public: true,
      componentType: 'math',
      stateVariablesDeterminingDependencies: [
        'nThroughPoints',
        'havePrescribedCenter',
        'havePrescribedRadius',
      ],
      defaultValue: me.fromAst(1),
      returnDependencies: function ({ stateValues }) {
        let dependencies = {
          numericalRadius: {
            dependencyType: 'stateVariable',
            variableName: 'numericalRadius',
          },
          nThroughPoints: {
            dependencyType: 'stateVariable',
            variableName: 'nThroughPoints',
          },
        };

        if (stateValues.havePrescribedRadius) {
          dependencies.prescribedRadius = {
            dependencyType: 'stateVariable',
            variableName: 'prescribedRadius',
          };
          if (
            stateValues.havePrescribedCenter &&
            stateValues.nThroughPoints > 0
          ) {
            dependencies.haveCenterRadiusPoints = {
              dependencyType: 'value',
              value: true,
            };
          }
        } else {
          if (
            stateValues.havePrescribedCenter &&
            stateValues.nThroughPoints === 1
          ) {
            dependencies.prescribedCenter = {
              dependencyType: 'stateVariable',
              variableName: 'prescribedCenter',
            };
            dependencies.throughPoints = {
              dependencyType: 'stateVariable',
              variableName: 'throughPoints',
            };
          }
        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        // console.log(`definition of radius of circle`);
        // console.log(dependencyValues);

        if (Number.isFinite(dependencyValues.numericalRadius)) {
          return {
            newValues: {
              radius: me.fromAst(dependencyValues.numericalRadius),
            },
            // make radius essential in case radius becomes non-numeric
            // and we have to set the radius state variable in the inverse definition
            makeEssential: { radius: true },
          };
        }

        if (dependencyValues.prescribedRadius !== undefined) {
          if (dependencyValues.haveCenterRadiusPoints) {
            console.warn(
              "Can't calculate circle with specified radius and center and through points",
            );
            return { newValues: { radius: me.fromAst('\uff3f') } };
          }
          return {
            newValues: {
              radius: dependencyValues.prescribedRadius,
            },
          };
        }

        if (dependencyValues.prescribedCenter !== undefined) {
          if (dependencyValues.nThroughPoints === 0) {
            return {
              useEssentialOrDefaultValue: {
                radius: {
                  variablesToCheck: 'radius',
                },
              },
            };
          } else if (dependencyValues.nThroughPoints === 1) {
            // center and one point specified.
            // Radius is distance from center to point.

            try {
              let pt = dependencyValues.throughPoints[0];
              let ptx = pt[0];
              let pty = pt[1];
              let ctx = dependencyValues.prescribedCenter[0];
              let cty = dependencyValues.prescribedCenter[1];

              let radius = ptx
                .subtract(ctx)
                .pow(2)
                .add(pty.subtract(cty).pow(2))
                .pow(0.5)
                .simplify();

              return { newValues: { radius } };
            } catch (e) {
              console.warn('Invalid center or through points of circle');
              return { newValues: { radius: me.fromAst('\uff3f') } };
            }
          } else {
            console.warn(
              "Can't calculate circle with specified center through more than 1 point",
            );
            return { newValues: { radius: me.fromAst('\uff3f') } };
          }
        }

        // don't have prescribed center
        if (dependencyValues.nThroughPoints < 2) {
          return {
            useEssentialOrDefaultValue: {
              radius: {
                variablesToCheck: 'radius',
              },
            },
          };
        } else {
          // having two or three through points
          // with no prescribed radius or center

          console.warn(
            `Have not implemented circle through ${dependencyValues.nThroughPoints} points when non-numerical values`,
          );
          return { newValues: { radius: me.fromAst('\uff3f') } };
        }
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
      }) {
        // console.log('inverse definition of radius of circle')
        // console.log(desiredStateVariableValues)
        // console.log(dependencyValues)

        let numericalRadius =
          desiredStateVariableValues.radius.evaluate_to_constant();

        if (
          Number.isFinite(numericalRadius) &&
          Number.isFinite(dependencyValues.numericalRadius)
        ) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'numericalRadius',
                desiredValue: numericalRadius,
              },
            ],
          };
        }

        if (dependencyValues.prescribedRadius !== undefined) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'prescribedRadius',
                desiredValue: desiredStateVariableValues.radius,
              },
            ],
          };
        }

        if (dependencyValues.nThroughPoints === 0) {
          // just change essential value of radius
          // (and numericalRadius if we have a numerical radius)
          let instructions = [
            {
              setStateVariable: 'radius',
              value: desiredStateVariableValues.radius,
            },
          ];

          if (Number.isFinite(numericalRadius)) {
            instructions.push({
              setDependency: 'numericalRadius',
              desiredValue: numericalRadius,
            });
          }
          return {
            success: true,
            instructions,
          };
        } else {
          console.warn(
            "Can't change radius of circle with non-numerical values through points",
          );
          return { success: false };
        }
      },
    };

    stateVariableDefinitions.diameter = {
      public: true,
      componentType: 'math',
      returnDependencies: () => ({
        radius: {
          dependencyType: 'stateVariable',
          variableName: 'radius',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            diameter: dependencyValues.radius.multiply(2).simplify(),
          },
        };
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
      }) {
        return {
          success: true,
          instructions: [
            {
              setDependency: 'radius',
              desiredValue: desiredStateVariableValues.diameter
                .divide(2)
                .simplify(),
            },
          ],
        };
      },
    };

    stateVariableDefinitions.center = {
      forRenderer: true,
      public: true,
      componentType: 'math',
      isArray: true,
      entryPrefixes: ['centerX'],
      defaultEntryValue: me.fromAst(0),
      returnWrappingComponents(prefix) {
        if (prefix === 'centerX') {
          return [];
        } else {
          // entire array
          // wrap by both <point> and <xs>
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      stateVariablesDeterminingDependencies: [
        'nThroughPoints',
        'havePrescribedCenter',
        'havePrescribedRadius',
      ],
      returnArraySizeDependencies: () => ({}),
      returnArraySize() {
        return [2];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        console.log(`array dependencies by key for circle center`);
        console.log(arrayKeys);
        console.log(stateValues);

        let globalDependencies = {};
        let dependenciesByKey = {};

        if (stateValues.havePrescribedCenter) {
          // if have prescribed center, we separate dependencies by key

          // add havePrescribedCenter as a value
          // so that it changes only when dependencies are recalculated
          globalDependencies.havePrescribedCenter = {
            dependencyType: 'value',
            value: true,
          };

          for (let arrayKey of arrayKeys) {
            let varEnding = Number(arrayKey) + 1;
            dependenciesByKey[arrayKey] = {
              numericalCenterX: {
                dependencyType: 'stateVariable',
                variableName: 'numericalCenterX' + varEnding,
              },
              prescribedCenterX: {
                dependencyType: 'stateVariable',
                variableName: 'prescribedCenterX' + varEnding,
              },
            };
          }

          if (
            stateValues.havePrescribedRadius &&
            stateValues.nThroughPoints > 0
          ) {
            globalDependencies.haveCenterRadiusPoints = {
              dependencyType: 'value',
              value: true,
            };
          }
        } else {
          // if don't have a prescribed center, we used global dependencies
          globalDependencies.numericalCenter = {
            dependencyType: 'stateVariable',
            variableName: 'numericalCenter',
          };

          globalDependencies.nThroughPoints = {
            dependencyType: 'stateVariable',
            variableName: 'nThroughPoints',
          };
          globalDependencies.throughPoints = {
            dependencyType: 'stateVariable',
            variableName: 'throughPoints',
          };

          if (stateValues.havePrescribedRadius) {
            // we call prescribedRadius as radius
            // as we will treat the same as calculated radius
            // for case with one through point
            globalDependencies.radius = {
              dependencyType: 'stateVariable',
              variableName: 'prescribedRadius',
            };
          } else if (stateValues.nThroughPoints == 1) {
            // if didn't have prescribed radius but just one point
            // we treat the radius calculated above as prescribed
            globalDependencies.radius = {
              dependencyType: 'stateVariable',
              variableName: 'radius',
            };
          }
        }

        console.log({ dependenciesByKey, globalDependencies });

        return { dependenciesByKey, globalDependencies };
      },
      arrayDefinitionByKey: function ({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        // console.log(`definition of center of circle`);
        // console.log(globalDependencyValues);
        // console.log(dependencyValuesByKey);

        if (globalDependencyValues.havePrescribedCenter) {
          if (globalDependencyValues.haveCenterRadiusPoints) {
            console.warn(
              "Can't calculate circle with specified radius and center and through points",
            );
            return {
              newValues: {
                center: [me.fromAst('\uff3f'), me.fromAst('\uff3f')],
              },
            };
          }

          let center = {};
          for (let arrayKey of arrayKeys) {
            if (
              Number.isFinite(dependencyValuesByKey[arrayKey].numericalCenterX)
            ) {
              center[arrayKey] = me.fromAst(
                dependencyValuesByKey[arrayKey].numericalCenterX,
              );
            } else {
              center[arrayKey] =
                dependencyValuesByKey[arrayKey].prescribedCenterX;
            }
          }
          return { newValues: { center } };
        }

        if (
          globalDependencyValues.numericalCenter.every((x) =>
            Number.isFinite(x),
          )
        ) {
          return {
            newValues: {
              center: globalDependencyValues.numericalCenter.map((x) =>
                me.fromAst(x),
              ),
            },
            // make center essential in case center becomes non-numeric
            // and we have to set the center state variable in the inverse definition
            makeEssential: { center: true },
          };
        }

        if (globalDependencyValues.radius !== undefined) {
          // have a radius defined and no center
          if (globalDependencyValues.nThroughPoints === 0) {
            // only radius specified.  Create centered at origin as a default.

            let essentialCenter = {};
            for (let arrayKey of arrayKeys) {
              essentialCenter[arrayKey] = {
                variablesToCheck: 'centerX' + arrayKey,
              };
            }
            return {
              useEssentialOrDefaultValue: { center: essentialCenter },
            };
          } else if (globalDependencyValues.nThroughPoints === 1) {
            // radius and one through point
            // create a circle with top being the point

            let center;

            // it is possible, as dependency are being worked out
            // that throughPoints[0][1], so catch the resulting error
            try {
              center = [
                globalDependencyValues.throughPoints[0][0],
                globalDependencyValues.throughPoints[0][1]
                  .subtract(globalDependencyValues.radius)
                  .simplify(),
              ];
            } catch (e) {
              center = [me.fromAst('\uff3f'), me.fromAst('\uff3f')];
            }

            return { newValues: { center } };
          } else {
            console.warn(
              "Can't create circle through more than one point with given radius when don't have numerical values",
            );
            return {
              newValues: {
                center: [me.fromAst('\uff3f'), me.fromAst('\uff3f')],
              },
            };
          }
        }

        // don't have prescribed radius
        if (globalDependencyValues.nThroughPoints === 0) {
          let essentialCenter = {};
          for (let arrayKey of arrayKeys) {
            essentialCenter[arrayKey] = {
              variablesToCheck: 'centerX' + arrayKey,
            };
          }
          return {
            useEssentialOrDefaultValue: { center: essentialCenter },
          };
        } else {
          // Must have at least two points, as case with one through point
          // used calculated radius

          console.warn(
            "Can't create circle through more than one point when don't have numerical values",
          );
          return {
            newValues: {
              center: [me.fromAst('\uff3f'), me.fromAst('\uff3f')],
            },
          };
        }
      },

      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        stateValues,
        dependencyNamesByKey,
        workspace,
      }) {
        // console.log('inverse definition of center of circle')
        // console.log(desiredStateVariableValues)
        // console.log(globalDependencyValues)
        // console.log(dependencyValuesByKey)

        if (globalDependencyValues.havePrescribedCenter) {
          let instructions = [];

          for (let arrayKey in desiredStateVariableValues.center) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].prescribedCenterX,
              desiredValue: desiredStateVariableValues.center[arrayKey],
              arrayKey,
            });
          }

          return {
            success: true,
            instructions,
          };
        }

        // since don't have prescribed center
        // we work with global dependency values

        // if have any empty values in desired value,
        // merge with current values, or value from workspace

        if (!workspace.desiredCenter) {
          workspace.desiredCenter = {};
        }

        for (let key = 0; key < 2; key++) {
          if (desiredStateVariableValues.center[key] !== undefined) {
            workspace.desiredCenter[key] =
              desiredStateVariableValues.center[key];
          } else if (workspace.desiredCenter[key] === undefined) {
            workspace.desiredCenter[key] = stateValues.center[key];
          }
        }

        let numericalCenter = [];
        let desiredCenterIsNumeric = true;

        for (let i = 0; i < 2; i++) {
          let component = workspace.desiredCenter[i].evaluate_to_constant();
          if (!Number.isFinite(component)) {
            desiredCenterIsNumeric = false;
            break;
          }
          numericalCenter.push(component);
        }

        if (
          desiredCenterIsNumeric &&
          globalDependencyValues.numericalCenter.every((x) =>
            Number.isFinite(x),
          )
        ) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'numericalCenter',
                desiredValue: numericalCenter,
              },
            ],
          };
        }

        if (globalDependencyValues.nThroughPoints === 0) {
          // just change essential value of center
          // (and numericalCenter if we have a numerical center)

          let instructions = [
            {
              setStateVariable: 'center',
              value: workspace.desiredCenter,
            },
          ];

          if (desiredCenterIsNumeric) {
            instructions.push({
              setDependency: 'numericalCenter',
              desiredValue: numericalCenter,
            });
          }

          return {
            success: true,
            instructions,
          };
        } else {
          console.warn(
            "Haven't implemented changing center of circle through points with non numerical values",
          );
          return { success: false };
        }
      },
    };

    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        numericalCenter: {
          dependencyType: 'stateVariable',
          variableName: 'numericalCenter',
        },
        numericalRadius: {
          dependencyType: 'stateVariable',
          variableName: 'numericalRadius',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          nearestPoint: function (variables) {
            let x1 = variables.x1.evaluate_to_constant();
            let x2 = variables.x2.evaluate_to_constant();

            if (!(Number.isFinite(x1) && Number.isFinite(x2))) {
              return {};
            }

            if (
              !(
                Number.isFinite(dependencyValues.numericalCenter[0]) &&
                Number.isFinite(dependencyValues.numericalCenter[1]) &&
                Number.isFinite(dependencyValues.numericalRadius)
              )
            ) {
              return {};
            }

            let theta = Math.atan2(
              x2 - dependencyValues.numericalCenter[1],
              x1 - dependencyValues.numericalCenter[0],
            );

            let result = {
              x1:
                dependencyValues.numericalCenter[0] +
                dependencyValues.numericalRadius * Math.cos(theta),
              x2:
                dependencyValues.numericalCenter[1] +
                dependencyValues.numericalRadius * Math.sin(theta),
            };

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

  moveCircle({ center, transient }) {
    let instructions = [
      {
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'numericalCenter',
        value: center,
      },
    ];

    if (
      this.stateValues.nThroughPoints === 1 &&
      this.stateValues.numericalPrescribedCenter !== null &&
      this.stateValues.numericalPrescribedRadius === null
    ) {
      // Case of a circle prescribed by center and one point.
      // Need to move the point to preserve the radius

      let theta = this.stateValues.throughAngles[0];
      let pt = [
        center[0] + this.stateValues.numericalRadius * Math.cos(theta),
        center[1] + this.stateValues.numericalRadius * Math.sin(theta),
      ];

      instructions.push({
        updateType: 'updateValue',
        componentName: this.componentName,
        stateVariable: 'numericalThroughPoints',
        value: [pt],
      });
    }

    if (transient) {
      this.coreFunctions.requestUpdate({
        updateInstructions: instructions,
        transient,
      });
    } else {
      this.coreFunctions.requestUpdate({
        updateInstructions: instructions,
        event: {
          verb: 'interacted',
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          result: {
            center,
          },
        },
      });
    }
  }
}

function circleFromTwoNumericalPoints({ point1, point2 }) {
  let xcenter = (point1[0] + point2[0]) / 2;
  let ycenter = (point1[1] + point2[1]) / 2;
  let numericalCenter = [xcenter, ycenter];
  let numericalRadius = Math.sqrt(
    Math.pow(xcenter - point1[0], 2) + Math.pow(ycenter - point1[1], 2),
  );
  return { numericalCenter, numericalRadius };
}
