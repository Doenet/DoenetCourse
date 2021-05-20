import GraphicalComponent from './abstract/GraphicalComponent';
import me from 'math-expressions';
import LineSegment from './LineSegment';

export default class Angle extends GraphicalComponent {
  static componentType = 'angle';

  static get stateVariablesShadowedForReference() {
    return [
      'nPointsSpecified',
      'points',
      'radians',
      'degrees',
      'numericalPoints',
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
    attributes.radius = {
      createComponentOfType: 'math',
      createStateVariable: 'radius',
      defaultValue: me.fromAst(1),
      public: true,
    };
    attributes.renderAsAcuteAngle = {
      createComponentOfType: 'boolean',
      createStateVariable: 'renderAsAcuteAngle',
      defaultValue: false,
      public: true,
      forRenderer: true,
    };
    attributes.inDegrees = {
      createComponentOfType: 'boolean',
      createStateVariable: 'inDegrees',
      defaultValue: false,
      public: true,
      forRenderer: true,
    };

    attributes.radians = {
      createComponentOfType: 'math',
    };
    attributes.degrees = {
      createComponentOfType: 'math',
    };
    attributes.through = {
      createComponentOfType: '_pointListComponent',
    };
    attributes.betweenLines = {
      createComponentOfType: '_lineListComponent',
    };

    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    sugarInstructions.push({
      childrenRegex: 's',
      replacementFunction: ({ matchedChildren }) => ({
        success: true,
        newAttributes: {
          radians: {
            componentType: 'math',
            children: matchedChildren,
          },
        },
      }),
    });

    return sugarInstructions;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.lineNames = {
      returnDependencies: () => ({
        betweenLines: {
          dependencyType: 'attributeComponent',
          attributeName: 'betweenLines',
          variableNames: ['lineNames'],
        },
      }),
      definition({ dependencyValues }) {
        let lineNames = [];

        if (dependencyValues.betweenLines !== null) {
          lineNames = dependencyValues.betweenLines.stateValues.lineNames;
        }
        return { newValues: { lineNames } };
      },
    };

    stateVariableDefinitions.betweenLinesName = {
      returnDependencies: () => ({
        betweenLines: {
          dependencyType: 'attributeComponent',
          attributeName: 'betweenLines',
        },
      }),
      definition({ dependencyValues }) {
        let betweenLinesName = null;

        if (dependencyValues.betweenLines !== null) {
          betweenLinesName = dependencyValues.betweenLines.componentName;
        }
        return { newValues: { betweenLinesName } };
      },
    };

    stateVariableDefinitions.nPointsSpecified = {
      returnDependencies: () => ({
        through: {
          dependencyType: 'attributeComponent',
          attributeName: 'through',
          variableNames: ['nPoints'],
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.through !== null) {
          return {
            newValues: {
              nPointsSpecified: dependencyValues.through.stateValues.nPoints,
            },
          };
        } else {
          return { newValues: { nPointsSpecified: 0 } };
        }
      },
    };

    stateVariableDefinitions.points = {
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['pointX', 'point'],
      stateVariablesDeterminingDependencies: [
        'nPointsSpecified',
        'betweenLinesName',
      ],
      returnArraySizeDependencies: () => ({
        radians: {
          dependencyType: 'attributeComponent',
          attributeName: 'radians',
          variableNames: ['value'],
        },
        degrees: {
          dependencyType: 'attributeComponent',
          attributeName: 'degrees',
          variableNames: ['value'],
        },
      }),
      returnArraySize({ dependencyValues }) {
        if (
          dependencyValues.radians !== null ||
          dependencyValues.degrees !== null
        ) {
          return [0, 0];
        } else {
          return [3, 2];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'pointX') {
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
          // point3 is all components of the third point
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
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let globalDependencies = {
          // lineChildren: {
          //   dependencyType: "child",
          //   childLogicName: "exactlyOneBetweenLines",
          //   variableNames: ["points", "nDimensions", "coeff0", "coeffvar1", "coeffvar2"]
          // },
          // use value of state variable determining dependency
          // (rather than reference to state variable value)
          // so that this dependency corresponds to the value used to set up dependencies, below
          nPointsSpecified: {
            dependencyType: 'value',
            value: stateValues.nPointsSpecified,
          },
        };

        if (stateValues.betweenLinesName !== null) {
          globalDependencies.lineChildren = {
            dependencyType: 'child',
            parentName: stateValues.betweenLinesName,
            childLogicName: 'atLeastZeroLines',
            variableNames: [
              'points',
              'nDimensions',
              'coeff0',
              'coeffvar1',
              'coeffvar2',
            ],
          };
        }

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');

          if (pointInd === '0' || stateValues.nPointsSpecified > 2) {
            let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

            dependenciesByKey[arrayKey] = {
              through: {
                dependencyType: 'attributeComponent',
                attributeName: 'through',
                variableNames: ['pointX' + varEnding],
              },
            };
          } else if (pointInd === '2' && stateValues.nPointsSpecified === 2) {
            // if have 2 points specified, third point is second specified point

            let varEnding = '2_' + (Number(dim) + 1);

            dependenciesByKey[arrayKey] = {
              through: {
                dependencyType: 'attributeComponent',
                attributeName: 'through',
                variableNames: ['pointX' + varEnding],
              },
            };
          }
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        dependencyValuesByKey,
        globalDependencyValues,
        arrayKeys,
      }) {
        if (globalDependencyValues.lineChildren) {
          if (globalDependencyValues.lineChildren.length !== 2) {
            console.warn(
              `Cannot define an angle between ${globalDependencyValues.lineChildren.length} line(s)`,
            );
          } else {
            let line1 = globalDependencyValues.lineChildren[0];
            let line2 = globalDependencyValues.lineChildren[1];

            let lineIntersection = calculateLineIntersection(line1, line2);

            if (lineIntersection === undefined) {
              let points = {};
              for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 2; j++) {
                  points[i + ',' + j] = me.fromAst('\uff3f');
                }
              }
              return { newValues: { points } };
            }

            let point2 = lineIntersection;

            let a1 = line1.stateValues.points[0][0].evaluate_to_constant();
            let a2 = line1.stateValues.points[0][1].evaluate_to_constant();
            let b1 = line1.stateValues.points[1][0].evaluate_to_constant();
            let b2 = line1.stateValues.points[1][1].evaluate_to_constant();
            let point1 = [
              me.fromAst(point2[0].tree + b1 - a1),
              me.fromAst(point2[1].tree + b2 - a2),
            ];

            a1 = line2.stateValues.points[0][0].evaluate_to_constant();
            a2 = line2.stateValues.points[0][1].evaluate_to_constant();
            b1 = line2.stateValues.points[1][0].evaluate_to_constant();
            b2 = line2.stateValues.points[1][1].evaluate_to_constant();
            let point3 = [
              me.fromAst(point2[0].tree + b1 - a1),
              me.fromAst(point2[1].tree + b2 - a2),
            ];

            return {
              newValues: {
                points: {
                  '0,0': point1[0],
                  '0,1': point1[1],
                  '1,0': point2[0],
                  '1,1': point2[1],
                  '2,0': point3[0],
                  '2,1': point3[1],
                },
              },
            };
          }
        }

        let nPointsSpecified = globalDependencyValues.nPointsSpecified;
        let points = {};
        let essentialPoints = {};

        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');

          if (pointInd === '0' || nPointsSpecified > 2) {
            let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);
            let specifiedPointComponent;
            if (dependencyValuesByKey[arrayKey].through !== null) {
              specifiedPointComponent =
                dependencyValuesByKey[arrayKey].through.stateValues[
                  'pointX' + varEnding
                ];
            }
            if (specifiedPointComponent === undefined) {
              if (
                (pointInd === '0' && dim === '1') ||
                (pointInd === '2' && dim === '0')
              ) {
                essentialPoints[arrayKey] = { defaultValue: me.fromAst(1) };
              } else {
                essentialPoints[arrayKey] = { defaultValue: me.fromAst(0) };
              }
            } else {
              points[arrayKey] = specifiedPointComponent;
            }
          } else if (pointInd === '2' && nPointsSpecified === 2) {
            // if have 2 points specified, third point is second specified point

            let varEnding = '2_' + (Number(dim) + 1);
            let specifiedPointComponent;
            if (dependencyValuesByKey[arrayKey].through !== null) {
              specifiedPointComponent =
                dependencyValuesByKey[arrayKey].through.stateValues[
                  'pointX' + varEnding
                ];
            }
            if (specifiedPointComponent === undefined) {
              if (dim === '0') {
                essentialPoints[arrayKey] = { defaultValue: me.fromAst(1) };
              } else {
                essentialPoints[arrayKey] = { defaultValue: me.fromAst(0) };
              }
            } else {
              points[arrayKey] = specifiedPointComponent;
            }
          } else {
            if (pointInd === '2' && dim === '0') {
              essentialPoints[arrayKey] = { defaultValue: me.fromAst(1) };
            } else {
              essentialPoints[arrayKey] = { defaultValue: me.fromAst(0) };
            }
          }
        }

        let result = {};

        if (Object.keys(points).length > 0) {
          result.newValues = { points };
        }
        if (Object.keys(essentialPoints).length > 0) {
          result.useEssentialOrDefaultValue = { points: essentialPoints };
        }
        return result;
      },
    };

    stateVariableDefinitions.radians = {
      public: true,
      componentType: 'math',
      forRenderer: true,
      returnDependencies: () => ({
        radians: {
          dependencyType: 'attributeComponent',
          attributeName: 'radians',
          variableNames: ['value'],
        },
        degrees: {
          dependencyType: 'attributeComponent',
          attributeName: 'degrees',
          variableNames: ['value'],
        },
        points: {
          dependencyType: 'stateVariable',
          variableName: 'points',
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.radians !== null) {
          return {
            newValues: {
              radians: dependencyValues.radians.stateValues.value.simplify(),
            },
          };
        } else if (dependencyValues.degrees !== null) {
          return {
            newValues: {
              radians: dependencyValues.degrees.stateValues.value
                .multiply(me.fromAst(['/', 'pi', 180]))
                .simplify(),
            },
          };
        }

        let ps = [];
        let foundNull = false;
        for (let i = 0; i < 3; i++) {
          ps.push([
            dependencyValues.points[i][0].evaluate_to_constant(),
            dependencyValues.points[i][1].evaluate_to_constant(),
          ]);
          if (ps[i][0] === null || ps[i][1] === null) {
            foundNull = true;
          }
        }

        let radians;

        if (foundNull) {
          return { newValues: { radians: me.fromAst('\uff3f') } };
        } else {
          radians =
            Math.atan2(ps[2][1] - ps[1][1], ps[2][0] - ps[1][0]) -
            Math.atan2(ps[0][1] - ps[1][1], ps[0][0] - ps[1][0]);
        }

        // make radians be between 0 and 2pi
        if (radians < 0) {
          radians += 2 * Math.PI;
        }

        return { newValues: { radians: me.fromAst(radians) } };
      },
    };

    stateVariableDefinitions.value = {
      isAlias: true,
      targetVariableName: 'radians',
    };

    stateVariableDefinitions.angle = {
      isAlias: true,
      targetVariableName: 'radians',
    };

    stateVariableDefinitions.degrees = {
      public: true,
      componentType: 'math',
      forRenderer: true,
      returnDependencies: () => ({
        radians: {
          dependencyType: 'stateVariable',
          variableName: 'radians',
        },
      }),
      definition({ dependencyValues }) {
        let degrees;

        if (
          dependencyValues.radians.tree === '\uff3f' ||
          Number.isNaN(dependencyValues.radians.tree)
        ) {
          degrees = dependencyValues.radians;
        } else {
          degrees = dependencyValues.radians
            .multiply(me.fromAst(['/', 180, 'pi']))
            .simplify();
        }
        return { newValues: { degrees } };
      },
    };

    stateVariableDefinitions.numericalPoints = {
      isArray: true,
      entryPrefixes: ['numericalPoint'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({
        radians: {
          dependencyType: 'attributeComponent',
          attributeName: 'radians',
          variableNames: ['value'],
        },
        degrees: {
          dependencyType: 'attributeComponent',
          attributeName: 'degrees',
          variableNames: ['value'],
        },
      }),
      returnArraySize({ dependencyValues }) {
        if (
          dependencyValues.radians !== null ||
          dependencyValues.degrees !== null
        ) {
          return [0];
        } else {
          return [3];
        }
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            point: {
              dependencyType: 'stateVariable',
              variableName: 'point' + (Number(arrayKey) + 1),
            },
          };
        }

        return { dependenciesByKey };
      },

      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let numericalPoints = {};
        for (let arrayKey of arrayKeys) {
          let point = dependencyValuesByKey[arrayKey].point;
          let numericalP = [];
          for (let ind = 0; ind < 2; ind++) {
            let val = point[ind].evaluate_to_constant();
            if (!Number.isFinite(val)) {
              val = NaN;
            }
            numericalP.push(val);
          }
          numericalPoints[arrayKey] = numericalP;
        }

        return { newValues: { numericalPoints } };
      },
    };

    stateVariableDefinitions.numericalRadius = {
      forRenderer: true,
      returnDependencies: () => ({
        radius: {
          dependencyType: 'stateVariable',
          variableName: 'radius',
        },
      }),
      definition({ dependencyValues }) {
        let numericalRadius = dependencyValues.radius.evaluate_to_constant();
        if (!Number.isFinite(numericalRadius)) {
          numericalRadius = NaN;
        }
        return { newValues: { numericalRadius } };
      },
    };

    return stateVariableDefinitions;
  }

  static adapters = ['radians'];
}

