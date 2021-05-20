import GraphicalComponent from './abstract/GraphicalComponent';
import { returnBreakStringsSugarFunction } from './commonsugar/breakstrings';

import me from 'math-expressions';

export default class Curve extends GraphicalComponent {
  static componentType = 'curve';
  static rendererType = 'curve';

  actions = {
    moveControlVector: this.moveControlVector.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
    moveThroughPoint: this.moveThroughPoint.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
    changeVectorControlDirection: this.changeVectorControlDirection.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    ),
  };

  static primaryStateVariableForDefinition = 'fShadow';
  static get stateVariablesShadowedForReference() {
    return [
      'variableForChild',
      'parMin',
      'parMax',
      'curveType',
      'nThroughPoints',
      'nDimensions',
      'throughPoints',
    ];
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

    attributes.label.propagateToDescendants = true;
    attributes.showLabel.propagateToDescendants = true;
    attributes.layer.propagateToDescendants = true;

    attributes.flipFunction = {
      createComponentOfType: 'boolean',
      createStateVariable: 'flipFunction',
      defaultValue: false,
      public: true,
      forRenderer: true,
    };
    attributes.nDiscretizationPoints = {
      createComponentOfType: 'number',
      createStateVariable: 'nDiscretizationPoints',
      defaultValue: 100,
      public: true,
    };
    attributes.periodic = {
      createComponentOfType: 'boolean',
      createStateVariable: 'periodic',
      defaultValue: false,
      public: true,
    };
    attributes.splineTension = {
      createComponentOfType: 'number',
      createStateVariable: 'splineTension',
      defaultValue: 0.8,
      clamp: [0, 1],
      public: true,
    };
    attributes.extrapolateBackward = {
      createComponentOfType: 'boolean',
      createStateVariable: 'extrapolateBackward',
      defaultValue: false,
      public: true,
      forRenderer: true,
    };
    attributes.extrapolateForward = {
      createComponentOfType: 'boolean',
      createStateVariable: 'extrapolateForward',
      defaultValue: false,
      public: true,
      forRenderer: true,
    };
    attributes.splineForm = {
      createComponentOfType: 'text',
      createStateVariable: 'splineForm',
      defaultValue: 'centripetal',
      public: true,
      toLowerCase: true,
      validValues: ['centripetal', 'uniform'],
    };
    attributes.variable = {
      createComponentOfType: 'variable',
      createStateVariable: 'variableForChild',
      defaultValue: me.fromAst('x'),
    };

    attributes.through = {
      createComponentOfType: '_pointListComponent',
    };
    attributes.parMin = {
      createComponentOfType: 'math',
    };
    attributes.parMax = {
      createComponentOfType: 'math',
    };

    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakIntoFunctionsByCommas = function ({ matchedChildren }) {
      let childrenToComponentFunction = (x) => ({
        componentType: 'function',
        children: x,
      });

      let breakFunction = returnBreakStringsSugarFunction({
        childrenToComponentFunction,
        mustStripOffOuterParentheses: true,
      });

      let result = breakFunction({ matchedChildren });

      if (!result.success) {
        // if didn't succeed,
        // then just wrap string with a function
        return {
          success: true,
          newChildren: [
            {
              componentType: 'function',
              children: matchedChildren,
            },
          ],
        };
      }

      return result;
    };

    sugarInstructions.push({
      childrenRegex: /s/,
      replacementFunction: breakIntoFunctionsByCommas,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroFunctions = childLogic.newLeaf({
      name: 'atLeastZeroFunctions',
      componentType: 'function',
      comparison: 'atLeast',
      number: 0,
    });

    let atMostOneBezierControls = childLogic.newLeaf({
      name: 'atMostOneBezierControls',
      componentType: 'bezierControls',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'functionsXorControl',
      operator: 'xor',
      propositions: [atLeastZeroFunctions, atMostOneBezierControls],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions({ numerics }) {
    let stateVariableDefinitions = super.returnStateVariableDefinitions({
      numerics,
    });

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
        let curveDescription = '';
        if (dependencyValues.selectedStyle.lineWidth >= 4) {
          curveDescription += 'thick ';
        } else if (dependencyValues.selectedStyle.lineWidth <= 1) {
          curveDescription += 'thin ';
        }
        if (dependencyValues.selectedStyle.lineStyle === 'dashed') {
          curveDescription += 'dashed ';
        } else if (dependencyValues.selectedStyle.lineStyle === 'dotted') {
          curveDescription += 'dotted ';
        }

        curveDescription += dependencyValues.selectedStyle.lineColor;

        return { newValues: { styleDescription: curveDescription } };
      },
    };

    stateVariableDefinitions.curveType = {
      forRenderer: true,
      returnDependencies: () => ({
        functionChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroFunctions',
        },
        through: {
          dependencyType: 'attributeComponent',
          attributeName: 'through',
        },
      }),
      definition({ dependencyValues }) {
        let curveType = 'function';
        if (dependencyValues.through !== null) {
          curveType = 'bezier';
        } else if (dependencyValues.functionChildren.length > 1) {
          curveType = 'parameterization';
        }

        return { newValues: { curveType } };
      },
    };

    // fShadow will be null unless curve was created via an adapter
    // In case of adapter,
    // given the primaryStateVariableForDefinition static variable,
    // the definition of fShadow will be changed to be the value
    // that shadows the component adapted
    stateVariableDefinitions.fShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          fShadow: { variablesToCheck: ['fShadow'] },
        },
      }),
    };

    stateVariableDefinitions.parMax = {
      public: true,
      componentType: 'number',
      forRenderer: true,
      defaultValue: 10,
      returnDependencies: () => ({
        curveType: {
          dependencyType: 'stateVariable',
          variableName: 'curveType',
        },
        parMaxAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'parMax',
          variableNames: ['value'],
        },
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
        extrapolateForward: {
          dependencyType: 'stateVariable',
          variableName: 'extrapolateForward',
        },
      }),
      definition: function ({ dependencyValues }) {
        let parMax;
        if (dependencyValues.curveType === 'bezier') {
          parMax = dependencyValues.nThroughPoints - 1;
          if (dependencyValues.extrapolateForward) {
            parMax *= 2;
          }
        } else if (dependencyValues.parMaxAttr !== null) {
          parMax =
            dependencyValues.parMaxAttr.stateValues.value.evaluate_to_constant();
          if (!Number.isFinite(parMax)) {
            parMax = NaN;
          }
        } else {
          return {
            useEssentialOrDefaultValue: {
              parMax: { variablesToCheck: ['parMax'] },
            },
          };
        }

        return { newValues: { parMax } };
      },
    };

    stateVariableDefinitions.parMin = {
      forRenderer: true,
      public: true,
      componentType: 'number',
      defaultValue: -10,
      returnDependencies: () => ({
        curveType: {
          dependencyType: 'stateVariable',
          variableName: 'curveType',
        },
        parMinAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'parMin',
          variableNames: ['value'],
        },
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
        extrapolateBackward: {
          dependencyType: 'stateVariable',
          variableName: 'extrapolateBackward',
        },
      }),
      definition: function ({ dependencyValues }) {
        let parMin;
        if (dependencyValues.curveType === 'bezier') {
          parMin = 0;
          if (dependencyValues.extrapolateBackward) {
            parMin = -(dependencyValues.nThroughPoints - 1);
          }
        } else if (dependencyValues.parMinAttr !== null) {
          parMin =
            dependencyValues.parMinAttr.stateValues.value.evaluate_to_constant();
          if (!Number.isFinite(parMin)) {
            parMin = NaN;
          }
        } else {
          return {
            useEssentialOrDefaultValue: {
              parMin: { variablesToCheck: ['parMin'] },
            },
          };
        }
        return { newValues: { parMin } };
      },
    };

    stateVariableDefinitions.nThroughPoints = {
      returnDependencies: () => ({
        through: {
          dependencyType: 'attributeComponent',
          attributeName: 'through',
          variableNames: ['nPoints'],
        },
      }),
      definition({ dependencyValues }) {
        let nThroughPoints = 0;
        if (dependencyValues.through !== null) {
          nThroughPoints = dependencyValues.through.stateValues.nPoints;
        }
        return { newValues: { nThroughPoints } };
      },
    };

    stateVariableDefinitions.nDimensions = {
      public: true,
      componentType: 'number',
      returnDependencies() {
        return {
          through: {
            dependencyType: 'attributeComponent',
            attributeName: 'through',
            variableNames: ['nDimensions'],
          },
        };
      },
      definition: function ({ dependencyValues }) {
        if (dependencyValues.through !== null) {
          let nDimensions = dependencyValues.through.stateValues.nDimensions;
          return {
            newValues: { nDimensions },
            checkForActualChange: { nDimensions: true },
          };
        } else {
          // curve through zero points
          return { newValues: { nDimensions: 2 } };
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
          // throughPoint or entire array
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'throughPointX') {
          // throughPointX1_2 is the 2nd component of the first throughPoint
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
          // throughPoint3 is all components of the third throughPoint
          if (!arraySize) {
            return [];
          }
          let throughPointInd = Number(varEnding) - 1;
          if (
            Number.isInteger(throughPointInd) &&
            throughPointInd >= 0 &&
            throughPointInd < arraySize[0]
          ) {
            // array of "throughPointInd,i", where i=0, ..., arraySize[1]-1
            return Array.from(
              Array(arraySize[1]),
              (_, i) => throughPointInd + ',' + i,
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
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nThroughPoints, dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          dependenciesByKey[arrayKey] = {
            through: {
              dependencyType: 'attributeComponent',
              attributeName: 'through',
              variableNames: ['pointX' + varEnding],
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log('array definition of curve throughPoints');
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))
        // console.log(arrayKeys);

        let throughPoints = {};

        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');
          let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

          let through = dependencyValuesByKey[arrayKey].through;
          if (through !== null && through.stateValues['pointX' + varEnding]) {
            throughPoints[arrayKey] = through.stateValues['pointX' + varEnding];
          } else {
            throughPoints[arrayKey] = me.fromAst(0);
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
        // console.log(`inverseArrayDefinition of throughPoints of curve`);
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
            dependencyValuesByKey[arrayKey].through !== null &&
            dependencyValuesByKey[arrayKey].through.stateValues[
              'pointX' + varEnding
            ]
          ) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].through,
              desiredValue: desiredStateVariableValues.throughPoints[arrayKey],
              childIndex: 0,
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

    stateVariableDefinitions.numericalThroughPoints = {
      isArray: true,
      entryPrefixes: ['numericalThroughPoint'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nThroughPoints];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            throughPoint: {
              dependencyType: 'stateVariable',
              variableName: 'throughPoint' + (Number(arrayKey) + 1),
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let numericalThroughPoints = {};

        for (let arrayKey of arrayKeys) {
          let pt = dependencyValuesByKey[arrayKey].throughPoint.map((x) =>
            x.evaluate_to_constant(),
          );
          if (!pt.every((x) => Number.isFinite(x))) {
            pt = Array(pt.length).fill(NaN);
          }
          numericalThroughPoints[arrayKey] = pt;
        }

        return { newValues: { numericalThroughPoints } };
      },
    };

    stateVariableDefinitions.haveBezierControls = {
      forRenderer: true,
      returnDependencies: () => ({
        controlChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneBezierControls',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            haveBezierControls: dependencyValues.controlChild.length === 1,
          },
        };
      },
    };

    stateVariableDefinitions.vectorControlDirections = {
      public: true,
      componentType: 'text',
      isArray: true,
      entryPrefixes: ['vectorControlDirection'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nThroughPoints];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            controlChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneBezierControls',
              variableNames: ['direction' + (Number(arrayKey) + 1)],
            },
          };
        }

        let globalDependencies = {
          haveBezierControls: {
            dependencyType: 'stateVariable',
            variableName: 'haveBezierControls',
          },
        };

        return { dependenciesByKey, globalDependencies };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let vectorControlDirections = {};

        for (let arrayKey of arrayKeys) {
          let controlChild = dependencyValuesByKey[arrayKey].controlChild;

          if (controlChild && controlChild.length === 1) {
            vectorControlDirections[arrayKey] =
              controlChild[0].stateValues['direction' + (Number(arrayKey) + 1)];
          } else {
            vectorControlDirections[arrayKey] = 'none';
          }
        }

        return {
          newValues: { vectorControlDirections },
        };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        dependencyValuesByKey,
        globalDependencyValues,
      }) {
        // if don't have bezier controls, cannot change directions,
        // they all stay at none so that have a spline
        if (!globalDependencyValues.haveBezierControls) {
          return { success: false };
        }

        let instructions = [];
        let newDirectionValues = {};
        for (let arrayKey in desiredStateVariableValues.vectorControlDirections) {
          let controlChild = dependencyValuesByKey[arrayKey].controlChild;

          if (controlChild && controlChild.length === 1) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].controlChild,
              desiredValue:
                desiredStateVariableValues.vectorControlDirections[arrayKey],
              childIndex: 0,
              variableIndex: 0,
            });
          } else {
            newDirectionValues[arrayKey] =
              desiredStateVariableValues.vectorControlDirections[arrayKey];
          }
        }

        if (Object.keys(newDirectionValues).length > 0) {
          instructions.push({
            setStateVariable: 'vectorControlDirections',
            value: newDirectionValues,
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.controlVectors = {
      isArray: true,
      public: true,
      componentType: 'math',
      entryPrefixes: ['controlVectorX', 'controlVector'],
      nDimensions: 3,
      stateVariablesDeterminingDependencies: [
        'vectorControlDirections',
        'nThroughPoints',
      ],
      returnWrappingComponents(prefix) {
        if (prefix === 'controlVectorX') {
          return [];
        } else {
          // controlVector or entire array
          // wrap inner dimension by both <vector> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['vector', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'controlVectorX') {
          // controlVectorX3_2_1 is the first component of the second control vector
          // controlling the third point
          let indices = varEnding.split('_').map((x) => Number(x) - 1);
          if (
            indices.length === 3 &&
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
          // controlVector3_2 is all components of the second control vector
          // controling the third point
          if (!arraySize) {
            return [];
          }
          let indices = varEnding.split('_').map((x) => Number(x) - 1);
          if (
            indices.length === 2 &&
            indices.every(
              (x, i) => Number.isInteger(x) && x >= 0 && x < arraySize[i],
            )
          ) {
            return Array.from(
              Array(arraySize[2]),
              (_, i) => String(indices) + ',' + i,
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
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [
          dependencyValues.nThroughPoints,
          2,
          dependencyValues.nDimensions,
        ];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let globalDependencies = {
          haveBezierControls: {
            dependencyType: 'stateVariable',
            variableName: 'haveBezierControls',
          },
          nThroughPoints: {
            dependencyType: 'stateVariable',
            variableName: 'nThroughPoints',
          },
          nDimensions: {
            dependencyType: 'stateVariable',
            variableName: 'nDimensions',
          },
          splineTension: {
            dependencyType: 'stateVariable',
            variableName: 'splineTension',
          },
          splineForm: {
            dependencyType: 'stateVariable',
            variableName: 'splineForm',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let arrayIndices = arrayKey.split(',').map((x) => Number(x));
          let varEndings = arrayIndices.map((x) => x + 1);
          let jointVarEnding = varEndings.join('_');

          dependenciesByKey[arrayKey] = {
            direction: {
              dependencyType: 'stateVariable',
              variableName: 'vectorControlDirection' + varEndings[0],
            },
            controlChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneBezierControls',
              variableNames: ['control' + jointVarEnding],
            },
          };

          let pointInd = arrayIndices[0];
          let direction = stateValues.vectorControlDirections[pointInd];
          let indsToCheck = [];
          if (direction === 'none') {
            indsToCheck = [pointInd - 1, pointInd, pointInd + 1];
          } else if (direction === 'previous') {
            indsToCheck = [pointInd, pointInd + 1];
          } else if (direction === 'next') {
            indsToCheck = [pointInd - 1, pointInd];
          }

          for (let ind of indsToCheck) {
            if (ind >= 0 && ind < stateValues.nThroughPoints) {
              dependenciesByKey[arrayKey]['throughPoint' + (ind + 1)] = {
                dependencyType: 'stateVariable',
                variableName: 'throughPoint' + (ind + 1),
              };
            }
          }
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        // console.log('definition of controlVectors for curve')
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)));
        // console.log(JSON.parse(JSON.stringify(globalDependencyValues)));
        // console.log(JSON.parse(JSON.stringify(arrayKeys)))

        let newControlValues = {};

        for (let arrayKey of arrayKeys) {
          // we have calculated this only for 2D
          if (globalDependencyValues.nDimensions !== 2) {
            newControlValues[arrayKey] = me.fromAst(NaN);
            continue;
          }

          // since calculate two control vectors at once with symmetric
          // and both dimensions of each vector at once
          // it is possible that arrayKey was calculated earlier in the loop
          if (arrayKey in newControlValues) {
            continue;
          }

          let arrayIndices = arrayKey.split(',').map((x) => Number(x));
          let varEndings = arrayIndices.map((x) => x + 1);
          let jointVarEnding = varEndings.join('_');

          let pointInd = arrayIndices[0];
          let vectorInd = arrayIndices[1];

          let direction = dependencyValuesByKey[arrayKey].direction;
          // if (!direction) {
          //   direction = "none";
          // }

          if (direction === 'none') {
            // if direction is none, then determine both first and second control vector
            // via spline (they will be symmetric)

            let point2 =
              dependencyValuesByKey[arrayKey]['throughPoint' + (pointInd + 1)];

            let point1, point3;
            if (pointInd > 0) {
              point1 =
                dependencyValuesByKey[arrayKey]['throughPoint' + pointInd];
            }
            if (pointInd < globalDependencyValues.nThroughPoints) {
              point3 =
                dependencyValuesByKey[arrayKey][
                  'throughPoint' + (pointInd + 2)
                ];
            }

            let { coordsNumeric, numericEntries } =
              calculateControlVectorFromSpline({
                tau: globalDependencyValues.splineTension,
                eps: numerics.eps,
                splineForm: globalDependencyValues.splineForm,
                point1,
                point2,
                point3,
              });

            for (let dim = 0; dim < 2; dim++) {
              let arrayKeyDim = pointInd + ',' + vectorInd + ',' + dim;
              let flippedArrayKeyDim =
                pointInd + ',' + (1 - vectorInd) + ',' + dim;

              if (vectorInd === 0) {
                // arrayKey corresponds to first vector
                newControlValues[arrayKeyDim] = coordsNumeric[dim];
                newControlValues[flippedArrayKeyDim] = me.fromAst(
                  -coordsNumeric[dim].tree,
                );
              } else {
                // arrayKey corresponds to second vector
                newControlValues[arrayKeyDim] = me.fromAst(
                  -coordsNumeric[dim].tree,
                );
                newControlValues[flippedArrayKeyDim] = coordsNumeric[dim];
              }
            }
          } else if (
            (arrayIndices[1] === 0 && direction === 'next') ||
            (arrayIndices[1] === 0 && direction === 'next')
          ) {
            // calculate control vector from spline

            // only two of these three will be defined
            let point1 =
              dependencyValuesByKey[arrayKey]['throughPoint' + pointInd];
            let point2 =
              dependencyValuesByKey[arrayKey]['throughPoint' + (pointInd + 1)];
            let point3 =
              dependencyValuesByKey[arrayKey]['throughPoint' + (pointInd + 2)];

            let { coordsNumeric, numericEntries } =
              calculateControlVectorFromSpline({
                tau: globalDependencyValues.splineTension,
                eps: numerics.eps,
                splineForm: globalDependencyValues.splineForm,
                point1: point1 ? point1 : point3,
                point2,
                point3: undefined,
              });

            for (let dim = 0; dim < 2; dim++) {
              let arrayKeyDim = pointInd + ',' + vectorInd + ',' + dim;
              newControlValues[arrayKeyDim] = coordsNumeric[dim];
            }
          } else {
            // if have a vector from control child, use that
            newControlValues[arrayKey] =
              dependencyValuesByKey[arrayKey].controlChild[0].stateValues[
                'control' + jointVarEnding
              ];
          }
        }

        return {
          newValues: {
            controlVectors: newControlValues,
          },
          // useEssentialOrDefaultValue: {
          //   controlVectors: essentialControls,
          // },
          // makeEssential: ["controlVectors"],
        };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        dependencyValuesByKey,
        globalDependencyValues,
      }) {
        // console.log('inverse definition of controlVectors for curve')
        // console.log(JSON.parse(JSON.stringify(desiredStateVariableValues)));
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)));
        // console.log(JSON.parse(JSON.stringify(globalDependencyValues)));

        // if don't have bezier controls, cannot change control vectors,
        // they all stay at those calculated from spline
        // Also can't change if aren't in 2D
        if (
          !globalDependencyValues.haveBezierControls ||
          globalDependencyValues.nDimensions !== 2
        ) {
          return { success: false };
        }

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.controlVectors) {
          let arrayIndices = arrayKey.split(',').map((x) => Number(x));
          let varEndings = arrayIndices.map((x) => x + 1);
          let jointVarEnding = varEndings.join('_');

          // if find the control on the control child,
          // set its value to the desired value
          let controlChild = dependencyValuesByKey[arrayKey].controlChild;
          if (controlChild.length === 1) {
            let control =
              controlChild[0].stateValues['control' + jointVarEnding];
            if (control) {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].controlChild,
                desiredValue:
                  desiredStateVariableValues.controlVectors[arrayKey],
                childIndex: 0,
                variableIndex: 0,
              });
            }
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.numericalControlVectors = {
      isArray: true,
      entryPrefixes: ['numericalControlVector'],
      forRenderer: true,
      nDimensions: 2,
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
          let arrayIndices = arrayKey.split(',').map((x) => Number(x));
          let varEndings = arrayIndices.map((x) => x + 1);
          let jointVarEnding = varEndings.join('_');

          dependenciesByKey[arrayKey] = {
            controlVector: {
              dependencyType: 'stateVariable',
              variableName: 'controlVector' + jointVarEnding,
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // control vectors already have numerical entries,
        // so just need to take tree from math expressions

        let numericalControlVectors = {};

        for (let arrayKey of arrayKeys) {
          let vect = dependencyValuesByKey[arrayKey].controlVector.map(
            (x) => x.tree,
          );
          numericalControlVectors[arrayKey] = vect;
        }

        return { newValues: { numericalControlVectors } };
      },
    };

    stateVariableDefinitions.controlPoints = {
      isArray: true,
      public: true,
      componentType: 'math',
      entryPrefixes: ['controlPointX', 'controlPoint'],
      nDimensions: 3,
      returnWrappingComponents(prefix) {
        if (prefix === 'controlPointX') {
          return [];
        } else {
          // controlPoint or entire array
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'controlPointX') {
          // controlPointX3_2_1 is the first component of the second control point
          // controlling the third point
          let indices = varEnding.split('_').map((x) => Number(x) - 1);
          if (
            indices.length === 3 &&
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
          // controlPoint3_2 is all components of the second control point
          // controling the third point
          if (!arraySize) {
            return [];
          }
          let indices = varEnding.split('_').map((x) => Number(x) - 1);
          if (
            indices.length === 2 &&
            indices.every(
              (x, i) => Number.isInteger(x) && x >= 0 && x < arraySize[i],
            )
          ) {
            return Array.from(
              Array(arraySize[2]),
              (_, i) => String(indices) + ',' + i,
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
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [
          dependencyValues.nThroughPoints,
          2,
          dependencyValues.nDimensions,
        ];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          haveBezierControls: {
            dependencyType: 'stateVariable',
            variableName: 'haveBezierControls',
          },
          nDimensions: {
            dependencyType: 'stateVariable',
            variableName: 'nDimensions',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let arrayIndices = arrayKey.split(',').map((x) => Number(x));
          let varEndings = arrayIndices.map((x) => x + 1);
          let jointVarEnding = varEndings.join('_');

          dependenciesByKey[arrayKey] = {
            throughPointX: {
              dependencyType: 'stateVariable',
              variableName:
                'throughPointX' + varEndings[0] + '_' + varEndings[2],
            },
            controlVectorX: {
              dependencyType: 'stateVariable',
              variableName: 'controlVectorX' + jointVarEnding,
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
        // console.log('definition of controlPoints for curve')
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)));
        // console.log(JSON.parse(JSON.stringify(globalDependencyValues)));
        // console.log(JSON.parse(JSON.stringify(arrayKeys)))

        let newControlValues = {};

        for (let arrayKey of arrayKeys) {
          // we have calculated this only for 2D
          if (globalDependencyValues.nDimensions !== 2) {
            newControlValues[arrayKey] = me.fromAst(NaN);
          } else {
            let vectorX = dependencyValuesByKey[arrayKey].controlVectorX;

            if (vectorX) {
              let pointX =
                dependencyValuesByKey[
                  arrayKey
                ].throughPointX.evaluate_to_constant();
              if (!Number.isFinite(pointX)) {
                pointX = NaN;
              }
              newControlValues[arrayKey] = me.fromAst(pointX + vectorX.tree);
            } else {
              newControlValues[arrayKey] = null;
            }
          }
        }
        return {
          newValues: {
            controlPoints: newControlValues,
          },
        };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        dependencyValuesByKey,
        globalDependencyValues,
      }) {
        // if don't have bezier controls, cannot change control vectors,
        // they all stay at those calculated from spline
        // Also can't change if aren't in 2D
        if (
          !globalDependencyValues.haveBezierControls ||
          globalDependencyValues.nDimensions !== 2
        ) {
          return { success: false };
        }

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.controlPoints) {
          // if find the control on the control child,
          // set its value to the desired value
          let vectorX = dependencyValuesByKey[arrayKey].controlVectorX;
          if (vectorX) {
            let pointX = dependencyValuesByKey[arrayKey].throughPointX;

            let desiredPoint =
              desiredStateVariableValues.controlPoints[arrayKey];
            if (desiredPoint.tree) {
              desiredPoint = desiredPoint.tree;
            }
            let desiredValue = me.fromAst([
              '+',
              desiredPoint,
              ['-', pointX.tree],
            ]);

            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].controlVectorX,
              desiredValue,
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.numericalControlPoints = {
      isArray: true,
      entryPrefixes: ['numericalControlPoint'],
      forRenderer: true,
      nDimensions: 2,
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
          let arrayIndices = arrayKey.split(',').map((x) => Number(x));
          let varEndings = arrayIndices.map((x) => x + 1);
          let jointVarEnding = varEndings.join('_');

          dependenciesByKey[arrayKey] = {
            controlPoint: {
              dependencyType: 'stateVariable',
              variableName: 'controlPoint' + jointVarEnding,
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // control points have numerical entries, to just take expression trees
        let numericalControlPoints = {};

        for (let arrayKey of arrayKeys) {
          let pt = dependencyValuesByKey[arrayKey].controlPoint.map(
            (x) => x.tree,
          );
          numericalControlPoints[arrayKey] = pt;
        }

        return { newValues: { numericalControlPoints } };
      },
    };

    stateVariableDefinitions.splineCoeffs = {
      isArray: true,
      returnArraySizeDependencies: () => ({
        nThroughPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nThroughPoints',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nThroughPoints - 1];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let ind1 = Number(arrayKey) + 1;
          let ind2 = ind1 + 1;

          dependenciesByKey[arrayKey] = {
            previousPoint: {
              dependencyType: 'stateVariable',
              variableName: 'numericalThroughPoint' + ind1,
            },
            nextPoint: {
              dependencyType: 'stateVariable',
              variableName: 'numericalThroughPoint' + ind2,
            },
            previousVector: {
              dependencyType: 'stateVariable',
              variableName: 'numericalControlVector' + ind1 + '_2',
            },
            nextVector: {
              dependencyType: 'stateVariable',
              variableName: 'numericalControlVector' + ind2 + '_1',
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let newSpineCoeffs = {};

        for (let arrayKey of arrayKeys) {
          let p1 = dependencyValuesByKey[arrayKey].previousPoint;
          let p2 = dependencyValuesByKey[arrayKey].nextPoint;
          let cv1 = dependencyValuesByKey[arrayKey].previousVector;
          let cv2 = dependencyValuesByKey[arrayKey].nextVector;

          let c = [];
          for (let dim = 0; dim < 2; dim++) {
            c.push(
              initCubicPoly(p1[dim], p2[dim], 3 * cv1[dim], -3 * cv2[dim]),
            );
          }

          newSpineCoeffs[arrayKey] = c;
        }

        return {
          newValues: {
            splineCoeffs: newSpineCoeffs,
          },
        };
      },
    };

    stateVariableDefinitions.extrapolateBackwardCoeffs = {
      returnDependencies: () => ({
        extrapolateBackward: {
          dependencyType: 'stateVariable',
          variableName: 'extrapolateBackward',
        },
        throughPoint1: {
          dependencyType: 'stateVariable',
          variableName: 'numericalThroughPoint1',
        },
        throughPoint2: {
          dependencyType: 'stateVariable',
          variableName: 'numericalThroughPoint2',
        },
        controlVector: {
          dependencyType: 'stateVariable',
          variableName: 'numericalControlVector1_1',
        },
      }),
      definition({ dependencyValues }) {
        if (!dependencyValues.extrapolateBackward) {
          return { newValues: { extrapolateBackwardCoeffs: null } };
        }

        // coefficicents to extrapolate beyond the first
        // if extrapolateBackward is true
        // For each curve component, we extrapolate with either
        // - a linear function that matches the value and derivative
        //   of the outer point, or
        // - a quadratic function that, in addition, matches the value
        //   of the previous point.
        // We choose the quadratic only if its critical point
        // is not located in the portion we extrapolate, i.e.,
        // we don't want the extrapolated curve to turn around in either x or y direction

        let p1 = dependencyValues.throughPoint1;
        let p2 = dependencyValues.throughPoint2;
        let cv1 = dependencyValues.controlVector;

        if (!(p1 && p2 && cv1)) {
          return { newValues: { extrapolateBackwardCoeffs: null } };
        }

        let c = [];
        c[0] = [p1[0], -3 * cv1[0] * 4, 0];

        let c2 = (p2[0] - p1[0] - 3 * cv1[0]) * -16;
        if (c2 !== 0) {
          if (cv1[0] / c2 > 0) {
            c[0][2] = c2;
          }
        }

        c[1] = [p1[1], -3 * cv1[1] * 4, 0];

        c2 = (p2[1] - p1[1] - 3 * cv1[1]) * -16;
        if (c2 !== 0) {
          if (cv1[1] / c2 > 0) {
            c[1][2] = c2;
          }
        }

        return { newValues: { extrapolateBackwardCoeffs: c } };
      },
    };

    stateVariableDefinitions.extrapolateForwardCoeffs = {
      stateVariablesDeterminingDependencies: ['nThroughPoints'],
      returnDependencies({ stateValues }) {
        let dependencies = {
          extrapolateForward: {
            dependencyType: 'stateVariable',
            variableName: 'extrapolateForward',
          },
        };

        if (stateValues.nThroughPoints >= 2) {
          dependencies.throughPoint1 = {
            dependencyType: 'stateVariable',
            variableName:
              'numericalThroughPoint' + (stateValues.nThroughPoints - 1),
          };
          (dependencies.throughPoint2 = {
            dependencyType: 'stateVariable',
            variableName: 'numericalThroughPoint' + stateValues.nThroughPoints,
          }),
            (dependencies.controlVector = {
              dependencyType: 'stateVariable',
              variableName:
                'numericalControlVector' + stateValues.nThroughPoints + '_2',
            });
        }
        return dependencies;
      },
      definition({ dependencyValues }) {
        if (!dependencyValues.extrapolateForward) {
          return { newValues: { extrapolateForwardCoeffs: null } };
        }

        // coefficicents to extrapolate beyond the last
        // if extrapolateForward is true
        // For each curve component, we extrapolate with either
        // - a linear function that matches the value and derivative
        //   of the outer point, or
        // - a quadratic function that, in addition, matches the value
        //   of the previous point.
        // We choose the quadratic only if its critical point
        // is not located in the portion we extrapolate, i.e.,
        // we don't want the extrapolated curve to turn around in either x or y direction

        let p1 = dependencyValues.throughPoint1;
        let p2 = dependencyValues.throughPoint2;
        let cv2 = dependencyValues.controlVector;

        if (!(p1 && p2 && cv2)) {
          return { newValues: { extrapolateForwardCoeffs: null } };
        }

        let c = [];
        c[0] = [p2[0], 3 * cv2[0] * 4, 0];

        let c2 = (p1[0] - p2[0] - 3 * cv2[0]) * -16;
        if (c2 !== 0) {
          if (cv2[0] / c2 > 0) {
            c[0][2] = c2;
          }
        }

        c[1] = [p2[1], 3 * cv2[1] * 4, 0];

        c2 = (p1[1] - p2[1] - 3 * cv2[1]) * -16;
        if (c2 !== 0) {
          if (cv2[1] / c2 > 0) {
            c[1][2] = c2;
          }
        }

        return { newValues: { extrapolateForwardCoeffs: c } };
      },
    };

    stateVariableDefinitions.fs = {
      forRenderer: true,
      isArray: true,
      entryPrefixes: ['f'],
      defaultEntryValue: () => 0,
      returnArraySizeDependencies: () => ({
        functionChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroFunctions',
        },
        curveType: {
          dependencyType: 'stateVariable',
          variableName: 'curveType',
        },
      }),
      returnArraySize({ dependencyValues }) {
        if (dependencyValues.curveType === 'bezier') {
          return [2];
        } else {
          return [Math.max(1, dependencyValues.functionChildren.length)];
        }
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          curveType: {
            dependencyType: 'stateVariable',
            variableName: 'curveType',
          },
          numericalThroughPoints: {
            dependencyType: 'stateVariable',
            variableName: 'numericalThroughPoints',
          },
          splineCoeffs: {
            dependencyType: 'stateVariable',
            variableName: 'splineCoeffs',
          },
          nThroughPoints: {
            dependencyType: 'stateVariable',
            variableName: 'nThroughPoints',
          },
          extrapolateBackward: {
            dependencyType: 'stateVariable',
            variableName: 'extrapolateBackward',
          },
          extrapolateBackwardCoeffs: {
            dependencyType: 'stateVariable',
            variableName: 'extrapolateBackwardCoeffs',
          },
          extrapolateForward: {
            dependencyType: 'stateVariable',
            variableName: 'extrapolateForward',
          },
          extrapolateForwardCoeffs: {
            dependencyType: 'stateVariable',
            variableName: 'extrapolateForwardCoeffs',
          },
        };

        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            functionChild: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroFunctions',
              variableNames: ['numericalf'],
              childIndices: [arrayKey],
            },
          };
          if (Number(arrayKey) === 0) {
            dependenciesByKey[arrayKey].fShadow = {
              dependencyType: 'stateVariable',
              variableName: 'fShadow',
            };
          }
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        if (globalDependencyValues.curveType === 'bezier') {
          return {
            newValues: {
              fs: returnBezierFunctions({ globalDependencyValues, arrayKeys }),
            },
          };
        }

        let fs = {};
        let essentialFs = {};
        for (let arrayKey of arrayKeys) {
          let functionChild = dependencyValuesByKey[arrayKey].functionChild;
          if (functionChild.length === 1) {
            fs[arrayKey] = functionChild[0].stateValues.numericalf;
          } else {
            if (
              Number(arrayKey) === 0 &&
              dependencyValuesByKey[arrayKey].fShadow
            ) {
              fs[arrayKey] = dependencyValuesByKey[arrayKey].fShadow;
            } else {
              essentialFs[arrayKey] = {
                variablesToCheck: [
                  { variableName: 'fs', arrayIndex: arrayKey },
                ],
              };
            }
          }
        }
        return {
          newValues: { fs },
          useEssentialOrDefaultValue: {
            fs: essentialFs,
          },
        };
      },
    };

    stateVariableDefinitions.f = {
      isAlias: true,
      targetVariableName: 'f1',
    };

    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        curveType: {
          dependencyType: 'stateVariable',
          variableName: 'curveType',
        },
        fs: {
          dependencyType: 'stateVariable',
          variableName: 'fs',
        },
        flipFunction: {
          dependencyType: 'stateVariable',
          variableName: 'flipFunction',
        },
        nDiscretizationPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nDiscretizationPoints',
        },
        parMin: {
          dependencyType: 'stateVariable',
          variableName: 'parMin',
        },
        parMax: {
          dependencyType: 'stateVariable',
          variableName: 'parMax',
        },
        periodic: {
          dependencyType: 'stateVariable',
          variableName: 'periodic',
        },
      }),
      definition({ dependencyValues }) {
        let nearestPointFunction = null;

        if (dependencyValues.curveType === 'function') {
          nearestPointFunction = getNearestPointFunctionCurve({
            dependencyValues,
            numerics,
          });
        } else if (
          ['parameterization', 'bezier'].includes(dependencyValues.curveType)
        ) {
          nearestPointFunction = getNearestPointParametrizedCurve({
            dependencyValues,
            numerics,
          });
        }

        return {
          newValues: { nearestPoint: nearestPointFunction },
        };
      },
    };

    return stateVariableDefinitions;
  }

  moveControlVector({ controlVector, controlVectorInds, transient }) {
    let desiredVector = {
      [controlVectorInds + ',0']: me.fromAst(controlVector[0]),
      [controlVectorInds + ',1']: me.fromAst(controlVector[1]),
    };

    if (transient) {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'controlVectors',
            value: desiredVector,
            sourceInformation: { controlVectorMoved: controlVectorInds },
          },
        ],
        transient,
      });
    } else {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'controlVectors',
            value: desiredVector,
            sourceInformation: { controlVectorMoved: controlVectorInds },
          },
        ],
        event: {
          verb: 'interacted',
          object: {
            componentId: this.componentName,
          },
          result: {
            ['controlVector' + controlVectorInds.join('_')]: controlVector,
          },
        },
      });
    }
  }

  moveThroughPoint({ throughPoint, throughPointInd, transient }) {
    let desiredPoint = {
      [throughPointInd + ',0']: me.fromAst(throughPoint[0]),
      [throughPointInd + ',1']: me.fromAst(throughPoint[1]),
    };

    if (transient) {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'throughPoints',
            value: desiredPoint,
            sourceInformation: { throughPointMoved: throughPointInd },
          },
        ],
        transient,
      });
    } else {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'throughPoints',
            value: desiredPoint,
            sourceInformation: { throughPointMoved: throughPointInd },
          },
        ],
        event: {
          verb: 'interacted',
          object: {
            componentId: this.componentName,
          },
          result: {
            ['throughPoint' + throughPointInd]: throughPoint,
          },
        },
      });
    }
  }

  changeVectorControlDirection({ direction, throughPointInd }) {
    this.coreFunctions.requestUpdate({
      updateInstructions: [
        {
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'vectorControlDirection',
          value: { [throughPointInd]: direction },
        },
      ],
    });
  }
}

