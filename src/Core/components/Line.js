import GraphicalComponent from './abstract/GraphicalComponent';
import me from 'math-expressions';
import { returnNVariables, convertValueToMathExpression } from '../utils/math';

export default class Line extends GraphicalComponent {
  static componentType = 'line';

  actions = {
    moveLine: this.moveLine.bind(new Proxy(this, this.readOnlyProxyHandler)),
  };

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['points', 'variables'];
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

    attributes.equation = {
      createComponentOfType: 'math',
    };
    attributes.through = {
      createComponentOfType: '_pointListComponent',
    };
    attributes.variables = {
      createComponentOfType: 'variables',
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
          equation: {
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
      stateVariablesDeterminingDependencies: ['equationIdentity'],
      returnDependencies: function ({ stateValues }) {
        if (stateValues.equationIdentity === null) {
          return {
            through: {
              dependencyType: 'attributeComponent',
              attributeName: 'through',
              variableNames: ['nDimensions'],
            },
          };
        } else {
          return {
            equation: {
              dependencyType: 'attributeComponent',
              attributeName: 'equation',
            },
          };
        }
      },
      definition: function ({ dependencyValues, changes }) {
        // console.log(`definition of nDimensions of ${componentName}`)
        // console.log(dependencyValues)
        // console.log(changes)

        // if have an equation, we must be 2D
        // (Haven't implemented a line in 3D determined by 2 equations)
        if (dependencyValues.equation) {
          if (changes.equation && changes.equation.componentIdentitiesChanged) {
            return {
              newValues: { nDimensions: 2 },
              checkForActualChange: { nDimensions: true },
            };
          } else {
            return { noChanges: ['nDimensions'] };
          }
        } else {
          if (dependencyValues.through) {
            let nDimensions = dependencyValues.through.stateValues.nDimensions;
            return {
              newValues: { nDimensions },
              checkForActualChange: { nDimensions: true },
            };
          } else {
            // line through zero points
            return { newValues: { nDimensions: 2 } };
          }
        }
      },
    };

    stateVariableDefinitions.variables = {
      isArray: true,
      public: true,
      componentType: 'variable',
      entryPrefixes: ['var'],
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey() {
        let globalDependencies = {
          variables: {
            dependencyType: 'attributeComponent',
            attributeName: 'variables',
            variableNames: ['variables'],
          },
        };

        return { globalDependencies };
      },
      arrayDefinitionByKey({ globalDependencyValues, arraySize }) {
        let variablesSpecified = [];
        if (globalDependencyValues.variables !== null) {
          variablesSpecified =
            globalDependencyValues.variables.stateValues.variables;
        }

        return {
          newValues: {
            variables: returnNVariables(arraySize[0], variablesSpecified),
          },
        };
      },
    };

    // we make equation identity be a state variable
    // as we need a state variable to determine other dependencies
    // using stateVariablesDeterminingDependencies
    stateVariableDefinitions.equationIdentity = {
      returnDependencies: () => ({
        equation: {
          dependencyType: 'attributeComponent',
          attributeName: 'equation',
        },
      }),
      definition: function ({ dependencyValues }) {
        // console.log(`definition of equation child for ${componentName}`)
        // console.log(dependencyValues);

        if (dependencyValues.equation !== null) {
          return { newValues: { equationIdentity: dependencyValues.equation } };
        } else {
          return { newValues: { equationIdentity: null } };
        }
      },
    };

    stateVariableDefinitions.points = {
      public: true,
      componentType: 'math',
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['pointX', 'point'],
      returnWrappingComponents(prefix) {
        if (prefix === 'pointX') {
          return [];
        } else {
          // point or entire array
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
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
      stateVariablesDeterminingDependencies: ['equationIdentity'],
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [2, dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ stateValues, arrayKeys }) {
        if (stateValues.equationIdentity === null) {
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
        } else {
          let globalDependencies = {
            coeff0: {
              dependencyType: 'stateVariable',
              variableName: 'coeff0',
            },
            coeffvar1: {
              dependencyType: 'stateVariable',
              variableName: 'coeffvar1',
            },
            coeffvar2: {
              dependencyType: 'stateVariable',
              variableName: 'coeffvar2',
            },
            variables: {
              dependencyType: 'stateVariable',
              variableName: 'variables',
            },
            lastPointsFromInverting: {
              dependencyType: 'stateVariable',
              variableName: 'lastPointsFromInverting',
            },
          };
          return { globalDependencies };
        }
      },

      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
        arraySize,
        componentName,
      }) {
        // console.log(`array definition of points for ${componentName}`)
        // console.log(globalDependencyValues)
        // console.log(dependencyValuesByKey)
        // console.log(arrayKeys)

        if ('coeff0' in globalDependencyValues) {
          let result = calculatePointsFromCoeffs(globalDependencyValues);

          if (!result.success) {
            let points = {};
            for (let ind1 = 0; ind1 < arraySize[0]; ind1++) {
              for (let ind2 = 0; ind2 < arraySize[1]; ind2++) {
                points[ind1 + ',' + ind2] = me.fromAst('\uff3f');
              }
            }
            return { newValues: { points } };
          } else {
            return { newValues: { points: result.points } };
          }
        } else {
          let points = {};
          let essentialPoints = {};

          for (let arrayKey of arrayKeys) {
            let [pointInd, dim] = arrayKey.split(',');
            let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

            if (
              dependencyValuesByKey[arrayKey].through !== null &&
              dependencyValuesByKey[arrayKey].through.stateValues[
                'pointX' + varEnding
              ]
            ) {
              points[arrayKey] =
                dependencyValuesByKey[arrayKey].through.stateValues[
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

          if (Object.keys(points).length > 0) {
            result.newValues = { points };
          }
          if (Object.keys(essentialPoints).length > 0) {
            result.useEssentialOrDefaultValue = { points: essentialPoints };
          }

          // console.log(`result of array definition of key of points`)
          // console.log(result);
          return result;
        }
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        initialChange,
        stateValues,
        workspace,
      }) {
        // console.log(`inverse array definition of points of line`);
        // console.log(desiredStateVariableValues)
        // console.log(JSON.parse(JSON.stringify(stateValues)))
        // console.log(dependencyValuesByKey);
        // console.log(globalDependencyValues);

        // if not draggable, then disallow initial change
        if (initialChange && !stateValues.draggable) {
          return { success: false };
        }

        if ('coeff0' in globalDependencyValues) {
          // dependencies are coeffs

          if (!workspace.desiredPoints) {
            workspace.desiredPoints = {};
          }

          Object.assign(
            workspace.desiredPoints,
            desiredStateVariableValues.points,
          );

          let point1x, point1y, point2x, point2y;
          if (workspace.desiredPoints['0,0']) {
            point1x = workspace.desiredPoints['0,0'];
          } else {
            point1x = stateValues.points[0][0];
          }
          if (workspace.desiredPoints['0,1']) {
            point1y = workspace.desiredPoints['0,1'];
          } else {
            point1y = stateValues.points[0][1];
          }
          if (workspace.desiredPoints['1,0']) {
            point2x = workspace.desiredPoints['1,0'];
          } else {
            point2x = stateValues.points[1][0];
          }
          if (workspace.desiredPoints['1,1']) {
            point2y = workspace.desiredPoints['1,1'];
          } else {
            point2y = stateValues.points[1][1];
          }

          if (
            typeof point1x.tree === 'number' &&
            typeof point1y.tree === 'number' &&
            typeof point2x.tree === 'number' &&
            typeof point2y.tree === 'number'
          ) {
            let numericalPoint1 = [point1x.tree, point1y.tree];
            let numericalPoint2 = [point2x.tree, point2y.tree];

            let coeffvar1 = numericalPoint1[1] - numericalPoint2[1];
            let coeffvar2 = numericalPoint2[0] - numericalPoint1[0];
            let coeff0 =
              numericalPoint1[0] * numericalPoint2[1] -
              numericalPoint1[1] * numericalPoint2[0];

            let prodDiff = Math.abs(
              coeffvar1 * stateValues.coeffvar2 -
                stateValues.coeffvar1 * coeffvar2,
            );

            let instructions = [];

            if (
              prodDiff <
              Math.abs(coeffvar1 * stateValues.coeffvar2) * 1e-12
            ) {
              // the slope didn't change, so line was translated
              // don't change coeffvar1 or coeffvar2, but just coeff0

              if (coeffvar1 !== 0) {
                coeff0 *= stateValues.coeffvar1 / coeffvar1;
              } else {
                coeff0 *= stateValues.coeffvar2 / coeffvar2;
              }

              instructions.push({
                setDependency: 'coeff0',
                desiredValue: coeff0,
                additionalDependencyValues: {
                  coeffvar1: stateValues.coeffvar1,
                  coeffvar2: stateValues.coeffvar2,
                },
              });
            } else {
              instructions.push({
                setDependency: 'coeff0',
                desiredValue: coeff0,
                additionalDependencyValues: {
                  coeffvar1,
                  coeffvar2,
                },
              });
            }

            instructions.push({
              setDependency: 'lastPointsFromInverting',
              desiredValue: [numericalPoint1, numericalPoint2],
            });

            return {
              success: true,
              instructions,
            };
          }

          let coeffvar1 = point1y.subtract(point2y).simplify();
          let coeffvar2 = point2x.subtract(point1x).simplify();
          let coeff0 = point1x
            .multiply(point2y)
            .subtract(point1y.multiply(point2x))
            .simplify();

          return {
            success: true,
            instructions: [
              {
                setDependency: 'coeff0',
                desiredValue: coeff0,
                additionalDependencyValues: {
                  coeffvar1,
                  coeffvar2,
                },
              },
            ],
          };
        } else {
          // no coeff0, so must depend on through points

          let instructions = [];

          // process in reverse order so x-coordinate and first point
          // are processed last and take precedence
          for (let arrayKey of Object.keys(
            desiredStateVariableValues.points,
          ).reverse()) {
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
                desiredValue: desiredStateVariableValues.points[arrayKey],
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setStateVariable: 'points',
                value: {
                  [arrayKey]: convertValueToMathExpression(
                    desiredStateVariableValues.points[arrayKey],
                  ),
                },
              });
            }
          }

          return {
            success: true,
            instructions,
          };
        }
      },
    };

    stateVariableDefinitions.equation = {
      public: true,
      componentType: 'math',
      forRenderer: true,
      stateVariablesDeterminingDependencies: ['equationIdentity'],
      additionalStateVariablesDefined: [
        {
          variableName: 'coeff0',
          public: true,
          componentType: 'math',
        },
        {
          variableName: 'coeffvar1',
          public: true,
          componentType: 'math',
        },
        {
          variableName: 'coeffvar2',
          public: true,
          componentType: 'math',
        },
      ],
      returnDependencies: function ({ stateValues }) {
        let dependencies = {
          variables: {
            dependencyType: 'stateVariable',
            variableName: 'variables',
          },
        };
        if (stateValues.equationIdentity === null) {
          dependencies.points = {
            dependencyType: 'stateVariable',
            variableName: 'points',
          };
          dependencies.nDimensions = {
            dependencyType: 'stateVariable',
            variableName: 'nDimensions',
          };
        } else {
          dependencies.equation = {
            dependencyType: 'attributeComponent',
            attributeName: 'equation',
            variableNames: ['value'],
          };
        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {
        // console.log(`definition of equation for ${componentName}`)
        // console.log(dependencyValues);

        let variables = dependencyValues.variables;

        let blankMath = me.fromAst('\uff3f');

        if (dependencyValues.equation) {
          let equation = dependencyValues.equation.stateValues.value;

          let result = calculateCoeffsFromEquation({ equation, variables });

          if (!result.success) {
            return {
              newValues: {
                equation,
                coeff0: blankMath,
                coeffvar1: blankMath,
                coeffvar2: blankMath,
              },
            };
          }

          let { coeff0, coeffvar1, coeffvar2 } = result;
          return {
            newValues: {
              equation,
              coeff0,
              coeffvar1,
              coeffvar2,
            },
          };
        }

        // have two points
        let nDimens = dependencyValues.nDimensions;

        if (Number.isNaN(nDimens)) {
          console.warn('Line through points of undetermined dimensions');
          return {
            newValues: {
              equation: blankMath,
              coeff0: blankMath,
              coeffvar1: blankMath,
              coeffvar2: blankMath,
            },
          };
        }

        if (nDimens < 2) {
          console.warn(
            'Line must be through points of at least two dimensions',
          );
          return {
            newValues: {
              equation: blankMath,
              coeff0: blankMath,
              coeffvar1: blankMath,
              coeffvar2: blankMath,
            },
          };
        }

        let point1x = dependencyValues.points[0][0];
        let point1y = dependencyValues.points[0][1];
        let point2x = dependencyValues.points[1][0];
        let point2y = dependencyValues.points[1][1];

        let varStrings = [...variables.map((x) => x.toString())];

        for (let i = 0; i < nDimens; i++) {
          if (
            point1x.variables().indexOf(varStrings[i]) !== -1 ||
            point1y.variables().indexOf(varStrings[i]) !== -1 ||
            point2x.variables().indexOf(varStrings[i]) !== -1 ||
            point2y.variables().indexOf(varStrings[i]) !== -1
          ) {
            console.warn(
              'Points through line depend on variables: ' +
                varStrings.join(', '),
            );
            return {
              newValues: {
                equation: blankMath,
                coeff0: blankMath,
                coeffvar1: blankMath,
                coeffvar2: blankMath,
              },
            };
          }
        }

        if (nDimens !== 2) {
          // no equation if not in 2D
          return {
            newValues: {
              equation: blankMath,
              coeff0: blankMath,
              coeffvar1: blankMath,
              coeffvar2: blankMath,
            },
          };
        }

        if (point1x.equals(point2x) && point1y.equals(point2y)) {
          // points are equal, so equation is undefined.  Set all coordinates to 0
          let zero = me.fromAst(0);
          return {
            newValues: {
              equation: blankMath,
              coeff0: zero,
              coeffvar1: zero,
              coeffvar2: zero,
            },
          };
        }

        // TODO: somehow normalize the equation for the line
        // at least for case where coeffs are numbers
        // Maybe detect case where coeffs are numbers so can do these calculation faster?

        let coeffvar1 = point1y.subtract(point2y).simplify();
        let coeffvar2 = point2x.subtract(point1x).simplify();
        let coeff0 = point1x
          .multiply(point2y)
          .subtract(point1y.multiply(point2x))
          .simplify();
        // let equation = me.fromAst('ax+by+c=0').substitute({a:coeffvar1, b:coeffvar2, c: coeff0, x: var1, y:var2}).simplify();
        let equation = me
          .fromAst(['=', ['+', ['*', 'a', 'x'], ['*', 'b', 'y'], 'c'], 0])
          .substitute({
            a: coeffvar1,
            b: coeffvar2,
            c: coeff0,
            x: variables[0],
            y: variables[1],
          })
          .simplify();

        return {
          newValues: {
            equation,
            coeff0,
            coeffvar1,
            coeffvar2,
          },
        };
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
      }) {
        // console.log(`inverse definition of equation, coeffs`);
        // console.log(desiredStateVariableValues)

        if (dependencyValues.points) {
          console.log(
            `Haven't implemented inverse definition of equation of line based on points`,
          );
          return { success: false };
        }

        if (desiredStateVariableValues.equation) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'equation',
                desiredValue: desiredStateVariableValues.equation,
                variableIndex: 0,
              },
            ],
          };
        }

        // if not inverting equation, must be inverting coeffs
        if (
          !(
            'coeff0' in desiredStateVariableValues &&
            'coeffvar1' in desiredStateVariableValues &&
            'coeffvar2' in desiredStateVariableValues
          )
        ) {
          console.log(
            `Haven't implemented inverting coeffs if not specifying all of them`,
          );
          return { success: false };
        }

        let equation = me
          .fromAst(['=', 0, ['+', ['*', 'a', 'x'], ['*', 'b', 'y'], 'c']])
          .substitute({
            a: desiredStateVariableValues.coeffvar1,
            b: desiredStateVariableValues.coeffvar2,
            c: desiredStateVariableValues.coeff0,
            x: dependencyValues.variables[0],
            y: dependencyValues.variables[1],
          })
          .simplify();

        return {
          success: true,
          instructions: [
            {
              setDependency: 'equation',
              desiredValue: equation,
              variableIndex: 0,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.numericalPoints = {
      isArray: true,
      entryPrefixes: ['numericalPoint'],
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
            point: {
              dependencyType: 'stateVariable',
              variableName: 'point' + (Number(arrayKey) + 1),
            },
          };
        }

        return { globalDependencies, dependenciesByKey };
      },

      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
        componentName,
      }) {
        // console.log(`array definition by key of numericalPoints of ${componentName}`)

        // console.log(globalDependencyValues)
        // console.log(dependencyValuesByKey)
        // console.log(arrayKeys);

        if (Number.isNaN(globalDependencyValues.nDimensions)) {
          return {};
        }

        let numericalPoints = {};
        for (let arrayKey of arrayKeys) {
          let point = dependencyValuesByKey[arrayKey].point;
          let numericalP = [];
          for (let ind = 0; ind < globalDependencyValues.nDimensions; ind++) {
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

    stateVariableDefinitions.numericalCoeff0 = {
      additionalStateVariablesDefined: [
        'numericalCoeffvar1',
        'numericalCoeffvar2',
      ],
      returnDependencies: () => ({
        coeff0: {
          dependencyType: 'stateVariable',
          variableName: 'coeff0',
        },
        coeffvar1: {
          dependencyType: 'stateVariable',
          variableName: 'coeffvar1',
        },
        coeffvar2: {
          dependencyType: 'stateVariable',
          variableName: 'coeffvar2',
        },
      }),
      definition: function ({ dependencyValues }) {
        let numericalCoeff0 = dependencyValues.coeff0.evaluate_to_constant();
        if (!Number.isFinite(numericalCoeff0)) {
          numericalCoeff0 = NaN;
        }

        let numericalCoeffvar1 =
          dependencyValues.coeffvar1.evaluate_to_constant();
        if (!Number.isFinite(numericalCoeffvar1)) {
          numericalCoeffvar1 = NaN;
        }

        let numericalCoeffvar2 =
          dependencyValues.coeffvar2.evaluate_to_constant();
        if (!Number.isFinite(numericalCoeffvar2)) {
          numericalCoeffvar2 = NaN;
        }

        return {
          newValues: {
            numericalCoeff0,
            numericalCoeffvar1,
            numericalCoeffvar2,
          },
        };
      },
    };

    stateVariableDefinitions.slope = {
      public: true,
      componentType: 'math',
      returnDependencies: () => ({
        coeffvar1: {
          dependencyType: 'stateVariable',
          variableName: 'coeffvar1',
        },
        coeffvar2: {
          dependencyType: 'stateVariable',
          variableName: 'coeffvar2',
        },
      }),
      definition: function ({ dependencyValues }) {
        let slope = me
          .fromAst(['-', ['/', 'a', 'b']])
          .substitute({
            a: dependencyValues.coeffvar1,
            b: dependencyValues.coeffvar2,
          })
          .simplify();

        return { newValues: { slope } };
      },
    };

    stateVariableDefinitions.xintercept = {
      public: true,
      componentType: 'math',
      returnDependencies: () => ({
        coeff0: {
          dependencyType: 'stateVariable',
          variableName: 'coeff0',
        },
        coeffvar1: {
          dependencyType: 'stateVariable',
          variableName: 'coeffvar1',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          xintercept: me
            .fromAst(['-', ['/', 'a', 'b']])
            .substitute({
              a: dependencyValues.coeff0,
              b: dependencyValues.coeffvar1,
            })
            .simplify(),
        },
      }),
    };

    stateVariableDefinitions.yintercept = {
      public: true,
      componentType: 'math',
      returnDependencies: () => ({
        coeff0: {
          dependencyType: 'stateVariable',
          variableName: 'coeff0',
        },
        coeffvar2: {
          dependencyType: 'stateVariable',
          variableName: 'coeffvar2',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          yintercept: me
            .fromAst(['-', ['/', 'a', 'b']])
            .substitute({
              a: dependencyValues.coeff0,
              b: dependencyValues.coeffvar2,
            })
            .simplify(),
        },
      }),
    };

    stateVariableDefinitions.lastPointsFromInverting = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          lastPointsFromInverting: {
            variableToCheck: 'lastPointsFromInverting',
          },
        },
      }),
      inverseDefinition: ({ desiredStateVariableValues }) => ({
        success: true,
        instructions: [
          {
            setStateVariable: 'lastPointsFromInverting',
            value: desiredStateVariableValues.lastPointsFromInverting,
          },
        ],
      }),
    };

    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
        numericalCoeff0: {
          dependencyType: 'stateVariable',
          variableName: 'numericalCoeff0',
        },
        numericalCoeffvar1: {
          dependencyType: 'stateVariable',
          variableName: 'numericalCoeffvar1',
        },
        numericalCoeffvar2: {
          dependencyType: 'stateVariable',
          variableName: 'numericalCoeffvar2',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          nearestPoint: function (variables) {
            // only implemented in 2D for now
            if (dependencyValues.nDimensions !== 2) {
              return {};
            }

            // only implement for constant coefficients
            let a = dependencyValues.numericalCoeffvar1;
            let b = dependencyValues.numericalCoeffvar2;
            let c = dependencyValues.numericalCoeff0;

            if (
              !(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c))
            ) {
              return {};
            }

            let denom = a * a + b * b;

            if (denom === 0) {
              return {};
            }

            let x1 = variables.x1.evaluate_to_constant();
            let x2 = variables.x2.evaluate_to_constant();

            if (!(Number.isFinite(x1) && Number.isFinite(x2))) {
              return {};
            }

            let result = {};
            result.x1 = (b * (b * x1 - a * x2) - a * c) / denom;
            result.x2 = (a * (-b * x1 + a * x2) - b * c) / denom;

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

  static adapters = ['equation'];

  moveLine({ point1coords, point2coords, transient }) {
    let desiredPoints = {
      '0,0': me.fromAst(point1coords[0]),
      '0,1': me.fromAst(point1coords[1]),
      '1,0': me.fromAst(point2coords[0]),
      '1,1': me.fromAst(point2coords[1]),
    };

    if (transient) {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'points',
            value: desiredPoints,
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
            stateVariable: 'points',
            value: desiredPoints,
          },
        ],
        event: {
          verb: 'interacted',
          object: {
            componentId: this.componentName,
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

function calculateCoeffsFromEquation({ equation, variables }) {
  // determine if equation is a linear equation in the variables

  let var1 = variables[0];
  let var2 = variables[1];
  let var1String = var1.toString();
  let var2String = var2.toString();

  equation = equation.expand().simplify();

  let rhs = me
    .fromAst(['+', equation.tree[2], ['-', equation.tree[1]]])
    .expand()
    .simplify();
  // divide rhs into terms

  let terms = [];
  if (Array.isArray(rhs.tree) && rhs.tree[0] === '+') {
    terms = rhs.tree.slice(1);
  } else {
    terms = [rhs.tree];
  }

  let coeffvar1 = me.fromAst(0);
  let coeffvar2 = me.fromAst(0);
  let coeff0 = me.fromAst(0);

  for (let term of terms) {
    let coeffs = getTermCoeffs(term);
    if (!coeffs.success) {
      return { success: false };
    }
    coeffvar1 = coeffvar1.add(coeffs.coeffvar1);
    coeffvar2 = coeffvar2.add(coeffs.coeffvar2);
    coeff0 = coeff0.add(coeffs.coeff0);
  }
  coeffvar1 = coeffvar1.simplify();
  coeffvar2 = coeffvar2.simplify();
  coeff0 = coeff0.simplify();

  return { success: true, coeff0, coeffvar1, coeffvar2 };

  function getTermCoeffs(term) {
    let cv1 = 0,
      cv2 = 0,
      c0 = 0;

    if (typeof term === 'string') {
      if (term === var1String) {
        cv1 = 1;
      } else if (term === var2String) {
        cv2 = 1;
      } else {
        c0 = term;
      }
    } else if (typeof term === 'number') {
      c0 = term;
    } else if (!Array.isArray(term)) {
      console.warn(
        'Invalid format for equation of line in variables ' +
          var1 +
          ' and ' +
          var2,
      );
      return { success: false };
    } else {
      let operator = term[0];
      let operands = term.slice(1);
      if (operator === '-') {
        let coeffs = getTermCoeffs(operands[0]);
        if (!coeffs.success) {
          return { success: false };
        }
        cv1 = ['-', coeffs.coeffvar1.tree];
        cv2 = ['-', coeffs.coeffvar2.tree];
        c0 = ['-', coeffs.coeff0.tree];
      } else if (operator === '+') {
        console.warn(
          'Invalid format for equation of line in variables ' +
            var1 +
            ' and ' +
            var2,
        );
        return { success: false };
      } else if (operator === '*') {
        let var1ind = -1,
          var2ind = -1;
        for (let i = 0; i < operands.length; i++) {
          if (var1.equals(me.fromAst(operands[i]))) {
            var1ind = i;
            break;
          } else if (var2.equals(me.fromAst(operands[i]))) {
            var2ind = i;
            break;
          }
        }
        if (var1ind !== -1) {
          operands.splice(var1ind, 1);
          if (operands.length === 1) {
            cv1 = operands[0];
          } else {
            cv1 = ['*'].concat(operands);
          }
        } else if (var2ind !== -1) {
          operands.splice(var2ind, 1);
          if (operands.length === 1) {
            cv2 = operands[0];
          } else {
            cv2 = ['*'].concat(operands);
          }
        } else {
          c0 = term;
        }
      } else if (operator === '/') {
        let coeffs = getTermCoeffs(operands[0]);
        if (!coeffs.success) {
          return { success: false };
        }
        cv1 = ['/', coeffs.coeffvar1.tree, operands[1]];
        cv2 = ['/', coeffs.coeffvar2.tree, operands[1]];
        c0 = ['/', coeffs.coeff0.tree, operands[1]];
      } else if (operator === '_') {
        if (var1.equals(me.fromAst(term))) {
          cv1 = 1;
        } else if (var2.equals(me.fromAst(term))) {
          cv2 = 1;
        } else {
          c0 = term;
        }
      } else {
        c0 = term;
      }
    }
    return {
      success: true,
      coeffvar1: me.fromAst(cv1),
      coeffvar2: me.fromAst(cv2),
      coeff0: me.fromAst(c0),
    };
  }
}

function calculatePointsFromCoeffs({
  coeff0,
  coeffvar1,
  coeffvar2,
  variables,
  lastPointsFromInverting,
}) {
  let var1 = variables[0];
  let var2 = variables[1];
  let var1String = var1.toString();
  let var2String = var2.toString();

  // if any of the coefficients have var1 or var2 in them, then it's not a line
  if (
    coeffvar1.variables(true).indexOf(var1String) !== -1 ||
    coeffvar1.variables(true).indexOf(var2String) !== -1 ||
    coeffvar2.variables(true).indexOf(var1String) !== -1 ||
    coeffvar2.variables(true).indexOf(var2String) !== -1 ||
    coeff0.variables(true).indexOf(var1String) !== -1 ||
    coeff0.variables(true).indexOf(var2String) !== -1
  ) {
    console.warn(
      'Invalid format for equation of line in variables ' +
        var1String +
        ' and ' +
        var2String,
    );
    return { success: false };
  }
  let zero = me.fromAst(0);
  if (coeffvar1.equals(zero) && coeffvar2.equals(zero)) {
    console.warn(
      'Invalid format for equation of line in variables ' +
        var1String +
        ' and ' +
        var2String,
    );
    return { success: false };
  }

  // console.log("coefficient of " + var1 + " is " + coeffvar1);
  // console.log("coefficient of " + var2 + " is " + coeffvar2);
  // console.log("constant coefficient is " + coeff0);

  let a = coeffvar1.evaluate_to_constant();
  let b = coeffvar2.evaluate_to_constant();
  let c = coeff0.evaluate_to_constant();

  let point1x, point1y, point2x, point2y;
  let points = {};

  if (Number.isFinite(c) && Number.isFinite(a) && Number.isFinite(b)) {
    let denom = a * a + b * b;
    if (denom === 0) {
      return { success: false };
    }

    if (lastPointsFromInverting) {
      let x1 = lastPointsFromInverting[0][0];
      let x2 = lastPointsFromInverting[0][1];
      point1x = (b * (b * x1 - a * x2) - a * c) / denom;
      point1y = (a * (-b * x1 + a * x2) - b * c) / denom;

      x1 = lastPointsFromInverting[1][0];
      x2 = lastPointsFromInverting[1][1];
      point2x = (b * (b * x1 - a * x2) - a * c) / denom;
      point2y = (a * (-b * x1 + a * x2) - b * c) / denom;
    } else {
      // create two points that equation passes through
      point1x = (2 * b - a * c) / denom;
      point1y = (-2 * a - b * c) / denom;
      point2x = (b - a * c) / denom;
      point2y = -(a + b * c) / denom;
    }

    points['0,0'] = me.fromAst(point1x);
    points['0,1'] = me.fromAst(point1y);
    points['1,0'] = me.fromAst(point2x);
    points['1,1'] = me.fromAst(point2y);
  } else {
    // create two points that equation passes through
    let denom = coeffvar1.pow(2).add(coeffvar2.pow(2));
    point1x = coeffvar2
      .multiply(2)
      .subtract(coeffvar1.multiply(coeff0))
      .divide(denom);
    point1y = coeffvar1
      .multiply(-2)
      .subtract(coeffvar2.multiply(coeff0))
      .divide(denom);
    point2x = coeffvar2.subtract(coeffvar1.multiply(coeff0)).divide(denom);
    point2y = coeffvar1
      .add(coeffvar2.multiply(coeff0))
      .multiply(-1)
      .divide(denom);

    points['0,0'] = point1x;
    points['0,1'] = point1y;
    points['1,0'] = point2x;
    points['1,1'] = point2y;
  }

  return { success: true, points };
}
