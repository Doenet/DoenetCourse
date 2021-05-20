import Polyline from '../Polyline';
import me from 'math-expressions';

export default class CobwebPolyline extends Polyline {
  static componentType = 'cobwebPolyline';
  static rendererType = 'cobwebPolyline';

  static get stateVariablesShadowedForReference() {
    return ['initialPoint', 'f'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.attractThreshold = {
      createComponentOfType: 'number',
      createStateVariable: 'attractThreshold',
      defaultValue: 0.5,
      public: true,
    };

    attributes.nPoints = {
      createComponentOfType: 'number',
      createStateVariable: 'nPoints',
      defaultValue: 1,
      public: true,
      clamp: [0, Infinity],
      forRenderer: true,
    };

    attributes.variable = {
      createComponentOfType: 'variable',
      createStateVariable: 'variable',
      defaultValue: me.fromAst('x'),
      public: true,
      forRenderer: true,
    };

    attributes.nIterationsRequired = {
      createComponentOfType: 'number',
      createStateVariable: 'nIterationsRequired',
      defaultValue: 1,
      public: true,
    };

    attributes.initialPoint = {
      createComponentOfType: 'point',
    };

    attributes.function = {
      createComponentOfType: 'function',
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nDimensions.returnDependencies = () => ({});
    stateVariableDefinitions.nDimensions.definition = () => ({
      newValues: { nDimensions: 2 },
    });

    stateVariableDefinitions.initialPoint = {
      isArray: true,
      public: true,
      componentType: 'math',
      entryPrefixes: ['initialPointX'],
      defaultEntryValue: me.fromAst(0),
      returnWrappingComponents(prefix) {
        if (prefix === 'initialPointX') {
          return [];
        } else {
          // entire array
          // wrap by both <point> and <xs>
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      returnArraySizeDependencies: () => ({}),
      returnArraySize: () => [2],
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            initialPointAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'initialPoint',
              variableNames: ['x' + varEnding],
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let initialPoint = {};
        let essentialInitialPoint = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          if (dependencyValuesByKey[arrayKey].initialPointAttr) {
            initialPoint[arrayKey] =
              dependencyValuesByKey[arrayKey].initialPointAttr.stateValues[
                'x' + varEnding
              ];
          } else {
            essentialInitialPoint[arrayKey] = {};
          }
        }
        let result = {};

        if (Object.keys(initialPoint).length > 0) {
          result.newValues = { initialPoint };
        }
        if (Object.keys(essentialInitialPoint).length > 0) {
          result.useEssentialOrDefaultValue = {
            initialPoint: essentialInitialPoint,
          };
        }

        return result;
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
      }) {
        // console.log(`inverseArrayDefinition of initialPoint of polyline`);
        // console.log(desiredStateVariableValues)
        // console.log(dependencyValuesByKey);

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.initialPoint) {
          if (
            dependencyValuesByKey[arrayKey].initialPointAttr &&
            dependencyValuesByKey[arrayKey].initialPointAttr.stateValues[
              'x' + (Number(arrayKey) + 1)
            ]
          ) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].initialPointAttr,
              desiredValue: desiredStateVariableValues.initialPoint[arrayKey],
              variableIndex: 0,
            });
          } else {
            instructions.push({
              setStateVariable: 'initialPoint',
              value: {
                [arrayKey]: desiredStateVariableValues.initialPoint[arrayKey],
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

    stateVariableDefinitions.f = {
      forRenderer: true,
      returnDependencies: () => ({
        functionAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'function',
          variableNames: ['numericalf'],
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.functionAttr) {
          return {
            newValues: {
              f: dependencyValues.functionAttr.stateValues.numericalf,
            },
          };
        } else {
          return { newValues: { f: null } };
        }
      },
    };

    // since inherit from polyline, should have nVertices be number of vertices
    stateVariableDefinitions.nVertices = {
      isAlias: true,
      targetVariableName: 'nPoints',
    };

    stateVariableDefinitions.nOriginalVertices = {
      providePreviousValuesInDefinition: true,
      returnDependencies: () => ({
        nVertices: {
          dependencyType: 'stateVariable',
          variableName: 'nVertices',
        },
      }),
      definition({ dependencyValues, previousValues }) {
        let nOriginalVertices = dependencyValues.nVertices;

        if (previousValues.nOriginalVertices > nOriginalVertices) {
          nOriginalVertices = previousValues.nOriginalVertices;
        }

        return { newValues: { nOriginalVertices } };
      },
    };

    stateVariableDefinitions.originalVertices = {
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['originalVertexX', 'originalVertex'],
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'originalVertexX') {
          // voriginalVertexX1_2 is the 2nd component of the first originalVertex
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
          // originalVertex3 is all components of the third riginalVertex
          if (!arraySize) {
            return [];
          }
          let vertexInd = Number(varEnding) - 1;
          if (
            Number.isInteger(vertexInd) &&
            vertexInd >= 0 &&
            vertexInd < arraySize[0]
          ) {
            // array of "vertexInd,i", where i=0, ..., arraySize[1]-1
            return Array.from(
              Array(arraySize[1]),
              (_, i) => vertexInd + ',' + i,
            );
          } else {
            return [];
          }
        }
      },
      returnArraySizeDependencies: () => ({
        nOriginalVertices: {
          dependencyType: 'stateVariable',
          variableName: 'nOriginalVertices',
        },
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [
          dependencyValues.nOriginalVertices - 1,
          dependencyValues.nDimensions,
        ];
      },
      returnArrayDependenciesByKey: () => ({
        globalDependencies: {
          graphAncestor: {
            dependencyType: 'ancestor',
            componentType: 'graph',
            variableNames: ['xmin', 'xmax', 'ymin', 'ymax'],
          },
        },
      }),
      arrayDefinitionByKey({ globalDependencyValues, arrayKeys }) {
        let originalVertices = {};

        for (let arrayKey of arrayKeys) {
          let arrayIndices = arrayKey.split(',').map(Number);
          let jointVarEnding = arrayIndices.map((x) => x + 1).join('_');

          originalVertices[arrayKey] = {
            variablesToCheck: ['originalVertex' + jointVarEnding],
            get defaultValue() {
              if (globalDependencyValues.graphAncestor) {
                if (arrayIndices[1] === 0) {
                  let xmin =
                    globalDependencyValues.graphAncestor.stateValues.xmin;
                  let xmax =
                    globalDependencyValues.graphAncestor.stateValues.xmax;
                  return me.fromAst((xmin + xmax) / 2);
                } else if (arrayIndices[1] === 1) {
                  let ymin =
                    globalDependencyValues.graphAncestor.stateValues.ymin;
                  let ymax =
                    globalDependencyValues.graphAncestor.stateValues.ymax;
                  return me.fromAst((ymin + ymax) / 2);
                }
              }
              return me.fromAst(0);
            },
          };
        }

        return {
          useEssentialOrDefaultValue: { originalVertices },
        };
      },
      inverseArrayDefinitionByKey({ desiredStateVariableValues }) {
        // console.log(`inverse definition of original vertices`)
        // console.log(desiredStateVariableValues)

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.originalVertices) {
          instructions.push({
            setStateVariable: 'originalVertices',
            value: {
              [arrayKey]: desiredStateVariableValues.originalVertices[arrayKey],
            },
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.vertices.additionalStateVariablesDefined = [
      {
        variableName: 'prelimCorrectVertices',
        entryPrefixes: ['prelimCorrectVertexX', 'prelimCorrectVertex'],
        getArrayKeysFromVarName: function ({
          arrayEntryPrefix,
          varEnding,
          arraySize,
        }) {
          if (arrayEntryPrefix === 'prelimCorrectVertexX') {
            // prelimCorrectVertexX1_2 is the 2nd component of the first prelimCorrectVertex
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
            // prelimCorrectVertex3 is all components of the third prelimCorrectVertex
            if (!arraySize) {
              return [];
            }
            let vertexInd = Number(varEnding) - 1;
            if (
              Number.isInteger(vertexInd) &&
              vertexInd >= 0 &&
              vertexInd < arraySize[0]
            ) {
              // array of "vertexInd,i", where i=0, ..., arraySize[1]-1
              return Array.from(
                Array(arraySize[1]),
                (_, i) => vertexInd + ',' + i,
              );
            } else {
              return [];
            }
          }
        },
      },
    ];

    stateVariableDefinitions.vertices.basedOnArrayKeyStateVariables = true;

    stateVariableDefinitions.vertices.returnArrayDependenciesByKey = function ({
      arrayKeys,
    }) {
      let globalDependencies = {
        f: {
          dependencyType: 'stateVariable',
          variableName: 'f',
        },
        attractThreshold: {
          dependencyType: 'stateVariable',
          variableName: 'attractThreshold',
        },
      };

      let dependenciesByKey = {};
      for (let arrayKey of arrayKeys) {
        let [pointInd, dim] = arrayKey.split(',');

        if (pointInd === '0') {
          dependenciesByKey[arrayKey] = {
            initialPoint: {
              dependencyType: 'stateVariable',
              variableName: 'initialPointX' + (Number(dim) + 1),
            },
          };
        } else {
          // use pointInd (rather than pointInd+1)
          // for both originalVertex (as it is missing first vertex)
          // and previousVertex
          dependenciesByKey[arrayKey] = {
            originalVertexX1: {
              dependencyType: 'stateVariable',
              variableName: 'originalVertexX' + pointInd + '_1',
            },
            originalVertexX2: {
              dependencyType: 'stateVariable',
              variableName: 'originalVertexX' + pointInd + '_2',
            },
            previousVertexX1: {
              dependencyType: 'stateVariable',
              variableName: 'vertexX' + pointInd + '_1',
            },
            previousVertexX2: {
              dependencyType: 'stateVariable',
              variableName: 'vertexX' + pointInd + '_2',
            },
          };
        }
      }
      return { globalDependencies, dependenciesByKey };
    };

    stateVariableDefinitions.vertices.arrayDefinitionByKey = function ({
      globalDependencyValues,
      dependencyValuesByKey,
      arrayKeys,
    }) {
      // console.log(`array definition of vertices`);
      // console.log(JSON.parse(JSON.stringify(arrayKeys)))
      // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)));
      // console.log(JSON.parse(JSON.stringify(globalDependencyValues)));

      let vertices = {};
      let prelimCorrectVertices = {};

      for (let arrayKey of arrayKeys) {
        let [pointInd, dim] = arrayKey.split(',');

        if (pointInd === '0') {
          vertices[arrayKey] = dependencyValuesByKey[arrayKey].initialPoint;
          prelimCorrectVertices[arrayKey] = null; // don't check if first vertex is correct
        } else {
          let originalVertex, previousVertex;

          try {
            originalVertex = [
              dependencyValuesByKey[
                arrayKey
              ].originalVertexX1.evaluate_to_constant(),
              dependencyValuesByKey[
                arrayKey
              ].originalVertexX2.evaluate_to_constant(),
            ];
            previousVertex = [
              dependencyValuesByKey[
                arrayKey
              ].previousVertexX1.evaluate_to_constant(),
              dependencyValuesByKey[
                arrayKey
              ].previousVertexX2.evaluate_to_constant(),
            ];
          } catch (e) {
            vertices[pointInd + ',0'] = me.fromAst(0);
            vertices[pointInd + ',1'] = me.fromAst(0);
            prelimCorrectVertices[pointInd + ',0'] = false;
            continue;
          }

          let attractPoint;

          if (Number(pointInd) % 2 === 1) {
            // odd point number, so attract to function

            let newY = globalDependencyValues.f(previousVertex[0]);
            attractPoint = [previousVertex[0], newY];
          } else {
            // even point number, so attract to diagonal
            attractPoint = [previousVertex[1], previousVertex[1]];
          }

          let distance2FromAttractor =
            Math.pow(originalVertex[0] - attractPoint[0], 2) +
            Math.pow(originalVertex[1] - attractPoint[1], 2);

          if (
            distance2FromAttractor <
            globalDependencyValues.attractThreshold *
              globalDependencyValues.attractThreshold
          ) {
            vertices[pointInd + ',0'] = me.fromAst(attractPoint[0]);
            vertices[pointInd + ',1'] = me.fromAst(attractPoint[1]);
            prelimCorrectVertices[pointInd + ',0'] = true;
          } else {
            vertices[pointInd + ',0'] =
              dependencyValuesByKey[arrayKey].originalVertexX1;
            vertices[pointInd + ',1'] =
              dependencyValuesByKey[arrayKey].originalVertexX2;
            prelimCorrectVertices[pointInd + ',0'] = false;
          }

          // don't use second coordinate of corrrectVertices,
          // as correctness is by vertex, not vertex coordinate
          // prelimCorrectVertices is 2D only so that can calculate it simulataneously
          // with vertices
          prelimCorrectVertices[pointInd + ',1'] = null;
        }
      }

      return { newValues: { vertices, prelimCorrectVertices } };
    };
    stateVariableDefinitions.vertices.inverseArrayDefinitionByKey = function ({
      desiredStateVariableValues,
      dependencyNamesByKey,
      initialChange,
      stateValues,
    }) {
      // console.log(`inverseArrayDefinition of vertices of polyline`);
      // console.log(desiredStateVariableValues)
      // console.log(JSON.parse(JSON.stringify(stateValues)))

      // if not draggable, then disallow initial change
      if (initialChange && !stateValues.draggable) {
        return { success: false };
      }

      let instructions = [];
      for (let arrayKey in desiredStateVariableValues.vertices) {
        let [pointInd, dim] = arrayKey.split(',');

        if (pointInd === '0') {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].initialPoint,
            desiredValue: desiredStateVariableValues.vertices[arrayKey],
          });
        } else {
          instructions.push({
            setDependency:
              dependencyNamesByKey[arrayKey][
                'originalVertexX' + (Number(dim) + 1)
              ],
            desiredValue: desiredStateVariableValues.vertices[arrayKey],
          });
        }
      }

      return {
        success: true,
        instructions,
      };
    };

    stateVariableDefinitions.correctVertices = {
      isArray: true,
      public: true,
      componentType: 'boolean',
      entryPrefixes: ['correctVertex'],
      returnArraySizeDependencies: () => ({
        nVertices: {
          dependencyType: 'stateVariable',
          variableName: 'nVertices',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nVertices - 1];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            prelimCorrectVertex: {
              dependencyType: 'stateVariable',
              variableName:
                'prelimCorrectVertexX' + (Number(arrayKey) + 2) + '_1',
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let correctVertices = {};
        for (let arrayKey of arrayKeys) {
          correctVertices[arrayKey] =
            dependencyValuesByKey[arrayKey].prelimCorrectVertex;
        }
        return { newValues: { correctVertices } };
      },
    };

    stateVariableDefinitions.fractionCorrectVertices = {
      public: true,
      componentType: 'number',
      additionalStateVariablesDefined: [
        {
          variableName: 'nGradedVertices',
          public: true,
          componentType: 'number',
        },
        {
          variableName: 'nCorrectVertices',
          public: true,
          componentType: 'number',
        },
      ],
      returnDependencies: () => ({
        correctVertices: {
          dependencyType: 'stateVariable',
          variableName: 'correctVertices',
        },
      }),
      definition({ dependencyValues }) {
        let nGradedVertices = dependencyValues.correctVertices.length;
        let fractionCorrectVertices;
        let nCorrectVertices;

        if (nGradedVertices === 0) {
          fractionCorrectVertices = 0;
          nCorrectVertices = 0;
        } else {
          nCorrectVertices = dependencyValues.correctVertices.reduce(
            (a, c) => a + c,
            0,
          );
          fractionCorrectVertices = nCorrectVertices / nGradedVertices;
        }

        return {
          newValues: {
            fractionCorrectVertices,
            nGradedVertices,
            nCorrectVertices,
          },
        };
      },
    };

    stateVariableDefinitions.fractionCorrectVerticesAdjusted = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        nCorrectVertices: {
          dependencyType: 'stateVariable',
          variableName: 'nCorrectVertices',
        },
        nGradedVertices: {
          dependencyType: 'stateVariable',
          variableName: 'nGradedVertices',
        },
        nIterationsRequired: {
          dependencyType: 'stateVariable',
          variableName: 'nIterationsRequired',
        },
      }),
      definition({ dependencyValues }) {
        let nVerticesRequired = 0;
        if (dependencyValues.nIterationsRequired > 0) {
          nVerticesRequired = 2 * dependencyValues.nIterationsRequired - 1;
        }

        let nGradedVerticesAdjusted = Math.max(
          dependencyValues.nGradedVertices,
          nVerticesRequired,
        );

        let fractionCorrectVerticesAdjusted;

        if (nGradedVerticesAdjusted === 0) {
          fractionCorrectVerticesAdjusted = 0;
        } else {
          fractionCorrectVerticesAdjusted =
            dependencyValues.nCorrectVertices / nGradedVerticesAdjusted;
        }

        return { newValues: { fractionCorrectVerticesAdjusted } };
      },
    };

    stateVariableDefinitions.nIterateValues = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        nVertices: {
          dependencyType: 'stateVariable',
          variableName: 'nVertices',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          nIterateValues: Math.ceil((dependencyValues.nVertices + 1) / 2),
        },
      }),
    };