function getNearestPointFunctionCurve({ dependencyValues, numerics }) {
  let flipFunction = dependencyValues.flipFunction;
  let f = dependencyValues.fs[0];
  let nDiscretizationPoints = dependencyValues.nDiscretizationPoints;

  return function (variables) {
    // first find nearest point when treating a function
    // (or an inverse function)
    // which finds a the nearest point vertically
    // (or horizontally)
    // assuming the function is defined at that point

    let x1AsFunction, x2AsFunction;
    if (flipFunction) {
      x2AsFunction = variables.x2.evaluate_to_constant();
      x1AsFunction = f(x2AsFunction);
    } else {
      x1AsFunction = variables.x1.evaluate_to_constant();
      x2AsFunction = f(x1AsFunction);
    }

    // next, find the nearest point over all

    let x1 = variables.x1.evaluate_to_constant();
    let x2 = variables.x2.evaluate_to_constant();

    if (!(Number.isFinite(x1) && Number.isFinite(x2))) {
      if (Number.isFinite(x1AsFunction) && Number.isFinite(x2AsFunction)) {
        result = {
          x1: x1AsFunction,
          x2: x2Asx1AsFunction,
        };
        if (variables.x3 !== undefined) {
          result.x3 = 0;
        }
        return result;
      } else {
        return {};
      }
    }

    let minfunc = function (t) {
      let x = -10 * Math.log(1 / t - 1);

      let dx1 = x1;
      let dx2 = x2;

      if (flipFunction) {
        dx1 -= f(x);
        dx2 -= x;
      } else {
        dx1 -= x;
        dx2 -= f(x);
      }

      return dx1 * dx1 + dx2 * dx2;
    };

    let minT = 0;
    let maxT = 1;

    let Nsteps = nDiscretizationPoints;
    let delta = (maxT - minT) / Nsteps;

    // sample Nsteps values of x between  [minT, maxT]
    // and find one where the value of minfunc is smallest
    // Will create an interval [tIntervalMin, tIntervalMax]
    // around that point (unless that point is minT or maxT)
    // to run numerical minimizer over that interval

    let tAtMin = minT;
    let fAtMin = minfunc(minT);
    let tIntervalMin = minT;
    let tIntervalMax = minT + delta;

    for (let step = 1; step <= Nsteps; step++) {
      let tnew = minT + step * delta;
      let fnew = minfunc(tnew);
      if (fnew < fAtMin || Number.isNaN(fAtMin)) {
        tAtMin = tnew;
        fAtMin = fnew;
        tIntervalMin = tnew - delta;
        if (step === Nsteps) {
          tIntervalMax = tnew;
        } else {
          tIntervalMax = tnew + delta;
        }
      }
    }

    let result = numerics.fminbr(minfunc, [tIntervalMin, tIntervalMax]);
    tAtMin = result.x;

    let x1AtMin = -10 * Math.log(1 / tAtMin - 1);
    let x2AtMin = f(x1AtMin);
    if (flipFunction) {
      [x1AtMin, x2AtMin] = [x2AtMin, x1AtMin];
    }

    // choose the nearest point treating as a function
    // if that point exists and isn't 10 times further
    // that the actual nearest point
    if (Number.isFinite(x1AsFunction) && Number.isFinite(x2AsFunction)) {
      let funD2 =
        Math.pow(x1AsFunction - x1, 2) + Math.pow(x2AsFunction - x2, 2);
      let d2 = Math.pow(x1AtMin - x1, 2) + Math.pow(x2AtMin - x2, 2);

      // 100 is 10 times distance, as working with squared distance
      if (funD2 < 100 * d2) {
        result = {
          x1: x1AsFunction,
          x2: x2AsFunction,
        };
        if (variables.x3 !== undefined) {
          result.x3 = 0;
        }
        return result;
      }
    }

    result = {
      x1: x1AtMin,
      x2: x2AtMin,
    };

    if (variables.x3 !== undefined) {
      result.x3 = 0;
    }

    return result;
  };
}