function calculateLineIntersection(line1, line2) {
  if (
    line1.stateValues.nDimensions !== 2 ||
    line2.stateValues.nDimensions !== 2
  ) {
    console.log('Calculating angle between two lines implemented only in 2D');
    return;
  }

  // only implement for constant coefficients
  let a1 = line1.stateValues.coeffvar1.evaluate_to_constant();
  let b1 = line1.stateValues.coeffvar2.evaluate_to_constant();
  let c1 = line1.stateValues.coeff0.evaluate_to_constant();
  let a2 = line2.stateValues.coeffvar1.evaluate_to_constant();
  let b2 = line2.stateValues.coeffvar2.evaluate_to_constant();
  let c2 = line2.stateValues.coeff0.evaluate_to_constant();

  if (
    !(
      Number.isFinite(a1) &&
      Number.isFinite(b1) &&
      Number.isFinite(c1) &&
      Number.isFinite(a2) &&
      Number.isFinite(b2) &&
      Number.isFinite(c2)
    )
  ) {
    console.log(
      'Calculating angle between two lines implemented only for constant coefficients',
    );
    return;
  }

  let d = a1 * b2 - a2 * b1;

  if (Math.abs(d) < 1e-14) {
    if (Math.abs(c2 * a1 - c1 * a2) > 1e-14) {
      console.log('Cannot calculate angle between two parallel lines');
      return;
    } else if (
      (a1 === 0 && b1 === 0 && c1 === 0) ||
      (a2 === 0 && b2 === 0 && c2 === 0)
    ) {
      // at least one line not defined
      return;
    } else {
      // identical lines, return any point on the line
      if (b1 !== 0) {
        return [me.fromAst(0), me.fromAst(-c1 / b1)];
      } else {
        return [me.fromAst(-c1 / a1), me.fromAst(0)];
      }
    }
  }

  // two intersecting lines, return point
  let x = (c2 * b1 - c1 * b2) / d;
  let y = (c1 * a2 - c2 * a1) / d;
  return [me.fromAst(x), me.fromAst(y)];
}
