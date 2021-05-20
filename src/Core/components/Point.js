import GraphicalComponent from './abstract/GraphicalComponent';
import me from 'math-expressions';
import {
  convertValueToMathExpression,
  mergeVectorsForInverseDefinition,
  roundForDisplay,
} from '../utils/math';
import { returnBreakStringsSugarFunction } from './commonsugar/breakstrings';
import { deepClone } from '../utils/deepFunctions';

export default class Point extends GraphicalComponent {
  static componentType = 'point';

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['xs', 'nDimensions'];
  }

  // Note: for other components with public point state variables,
  // the recommended course of action is not to have
  // a public state variable with component type point, which would use coordsShadow
  // Instead have a public array state variable of maths for each component
  // and use wrapping components to create points from those
  static primaryStateVariableForDefinition = 'coordsShadow';
  static stateVariableForAttributeValue = 'coords';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.draggable = {
      createComponentOfType: 'boolean',
      createStateVariable: 'draggable',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };

    attributes.x = {
      createComponentOfType: 'math',
    };
    attributes.y = {
      createComponentOfType: 'math',
    };
    attributes.z = {
      createComponentOfType: 'math',
    };
    attributes.xs = {
      createComponentOfType: 'mathList',
    };
    attributes.coords = {
      createComponentOfType: 'coords',
    };

    attributes.displayDigits = {
      createComponentOfType: 'number',
      createStateVariable: 'displayDigits',
      defaultValue: 10,
      public: true,
    };

    attributes.displayDecimals = {
      createComponentOfType: 'number',
      createStateVariable: 'displayDecimals',
      defaultValue: null,
      public: true,
    };

    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakIntoXsByCommas = function ({ matchedChildren }) {
      let childrenToComponentFunction = (x) => ({
        componentType: 'math',
        children: x,
      });

      let breakFunction = returnBreakStringsSugarFunction({
        childrenToComponentFunction,
        mustStripOffOuterParentheses: true,
      });

      let result = breakFunction({ matchedChildren });

      if (!result.success && matchedChildren.length === 1) {
        // if didn't succeed and just have a single string child,
        // then just wrap string with a x
        return {
          success: true,
          newAttributes: {
            x: {
              componentType: 'math',
              children: matchedChildren,
            },
          },
        };
      }

      if (result.success) {
        // wrap xs around the x children
        (result.newAttributes = {
          xs: {
            componentType: 'mathList',
            children: result.newChildren,
          },
        }),
          delete result.newChildren;
      }

      return result;
    };

    sugarInstructions.push({
      childrenRegex: /s+(.*s)?/,
      replacementFunction: breakIntoXsByCommas,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atMostOnePoint = childLogic.newLeaf({
      name: 'atMostOnePoint',
      componentType: 'point',
      comparison: 'atMost',
      number: 1,
    });

    let atMostOneConstraints = childLogic.newLeaf({
      name: 'atMostOneConstraints',
      componentType: 'constraints',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'pointWithConstraints',
      operator: 'and',
      propositions: [atMostOnePoint, atMostOneConstraints],
      setAsBase: true,
    });

    return childLogic;
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
        return {
          newValues: {
            styleDescription: dependencyValues.selectedStyle.markerColor,
          },
        };
      },
    };

    stateVariableDefinitions.styleDescriptionWithNoun = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        selectedStyle: {
          dependencyType: 'stateVariable',
          variableName: 'selectedStyle',
        },
      }),
      definition: function ({ dependencyValues }) {
        let pointDescription = dependencyValues.selectedStyle.markerColor;
        if (dependencyValues.selectedStyle.markerStyle === 'circle') {
          pointDescription += ' point';
        } else {
          pointDescription += ` ${dependencyValues.selectedStyle.markerStyle}`;
        }
        return { newValues: { styleDescriptionWithNoun: pointDescription } };
      },
    };

    // coordsShadow will be null unless point was created
    // via an adapter or ref prop or from serialized state with coords value
    // In case of adapter or ref prop,
    // given the primaryStateVariableForDefinition static variable,
    // the definition of coordsShadow will be changed to be the value
    // that shadows the component adapted or reffed
    stateVariableDefinitions.coordsShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          coordsShadow: { variablesToCheck: ['coords', 'coordsShadow'] },
        },
      }),
      inverseDefinition: function ({
        desiredStateVariableValues,
        stateValues,
        workspace,
      }) {
        let desiredCoords = mergeVectorsForInverseDefinition({
          desiredVector: desiredStateVariableValues.coordsShadow,
          currentVector: stateValues.coordsShadow,
          workspace,
          workspaceKey: 'desiredCoords',
        });

        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'coordsShadow',
              value: desiredCoords,
            },
          ],
        };
      },
    };

    // Note: if point created via a copy (with no prop) of another point
    // definition of nDimensions will be overwritten to shadow nDimensions
    // of the other point
    // (based on static variable stateVariablesShadowedForReference)
    stateVariableDefinitions.nDimensions = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        coordsShadow: {
          dependencyType: 'stateVariable',
          variableName: 'coordsShadow',
        },
        coords: {
          dependencyType: 'attributeComponent',
          attributeName: 'coords',
          variableNames: ['value'],
        },
        x: {
          dependencyType: 'attributeComponent',
          attributeName: 'x',
        },
        y: {
          dependencyType: 'attributeComponent',
          attributeName: 'y',
        },
        z: {
          dependencyType: 'attributeComponent',
          attributeName: 'z',
        },
        xs: {
          dependencyType: 'attributeComponent',
          attributeName: 'xs',
          variableNames: ['nComponents'],
        },
        pointChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOnePoint',
          variableNames: ['nDimensions'],
        },
      }),
      definition: function ({ dependencyValues, changes }) {
        // console.log(`nDimensions definition`)
        // console.log(dependencyValues)

        let basedOnCoords = false;
        let coords;
        let nDimensions;

        if (dependencyValues.coords !== null) {
          basedOnCoords = true;
          coords = dependencyValues.coords.stateValues.value;
        } else if (dependencyValues.coordsShadow) {
          basedOnCoords = true;
          coords = dependencyValues.coordsShadow;
        }

        if (basedOnCoords) {
          let coordsTree = coords.tree;
          if (
            Array.isArray(coordsTree) &&
            ['tuple', 'vector'].includes(coordsTree[0])
          ) {
            nDimensions = coordsTree.length - 1;
          } else {
            nDimensions = 1;
          }

          // if based on coords, should check for actual change
          // as frequently the dimension doesn't change
          return {
            newValues: { nDimensions },
            checkForActualChange: { nDimensions: true },
          };
        } else {
          if (dependencyValues.xs !== null) {
            return {
              newValues: {
                nDimensions: dependencyValues.xs.stateValues.nComponents,
              },
            };
          }
          if (dependencyValues.pointChild.length === 1) {
            return {
              newValues: {
                nDimensions:
                  dependencyValues.pointChild[0].stateValues.nDimensions,
              },
            };
          }

          // determine from which component children have

          // Note: wouldn't have been marked stale (so wouldn't get to definution)
          // if identities of one of the children hadn't changed
          // so don't need to check if identity changed

          if (dependencyValues.z !== null) {
            nDimensions = 3;
          } else if (dependencyValues.y !== null) {
            nDimensions = 2;
          } else if (dependencyValues.x !== null) {
            nDimensions = 1;
          } else {
            nDimensions = 2;
          }
        }

        return {
          newValues: { nDimensions },
          checkForActualChange: { nDimensions: true },
        };
      },
    };

    stateVariableDefinitions.arrayVariableForConstraints = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { arrayVariableForConstraints: 'unconstrainedXs' },
      }),
    };

    stateVariableDefinitions.arrayEntryPrefixForConstraints = {
      returnDependencies: () => ({}),
      definition: () => ({
        newValues: { arrayEntryPrefixForConstraints: 'unconstrainedX' },
      }),
    };

    stateVariableDefinitions.nDimensionsForConstraints = {
      isAlias: true,
      targetVariableName: 'nDimensions',
    };

    stateVariableDefinitions.unconstrainedXs = {
      isArray: true,
      entryPrefixes: ['unconstrainedX'],
      defaultEntryValue: me.fromAst(0),
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          coordsShadow: {
            dependencyType: 'stateVariable',
            variableName: 'coordsShadow',
          },
          coords: {
            dependencyType: 'attributeComponent',
            attributeName: 'coords',
            variableNames: ['value'],
          },
        };

        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            xs: {
              dependencyType: 'attributeComponent',
              attributeName: 'xs',
              variableNames: ['math' + varEnding],
            },
            pointChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOnePoint',
              variableNames: ['x' + varEnding],
            },
          };
          if (arrayKey === '0') {
            dependenciesByKey[arrayKey].component = {
              dependencyType: 'attributeComponent',
              attributeName: 'x',
              variableNames: ['value'],
            };
          } else if (arrayKey === '1') {
            dependenciesByKey[arrayKey].component = {
              dependencyType: 'attributeComponent',
              attributeName: 'y',
              variableNames: ['value'],
            };
          } else if (arrayKey === '2') {
            dependenciesByKey[arrayKey].component = {
              dependencyType: 'attributeComponent',
              attributeName: 'z',
              variableNames: ['value'],
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
        // console.log('unconstrained xs definition by key')
        // console.log(deepClone(globalDependencyValues))
        // console.log(deepClone(dependencyValuesByKey))
        // console.log(deepClone(arrayKeys));

        let newXs = {};
        let essentialXs = {};

        let basedOnCoords = false;
        let coords;

        if (globalDependencyValues.coords !== null) {
          basedOnCoords = true;
          coords = globalDependencyValues.coords.stateValues.value;
        } else if (globalDependencyValues.coordsShadow) {
          basedOnCoords = true;
          coords = globalDependencyValues.coordsShadow;
        }

        if (basedOnCoords) {
          let coordsTree = coords.tree;
          if (
            Array.isArray(coordsTree) &&
            ['tuple', 'vector'].includes(coordsTree[0])
          ) {
            for (let arrayKey of arrayKeys) {
              let ind = Number(arrayKey);
              if (ind >= 0 || ind < coordsTree.length - 1) {
                if (coords.tree[ind + 1] === undefined) {
                  newXs[arrayKey] = me.fromAst('\uff3f');
                } else {
                  newXs[arrayKey] = coords.get_component(ind).simplify();
                }
              }
            }
          } else {
            if (arrayKeys.includes('0')) {
              newXs[0] = coords.simplify();
            }
          }
        } else {
          for (let arrayKey of arrayKeys) {
            let varEnding = Number(arrayKey) + 1;
            let xs = dependencyValuesByKey[arrayKey].xs;
            if (xs !== null) {
              newXs[arrayKey] = xs.stateValues['math' + varEnding].simplify();
            } else {
              let pointChild = dependencyValuesByKey[arrayKey].pointChild;
              if (pointChild.length === 1) {
                newXs[arrayKey] = pointChild[0].stateValues['x' + varEnding];
              } else {
                let component = dependencyValuesByKey[arrayKey].component;
                if (component !== null) {
                  newXs[arrayKey] = component.stateValues.value.simplify();
                } else {
                  essentialXs[arrayKey] = {
                    variablesToCheck: [
                      { variableName: 'xs', arrayIndex: arrayKey },
                      { variableName: 'coords', mathComponentIndex: arrayKey },
                    ],
                  };
                }
              }
            }
          }
        }

        // console.log("newXs");
        // console.log(newXs);
        // console.log("essentialXs");
        // console.log(essentialXs);
        let result = {};
        if (Object.keys(newXs).length > 0) {
          result.newValues = { unconstrainedXs: newXs };
        }
        if (Object.keys(essentialXs).length > 0) {
          result.useEssentialOrDefaultValue = { unconstrainedXs: essentialXs };
        }
        return result;
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        arraySize,
      }) {
        // console.log("invertUnconstrainedXs");
        // console.log(desiredStateVariableValues)
        // console.log(globalDependencyValues);
        // console.log(dependencyValuesByKey);

        let instructions = [];
        let basedOnCoords = false;
        let coordsDependency;

        if (globalDependencyValues.coords !== null) {
          basedOnCoords = true;
          coordsDependency = 'coords';
        } else if (globalDependencyValues.coordsShadow !== null) {
          basedOnCoords = true;
          coordsDependency = 'coordsShadow';
        }

        if (basedOnCoords) {
          let desiredCoords;
          if (arraySize[0] === 1) {
            desiredCoords = convertValueToMathExpression(
              desiredStateVariableValues.unconstrainedXs[0],
            );
          } else {
            // coordsTree could have undefined components,
            // which will indicate not to change those components
            let coordsTree = Array(arraySize[0] + 1);
            coordsTree[0] = 'vector';
            for (let arrayKey in desiredStateVariableValues.unconstrainedXs) {
              let value = desiredStateVariableValues.unconstrainedXs[arrayKey];
              coordsTree[Number(arrayKey) + 1] =
                value instanceof me.class ? value.tree : value;
            }
            desiredCoords = me.fromAst(coordsTree);
          }

          let instruction = {
            setDependency: coordsDependency,
            desiredValue: desiredCoords,
          };
          if (coordsDependency === 'coords') {
            instruction.childIndex = 0;
            instruction.variableIndex = 0;
          }

          instructions.push(instruction);

          return {
            success: true,
            instructions,
          };
        } else {
          for (let arrayKey of Object.keys(
            desiredStateVariableValues.unconstrainedXs,
          ).reverse()) {
            if (!dependencyValuesByKey[arrayKey]) {
              continue;
            }

            let xs = dependencyValuesByKey[arrayKey].xs;
            if (xs !== null) {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].xs,
                desiredValue: convertValueToMathExpression(
                  desiredStateVariableValues.unconstrainedXs[arrayKey],
                ),
                childIndex: 0,
                variableIndex: 0,
              });
            } else {
              let pointChild = dependencyValuesByKey[arrayKey].pointChild;
              if (pointChild.length === 1) {
                instructions.push({
                  setDependency: dependencyNamesByKey[arrayKey].pointChild,
                  desiredValue: convertValueToMathExpression(
                    desiredStateVariableValues.unconstrainedXs[arrayKey],
                  ),
                  childIndex: 0,
                  variableIndex: 0,
                });
              } else {
                let component = dependencyValuesByKey[arrayKey].component;
                if (component !== null) {
                  instructions.push({
                    setDependency: dependencyNamesByKey[arrayKey].component,
                    // since going through Math component, don't need to manually convert to math expression
                    desiredValue:
                      desiredStateVariableValues.unconstrainedXs[arrayKey],
                    childIndex: 0,
                    variableIndex: 0,
                  });
                } else {
                  instructions.push({
                    setStateVariable: 'unconstrainedXs',
                    value: {
                      [arrayKey]: convertValueToMathExpression(
                        desiredStateVariableValues.unconstrainedXs[arrayKey],
                      ),
                    },
                  });
                }
              }
            }
          }

          return {
            success: true,
            instructions,
          };
        }
      },
    };

    stateVariableDefinitions.xs = {
      public: true,
      componentType: 'math',
      isArray: true,
      entryPrefixes: ['x'],
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          let keyDeps = {};
          keyDeps.unconstrainedX = {
            dependencyType: 'stateVariable',
            variableName: `unconstrainedX${varEnding}`,
          };
          keyDeps.constraintsChild = {
            dependencyType: 'child',
            childLogicName: 'atMostOneConstraints',
            variableNames: [`constraintResult${varEnding}`],
          };
          dependenciesByKey[arrayKey] = keyDeps;
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log('array definition of xs')
        // console.log(deepClone(dependencyValuesByKey))
        // console.log(deepClone(arrayKeys));

        let xs = {};

        for (let arrayKey of arrayKeys) {
          if (dependencyValuesByKey[arrayKey].constraintsChild.length === 1) {
            let varEnding = Number(arrayKey) + 1;
            xs[arrayKey] = convertValueToMathExpression(
              dependencyValuesByKey[arrayKey].constraintsChild[0].stateValues[
                'constraintResult' + varEnding
              ],
            );
          } else {
            xs[arrayKey] = convertValueToMathExpression(
              dependencyValuesByKey[arrayKey].unconstrainedX,
            );
          }
        }

        if (arrayKeys.length > 0) {
          return { newValues: { xs } };
        } else {
          return {};
        }
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        initialChange,
        stateValues,
      }) {
        // console.log('invert xs')
        // console.log(desiredStateVariableValues);
        // console.log(dependencyValuesByKey);
        // console.log(dependencyNamesByKey);

        // if not draggable, then disallow initial change
        if (initialChange && !stateValues.draggable) {
          return { success: false };
        }

        let instructions = [];
        for (let arrayKey of Object.keys(
          desiredStateVariableValues.xs,
        ).reverse()) {
          if (!dependencyValuesByKey[arrayKey]) {
            continue;
          }
          if (dependencyValuesByKey[arrayKey].constraintsChild.length === 1) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].constraintsChild,
              desiredValue: desiredStateVariableValues.xs[arrayKey],
              childIndex: 0,
              variableIndex: 0,
            });
          } else {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].unconstrainedX,
              desiredValue: desiredStateVariableValues.xs[arrayKey],
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.x = {
      isAlias: true,
      targetVariableName: 'x1',
    };

    stateVariableDefinitions.y = {
      isAlias: true,
      targetVariableName: 'x2',
    };

    stateVariableDefinitions.z = {
      isAlias: true,
      targetVariableName: 'x3',
    };

    stateVariableDefinitions.coords = {
      public: true,
      componentType: 'coords',
      returnDependencies: () => ({
        xs: {
          dependencyType: 'stateVariable',
          variableName: 'xs',
        },
      }),
      definition: function ({ dependencyValues }) {
        // console.log(`definition of coords`)
        // console.log(deepClone(dependencyValues));
        let coordsAst = [];
        for (let v of dependencyValues.xs) {
          if (v) {
            coordsAst.push(v.tree);
          } else {
            coordsAst.push('\uff3f');
          }
        }
        if (coordsAst.length > 1) {
          coordsAst = ['vector', ...coordsAst];
        } else if (coordsAst.length === 1) {
          coordsAst = coordsAst[0];
        } else {
          coordsAst = '\uff3f';
        }

        return { newValues: { coords: me.fromAst(coordsAst) } };
      },

      inverseDefinition: function ({
        desiredStateVariableValues,
        stateValues,
        initialChange,
      }) {
        // console.log("invertCoords");
        // console.log(desiredStateVariableValues)
        // console.log(stateValues);

        // if not draggable, then disallow initial change
        if (initialChange && !stateValues.draggable) {
          return { success: false };
        }

        let instructions = [];

        let desiredXValues = {};

        let coordsTree = desiredStateVariableValues.coords.tree;

        if (
          !(
            Array.isArray(coordsTree) &&
            ['tuple', 'vector'].includes(coordsTree[0])
          )
        ) {
          desiredXValues[0] = desiredStateVariableValues.coords;
        } else {
          for (let i = 0; i < coordsTree.length - 1; i++) {
            let desiredValue =
              desiredStateVariableValues.coords.get_component(i);
            if (desiredValue.tree !== undefined) {
              desiredXValues[i] = desiredValue;
            }
          }
        }

        instructions.push({
          setDependency: 'xs',
          desiredValue: desiredXValues,
        });

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.coordsForDisplay = {
      forRenderer: true,
      returnDependencies: () => ({
        coords: {
          dependencyType: 'stateVariable',
          variableName: 'coords',
        },
        displayDigits: {
          dependencyType: 'stateVariable',
          variableName: 'displayDigits',
        },
        displayDecimals: {
          dependencyType: 'stateVariable',
          variableName: 'displayDecimals',
        },
      }),
      definition: function ({ dependencyValues, usedDefault }) {
        // for display via latex and text, round any decimal numbers to the significant digits
        // determined by displaydigits or displaydecimals
        let coordsForDisplay = roundForDisplay({
          value: dependencyValues.coords,
          dependencyValues,
          usedDefault,
        });

        return { newValues: { coordsForDisplay } };
      },
    };

    // currently value is used by answer to get variable for response
    stateVariableDefinitions.value = {
      isAlias: true,
      targetVariableName: 'coords',
    };

    stateVariableDefinitions.constraintUsed = {
      public: true,
      componentType: 'boolean',
      returnDependencies: () => ({
        constraintsChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneConstraints',
          variableNames: ['constraintUsed'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.constraintsChild.length === 0) {
          return { newValues: { constraintUsed: false } };
        } else {
          return {
            newValues: {
              constraintUsed:
                dependencyValues.constraintsChild[0].stateValues.constraintUsed,
            },
          };
        }
      },
    };

    stateVariableDefinitions.numericalXs = {
      public: true,
      componentType: 'number',
      isArray: true,
      entryPrefixes: ['numericalX'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            [`x`]: {
              dependencyType: 'stateVariable',
              variableName: `x${varEnding}`,
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log(`definition of numericalXs`)
        // console.log(deepClone(dependencyValuesByKey))
        // console.log(deepClone(arrayKeys))

        let numericalXs = {};

        for (let arrayKey of arrayKeys) {
          let x = dependencyValuesByKey[arrayKey].x;
          if (x) {
            x = dependencyValuesByKey[arrayKey].x.evaluate_to_constant();
            if (Number.isFinite(x)) {
              numericalXs[arrayKey] = x;
            } else {
              numericalXs[arrayKey] = NaN;
            }
          } else {
            numericalXs[arrayKey] = NaN;
          }
        }

        return { newValues: { numericalXs } };
      },

      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        initialChange,
        stateValues,
      }) {
        // if not draggable, then disallow initial change
        if (initialChange && !stateValues.draggable) {
          return { success: false };
        }

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.numericalXs) {
          if (!dependencyValuesByKey[arrayKey]) {
            continue;
          }
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].xs,
            desiredValue: desiredStateVariableValues.numericalXs[arrayKey],
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
        numericalXs: {
          dependencyType: 'stateVariable',
          variableName: 'numericalXs',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          nearestPoint: function () {
            // for point, nearest point is just the point itself
            // only implement for numerical values
            let result = {};

            for (let ind = 1; ind <= dependencyValues.nDimensions; ind++) {
              let x = dependencyValues.numericalXs[ind - 1];
              if (!Number.isFinite(x)) {
                return {};
              }
              result['x' + ind] = x;
            }
            return result;
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }

  static adapters = ['coords'];

  movePoint({ x, y, z, transient }) {
    let components = {};
    if (x !== undefined) {
      components[0] = me.fromAst(x);
    }
    if (y !== undefined) {
      components[1] = me.fromAst(y);
    }
    if (z !== undefined) {
      components[2] = me.fromAst(z);
    }
    if (transient) {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'xs',
            value: components,
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
            stateVariable: 'xs',
            value: components,
          },
        ],
        event: {
          verb: 'interacted',
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          result: {
            x,
            y,
            z,
          },
        },
      });
    }
  }

  actions = {
    movePoint: this.movePoint.bind(new Proxy(this, this.readOnlyProxyHandler)),
  };
}