function getNearestPointParametrizedCurve({ dependencyValues, numerics }) {
  let fs = dependencyValues.fs;
  let parMin = dependencyValues.parMin;
  let parMax = dependencyValues.parMax;
  let nDiscretizationPoints = dependencyValues.nDiscretizationPoints;
  let periodic = dependencyValues.periodic;

  return function (variables) {
    // TODO: extend to dimensions other than N=2

    if (dependencyValues.fs.length !== 2) {
      return {};
    }

    let x1 = variables.x1.evaluate_to_constant();
    let x2 = variables.x2.evaluate_to_constant();

    if (!(Number.isFinite(x1) && Number.isFinite(x2))) {
      return {};
    }

    let minfunc = function (t) {
      let dx1 = x1 - fs[0](t);
      let dx2 = x2 - fs[1](t);

      return dx1 * dx1 + dx2 * dx2;
    };

    let minT = parMin;
    let maxT = parMax;

    let Nsteps = nDiscretizationPoints;
    let delta = (maxT - minT) / Nsteps;

    // sample Nsteps values of x between  [minT, maxT]
    // and find one where the value of minfunc is smallest
    // Will create an interval [tIntervalMin, tIntervalMax]
    // around that point (unless that point is minT or maxT)
    // to run numerical minimizer over that interval

    let tAtMin = minT;
    let fAtMin = minfunc(minT);
    let tIntervalMin = minT;
    let tIntervalMax = minT + delta;

    for (let step = 1; step <= Nsteps; step++) {
      let tnew = minT + step * delta;
      let fnew = minfunc(tnew);
      if (fnew < fAtMin || Number.isNaN(fAtMin)) {
        tAtMin = tnew;
        fAtMin = fnew;
        tIntervalMin = tnew - delta;
        if (step === Nsteps) {
          tIntervalMax = tnew;
        } else {
          tIntervalMax = tnew + delta;
        }
      }
    }

    if (periodic) {
      // if have periodic
      // and tAtMin is at endpoint, make interval span past endpoint
      if (Math.abs(tAtMin - minT) < numerics.eps) {
        // append interval for delta for last interval before minT
        tIntervalMin = minT - delta;
      } else if (Math.abs(tAtMin - maxT) < numerics.eps) {
        // append interval for delta for first interval after minT
        tIntervalMax = maxT + delta;
      }
    }

    let result = numerics.fminbr(minfunc, [tIntervalMin, tIntervalMax]);
    tAtMin = result.x;

    let x1AtMin = fs[0](tAtMin);
    let x2AtMin = fs[1](tAtMin);

    result = {
      x1: x1AtMin,
      x2: x2AtMin,
    };

    if (variables.x3 !== undefined) {
      result.x3 = 0;
    }

    return result;
  };
}

