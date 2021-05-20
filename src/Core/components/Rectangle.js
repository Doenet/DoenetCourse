import Polygon from './Polygon';
import me from 'math-expressions';

export default class Rectangle extends Polygon {
  static componentType = 'rectangle';
  static rendererType = 'polygon';

  // used when referencing this component without prop
  static get stateVariablesShadowedForReference() {
    return [
      'vertices',
      'nVertices',
      'nVerticesSpecified',
      'haveSpecifiedCenter',
      'specifiedWidth',
      'specifiedHeight',
      'specifiedCenter',
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

    attributes.vertices = {
      createComponentOfType: '_pointListComponent',
    };
    attributes.center = {
      createComponentOfType: 'point',
    };
    attributes.width = {
      createComponentOfType: 'number',
    };
    attributes.height = {
      createComponentOfType: 'number',
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nVerticesSpecified = {
      returnDependencies: () => ({
        verticesAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'vertices',
          variableNames: ['nPoints'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.verticesAttr !== null) {
          return {
            newValues: {
              nVerticesSpecified:
                dependencyValues.verticesAttr.stateValues.nPoints,
            },
          };
        } else {
          return { newValues: { nVerticesSpecified: 0 } };
        }
      },
    };

    stateVariableDefinitions.essentialVertex = {
      isArray: true,
      entryPrefixes: ['essentialVertexX'],
      defaultEntryValue: me.fromAst(0),

      returnArraySizeDependencies: () => ({
        nVerticesSpecified: {
          dependencyType: 'stateVariable',
          variableName: 'nVerticesSpecified',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nVerticesSpecified === 0 ? 2 : 0];
      },

      returnArrayDependenciesByKey() {
        return {};
      },

      arrayDefinitionByKey: function ({ arrayKeys }) {
        let essentialVertex = {};

        for (let arrayKey of arrayKeys) {
          essentialVertex[arrayKey] = {
            variablesToCheck: ['essentialVertexX' + (Number(arrayKey) + 1)],
          };
        }
        return { useEssentialOrDefaultValue: { essentialVertex } };
      },

      inverseArrayDefinitionByKey({ desiredStateVariableValues }) {
        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.essentialVertex) {
          instructions.push({
            setStateVariable: 'essentialVertex',
            value: {
              [arrayKey]: desiredStateVariableValues.essentialVertex[arrayKey],
            },
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.haveSpecifiedCenter = {
      returnDependencies: () => ({
        centerAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'center',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          haveSpecifiedCenter: dependencyValues.centerAttr !== null,
        },
      }),
    };

    stateVariableDefinitions.specifiedCenter = {
      isArray: true,
      entryPrefixes: ['specifiedCenterX'],
      returnArraySizeDependencies: () => ({
        haveSpecifiedCenter: {
          dependencyType: 'stateVariable',
          variableName: 'haveSpecifiedCenter',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.haveSpecifiedCenter ? 2 : 0];
      },

      returnArrayDependenciesByKey({ arrayKeys }) {
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

        return { dependenciesByKey };
      },

      arrayDefinitionByKey: function ({ dependencyValuesByKey, arrayKeys }) {
        let specifiedCenter = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (dependencyValuesByKey[arrayKey].centerAttr !== null) {
            specifiedCenter[arrayKey] =
              dependencyValuesByKey[arrayKey].centerAttr.stateValues[
                'x' + varEnding
              ];
          }
        }

        return { newValues: { specifiedCenter } };
      },

      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
      }) {
        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.specifiedCenter) {
          if (
            dependencyValuesByKey[arrayKey].centerAttr &&
            dependencyValuesByKey[arrayKey].centerAttr !== null
          ) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].centerAttr,
              desiredValue:
                desiredStateVariableValues.specifiedCenter[arrayKey],
              variableIndex: 0,
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.specifiedWidth = {
      defaultValue: 1,

      returnDependencies() {
        return {
          widthAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'width',
            variableNames: ['value'],
          },
          nVerticesSpecified: {
            dependencyType: 'stateVariable',
            variableName: 'nVerticesSpecified',
          },
          haveSpecifiedCenter: {
            dependencyType: 'stateVariable',
            variableName: 'haveSpecifiedCenter',
          },
        };
      },

      definition({ dependencyValues }) {
        if (dependencyValues.widthAttr !== null) {
          return {
            newValues: {
              specifiedWidth: dependencyValues.widthAttr.stateValues.value,
            },
          };
        } else if (
          (dependencyValues.haveSpecifiedCenter ? 1 : 0) +
            dependencyValues.nVerticesSpecified <=
          1
        ) {
          return {
            useEssentialOrDefaultValue: {
              specifiedWidth: { variablesToCheck: ['specifiedWidth'] },
            },
          };
        }
        return { newValues: { specifiedWidth: null } };
      },

      inverseDefinition({ desiredStateVariableValues, dependencyValues }) {
        if (dependencyValues.widthAttr !== null) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'widthAttr',
                desiredValue: desiredStateVariableValues.specifiedWidth,
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
                setStateVariable: 'specifiedWidth',
                value: desiredStateVariableValues.specifiedWidth,
              },
            ],
          };
        }
      },
    };

    stateVariableDefinitions.specifiedHeight = {
      defaultValue: 1,

      returnDependencies() {
        return {
          heightAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'height',
            variableNames: ['value'],
          },
          nVerticesSpecified: {
            dependencyType: 'stateVariable',
            variableName: 'nVerticesSpecified',
          },
          haveSpecifiedCenter: {
            dependencyType: 'stateVariable',
            variableName: 'haveSpecifiedCenter',
          },
        };
      },

      definition({ dependencyValues }) {
        if (dependencyValues.heightAttr !== null) {
          return {
            newValues: {
              specifiedHeight: dependencyValues.heightAttr.stateValues.value,
            },
          };
        } else if (
          (dependencyValues.haveSpecifiedCenter ? 1 : 0) +
            dependencyValues.nVerticesSpecified <=
          1
        ) {
          return {
            useEssentialOrDefaultValue: {
              specifiedHeight: { variablesToCheck: ['specifiedHeight'] },
            },
          };
        }
        return { newValues: { specifiedHeight: null } };
      },

      inverseDefinition({ desiredStateVariableValues, dependencyValues }) {
        if (dependencyValues.heightAttr !== null) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'heightAttr',
                desiredValue: desiredStateVariableValues.specifiedHeight,
                variableIndex: 0,
              },
            ],
          };
        } else {
          return {
            success: true,
            instructions: [
              {
                setStateVariable: 'specifiedHeight',
                value: desiredStateVariableValues.specifiedHeight,
              },
            ],
          };
        }
      },
    };

    stateVariableDefinitions.center = {
      public: true,
      isArray: true,
      entryPrefixes: ['centerX'],
      componentType: 'math',
      returnWrappingComponents(prefix) {
        if (prefix === 'centerX') {
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
            vertex0: {
              dependencyType: 'stateVariable',
              variableName: 'vertexX1_' + varEnding,
            },
            vertex2: {
              dependencyType: 'stateVariable',
              variableName: 'vertexX3_' + varEnding,
            },
          };
        }

        return { dependenciesByKey };
      },

      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let center = {};

        for (let arrayKey of arrayKeys) {
          let v0 = dependencyValuesByKey[arrayKey].vertex0;
          let v2 = dependencyValuesByKey[arrayKey].vertex2;

          center[arrayKey] = v0.add(v2).divide(2).simplify();
        }

        return { newValues: { center } };
      },

      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        stateValues,
      }) {
        // console.log("center inverse", desiredStateVariableValues, dependencyValuesByKey, stateValues);

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.center) {
          let dim = Number(arrayKey);

          let v0 = dependencyValuesByKey[arrayKey].vertex0;
          let v2 = dependencyValuesByKey[arrayKey].vertex2;

          let offset = desiredStateVariableValues.center[dim].subtract(
            stateValues.center[dim],
          );

          let desiredV0 = v0.add(offset).simplify();
          let desiredV2 = v2.add(offset).simplify();

          instructions.push(
            {
              setDependency: dependencyNamesByKey[arrayKey].vertex0,
              desiredValue: desiredV0,
            },
            {
              setDependency: dependencyNamesByKey[arrayKey].vertex2,
              desiredValue: desiredV2,
            },
          );
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.width = {
      public: true,
      componentType: 'number',

      returnDependencies({}) {
        return {
          vertex0: {
            dependencyType: 'stateVariable',
            variableName: 'vertexX1_1',
          },
          vertex2: {
            dependencyType: 'stateVariable',
            variableName: 'vertexX3_1',
          },
        };
      },

      definition({ dependencyValues }) {
        let v0 = dependencyValues.vertex0.evaluate_to_constant();
        let v2 = dependencyValues.vertex2.evaluate_to_constant();
        let width = Math.abs(v0 - v2);

        return { newValues: { width } };
      },

      inverseDefinition({
        desiredStateVariableValues,
        dependencyValues,
        stateValues,
      }) {
        let v0 = dependencyValues.vertex0.evaluate_to_constant();
        let v2 = dependencyValues.vertex2.evaluate_to_constant();
        let center = (v2 + v0) / 2;

        let widthSign = v2 - v0 < 0 ? -1 : 1;
        let offset =
          (widthSign * Math.max(0, desiredStateVariableValues.width)) / 2;

        let desiredV0 = me.fromAst(center - offset);
        let desiredV2 = me.fromAst(center + offset);

        return {
          success: true,
          instructions: [
            {
              setDependency: 'vertex0',
              desiredValue: desiredV0,
            },
            {
              setDependency: 'vertex2',
              desiredValue: desiredV2,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.height = {
      public: true,
      componentType: 'number',

      returnDependencies({}) {
        return {
          vertex0: {
            dependencyType: 'stateVariable',
            variableName: 'vertexX1_2',
          },
          vertex2: {
            dependencyType: 'stateVariable',
            variableName: 'vertexX3_2',
          },
        };
      },

      definition({ dependencyValues }) {
        let v0 = dependencyValues.vertex0.evaluate_to_constant();
        let v2 = dependencyValues.vertex2.evaluate_to_constant();

        let height = Math.abs(v0 - v2);

        return { newValues: { height } };
      },

      inverseDefinition({ desiredStateVariableValues, dependencyValues }) {
        let v0 = dependencyValues.vertex0.evaluate_to_constant();
        let v2 = dependencyValues.vertex2.evaluate_to_constant();
        let center = (v2 + v0) / 2;

        let heightSign = v2 - v0 < 0 ? -1 : 1;
        let offset =
          (heightSign * Math.max(0, desiredStateVariableValues.height)) / 2;

        let desiredV0 = me.fromAst(center - offset);
        let desiredV2 = me.fromAst(center + offset);

        return {
          success: true,
          instructions: [
            {
              setDependency: 'vertex0',
              desiredValue: desiredV0,
            },
            {
              setDependency: 'vertex2',
              desiredValue: desiredV2,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.vertices = {
      public: true,
      componentType: 'point',
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['vertexX', 'vertex'],
      returnWrappingComponents(prefix) {
        if (prefix === 'vertexX') {
          return [];
        } else {
          // vertex or entire array
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'vertexX') {
          // vertexX1_2 is the 2nd component of the first vertex
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
          // vertex3 is all components of the third vertex
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
      stateVariablesDeterminingDependencies: [
        'nVerticesSpecified',
        'haveSpecifiedCenter',
      ],
      returnArraySizeDependencies: () => ({}),
      returnArraySize() {
        return [4, 2];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let dependenciesByKey = {};
        let globalDependencies = {
          nVerticesSpecified: {
            dependencyType: 'stateVariable',
            variableName: 'nVerticesSpecified',
          },
        };

        if (stateValues.nVerticesSpecified === 0) {
          globalDependencies.haveSpecifiedCenter = {
            dependencyType: 'stateVariable',
            variableName: 'haveSpecifiedCenter',
          };

          if (stateValues.haveSpecifiedCenter) {
            // center, width, height

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');

              dependenciesByKey[arrayKey] = {
                specifiedCenter: {
                  dependencyType: 'stateVariable',
                  variableName: 'specifiedCenterX' + (Number(dim) + 1),
                },
              };

              if (dim === '0') {
                dependenciesByKey[arrayKey].specifiedWidth = {
                  dependencyType: 'stateVariable',
                  variableName: 'specifiedWidth',
                };
              } else {
                dependenciesByKey[arrayKey].specifiedHeight = {
                  dependencyType: 'stateVariable',
                  variableName: 'specifiedHeight',
                };
              }
            }
          } else {
            // essential vertex, width, height

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');

              dependenciesByKey[arrayKey] = {
                essentialVertex: {
                  dependencyType: 'stateVariable',
                  variableName: 'essentialVertexX' + (Number(dim) + 1),
                },
              };

              if (dim === '0') {
                if (vertexInd === '1' || vertexInd === '2') {
                  dependenciesByKey[arrayKey].specifiedWidth = {
                    dependencyType: 'stateVariable',
                    variableName: 'specifiedWidth',
                  };
                }
              } else {
                if (vertexInd === '2' || vertexInd === '3') {
                  dependenciesByKey[arrayKey].specifiedHeight = {
                    dependencyType: 'stateVariable',
                    variableName: 'specifiedHeight',
                  };
                }
              }
            }
          }
        } else if (stateValues.nVerticesSpecified === 1) {
          globalDependencies.haveSpecifiedCenter = {
            dependencyType: 'stateVariable',
            variableName: 'haveSpecifiedCenter',
          };

          if (stateValues.haveSpecifiedCenter) {
            // 1 point, center

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');
              let varEnding = '1_' + (Number(dim) + 1);

              dependenciesByKey[arrayKey] = {
                verticesAttr: {
                  dependencyType: 'attributeComponent',
                  attributeName: 'vertices',
                  variableNames: ['pointX' + varEnding],
                },
              };

              if (
                (dim === '0' && vertexInd === '1') ||
                vertexInd === '2' ||
                (dim === '1' && vertexInd === '2') ||
                vertexInd === '3'
              ) {
                dependenciesByKey[arrayKey].specifiedCenter = {
                  dependencyType: 'stateVariable',
                  variableName: 'specifiedCenterX' + (Number(dim) + 1),
                };
              }
            }
          } else {
            // 1 point, width and height

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');
              let varEnding = '1_' + (Number(dim) + 1);

              dependenciesByKey[arrayKey] = {
                verticesAttr: {
                  dependencyType: 'attributeComponent',
                  attributeName: 'vertices',
                  variableNames: ['pointX' + varEnding],
                },
              };

              if (dim === '0') {
                if (vertexInd === '1' || vertexInd === '2')
                  dependenciesByKey[arrayKey].specifiedWidth = {
                    dependencyType: 'stateVariable',
                    variableName: 'specifiedWidth',
                  };
              } else {
                if (vertexInd === '2' || vertexInd === '3') {
                  dependenciesByKey[arrayKey].specifiedHeight = {
                    dependencyType: 'stateVariable',
                    variableName: 'specifiedHeight',
                  };
                }
              }
            }
          }
        } else {
          // 2 points

          for (let arrayKey of arrayKeys) {
            let [vertexInd, dim] = arrayKey.split(',');
            let varEnding1 = '1_' + (Number(dim) + 1);
            let varEnding2 = '2_' + (Number(dim) + 1);

            let varEnding;
            if (vertexInd === '0') {
              varEnding = varEnding1;
            } else if (vertexInd === '2') {
              varEnding = varEnding2;
            } else if (vertexInd === '1') {
              if (dim === '0') {
                varEnding = varEnding2;
              } else {
                varEnding = varEnding1;
              }
            } else {
              if (dim === '0') {
                varEnding = varEnding1;
              } else {
                varEnding = varEnding2;
              }
            }

            dependenciesByKey[arrayKey] = {
              verticesAttr: {
                dependencyType: 'attributeComponent',
                attributeName: 'vertices',
                variableNames: ['pointX' + varEnding],
              },
            };
          }
        }

        return {
          dependenciesByKey,
          globalDependencies,
        };
      },
      arrayDefinitionByKey({
        dependencyValuesByKey,
        arrayKeys,
        globalDependencyValues,
      }) {
        let vertices = {};

        if (globalDependencyValues.nVerticesSpecified === 0) {
          if (globalDependencyValues.haveSpecifiedCenter) {
            // width, height, center

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');

              let centerComponent =
                dependencyValuesByKey[arrayKey].specifiedCenter;

              if (dim === '0') {
                let width = dependencyValuesByKey[arrayKey].specifiedWidth;

                if (vertexInd === '0' || vertexInd === '3') {
                  vertices[arrayKey] = centerComponent.subtract(width / 2);
                } else {
                  vertices[arrayKey] = centerComponent.add(width / 2);
                }
              } else {
                let height = dependencyValuesByKey[arrayKey].specifiedHeight;

                if (vertexInd === '0' || vertexInd === '1') {
                  vertices[arrayKey] = centerComponent.subtract(height / 2);
                } else {
                  vertices[arrayKey] = centerComponent.add(height / 2);
                }
              }
            }
          } else {
            // width, height, essential vertex

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');

              let vertComponent =
                dependencyValuesByKey[arrayKey].essentialVertex;

              if (dim === '0') {
                if (vertexInd === '0' || vertexInd === '3') {
                  vertices[arrayKey] = vertComponent;
                } else {
                  let width = dependencyValuesByKey[arrayKey].specifiedWidth;
                  vertices[arrayKey] = vertComponent.add(width);
                }
              } else {
                if (vertexInd === '0' || vertexInd === '1') {
                  vertices[arrayKey] = vertComponent;
                } else {
                  let height = dependencyValuesByKey[arrayKey].specifiedHeight;
                  vertices[arrayKey] = vertComponent.add(height);
                }
              }
            }
          }
        } else if (globalDependencyValues.nVerticesSpecified === 1) {
          if (globalDependencyValues.haveSpecifiedCenter) {
            // 1 vertex, center

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');

              let verticesAttr = dependencyValuesByKey[arrayKey].verticesAttr;
              let vertComponent;

              if (
                verticesAttr !== null &&
                Object.keys(verticesAttr.stateValues).length === 1
              ) {
                vertComponent = Object.values(verticesAttr.stateValues)[0];
              } else {
                vertComponent = me.fromAst('\uff3f');
              }

              if (
                (dim === '0' && (vertexInd === '0' || vertexInd === '3')) ||
                (dim === '1' && (vertexInd === '0' || vertexInd === '1'))
              ) {
                vertices[arrayKey] = vertComponent;
              } else {
                let centerComponent =
                  dependencyValuesByKey[arrayKey].specifiedCenter;
                vertices[arrayKey] = vertComponent.add(
                  centerComponent.subtract(vertComponent).multiply(2),
                );
              }
            }
          } else {
            // 1 vertex, width and height

            for (let arrayKey of arrayKeys) {
              let [vertexInd, dim] = arrayKey.split(',');

              let verticesAttr = dependencyValuesByKey[arrayKey].verticesAttr;
              let vertComponent;

              if (
                verticesAttr !== null &&
                Object.keys(verticesAttr.stateValues).length === 1
              ) {
                vertComponent = Object.values(verticesAttr.stateValues)[0];
              } else {
                vertComponent = me.fromAst('\uff3f');
              }

              if (dim === '0') {
                if (vertexInd === '0' || vertexInd === '3') {
                  vertices[arrayKey] = vertComponent;
                } else {
                  let width = dependencyValuesByKey[arrayKey].specifiedWidth;
                  vertices[arrayKey] = vertComponent.add(width);
                }
              } else {
                if (vertexInd === '0' || vertexInd === '1') {
                  vertices[arrayKey] = vertComponent;
                } else {
                  let height = dependencyValuesByKey[arrayKey].specifiedHeight;
                  vertices[arrayKey] = vertComponent.add(height);
                }
              }
            }
          }
        } else {
          // 2 vertices

          for (let arrayKey of arrayKeys) {
            let verticesAttr = dependencyValuesByKey[arrayKey].verticesAttr;

            if (
              verticesAttr !== null &&
              Object.keys(verticesAttr.stateValues).length === 1
            ) {
              vertices[arrayKey] = Object.values(verticesAttr.stateValues)[0];
            } else {
              vertices[arrayKey] = me.fromAst('\uff3f');
            }
          }
        }

        return { newValues: { vertices } };
      },

      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyValuesByKey,
        globalDependencyValues,
        stateValues,
        workspace,
        initialChange,
        dependencyNamesByKey,
      }) {
        // console.log("inverse definition of vertices of rectangle",
        //   desiredStateVariableValues, dependencyValuesByKey, stateValues);

        // if not draggable, then disallow initial change

        if (initialChange && !stateValues.draggable) {
          return { success: false };
        }

        if (!workspace.v0) {
          workspace.v0 = [...stateValues.vertices[0]];
          workspace.v2 = [...stateValues.vertices[2]];
        }

        let keyX, keyY, keyV0X, keyV0Y, keyV2X, keyV2Y;

        for (let arrayKey in desiredStateVariableValues.vertices) {
          let [vertexInd, dim] = arrayKey.split(',');

          let desiredValue = desiredStateVariableValues.vertices[arrayKey];

          if (vertexInd === '0') {
            workspace.v0[Number(dim)] = desiredValue;
          } else if (vertexInd === '2') {
            workspace.v2[Number(dim)] = desiredValue;
          } else if (vertexInd === '1') {
            if (dim === '0') {
              workspace.v2[Number(dim)] = desiredValue;
            } else {
              workspace.v0[Number(dim)] = desiredValue;
            }
          } else {
            if (dim === '0') {
              workspace.v0[Number(dim)] = desiredValue;
            } else {
              workspace.v2[Number(dim)] = desiredValue;
            }
          }

          if (dim === '0') {
            keyX = arrayKey;
            if (vertexInd === '0' || vertexInd === '3') {
              keyV0X = arrayKey;
            } else {
              keyV2X = arrayKey;
            }
          } else {
            keyY = arrayKey;
            if (vertexInd === '0' || vertexInd === '1') {
              keyV0Y = arrayKey;
            } else {
              keyV2Y = arrayKey;
            }
          }
        }

        let instructions = [];

        if (globalDependencyValues.nVerticesSpecified === 0) {
          if (globalDependencyValues.haveSpecifiedCenter) {
            // width, height, center

            if (keyX !== undefined) {
              let width = workspace.v2[0]
                .subtract(workspace.v0[0])
                .evaluate_to_constant();
              let center = workspace.v2[0]
                .add(workspace.v0[0])
                .divide(2)
                .simplify();

              instructions.push(
                {
                  setDependency: dependencyNamesByKey[keyX].specifiedWidth,
                  desiredValue: width,
                },
                {
                  setDependency: dependencyNamesByKey[keyX].specifiedCenter,
                  desiredValue: center,
                },
              );
            }

            if (keyY !== undefined) {
              let height = workspace.v2[1]
                .subtract(workspace.v0[1])
                .evaluate_to_constant();
              let center = workspace.v2[1]
                .add(workspace.v0[1])
                .divide(2)
                .simplify();

              instructions.push(
                {
                  setDependency: dependencyNamesByKey[keyY].specifiedHeight,
                  desiredValue: height,
                },
                {
                  setDependency: dependencyNamesByKey[keyY].specifiedCenter,
                  desiredValue: center,
                },
              );
            }
          } else {
            // width, height, essential vertex

            if (keyV0X !== undefined) {
              let vert = workspace.v0[0].simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV0X].essentialVertex,
                desiredValue: vert,
              });
            }
            if (keyV2X !== undefined) {
              let width = workspace.v2[0]
                .subtract(workspace.v0[0])
                .evaluate_to_constant();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV2X].specifiedWidth,
                desiredValue: width,
              });
            }

            if (keyV0Y !== undefined) {
              let vert = workspace.v0[1].simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV0Y].essentialVertex,
                desiredValue: vert,
              });
            }
            if (keyV2Y !== undefined) {
              let height = workspace.v2[1]
                .subtract(workspace.v0[1])
                .evaluate_to_constant();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV2Y].specifiedHeight,
                desiredValue: height,
              });
            }
          }
        } else if (globalDependencyValues.nVerticesSpecified === 1) {
          if (globalDependencyValues.haveSpecifiedCenter) {
            // 1 vertex, center

            if (keyV0X !== undefined) {
              let vert = workspace.v0[0].simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV0X].verticesAttr,
                desiredValue: vert,
                variableIndex: 0,
              });
            }
            if (keyV2X !== undefined) {
              let center = workspace.v2[0]
                .add(workspace.v0[0])
                .divide(2)
                .simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV2X].specifiedCenter,
                desiredValue: center,
              });
            }

            if (keyV0Y !== undefined) {
              let vert = workspace.v0[1].simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV0Y].verticesAttr,
                desiredValue: vert,
                variableIndex: 0,
              });
            }
            if (keyV2Y !== undefined) {
              let center = workspace.v2[1]
                .add(workspace.v0[1])
                .divide(2)
                .simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV2Y].specifiedCenter,
                desiredValue: center,
              });
            }
          } else {
            // 1 vertex, width, height

            if (keyV0X !== undefined) {
              let vert = workspace.v0[0].simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV0X].verticesAttr,
                desiredValue: vert,
                variableIndex: 0,
              });
            }
            if (keyV2X !== undefined) {
              let width = workspace.v2[0]
                .subtract(workspace.v0[0])
                .evaluate_to_constant();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV2X].specifiedWidth,
                desiredValue: width,
              });
            }

            if (keyV0Y !== undefined) {
              let vert = workspace.v0[1].simplify();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV0Y].verticesAttr,
                desiredValue: vert,
                variableIndex: 0,
              });
            }
            if (keyV2Y !== undefined) {
              let height = workspace.v2[1]
                .subtract(workspace.v0[1])
                .evaluate_to_constant();

              instructions.push({
                setDependency: dependencyNamesByKey[keyV2Y].specifiedHeight,
                desiredValue: height,
              });
            }
          }
        } else {
          // 2 vertices

          if (keyV0X !== undefined) {
            instructions.push({
              setDependency: dependencyNamesByKey[keyV0X].verticesAttr,
              desiredValue: workspace.v0[0],
              variableIndex: 0,
            });
          }
          if (keyV2X !== undefined) {
            instructions.push({
              setDependency: dependencyNamesByKey[keyV2X].verticesAttr,
              desiredValue: workspace.v2[0],
              variableIndex: 0,
            });
          }

          if (keyV0Y !== undefined) {
            instructions.push({
              setDependency: dependencyNamesByKey[keyV0Y].verticesAttr,
              desiredValue: workspace.v0[1],
              variableIndex: 0,
            });
          }
          if (keyV2Y !== undefined) {
            instructions.push({
              setDependency: dependencyNamesByKey[keyV2Y].verticesAttr,
              desiredValue: workspace.v2[1],
              variableIndex: 0,
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.nVertices = {
      public: true,
      componentType: 'number',
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { nVertices: 4 } }),
    };

    return stateVariableDefinitions;
  }

  movePolygon(pointcoordsObject) {
    let updateInstructions = [];

    let vertexComponents = {};

    for (let ind in pointcoordsObject) {
      vertexComponents[ind + ',0'] = me.fromAst(pointcoordsObject[ind][0]);
      vertexComponents[ind + ',1'] = me.fromAst(pointcoordsObject[ind][1]);
    }
    updateInstructions.push({
      updateType: 'updateValue',
      componentName: this.componentName,
      stateVariable: 'vertices',
      value: vertexComponents,
    });

    if (Object.keys(pointcoordsObject).length === 1) {
      // When dragging a rectangle corner, add additional instructions
      // if they are needed to ensure the opposite corner doesn't move

      let ind = Number(Object.keys(pointcoordsObject)[0]);
      let vertexX = me.fromAst(pointcoordsObject[ind][0]);
      let vertexY = me.fromAst(pointcoordsObject[ind][1]);

      let oppositeInd = (ind + 2) % 4;
      let oppositeX = this.stateValues.vertices[oppositeInd][0];
      let oppositeY = this.stateValues.vertices[oppositeInd][1];

      if (this.stateValues.nVerticesSpecified < 2) {
        if (this.stateValues.haveSpecifiedCenter) {
          // 1 vertex (or essential vertex) and center

          let centerX, centerY;
          if (ind === 0) {
            centerX = vertexX.add(oppositeX).divide(2);
            centerY = vertexY.add(oppositeY).divide(2);
          } else if (ind === 1) {
            centerY = vertexY.add(oppositeY).divide(2);
          } else if (ind === 3) {
            centerX = vertexX.add(oppositeX).divide(2);
          }

          if (centerX !== undefined) {
            updateInstructions.push({
              updateType: 'updateValue',
              componentName: this.componentName,
              stateVariable: 'specifiedCenter',
              value: { 0: centerX.simplify() },
            });
          }
          if (centerY !== undefined) {
            updateInstructions.push({
              updateType: 'updateValue',
              componentName: this.componentName,
              stateVariable: 'specifiedCenter',
              value: { 1: centerY.simplify() },
            });
          }
        } else {
          // 1 vertex (or essential vertex), width and height

          let width, height;
          if (ind === 0) {
            width = oppositeX.subtract(vertexX);
            height = oppositeY.subtract(vertexY);
          } else if (ind === 1) {
            height = oppositeY.subtract(vertexY);
          } else if (ind === 3) {
            width = oppositeX.subtract(vertexX);
          }

          if (width !== undefined) {
            updateInstructions.push({
              updateType: 'updateValue',
              componentName: this.componentName,
              stateVariable: 'specifiedWidth',
              value: width.simplify(),
            });
          }
          if (height !== undefined) {
            updateInstructions.push({
              updateType: 'updateValue',
              componentName: this.componentName,
              stateVariable: 'specifiedHeight',
              value: height.simplify(),
            });
          }
        }
      }
    }

    // console.log("movePolygon updateInstructions", updateInstructions);

    this.coreFunctions.requestUpdate({
      updateInstructions,
    });
  }
}