    stateVariableDefinitions.iterateValues = {
      isArray: true,
      public: true,
      componentType: 'number',
      entryPrefixes: ['iterateValue'],
      returnArraySizeDependencies: () => ({
        nIterateValues: {
          dependencyType: 'stateVariable',
          variableName: 'nIterateValues',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nIterateValues];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          if (arrayKey === '0') {
            dependenciesByKey[arrayKey] = {
              iterateValue: {
                dependencyType: 'stateVariable',
                variableName: 'vertexX1_1',
              },
            };
          } else {
            dependenciesByKey[arrayKey] = {
              iterateValue: {
                dependencyType: 'stateVariable',
                variableName: 'vertexX' + 2 * Number(arrayKey) + '_2',
              },
            };
          }
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let iterateValues = {};
        for (let arrayKey of arrayKeys) {
          iterateValues[arrayKey] =
            dependencyValuesByKey[arrayKey].iterateValue;
        }
        return { newValues: { iterateValues } };
      },
    };

    // stateVariableDefinitions.lastVertex = {
    //   stateVariablesDeterminingDependencies: ["nPoints"],
    //   isArray: true,
    //   public: true,
    //   componentType: "math",
    //   entryPrefixes: ["lastVertexX"],
    //   returnWrappingComponents(prefix) {
    //     if (prefix === "lastVertexX") {
    //       return [];
    //     } else {
    //       // entire array
    //       // wrap by both <point> and <xs>
    //       return [["point", { componentType: "mathList", isAttribute: "xs" }]];
    //     }
    //   },
    //   returnArraySizeDependencies: () => ({}),
    //   returnArraySize: () => [2],
    //   returnArrayDependenciesByKey({ stateValues, arrayKeys }) {
    //     let dependenciesByKey = {};

    //     for (let arrayKey of arrayKeys) {
    //       dependenciesByKey[arrayKey] = {
    //         lastVertex: {
    //           dependencyType: "stateVariable",
    //           variableName: `vertexX${stateValues.nPoints}_${Number(arrayKey) + 1}`
    //         }
    //       }
    //     }
    //     return { dependenciesByKey }
    //   },
    //   arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
    //     let lastVertex = {};
    //     for (let arrayKey of arrayKeys) {
    //       lastVertex[arrayKey] = dependencyValuesByKey[arrayKey].lastVertex
    //     }
    //     return { newValues: { lastVertex } }
    //   }
    // }

    return stateVariableDefinitions;
  }
}
