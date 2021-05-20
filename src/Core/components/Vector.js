import GraphicalComponent from './abstract/GraphicalComponent';
import me from 'math-expressions';
import { returnBreakStringsSugarFunction } from './commonsugar/breakstrings';
import { convertValueToMathExpression } from '../utils/math';

export default class Vector extends GraphicalComponent {
  constructor(args) {
    super(args);
    this.moveVector = this.moveVector.bind(
      new Proxy(this, this.readOnlyProxyHandler),
    );
    this.actions = {
      moveVector: this.moveVector,
    };
  }
  static componentType = 'vector';

  // used when referencing this component without prop
  // reference via the head/tail/displacement plus keep track of how defined
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return [
      'head',
      'tail',
      'displacement',
      'basedOnHead',
      'basedOnTail',
      'basedOnDisplacement',
      'nDimensions',
      'nDimDisplacement',
      'nDimHead',
      'nDimTail',
    ];
  }

  static primaryStateVariableForDefinition = 'displacementShadow';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.draggable = {
      createComponentOfType: 'boolean',
      createStateVariable: 'draggable',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };
    attributes.headDraggable = {
      createComponentOfType: 'boolean',
      createStateVariable: 'headDraggable',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };
    attributes.tailDraggable = {
      createComponentOfType: 'boolean',
      createStateVariable: 'tailDraggable',
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
    attributes.displacement = {
      createComponentOfType: 'vector',
    };
    attributes.head = {
      createComponentOfType: 'point',
    };
    attributes.tail = {
      createComponentOfType: 'point',
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

    let atMostOneVector = childLogic.newLeaf({
      name: 'atMostOneVector',
      componentType: 'vector',
      comparison: 'atMost',
      number: 1,
    });

    childLogic.newOperator({
      name: 'vectorXorPoints',
      operator: 'xor',
      propositions: [atMostOnePoint, atMostOneVector],
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

    // displacementShadow will be null unless vector was created
    // via an adapter or ref prop or from serialized state with displacement value
    // In case of adapter or ref prop,
    // given the primaryStateVariableForDefinition static variable,
    // the definition of displacementShadow will be changed to be the value
    // that shadows the component adapted or reffed
    stateVariableDefinitions.displacementShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          displacementShadow: {
            variablesToCheck: ['displacement', 'displacementShadow'],
          },
        },
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'displacementShadow',
              value: desiredStateVariableValues.displacementShadow,
            },
          ],
        };
      },
    };

    // headShadow will be null unless vector was created
    // from serialized state with head value
    stateVariableDefinitions.headShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          headShadow: { variablesToCheck: ['head', 'headShadow'] },
        },
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'headShadow',
              value: desiredStateVariableValues.headShadow,
            },
          ],
        };
      },
    };

    // tailShadow will be null unless vector was created
    // from serialized state with tail value
    stateVariableDefinitions.tailShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          tailShadow: { variablesToCheck: ['tail', 'tailShadow'] },
        },
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'tailShadow',
              value: desiredStateVariableValues.tailShadow,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.sourceOfDisplacement = {
      returnDependencies: () => ({
        xAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'x',
        },
        yAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'y',
        },
        zAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'z',
        },
        xsAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'xs',
        },
        displacementAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'displacement',
        },
        pointChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOnePoint',
        },
        vectorChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneVector',
        },
      }),
      definition({ dependencyValues }) {
        let sourceOfDisplacement = null;
        if (dependencyValues.vectorChild.length === 1) {
          sourceOfDisplacement = 'vectorChild';
        } else if (dependencyValues.pointChild.length === 1) {
          sourceOfDisplacement = 'pointChild';
        } else if (dependencyValues.displacementAttr !== null) {
          sourceOfDisplacement = 'displacementAttr';
        } else if (dependencyValues.xsAttr !== null) {
          sourceOfDisplacement = 'xsAttr';
        } else if (
          dependencyValues.xAttr !== null ||
          dependencyValues.yAttr !== null ||
          dependencyValues.zAttr !== null
        ) {
          sourceOfDisplacement = 'componentAttrs';
        }

        return {
          newValues: { sourceOfDisplacement },
        };
      },
    };

    // if a copy shadow, the basedOnX definitions will be overwritten
    // so we don't have to consider that case here

    stateVariableDefinitions.basedOnHead = {
      returnDependencies: () => ({
        headAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'head',
        },
        headShadow: {
          dependencyType: 'stateVariable',
          variableName: 'headShadow',
        },
        tailAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'tail',
        },
        sourceOfDisplacement: {
          dependencyType: 'stateVariable',
          variableName: 'sourceOfDisplacement',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (
          dependencyValues.tailAttr !== null &&
          dependencyValues.sourceOfDisplacement !== null
        ) {
          if (dependencyValues.headAttr !== null) {
            // if overprescribed by specifying head, tail, and displacement
            // we ignore head
            console.warn(
              `Vector is prescribed by head, tail, and displacement.  Ignoring specified head.`,
            );
          }
          return {
            newValues: { basedOnHead: false },
            checkForActualChange: { basedOnHead: true },
          };
        }

        if (dependencyValues.headAttr !== null) {
          return {
            newValues: { basedOnHead: true },
            checkForActualChange: { basedOnHead: true },
          };
        }

        return {
          newValues: { basedOnHead: dependencyValues.headShadow !== null },
          checkForActualChange: { basedOnHead: true },
        };
      },
    };

    stateVariableDefinitions.basedOnTail = {
      returnDependencies: () => ({
        tailAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'tail',
        },
        tailShadow: {
          dependencyType: 'stateVariable',
          variableName: 'tailShadow',
        },
        sourceOfDisplacement: {
          dependencyType: 'stateVariable',
          variableName: 'sourceOfDisplacement',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.tailAttr !== null) {
          return {
            newValues: { basedOnTail: true },
            checkForActualChange: { basedOnTail: true },
          };
        }

        return {
          newValues: { basedOnTail: dependencyValues.tailShadow !== null },
          checkForActualChange: { basedOnTail: true },
        };
      },
    };

    stateVariableDefinitions.basedOnDisplacement = {
      returnDependencies: () => ({
        sourceOfDisplacement: {
          dependencyType: 'stateVariable',
          variableName: 'sourceOfDisplacement',
        },
        displacementShadow: {
          dependencyType: 'stateVariable',
          variableName: 'displacementShadow',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.sourceOfDisplacement !== null) {
          return {
            newValues: { basedOnDisplacement: true },
            checkForActualChange: { basedOnDisplacement: true },
          };
        }
        return {
          newValues: {
            basedOnDisplacement: dependencyValues.displacementShadow !== null,
          },
          checkForActualChange: { basedOnDisplacement: true },
        };
      },
    };

    // Note: if vector created via a copy (with no prop) of another vector
    // definition of nDimensions and related will be overwritten to shadow variables
    // of the other vector
    // (based on static variable stateVariablesShadowedForReference)

    stateVariableDefinitions.nDimDisplacement = {
      stateVariablesDeterminingDependencies: [
        'basedOnDisplacement',
        'basedOnHead',
        'basedOnTail',
      ],
      returnDependencies({ stateValues }) {
        let dependencies = {
          basedOnHead: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnHead',
          },
          basedOnTail: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnTail',
          },
          basedOnDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnDisplacement',
          },
          sourceOfDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'sourceOfDisplacement',
          },
          displacementShadow: {
            dependencyType: 'stateVariable',
            variableName: 'displacementShadow',
          },
          displacementAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'displacement',
            variableNames: ['nDimensions'],
          },
          vectorChild: {
            dependencyType: 'child',
            childLogicName: 'atMostOneVector',
            variableNames: ['nDimensions'],
          },
          pointChild: {
            dependencyType: 'child',
            childLogicName: 'atMostOnePoint',
            variableNames: ['nDimensions'],
          },
          xAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'x',
          },
          yAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'y',
          },
          zAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'z',
          },
          xsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'xs',
            variableNames: ['nComponents'],
          },
        };

        if (!stateValues.basedOnDisplacement) {
          if (stateValues.basedOnHead) {
            dependencies.nDimHead = {
              dependencyType: 'stateVariable',
              variableName: 'nDimHead',
            };
          }
          if (stateValues.basedOnTail) {
            dependencies.nDimTail = {
              dependencyType: 'stateVariable',
              variableName: 'nDimTail',
            };
          }
        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        let nDimDisplacement;

        if (dependencyValues.basedOnDisplacement) {
          switch (dependencyValues.sourceOfDisplacement) {
            case 'vectorChild':
              nDimDisplacement =
                dependencyValues.vectorChild[0].stateValues.nDimensions;
              break;
            case 'pointChild':
              nDimDisplacement =
                dependencyValues.pointChild[0].stateValues.nDimensions;
              break;
            case 'displacementAttr':
              nDimDisplacement =
                dependencyValues.displacementAttr.stateValues.nDimensions;
              break;
            case 'xsAttr':
              nDimDisplacement =
                dependencyValues.xsAttr.stateValues.nComponents;
              break;
            case 'componentAttrs':
              if (dependencyValues.zAttr !== null) {
                nDimDisplacement = 3;
              } else if (dependencyValues.yAttr !== null) {
                nDimDisplacement = 2;
              } else {
                nDimDisplacement = 1;
              }
              break;
            default:
              // since based on displacement and no source of displacement
              // we must have a displacement shadow
              let displacementTree = dependencyValues.displacementShadow.tree;
              if (
                Array.isArray(displacementTree) &&
                ['tuple', 'vector'].includes(displacementTree[0])
              ) {
                nDimDisplacement = displacementTree.length - 1;
              } else {
                nDimDisplacement = 1;
              }
          }
        } else {
          if (dependencyValues.basedOnHead) {
            if (dependencyValues.basedOnTail) {
              if (dependencyValues.nDimHead === dependencyValues.nDimTail) {
                nDimDisplacement = dependencyValues.nDimHead;
              } else {
                nDimDisplacement = NaN;
              }
            } else {
              nDimDisplacement = dependencyValues.nDimHead;
            }
          } else if (dependencyValues.basedOnTail) {
            nDimDisplacement = dependencyValues.nDimTail;
          } else {
            nDimDisplacement = 2;
          }
        }

        return {
          newValues: { nDimDisplacement },
          checkForActualChange: { nDimDisplacement: true },
        };
      },
    };

    stateVariableDefinitions.nDimHead = {
      stateVariablesDeterminingDependencies: [
        'basedOnDisplacement',
        'basedOnHead',
        'basedOnTail',
      ],
      returnDependencies({ stateValues }) {
        let dependencies = {
          basedOnHead: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnHead',
          },
          basedOnTail: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnTail',
          },
          basedOnDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnDisplacement',
          },
          headShadow: {
            dependencyType: 'stateVariable',
            variableName: 'headShadow',
          },
          headAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'head',
            variableNames: ['nDimensions'],
          },
        };

        if (!stateValues.basedOnHead) {
          if (stateValues.basedOnTail) {
            dependencies.nDimTail = {
              dependencyType: 'stateVariable',
              variableName: 'nDimTail',
            };
          }
          if (stateValues.basedOnDisplacement) {
            dependencies.nDimDisplacement = {
              dependencyType: 'stateVariable',
              variableName: 'nDimDisplacement',
            };
          }
        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        let nDimHead;

        if (dependencyValues.basedOnHead) {
          if (dependencyValues.headAttr !== null) {
            nDimHead = dependencyValues.headAttr.stateValues.nDimensions;
          } else if (dependencyValues.headShadow) {
            let headTree = dependencyValues.headShadow.tree;
            if (
              Array.isArray(headTree) &&
              ['tuple', 'vector'].includes(headTree[0])
            ) {
              nDimHead = headTree.length - 1;
            } else {
              nDimHead = 2;
            }
          }
        } else {
          if (dependencyValues.basedOnDisplacement) {
            if (dependencyValues.basedOnTail) {
              if (
                dependencyValues.nDimDisplacement === dependencyValues.nDimTail
              ) {
                nDimHead = dependencyValues.nDimDisplacement;
              } else {
                nDimHead = NaN;
              }
            } else {
              nDimHead = dependencyValues.nDimDisplacement;
            }
          } else if (dependencyValues.basedOnTail) {
            nDimHead = dependencyValues.nDimTail;
          } else {
            nDimHead = 2;
          }
        }

        return {
          newValues: { nDimHead },
          checkForActualChange: { nDimHead: true },
        };
      },
    };

    stateVariableDefinitions.nDimTail = {
      stateVariablesDeterminingDependencies: [
        'basedOnDisplacement',
        'basedOnHead',
        'basedOnTail',
      ],
      returnDependencies({ stateValues }) {
        let dependencies = {
          basedOnHead: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnHead',
          },
          basedOnTail: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnTail',
          },
          basedOnDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnDisplacement',
          },
          tailShadow: {
            dependencyType: 'stateVariable',
            variableName: 'tailShadow',
          },
          tailAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'tail',
            variableNames: ['nDimensions'],
          },
        };

        if (!stateValues.basedOnTail) {
          if (stateValues.basedOnHead) {
            dependencies.nDimHead = {
              dependencyType: 'stateVariable',
              variableName: 'nDimHead',
            };
          }
          if (stateValues.basedOnDisplacement) {
            dependencies.nDimDisplacement = {
              dependencyType: 'stateVariable',
              variableName: 'nDimDisplacement',
            };
          }
        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        let nDimTail;

        if (dependencyValues.basedOnTail) {
          if (dependencyValues.tailAttr !== null) {
            nDimTail = dependencyValues.tailAttr.stateValues.nDimensions;
          } else if (dependencyValues.tailShadow) {
            let tailTree = dependencyValues.tailShadow.tree;
            if (
              Array.isArray(tailTree) &&
              ['tuple', 'vector'].includes(tailTree[0])
            ) {
              nDimTail = tailTree.length - 1;
            } else {
              nDimTail = 2;
            }
          }
        } else {
          if (dependencyValues.basedOnDisplacement) {
            if (dependencyValues.basedOnHead) {
              if (
                dependencyValues.nDimDisplacement === dependencyValues.nDimHead
              ) {
                nDimTail = dependencyValues.nDimDisplacement;
              } else {
                nDimTail = NaN;
              }
            } else {
              nDimTail = dependencyValues.nDimDisplacement;
            }
          } else if (dependencyValues.basedOnHead) {
            nDimTail = dependencyValues.nDimHead;
          } else {
            nDimTail = 2;
          }
        }

        return {
          newValues: { nDimTail },
          checkForActualChange: { nDimTail: true },
        };
      },
    };

    stateVariableDefinitions.nDimensions = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        basedOnHead: {
          dependencyType: 'stateVariable',
          variableName: 'basedOnHead',
        },
        basedOnTail: {
          dependencyType: 'stateVariable',
          variableName: 'basedOnTail',
        },
        basedOnDisplacement: {
          dependencyType: 'stateVariable',
          variableName: 'basedOnDisplacement',
        },
        nDimDisplacement: {
          dependencyType: 'stateVariable',
          variableName: 'nDimDisplacement',
        },
        nDimHead: {
          dependencyType: 'stateVariable',
          variableName: 'nDimHead',
        },
        nDimTail: {
          dependencyType: 'stateVariable',
          variableName: 'nDimTail',
        },
      }),
      definition: function ({ dependencyValues }) {
        // console.log(`nDimensions definition`)
        // console.log(dependencyValues)

        let nDimensions;
        if (dependencyValues.basedOnDisplacement) {
          if (dependencyValues.basedOnTail) {
            // ignore head if have both displacement and tail
            if (
              dependencyValues.nDimDisplacement !== dependencyValues.nDimTail
            ) {
              console.warn(`nDimensions mismatch in vector`);
              return { newValues: { nDimensions: NaN } };
            }
          } else if (dependencyValues.basedOnHead) {
            if (
              dependencyValues.nDimDisplacement !== dependencyValues.nDimHead
            ) {
              console.warn(`nDimensions mismatch in vector`);
              return { newValues: { nDimensions: NaN } };
            }
          }
          nDimensions = dependencyValues.nDimDisplacement;
        } else if (dependencyValues.basedOnTail) {
          if (dependencyValues.basedOnHead) {
            if (dependencyValues.nDimTail !== dependencyValues.nDimHead) {
              console.warn(`nDimensions mismatch in vector`);
              return { newValues: { nDimensions: NaN } };
            }
          }
          nDimensions = dependencyValues.nDimTail;
        } else if (dependencyValues.basedOnHead) {
          nDimensions = dependencyValues.nDimHead;
        } else {
          nDimensions = 2;
        }

        return {
          newValues: { nDimensions },
          checkForActualChange: { nDimensions: true },
        };
      },
    };

    // allowed possibilities for specified properties
    // nothing (tail set to zero, head set to (1,0s),  displacement/xs set to head-tail)
    // head (tail set to zero, displacement/xs set to head-tail)
    // tail (head set to tail + (1,0s), displacement/xs set to head-tail)
    // displacement/xs (tail set to zero, head set to displacement)
    // head and tail (displacement/xs set to head-tail)
    // head and displacement/xs (tail set to head-displacement)
    // tail and displacement/xs (head set to tail+displacement)
    // If head, tail, and displacment/xs supplied, ignore head

    stateVariableDefinitions.displacement = {
      public: true,
      componentType: 'math',
      isArray: true,
      entryPrefixes: ['x'],
      returnWrappingComponents(prefix) {
        if (prefix === 'x') {
          return [];
        } else {
          // entire array
          // wrap by both <vector> and <xs>
          return [['vector', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      stateVariablesDeterminingDependencies: [
        'basedOnDisplacement',
        'sourceOfDisplacement',
      ],
      returnArraySizeDependencies: () => ({
        nDimDisplacement: {
          dependencyType: 'stateVariable',
          variableName: 'nDimDisplacement',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimDisplacement];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let globalDependencies = {
          basedOnHead: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnHead',
          },
          basedOnTail: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnTail',
          },
          basedOnDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnDisplacement',
          },
          displacementShadow: {
            dependencyType: 'stateVariable',
            variableName: 'displacementShadow',
          },
          sourceOfDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'sourceOfDisplacement',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            xsAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'xs',
              variableNames: ['math' + varEnding],
            },
            displacementAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'displacement',
              variableNames: ['x' + varEnding],
            },
            pointChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOnePoint',
              variableNames: ['x' + varEnding],
            },
            vectorChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneVector',
              variableNames: ['x' + varEnding],
            },
          };
          if (arrayKey === '0') {
            dependenciesByKey[arrayKey].componentAttr = {
              dependencyType: 'attributeComponent',
              attributeName: 'x',
              variableNames: ['value'],
            };
          } else if (arrayKey === '1') {
            dependenciesByKey[arrayKey].componentAttr = {
              dependencyType: 'attributeComponent',
              attributeName: 'y',
              variableNames: ['value'],
            };
          } else if (arrayKey === '2') {
            dependenciesByKey[arrayKey].componentAttr = {
              dependencyType: 'attributeComponent',
              attributeName: 'z',
              variableNames: ['value'],
            };
          }

          if (!stateValues.basedOnDisplacement) {
            // if not based on displacement, will always use head and tail values
            // as, even if not based on head or tail,
            // head or tail will be made essential (with default of zero)
            dependenciesByKey[arrayKey].tailX = {
              dependencyType: 'stateVariable',
              variableName: 'tailX' + varEnding,
            };
            dependenciesByKey[arrayKey].headX = {
              dependencyType: 'stateVariable',
              variableName: 'headX' + varEnding,
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
        // console.log('array definition of vector displacement')
        // console.log(globalDepend encyValues, dependencyValuesByKey, arrayKeys)

        let displacement = {};
        let essentialDisplacement = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (globalDependencyValues.basedOnDisplacement) {
            switch (globalDependencyValues.sourceOfDisplacement) {
              case 'vectorChild':
                displacement[arrayKey] =
                  dependencyValuesByKey[arrayKey].vectorChild[0].stateValues[
                    'x' + varEnding
                  ];
                break;
              case 'pointChild':
                displacement[arrayKey] =
                  dependencyValuesByKey[arrayKey].pointChild[0].stateValues[
                    'x' + varEnding
                  ];
                break;
              case 'displacementAttr':
                displacement[arrayKey] =
                  dependencyValuesByKey[arrayKey].displacementAttr.stateValues[
                    'x' + varEnding
                  ];
                break;
              case 'xsAttr':
                displacement[arrayKey] =
                  dependencyValuesByKey[arrayKey].xsAttr.stateValues[
                    'math' + varEnding
                  ].simplify();
                break;
              case 'componentAttrs':
                let componentAttr =
                  dependencyValuesByKey[arrayKey].componentAttr;
                if (componentAttr === null) {
                  // based on component attributes, but don't have
                  // this particular one specified
                  essentialDisplacement[arrayKey] = {
                    defaultValue: me.fromAst(0),
                  };
                } else {
                  displacement[arrayKey] =
                    componentAttr.stateValues.value.simplify();
                }
                break;
              default:
                // since based on displacement and no source of displacement
                // we must have a displacement shadow
                let displacementTree =
                  globalDependencyValues.displacementShadow.tree;
                if (
                  Array.isArray(displacementTree) &&
                  ['tuple', 'vector'].includes(displacementTree[0])
                ) {
                  displacement[arrayKey] =
                    globalDependencyValues.displacementShadow.get_component(
                      Number(arrayKey),
                    );
                } else {
                  displacement[arrayKey] =
                    globalDependencyValues.displacementShadow;
                }
            }
          } else {
            // basedOnDisplacement is false
            // calculate displacement from head and tail
            displacement[arrayKey] = dependencyValuesByKey[arrayKey].headX
              .subtract(dependencyValuesByKey[arrayKey].tailX)
              .simplify();
          }
        }

        let result = {};

        if (Object.keys(displacement).length > 0) {
          result.newValues = { displacement };
        }
        if (Object.keys(essentialDisplacement).length > 0) {
          result.useEssentialOrDefaultValue = {
            displacement: essentialDisplacement,
          };
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
        // console.log(`inverse array definition of displacement`)
        // console.log(JSON.parse(JSON.stringify(desiredStateVariableValues)))
        // console.log(JSON.parse(JSON.stringify(globalDependencyValues)))
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))

        let instructions = [];

        let updateDisplacementShadow = false;

        for (let arrayKey in desiredStateVariableValues.displacement) {
          if (globalDependencyValues.basedOnDisplacement) {
            switch (globalDependencyValues.sourceOfDisplacement) {
              case 'vectorChild':
                instructions.push({
                  setDependency: dependencyNamesByKey[arrayKey].vectorChild,
                  desiredValue:
                    desiredStateVariableValues.displacement[arrayKey],
                  childIndex: 0,
                  variableIndex: 0,
                });
                break;
              case 'pointChild':
                instructions.push({
                  setDependency: dependencyNamesByKey[arrayKey].pointChild,
                  desiredValue:
                    desiredStateVariableValues.displacement[arrayKey],
                  childIndex: 0,
                  variableIndex: 0,
                });
                break;
              case 'displacementAttr':
                instructions.push({
                  setDependency:
                    dependencyNamesByKey[arrayKey].displacementAttr,
                  desiredValue:
                    desiredStateVariableValues.displacement[arrayKey],
                  variableIndex: 0,
                });
                break;
              case 'xsAttr':
                instructions.push({
                  setDependency: dependencyNamesByKey[arrayKey].xsAttr,
                  desiredValue:
                    desiredStateVariableValues.displacement[arrayKey],
                  variableIndex: 0,
                });
                break;
              case 'componentAttrs':
                let componentAttr =
                  dependencyValuesByKey[arrayKey].componentAttr;
                if (componentAttr === null) {
                  // based on component attributes, but don't have
                  // this particular one specified
                  instructions.push({
                    setStateVariable: 'displacement',
                    value: {
                      [arrayKey]: convertValueToMathExpression(
                        desiredStateVariableValues.displacement[arrayKey],
                      ),
                    },
                  });
                } else {
                  instructions.push({
                    setDependency: dependencyNamesByKey[arrayKey].componentAttr,
                    desiredValue:
                      desiredStateVariableValues.displacement[arrayKey],
                    variableIndex: 0,
                  });
                }
                break;
              default:
                // since based on displacement and no source of displacement
                // we must have a displacement shadow
                updateDisplacementShadow = true;
            }
          } else {
            // basedOnDisplacement is false
            // set head to be sum of tail and desired displacement
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].headX,
              desiredValue: dependencyValuesByKey[arrayKey].tailX
                .add(desiredStateVariableValues.displacement[arrayKey])
                .simplify(),
            });
          }
        }

        if (updateDisplacementShadow) {
          if (arraySize[0] > 1) {
            let desiredDisplacement = ['vector'];
            for (let arrayKey in desiredStateVariableValues.displacement) {
              desiredDisplacement[Number(arrayKey) + 1] =
                desiredStateVariableValues.displacement[arrayKey].tree;
            }
            desiredDisplacement.length = arraySize[0] + 1;
            instructions.push({
              setDependency: 'displacementShadow',
              desiredValue: me.fromAst(desiredDisplacement),
            });
          } else if (
            arraySize[0] === 1 &&
            '0' in desiredStateVariableValues.displacement
          ) {
            instructions.push({
              setDependency: 'displacementShadow',
              desiredValue: desiredStateVariableValues.displacement[0],
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

    stateVariableDefinitions.head = {
      public: true,
      componentType: 'math',
      isArray: true,
      entryPrefixes: ['headX'],
      returnWrappingComponents(prefix) {
        if (prefix === 'headX') {
          return [];
        } else {
          // entire array
          // wrap by both <point> and <xs>
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      stateVariablesDeterminingDependencies: [
        'basedOnHead',
        'basedOnDisplacement',
      ],
      returnArraySizeDependencies: () => ({
        nDimHead: {
          dependencyType: 'stateVariable',
          variableName: 'nDimHead',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimHead];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let globalDependencies = {
          basedOnDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnDisplacement',
          },
          basedOnTail: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnTail',
          },
          basedOnHead: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnHead',
          },
          headShadow: {
            dependencyType: 'stateVariable',
            variableName: 'headShadow',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            headAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'head',
              variableNames: ['x' + varEnding],
            },
          };

          if (!stateValues.basedOnHead) {
            // if not based on head, will always use tail value
            // as, even if not based on tail,
            // tail will be made essential (with default of zero)
            dependenciesByKey[arrayKey].tailX = {
              dependencyType: 'stateVariable',
              variableName: 'tailX' + varEnding,
            };

            if (stateValues.basedOnDisplacement) {
              dependenciesByKey[arrayKey].x = {
                dependencyType: 'stateVariable',
                variableName: 'x' + varEnding,
              };
            }
          }
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey: function ({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        // console.log('array definition of vector head')
        // console.log(globalDependencyValues, dependencyValuesByKey, arrayKeys)

        let head = {};
        let essentialHeadXs = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (globalDependencyValues.basedOnHead) {
            if (dependencyValuesByKey[arrayKey].headAttr !== null) {
              head[arrayKey] =
                dependencyValuesByKey[arrayKey].headAttr.stateValues[
                  'x' + varEnding
                ];
            } else if (globalDependencyValues.headShadow !== null) {
              head[arrayKey] = globalDependencyValues.headShadow.get_component(
                Number(arrayKey),
              );
            }
          } else {
            // basedOnHead is false

            if (globalDependencyValues.basedOnDisplacement) {
              // displacement and tail: add to create head
              // for this case, it doesn't matter if based on tail
              // as will use tail value anyway
              // (tail will be made essential with default of zero
              // if not based on head or tail)

              head[arrayKey] = dependencyValuesByKey[arrayKey].tailX
                .add(dependencyValuesByKey[arrayKey].x)
                .simplify();
            } else {
              if (globalDependencyValues.basedOnTail) {
                // if just based on tail, then head component should default
                // to the tail plus 1 in the first component and zero elsewhere
                // (but it will use the resulting essential value after that
                // so any changes will be saved)
                essentialHeadXs[arrayKey] = {
                  get defaultValue() {
                    if (arrayKey === '0') {
                      return dependencyValuesByKey[arrayKey].tailX
                        .add(me.fromAst(1))
                        .simplify();
                    } else {
                      return dependencyValuesByKey[arrayKey].tailX;
                    }
                  },
                  variablesToCheck: ['headX' + varEnding],
                };
              } else {
                // if not based on anything, then head component should default
                // to 1 in the first component and zeros elsewhere
                // (but it will use the resulting essential value after that
                // so any changes will be saved)
                essentialHeadXs[arrayKey] = {
                  get defaultValue() {
                    return me.fromAst(arrayKey === '0' ? 1 : 0);
                  },
                  variablesToCheck: ['headX' + varEnding],
                };
              }
            }
          }
        }

        let result = {};
        if (Object.keys(head).length > 0) {
          result.newValues = { head };
        }
        if (Object.keys(essentialHeadXs).length > 0) {
          result.useEssentialOrDefaultValue = { head: essentialHeadXs };
        }

        // console.log(`result of array definition of head of vector`)
        // console.log(result);

        return result;
      },

      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        arraySize,
      }) {
        // console.log(`inverse array definition of head`, desiredStateVariableValues,
        //   globalDependencyValues, dependencyValuesByKey
        // )

        let instructions = [];

        let updateHeadShadow = false;

        for (let arrayKey in desiredStateVariableValues.head) {
          if (globalDependencyValues.basedOnHead) {
            if (
              dependencyValuesByKey[arrayKey].headAttr &&
              dependencyValuesByKey[arrayKey].headAttr !== null
            ) {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].headAttr,
                desiredValue: desiredStateVariableValues.head[arrayKey],
                variableIndex: 0,
              });
            } else if (globalDependencyValues.headShadow !== null) {
              updateHeadShadow = true;
            }
          } else {
            // not based on head

            if (globalDependencyValues.basedOnDisplacement) {
              // displacement and tail: set displacement to be desired head - tail

              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].x,
                desiredValue: desiredStateVariableValues.head[arrayKey]
                  .subtract(dependencyValuesByKey[arrayKey].tailX)
                  .simplify(),
              });
            } else {
              // if just based on tail, then headX should have become
              // an essential state variable
              // set the value of the variable directly

              instructions.push({
                setStateVariable: 'head',
                value: {
                  [arrayKey]: desiredStateVariableValues.head[arrayKey],
                },
              });
            }
          }
        }

        if (updateHeadShadow) {
          if (arraySize[0] > 1) {
            let desiredHead = ['vector'];
            for (let arrayKey in desiredStateVariableValues.head) {
              desiredHead[Number(arrayKey) + 1] =
                desiredStateVariableValues.head[arrayKey].tree;
            }
            desiredHead.length = arraySize[0] + 1;
            instructions.push({
              setDependency: 'headShadow',
              desiredValue: me.fromAst(desiredHead),
            });
          } else if (
            arraySize[0] === 1 &&
            '0' in desiredStateVariableValues.head
          ) {
            instructions.push({
              setDependency: 'headShadow',
              desiredValue: desiredStateVariableValues.head[0],
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.tail = {
      public: true,
      componentType: 'math',
      isArray: true,
      entryPrefixes: ['tailX'],
      returnWrappingComponents(prefix) {
        if (prefix === 'tailX') {
          return [];
        } else {
          // entire array
          // wrap by both <point> and <xs>
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        }
      },
      stateVariablesDeterminingDependencies: [
        'basedOnHead',
        'basedOnDisplacement',
      ],
      returnArraySizeDependencies: () => ({
        nDimTail: {
          dependencyType: 'stateVariable',
          variableName: 'nDimTail',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimTail];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let globalDependencies = {
          basedOnDisplacement: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnDisplacement',
          },
          basedOnHead: {
            dependencyType: 'stateVariable',
            variableName: 'basedOnHead',
          },
          tailShadow: {
            dependencyType: 'stateVariable',
            variableName: 'tailShadow',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          dependenciesByKey[arrayKey] = {
            tailAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'tail',
              variableNames: ['x' + varEnding],
            },
          };

          if (!stateValues.basedOnTail) {
            if (stateValues.basedOnHead) {
              dependenciesByKey[arrayKey].headX = {
                dependencyType: 'stateVariable',
                variableName: 'headX' + varEnding,
              };
            }
            if (stateValues.basedOnDisplacement) {
              dependenciesByKey[arrayKey].x = {
                dependencyType: 'stateVariable',
                variableName: 'x' + varEnding,
              };
            }
          }
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey: function ({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        // console.log('array definition of vector tail');
        // console.log(JSON.parse(JSON.stringify(globalDependencyValues)))
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))
        // console.log(JSON.parse(JSON.stringify(arrayKeys)))

        let tail = {};
        let essentialTailXs = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (dependencyValuesByKey[arrayKey].tailAttr !== null) {
            tail[arrayKey] =
              dependencyValuesByKey[arrayKey].tailAttr.stateValues[
                'x' + varEnding
              ];
          } else if (globalDependencyValues.tailShadow !== null) {
            tail[arrayKey] = globalDependencyValues.tailShadow.get_component(
              Number(arrayKey),
            );
          } else {
            // if made it to here, basedOnTail is false

            if (
              globalDependencyValues.basedOnHead &&
              globalDependencyValues.basedOnDisplacement
            ) {
              // based on head and displacement,
              // subtract displacement from head to get tail
              tail[arrayKey] = dependencyValuesByKey[arrayKey].headX
                .subtract(dependencyValuesByKey[arrayKey].x)
                .simplify();
            } else {
              // tail defaults to zero
              // (but it will use the resulting essential value after that
              // so any changes will be saved)
              essentialTailXs[arrayKey] = {
                get defaultValue() {
                  return me.fromAst(0);
                },
                variablesToCheck: ['tailX' + varEnding],
              };
            }
          }
        }

        let result = {};
        if (Object.keys(tail).length > 0) {
          result.newValues = { tail };
        }
        if (Object.keys(essentialTailXs).length > 0) {
          result.useEssentialOrDefaultValue = { tail: essentialTailXs };
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
        // console.log(`inverse array definition of tail`, desiredStateVariableValues,
        //   globalDependencyValues, dependencyValuesByKey
        // )

        let instructions = [];

        let updateTailShadow = false;

        for (let arrayKey in desiredStateVariableValues.tail) {
          if (
            dependencyValuesByKey[arrayKey].tailAttr &&
            dependencyValuesByKey[arrayKey].tailAttr !== null
          ) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].tailAttr,
              desiredValue: desiredStateVariableValues.tail[arrayKey],
              variableIndex: 0,
            });
          } else if (globalDependencyValues.tailShadow !== null) {
            updateTailShadow = true;
          } else {
            // not based on tail

            if (
              globalDependencyValues.basedOnHead &&
              globalDependencyValues.basedOnDisplacement
            ) {
              // set displacement to be difference between head and desired tail

              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].x,
                desiredValue: dependencyValuesByKey[arrayKey].headX
                  .subtract(desiredStateVariableValues.tail[arrayKey])
                  .simplify(),
              });
            } else {
              // if not based on both head and displacement,
              // then tail should have become
              // an essential state variable
              // set the value of the variable directly

              instructions.push({
                setStateVariable: 'tail',
                value: {
                  [arrayKey]: desiredStateVariableValues.tail[arrayKey],
                },
              });
            }
          }
        }

        if (updateTailShadow) {
          if (arraySize[0] > 1) {
            let desiredTail = ['vector'];
            for (let arrayKey in desiredStateVariableValues.tail) {
              desiredTail[Number(arrayKey) + 1] =
                desiredStateVariableValues.tail[arrayKey].tree;
            }
            desiredTail.length = arraySize[0] + 1;
            instructions.push({
              setDependency: 'tailShadow',
              desiredValue: me.fromAst(desiredTail),
            });
          } else if (
            arraySize[0] === 1 &&
            '0' in desiredStateVariableValues.tail
          ) {
            instructions.push({
              setDependency: 'tailShadow',
              desiredValue: desiredStateVariableValues.tail[0],
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
      forRenderer: true,
      returnDependencies: () => ({
        head: {
          dependencyType: 'stateVariable',
          variableName: 'head',
        },
        tail: {
          dependencyType: 'stateVariable',
          variableName: 'tail',
        },
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      definition: function ({ dependencyValues }) {
        let numericalHead, numericalTail;
        if (dependencyValues.nDimensions === 1) {
          let numericalHead = dependencyValues.head.evaluate_to_constant();
          if (!Number.isFinite(numericalHead)) {
            numericalHead = NaN;
          }
          numericalTail = dependencyValues.tail.evaluate_to_constant();
          if (!Number.isFinite(numericalTail)) {
            numericalTail = NaN;
          }
        } else {
          numericalHead = [];
          numericalTail = [];

          for (let i = 0; i < dependencyValues.nDimensions; i++) {
            let head = dependencyValues.head[i].evaluate_to_constant();
            if (!Number.isFinite(head)) {
              head = NaN;
            }
            numericalHead.push(head);

            let tail = dependencyValues.tail[i].evaluate_to_constant();
            if (!Number.isFinite(tail)) {
              tail = NaN;
            }
            numericalTail.push(tail);
          }
        }

        return {
          newValues: { numericalEndpoints: [numericalTail, numericalHead] },
        };
      },
    };

    stateVariableDefinitions.displacementCoords = {
      forRenderer: true,
      returnDependencies: () => ({
        displacement: {
          dependencyType: 'stateVariable',
          variableName: 'displacement',
        },
      }),
      definition({ dependencyValues }) {
        let coordsAst = [];
        for (let v of dependencyValues.displacement) {
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

        return { newValues: { displacementCoords: me.fromAst(coordsAst) } };
      },
    };

    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
        numericalEndpoints: {
          dependencyType: 'stateVariable',
          variableName: 'numericalEndpoints',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          nearestPoint: function (variables) {
            // only implemented in 2D for now
            if (dependencyValues.nDimensions !== 2) {
              return {};
            }

            let A1 = dependencyValues.numericalEndpoints[0][0];
            let A2 = dependencyValues.numericalEndpoints[0][1];
            let B1 = dependencyValues.numericalEndpoints[1][0];
            let B2 = dependencyValues.numericalEndpoints[1][1];

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

            let x1 = variables.x1.evaluate_to_constant();
            let x2 = variables.x2.evaluate_to_constant();

            if (!(Number.isFinite(x1) && Number.isFinite(x2))) {
              return {};
            }

            let t = ((x1 - A1) * BA1 + (x2 - A2) * BA2) / denom;

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

  static adapters = [
    {
      stateVariable: 'displacementCoords',
      componentType: 'coords',
    },
  ];

  moveVector({ tailcoords, headcoords, transient, sourceInformation }) {
    let updateInstructions = [];

    if (tailcoords !== undefined) {
      // if based on both head and displacement
      // then set displacement as head - tail
      if (
        this.stateValues.basedOnHead &&
        this.stateValues.basedOnDisplacement
      ) {
        let displacement;
        if (headcoords === undefined) {
          // use current value of head
          // if head isn't supposed to change
          displacement = tailcoords.map(
            (x, i) => this.stateValues.numericalEndpoints[1][i] - x,
          );
        } else {
          displacement = tailcoords.map((x, i) => headcoords[i] - x);
        }

        updateInstructions.push({
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'displacement',
          value: displacement.map((x) => me.fromAst(x)),
          sourceInformation,
        });
      } else {
        // set tail directly
        updateInstructions.push({
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'tail',
          value: tailcoords.map((x) => me.fromAst(x)),
          sourceInformation,
        });
      }

      if (headcoords === undefined) {
        // if set tail but not head, the idea is that head shouldn't move
        // however, head would move if based on displacement but not head
        // so give instructions to change displacement to keep head fixed
        if (
          !this.stateValues.basedOnHead &&
          this.stateValues.basedOnDisplacement
        ) {
          let displacement = tailcoords.map(
            (x, i) => this.stateValues.numericalEndpoints[1][i] - x,
          );
          updateInstructions.push({
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'displacement',
            value: displacement.map((x) => me.fromAst(x)),
            sourceInformation,
          });
        }
      }
    }

    if (headcoords !== undefined) {
      // for head, we'll set it directly if based on head
      // or not based on displacement
      if (
        this.stateValues.basedOnHead ||
        !this.stateValues.basedOnDisplacement
      ) {
        updateInstructions.push({
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'head',
          value: headcoords.map((x) => me.fromAst(x)),
          sourceInformation,
        });
      } else {
        // if based on displacement alone or displacement and tail
        // then update displacement instead of head

        if (tailcoords == undefined) {
          tailcoords = this.stateValues.numericalEndpoints[0];
        }
        let displacement = tailcoords.map((x, i) => headcoords[i] - x);
        updateInstructions.push({
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'displacement',
          value: displacement.map((x) => me.fromAst(x)),
          sourceInformation,
        });
      }

      if (tailcoords === undefined) {
        // if set head but not tail, the idea is that tail shouldn't move
        // however, tail would move if based on displacement and head
        // so give instructions to change displacement to keep tail fixed
        if (
          this.stateValues.basedOnHead &&
          this.stateValues.basedOnDisplacement
        ) {
          let displacement = headcoords.map(
            (x, i) => x - this.stateValues.numericalEndpoints[0][i],
          );
          updateInstructions.push({
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'displacement',
            value: displacement.map((x) => me.fromAst(x)),
            sourceInformation,
          });
        }
      }
    }

    if (transient) {
      this.coreFunctions.requestUpdate({
        updateInstructions,
        transient,
      });
    } else {
      this.coreFunctions.requestUpdate({
        updateInstructions,
        event: {
          verb: 'interacted',
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          result: {
            head: headcoords,
            tail: tailcoords,
          },
        },
      });
    }
  }
}