function calculateControlVectorFromSpline({
  tau,
  eps,
  point1,
  point2,
  point3,
  splineForm,
}) {
  let dist = function (p1, p2) {
    let dx = p1[0] - p2[0];
    let dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  let p1, p2, p3;

  if (point2) {
    p2 = point2.map((x) => x.evaluate_to_constant());
  } else {
    return {
      coordsNumeric: [me.fromAst(NaN), me.fromAst(NaN)],
      numericEntries: false,
    };
  }

  if (point3) {
    p3 = point3.map((x) => x.evaluate_to_constant());

    if (point1) {
      p1 = point1.map((x) => x.evaluate_to_constant());
    } else {
      p1 = [2 * p2[0] - p3[0], 2 * p2[1] - p3[1]];
    }
  } else {
    if (point1) {
      p1 = point1.map((x) => x.evaluate_to_constant());
      p3 = [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
    } else {
      return {
        coordsNumeric: [me.fromAst(NaN), me.fromAst(NaN)],
        numericEntries: false,
      };
    }
  }

  let cv = [];

  if (splineForm === 'centripetal') {
    let dt0 = dist(p1, p2);
    let dt1 = dist(p2, p3);

    dt0 = Math.sqrt(dt0);
    dt1 = Math.sqrt(dt1);

    if (dt1 < eps) {
      dt1 = 1.0;
    }
    if (dt0 < eps) {
      dt0 = dt1;
    }

    for (let dim = 0; dim < 2; dim++) {
      let t1 =
        (p2[dim] - p1[dim]) / dt0 -
        (p3[dim] - p1[dim]) / (dt1 + dt0) +
        (p3[dim] - p2[dim]) / dt1;

      // original algorithm would multiply by different dt's on each side
      // of the point
      // Took geometric mean so that control vectors are symmetric
      t1 *= tau * Math.sqrt(dt0 * dt1);

      // Bezier control vector component lengths
      // are one third the respective derivative of the cubic
      // if (i === 0) {
      //   cv.push(t1 / 3);
      // } else {
      cv.push(-t1 / 3);
      // }
    }
  } else {
    // uniform spline case
    for (let dim = 0; dim < 2; dim++) {
      // Bezier control vector component lengths
      // are one third the respective derivative of the cubic
      // if (i === 0) {
      //   cv.push(tau * (p3[dim] - p1[dim]) / 3);
      // } else {
      cv.push((-tau * (p3[dim] - p1[dim])) / 3);
      // }
    }
  }
  let coordsNumeric = cv.map((x) => me.fromAst(x));
  let numericEntries = Number.isFinite(cv[0]) && Number.isFinite(cv[1]);

  return { coordsNumeric, numericEntries };
}

// Compute coefficients for a cubic polynomial
//   p(s) = c0 + c1*s + c2*s^2 + c3*s^3
// such that
//   p(0) = x1, p(1) = x2
// and
//   p'(0) = t1, p'(1) = t2
function initCubicPoly(x1, x2, t1, t2) {
  return [x1, t1, -3 * x1 + 3 * x2 - 2 * t1 - t2, 2 * x1 - 2 * x2 + t1 + t2];
}

function returnBezierFunctions({ globalDependencyValues, arrayKeys }) {
  if (globalDependencyValues.nThroughPoints < 1) {
    let fs = {};
    for (let arrayKey of arrayKeys) {
      fs[arrayKey] = () => NaN;
    }
    return fs;
  }

  let len = globalDependencyValues.nThroughPoints - 1;

  let fs = {};

  let extrapolateBackward = globalDependencyValues.extrapolateBackward;
  let extrapolateForward = globalDependencyValues.extrapolateForward;

  for (let arrayKey of arrayKeys) {
    let firstPointX =
      globalDependencyValues.numericalThroughPoints[0][arrayKey];
    let lastPointX =
      globalDependencyValues.numericalThroughPoints[len][arrayKey];

    let cs = globalDependencyValues.splineCoeffs.map((x) => x[arrayKey]);
    let cB;
    if (extrapolateBackward) {
      cB = globalDependencyValues.extrapolateBackwardCoeffs[arrayKey];
    }
    let cF;
    if (extrapolateForward) {
      cF = globalDependencyValues.extrapolateForwardCoeffs[arrayKey];
    }

    fs[arrayKey] = function (t) {
      if (isNaN(t)) {
        return NaN;
      }

      if (t < 0) {
        if (extrapolateBackward) {
          return (cB[2] * t + cB[1]) * t + cB[0];
        } else {
          return firstPointX;
        }
      }

      if (t >= len) {
        if (extrapolateForward) {
          t -= len;
          return (cF[2] * t + cF[1]) * t + cF[0];
        } else {
          return lastPointX;
        }
      }

      let z = Math.floor(t);
      t -= z;
      let c = cs[z];
      return ((c[3] * t + c[2]) * t + c[1]) * t + c[0];
    };
  }

  return fs;
}
