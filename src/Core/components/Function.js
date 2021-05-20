import InlineComponent from './abstract/InlineComponent';
import me from 'math-expressions';
import { normalizeMathExpression } from '../utils/math';
import { returnDefaultStyleDefinitions } from '../utils/style';

export default class Function extends InlineComponent {
  static componentType = 'function';
  static rendererType = 'math';

  static get stateVariablesShadowedForReference() {
    return [
      'variable',
      'numericalf',
      'symbolicf',
      'symbolic',
      'isInterpolatedFunction',
      'formula',
      'prescribedPoints',
      'prescribedMinima',
      'prescribedMaxima',
      'prescribedExtrema',
    ];
  }

  static primaryStateVariableForDefinition = 'numericalfShadow';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.simplify = {
      createComponentOfType: 'text',
      createStateVariable: 'simplify',
      defaultValue: 'none',
      public: true,
      toLowerCase: true,
      valueTransformations: { true: 'full' },
      validValues: ['none', 'full', 'numbers', 'numberspreserveorder'],
    };
    attributes.expand = {
      createComponentOfType: 'boolean',
      createStateVariable: 'expand',
      defaultValue: false,
      public: true,
    };
    attributes.xscale = {
      createComponentOfType: 'number',
      createStateVariable: 'xscale',
      defaultValue: 1,
      public: true,
      propagateToDescendants: true,
    };
    attributes.yscale = {
      createComponentOfType: 'number',
      createStateVariable: 'yscale',
      defaultValue: 1,
      public: true,
      propagateToDescendants: true,
    };

    // include attributes of graphical components
    // for case when function is adapted into a curve

    attributes.label = {
      createComponentOfType: 'text',
      createStateVariable: 'label',
      defaultValue: '',
      public: true,
      forRenderer: true,
    };
    attributes.showLabel = {
      createComponentOfType: 'boolean',
      createStateVariable: 'showLabel',
      defaultValue: true,
      public: true,
      forRenderer: true,
    };
    attributes.layer = {
      createComponentOfType: 'number',
      createStateVariable: 'layer',
      defaultValue: 0,
      public: true,
      forRenderer: true,
    };

    attributes.formula = {
      createComponentOfType: 'math',
    };

    attributes.minima = {
      createComponentOfType: 'extrema',
    };
    attributes.maxima = {
      createComponentOfType: 'extrema',
    };
    attributes.extrema = {
      createComponentOfType: 'extrema',
    };
    attributes.through = {
      createComponentOfType: '_pointListComponent',
    };
    attributes.throughSlopes = {
      createComponentOfType: 'mathList',
    };
    attributes.variable = {
      createComponentOfType: 'variable',
    };
    attributes.symbolic = {
      createComponentOfType: 'boolean',
    };

    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    sugarInstructions.push({
      childrenRegex: /s/,
      replacementFunction: ({ matchedChildren }) => ({
        success: true,
        newAttributes: {
          formula: {
            componentType: 'math',
            children: matchedChildren,
          },
        },
      }),
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atMostOneFunction',
      componentType: 'function',
      comparison: 'atMost',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions({ numerics }) {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.selectedStyle = {
      forRenderer: true,
      returnDependencies: () => ({
        styleNumber: {
          dependencyType: 'stateVariable',
          variableName: 'styleNumber',
        },
        ancestorWithStyle: {
          dependencyType: 'ancestor',
          variableNames: ['styleDefinitions'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let styleDefinitions =
          dependencyValues.ancestorWithStyle.stateValues.styleDefinitions;
        if (!styleDefinitions) {
          styleDefinitions = returnDefaultStyleDefinitions();
        }

        let selectedStyle;

        for (let styleDefinition of styleDefinitions) {
          if (dependencyValues.styleNumber === styleDefinition.styleNumber) {
            if (selectedStyle === undefined) {
              selectedStyle = styleDefinition;
            } else {
              // attributes from earlier matches take precedence
              selectedStyle = Object.assign(
                Object.assign({}, styleDefinition),
                selectedStyle,
              );
            }
          }
        }

        if (selectedStyle === undefined) {
          selectedStyle = styleDefinitions[0];
        }
        return { newValues: { selectedStyle } };
      },
    };

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

    stateVariableDefinitions.numericalfShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          numericalfShadow: {},
        },
      }),
    };

    stateVariableDefinitions.symbolicfShadow = {
      defaultValue: null,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          symbolicfShadow: {},
        },
      }),
    };

    stateVariableDefinitions.symbolic = {
      public: true,
      componentType: 'boolean',
      defaultValue: false,
      returnDependencies: () => ({
        symbolicAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'symbolic',
          variableNames: ['value'],
        },
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunction',
          variableNames: ['symbolic'],
        },
        numericalfShadow: {
          dependencyType: 'stateVariable',
          variableName: 'numericalfShadow',
        },
        symbolicfShadow: {
          dependencyType: 'stateVariable',
          variableName: 'symbolicfShadow',
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.symbolicAttr !== null) {
          return {
            newValues: {
              symbolic: dependencyValues.symbolicAttr.stateValues.value,
            },
          };
        } else if (dependencyValues.functionChild.length === 1) {
          return {
            newValues: {
              symbolic: dependencyValues.functionChild[0].stateValues.symbolic,
            },
          };
        } else if (dependencyValues.numericalfShadow) {
          return { newValues: { symbolic: false } };
        } else if (dependencyValues.symbolicfShadow) {
          return { newValues: { symbolic: true } };
        } else {
          return {
            useEssentialOrDefaultValue: {
              symbolic: { variablesToCheck: ['symbolic'] },
            },
          };
        }
      },
    };

    stateVariableDefinitions.isInterpolatedFunction = {
      returnDependencies: () => ({
        through: {
          dependencyType: 'attributeComponent',
          attributeName: 'through',
        },
        minima: {
          dependencyType: 'attributeComponent',
          attributeName: 'minima',
        },
        maxima: {
          dependencyType: 'attributeComponent',
          attributeName: 'maxima',
        },
        extrema: {
          dependencyType: 'attributeComponent',
          attributeName: 'extrema',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            isInterpolatedFunction:
              dependencyValues.through ||
              dependencyValues.minima ||
              dependencyValues.maxima ||
              dependencyValues.extrema,
          },
        };
      },
    };

    stateVariableDefinitions.variable = {
      public: true,
      componentType: 'variable',
      defaultValue: me.fromAst('x'),
      returnDependencies: () => ({
        variableAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'variable',
          variableNames: ['value'],
        },
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunction',
          variableNames: ['variable'],
        },
        parentVariableForChild: {
          dependencyType: 'parentStateVariable',
          variableName: 'variableForChild',
        },
        isInterpolatedFunction: {
          dependencyType: 'stateVariable',
          variableName: 'isInterpolatedFunction',
        },
      }),
      definition: function ({ dependencyValues, usedDefault }) {
        if (dependencyValues.isInterpolatedFunction) {
          return { newValues: { variable: me.fromAst('\uff3f') } };
        } else if (dependencyValues.functionChild.length === 1) {
          if (dependencyValues.variableAttr !== null) {
            console.warn(
              'Variable for function is ignored when it has a function child',
            );
          }
          return {
            newValues: {
              variable: dependencyValues.functionChild[0].stateValues.variable,
            },
          };
        } else if (dependencyValues.variableAttr !== null) {
          return {
            newValues: {
              variable: dependencyValues.variableAttr.stateValues.value,
            },
          };
        } else if (
          dependencyValues.parentVariableForChild &&
          !usedDefault.parentVariableForChild
        ) {
          return {
            newValues: { variable: dependencyValues.parentVariableForChild },
          };
        } else {
          return {
            useEssentialOrDefaultValue: {
              variable: { variablesToCheck: ['variable'] },
            },
          };
        }
      },
    };

    stateVariableDefinitions.formula = {
      public: true,
      componentType: 'formula',
      defaultValue: me.fromAst(0),
      returnDependencies: () => ({
        formulaAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'formula',
          variableNames: ['value'],
        },
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunction',
          variableNames: ['formula'],
        },
        isInterpolatedFunction: {
          dependencyType: 'stateVariable',
          variableName: 'isInterpolatedFunction',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.isInterpolatedFunction) {
          return { newValues: { formula: me.fromAst('\uff3f') } };
        } else if (dependencyValues.formulaAttr !== null) {
          return {
            newValues: {
              formula: dependencyValues.formulaAttr.stateValues.value,
            },
          };
        } else if (dependencyValues.functionChild.length === 1) {
          return {
            newValues: {
              formula: dependencyValues.functionChild[0].stateValues.formula,
            },
          };
        } else {
          return {
            useEssentialOrDefaultValue: {
              formula: { variablesToCheck: ['formula'] },
            },
          };
        }
      },
    };

    // variables for interpolated function

    stateVariableDefinitions.nPrescribedPoints = {
      returnDependencies: () => ({
        through: {
          dependencyType: 'attributeComponent',
          attributeName: 'through',
          variableNames: ['nPoints'],
        },
      }),
      definition({ dependencyValues }) {
        let nPrescribedPoints = 0;
        if (dependencyValues.through !== null) {
          nPrescribedPoints = dependencyValues.through.stateValues.nPoints;
        }
        return {
          newValues: { nPrescribedPoints },
        };
      },
    };

    stateVariableDefinitions.prescribedPoints = {
      isArray: true,
      entryPrefixes: ['prescribedPoint'],
      returnArraySizeDependencies: () => ({
        nPrescribedPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nPrescribedPoints',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nPrescribedPoints];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let pointNum = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            through: {
              dependencyType: 'attributeComponent',
              attributeName: 'through',
              variableNames: ['point' + pointNum],
            },
            throughSlopes: {
              dependencyType: 'attributeComponent',
              attributeName: 'throughSlopes',
              variableNames: ['math' + pointNum],
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log('array definition of prescribed points')
        // console.log(dependencyValuesByKey);
        // console.log(arrayKeys)

        let prescribedPoints = {};

        for (let arrayKey of arrayKeys) {
          let through = dependencyValuesByKey[arrayKey].through;
          if (through !== null) {
            let pointNum = Number(arrayKey) + 1;
            let point = through.stateValues['point' + pointNum];
            let slope = null;

            let throughSlopes = dependencyValuesByKey[arrayKey].throughSlopes;
            if (throughSlopes !== null) {
              slope = throughSlopes.stateValues['math' + pointNum];
              if (slope === undefined) {
                slope = null;
              }
            }

            prescribedPoints[arrayKey] = {
              x: point[0],
              y: point[1],
              slope,
            };
          }
        }
        return { newValues: { prescribedPoints } };
      },
    };

    stateVariableDefinitions.prescribedMinima = {
      returnDependencies: () => ({
        minima: {
          dependencyType: 'attributeComponent',
          attributeName: 'minima',
          variableNames: ['extrema'],
        },
      }),
      definition({ dependencyValues }) {
        let prescribedMinima = [];
        if (dependencyValues.minima !== null) {
          prescribedMinima = dependencyValues.minima.stateValues.extrema.map(
            (v) => ({
              x: v[0],
              y: v[1],
            }),
          );
        }
        return {
          newValues: { prescribedMinima },
        };
      },
    };

    stateVariableDefinitions.prescribedMaxima = {
      returnDependencies: () => ({
        maxima: {
          dependencyType: 'attributeComponent',
          attributeName: 'maxima',
          variableNames: ['extrema'],
        },
      }),
      definition({ dependencyValues }) {
        let prescribedMaxima = [];
        if (dependencyValues.maxima !== null) {
          prescribedMaxima = dependencyValues.maxima.stateValues.extrema.map(
            (v) => ({
              x: v[0],
              y: v[1],
            }),
          );
        }
        return {
          newValues: { prescribedMaxima },
        };
      },
    };

    stateVariableDefinitions.prescribedExtrema = {
      returnDependencies: () => ({
        extrema: {
          dependencyType: 'attributeComponent',
          attributeName: 'extrema',
          variableNames: ['extrema'],
        },
      }),
      definition({ dependencyValues }) {
        let prescribedExtrema = [];
        if (dependencyValues.extrema !== null) {
          prescribedExtrema = dependencyValues.extrema.stateValues.extrema.map(
            (v) => ({
              x: v[0],
              y: v[1],
            }),
          );
        }
        return {
          newValues: { prescribedExtrema },
        };
      },
    };

    stateVariableDefinitions.interpolationPoints = {
      returnDependencies: () => ({
        xscale: {
          dependencyType: 'stateVariable',
          variableName: 'xscale',
        },
        yscale: {
          dependencyType: 'stateVariable',
          variableName: 'yscale',
        },
        prescribedPoints: {
          dependencyType: 'stateVariable',
          variableName: 'prescribedPoints',
        },
        prescribedMinima: {
          dependencyType: 'stateVariable',
          variableName: 'prescribedMinima',
        },
        prescribedMaxima: {
          dependencyType: 'stateVariable',
          variableName: 'prescribedMaxima',
        },
        prescribedExtrema: {
          dependencyType: 'stateVariable',
          variableName: 'prescribedExtrema',
        },
      }),
      definition: ({ dependencyValues }) =>
        calculateInterpolationPoints({ dependencyValues, numerics }),
    };

    stateVariableDefinitions.xs = {
      additionalStateVariablesDefined: ['coeffs'],
      returnDependencies: () => ({
        interpolationPoints: {
          dependencyType: 'stateVariable',
          variableName: 'interpolationPoints',
        },
      }),
      definition: computeSplineParamCoeffs,
    };

    stateVariableDefinitions.symbolicf = {
      stateVariablesDeterminingDependencies: ['isInterpolatedFunction'],
      returnDependencies({ stateValues }) {
        if (stateValues.isInterpolatedFunction) {
          return {
            xs: {
              dependencyType: 'stateVariable',
              variableName: 'xs',
            },
            coeffs: {
              dependencyType: 'stateVariable',
              variableName: 'coeffs',
            },
            interpolationPoints: {
              dependencyType: 'stateVariable',
              variableName: 'interpolationPoints',
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        } else {
          return {
            formula: {
              dependencyType: 'stateVariable',
              variableName: 'formula',
            },
            variable: {
              dependencyType: 'stateVariable',
              variableName: 'variable',
            },
            functionChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneFunction',
              variableNames: ['symbolicf'],
            },
            simplify: {
              dependencyType: 'stateVariable',
              variableName: 'simplify',
            },
            expand: {
              dependencyType: 'stateVariable',
              variableName: 'expand',
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
            symbolicfShadow: {
              dependencyType: 'stateVariable',
              variableName: 'symbolicfShadow',
            },
            numericalfShadow: {
              dependencyType: 'stateVariable',
              variableName: 'numericalfShadow',
            },
          };
        }
      },
      definition: function ({ dependencyValues, usedDefault }) {
        if (dependencyValues.isInterpolatedFunction) {
          let numericalf = returnInterpolatedFunction(dependencyValues);
          return {
            newValues: {
              symbolicf: function (x) {
                me.fromAst(numericalf(x.evaluate_to_constant()));
              },
            },
          };
        } else if (dependencyValues.functionChild.length === 1) {
          return {
            newValues: {
              symbolicf:
                dependencyValues.functionChild[0].stateValues.symbolicf,
            },
          };
        } else if (!usedDefault.formula) {
          return {
            newValues: {
              symbolicf: returnSymbolicFunctionFromFormula(dependencyValues),
            },
          };
        } else if (dependencyValues.symbolicfShadow) {
          return {
            newValues: { symbolicf: dependencyValues.symbolicfShadow },
          };
        } else if (dependencyValues.numericalfShadow) {
          return {
            newValues: {
              symbolicf: function (x) {
                let input = x.evaluate_to_constant();
                if (input === null) {
                  return NaN;
                }
                return me.fromAst(dependencyValues.numericalfShadow(input));
              },
            },
          };
        } else {
          return {
            newValues: {
              symbolicf: returnSymbolicFunctionFromFormula(dependencyValues),
            },
          };
        }
      },
    };

    stateVariableDefinitions.numericalf = {
      stateVariablesDeterminingDependencies: ['isInterpolatedFunction'],
      returnDependencies({ stateValues }) {
        if (stateValues.isInterpolatedFunction) {
          return {
            xs: {
              dependencyType: 'stateVariable',
              variableName: 'xs',
            },
            coeffs: {
              dependencyType: 'stateVariable',
              variableName: 'coeffs',
            },
            interpolationPoints: {
              dependencyType: 'stateVariable',
              variableName: 'interpolationPoints',
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        } else {
          return {
            formula: {
              dependencyType: 'stateVariable',
              variableName: 'formula',
            },
            variable: {
              dependencyType: 'stateVariable',
              variableName: 'variable',
            },
            functionChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneFunction',
              variableNames: ['numericalf'],
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
            symbolicfShadow: {
              dependencyType: 'stateVariable',
              variableName: 'symbolicfShadow',
            },
            numericalfShadow: {
              dependencyType: 'stateVariable',
              variableName: 'numericalfShadow',
            },
          };
        }
      },
      definition: function ({ dependencyValues, usedDefault }) {
        if (dependencyValues.isInterpolatedFunction) {
          return {
            newValues: {
              numericalf: returnInterpolatedFunction(dependencyValues),
            },
          };
        } else if (dependencyValues.functionChild.length === 1) {
          return {
            newValues: {
              numericalf:
                dependencyValues.functionChild[0].stateValues.numericalf,
            },
          };
        } else if (!usedDefault.formula) {
          return {
            newValues: {
              numericalf: returnNumericalFunctionFromFormula(dependencyValues),
            },
          };
        } else if (dependencyValues.numericalfShadow) {
          return {
            newValues: { numericalf: dependencyValues.numericalfShadow },
          };
        } else if (dependencyValues.symbolicfShadow) {
          return {
            newValues: {
              numericalf: function (x) {
                let val = dependencyValues
                  .symbolicfShadow(me.fromAst(x))
                  .evaluate_to_constant();
                if (val === null) {
                  val = NaN;
                }
                return val;
              },
            },
          };
        } else {
          return {
            newValues: {
              numericalf: returnNumericalFunctionFromFormula(dependencyValues),
            },
          };
        }
      },
    };

    stateVariableDefinitions.f = {
      returnDependencies: () => ({
        symbolic: {
          dependencyType: 'stateVariable',
          variableName: 'symbolic',
        },
        symbolicf: {
          dependencyType: 'stateVariable',
          variableName: 'symbolicf',
        },
        numericalf: {
          dependencyType: 'stateVariable',
          variableName: 'numericalf',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.symbolic) {
          return {
            newValues: {
              f: dependencyValues.symbolicf,
            },
          };
        } else {
          return {
            newValues: {
              f: dependencyValues.numericalf,
            },
          };
        }
      },
    };

    stateVariableDefinitions.latex = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        formula: {
          dependencyType: 'stateVariable',
          variableName: 'formula',
        },
      }),
      definition: function ({ dependencyValues }) {
        return { newValues: { latex: dependencyValues.formula.toLatex() } };
      },
    };

    stateVariableDefinitions.latexWithInputChildren = {
      forRenderer: true,
      returnDependencies: () => ({
        latex: {
          dependencyType: 'stateVariable',
          variableName: 'latex',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { latexWithInputChildren: [dependencyValues.latex] },
        };
      },
    };

    stateVariableDefinitions.allMinima = {
      stateVariablesDeterminingDependencies: ['isInterpolatedFunction'],
      returnDependencies({ stateValues }) {
        if (stateValues.isInterpolatedFunction) {
          return {
            xs: {
              dependencyType: 'stateVariable',
              variableName: 'xs',
            },
            coeffs: {
              dependencyType: 'stateVariable',
              variableName: 'coeffs',
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        } else {
          return {
            numericalf: {
              dependencyType: 'stateVariable',
              variableName: 'numericalf',
            },
            xscale: {
              dependencyType: 'stateVariable',
              variableName: 'xscale',
            },
            functionChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneFunction',
              variableNames: ['allMinima'],
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        }
      },
      definition: function ({ dependencyValues, componentName }) {
        if (dependencyValues.isInterpolatedFunction) {
          let xs = dependencyValues.xs;
          let coeffs = dependencyValues.coeffs;
          let eps = numerics.eps;

          let minimaList = [];

          if (xs === null) {
            return { newValues: { allMinima: minimaList } };
          }

          let minimumAtPreviousRight = false;

          // since extrapolate for x < xs[0], formula based on coeffs[0]
          // is valid for x < xs[1]
          let c = coeffs[0];
          let dx = xs[1] - xs[0];

          if (c[3] === 0) {
            // have quadratic.  Minimum only if c[2] > 0
            if (c[2] > 0) {
              let x = -c[1] / (2 * c[2]);
              if (x <= dx - eps) {
                minimaList.push([
                  x + xs[0],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              } else if (Math.abs(x - dx) < eps) {
                minimumAtPreviousRight = true;
              }
            }
          } else {
            // since c[3] != 0, have cubic

            let discrim = 4 * c[2] * c[2] - 12 * c[3] * c[1];
            if (discrim > 0) {
              let sqrtdiscrim = Math.sqrt(discrim);

              // critical point where choose +sqrtdiscrim is minimum
              let x = (-2 * c[2] + sqrtdiscrim) / (6 * c[3]);
              if (x <= dx - eps) {
                minimaList.push([
                  x + xs[0],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              } else if (Math.abs(x - dx) < eps) {
                minimumAtPreviousRight = true;
              }
            }
          }

          for (let i = 1; i < xs.length - 2; i++) {
            c = coeffs[i];
            dx = xs[i + 1] - xs[i];

            if (c[3] === 0) {
              // have quadratic.  Minimum only if c[2] > 0
              if (c[2] > 0) {
                let x = -c[1] / (2 * c[2]);
                if (Math.abs(x) < eps) {
                  if (minimumAtPreviousRight) {
                    minimaList.push([
                      x + xs[i],
                      ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                    ]);
                  }
                } else if (x >= eps && x <= dx - eps) {
                  minimaList.push([
                    x + xs[i],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
                minimumAtPreviousRight = Math.abs(x - dx) < eps;
              } else {
                minimumAtPreviousRight = false;
              }
            } else {
              // since c[3] != 0, have cubic

              let discrim = 4 * c[2] * c[2] - 12 * c[3] * c[1];
              if (discrim > 0) {
                let sqrtdiscrim = Math.sqrt(discrim);

                // critical point where choose +sqrtdiscrim is minimum
                let x = (-2 * c[2] + sqrtdiscrim) / (6 * c[3]);
                if (Math.abs(x) < eps) {
                  if (minimumAtPreviousRight) {
                    minimaList.push([
                      x + xs[i],
                      ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                    ]);
                  }
                } else if (x >= eps && x <= dx - eps) {
                  minimaList.push([
                    x + xs[i],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
                minimumAtPreviousRight = Math.abs(x - dx) < eps;
              } else {
                minimumAtPreviousRight = false;
              }
            }
          }

          // since extrapolate for x > xs[n-1], formula based on coeffs[n-2]
          // is valid for x > xs[n-2]
          c = coeffs[xs.length - 2];
          if (c[3] === 0) {
            // have quadratic.  Minimum only if c[2] > 0
            if (c[2] > 0) {
              let x = -c[1] / (2 * c[2]);
              if (Math.abs(x) < eps) {
                if (minimumAtPreviousRight) {
                  minimaList.push([
                    x + xs[xs.length - 2],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
              } else if (x >= eps) {
                minimaList.push([
                  x + xs[xs.length - 2],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              }
            }
          } else {
            // since c[3] != 0, have cubic

            let discrim = 4 * c[2] * c[2] - 12 * c[3] * c[1];
            if (discrim > 0) {
              let sqrtdiscrim = Math.sqrt(discrim);

              // critical point where choose +sqrtdiscrim is minimum
              let x = (-2 * c[2] + sqrtdiscrim) / (6 * c[3]);
              if (x >= eps) {
                minimaList.push([
                  x + xs[xs.length - 2],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              } else if (Math.abs(x) < eps) {
                if (minimumAtPreviousRight) {
                  minimaList.push([
                    x + xs[xs.length - 2],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
              }
            }
          }

          return { newValues: { allMinima: minimaList } };
        } else {
          // check for presence of functionChild
          // as derived classes may have changed the dependencies
          // to eliminate functionChildDependency
          if (
            dependencyValues.functionChild &&
            dependencyValues.functionChild.length === 1
          ) {
            return {
              newValues: {
                allMinima:
                  dependencyValues.functionChild[0].stateValues.allMinima,
              },
            };
          }

          // no function child

          let f = dependencyValues.numericalf;

          // for now, look for minima in interval -100*xscale to 100*xscale
          // dividing interval into 1000 subintervals
          let minx = -100 * dependencyValues.xscale;
          let maxx = 100 * dependencyValues.xscale;
          let nIntervals = 1000;
          let dx = (maxx - minx) / nIntervals;

          let minimaList = [];
          let minimumAtPreviousRight = false;
          let fright = f(minx);
          for (let i = 0; i < nIntervals; i++) {
            let xleft = minx + i * dx;
            let xright = minx + (i + 1) * dx;
            let fleft = fright;
            fright = f(xright);

            if (Number.isNaN(fleft) || Number.isNaN(fright)) {
              continue;
            }

            let result = numerics.fminbr(f, [xleft, xright]);
            if (result.success !== true) {
              continue;
            }
            let x = result.x;
            let fx = result.fx;

            if (fleft < fx) {
              if (minimumAtPreviousRight) {
                if (Number.isFinite(fleft)) {
                  minimaList.push([xleft, fleft]);
                }
              }
              minimumAtPreviousRight = false;
            } else if (fright < fx) {
              minimumAtPreviousRight = true;
            } else {
              minimumAtPreviousRight = false;

              // make sure it actually looks like a strict minimum of f(x)
              if (
                fx < fright &&
                fx < fleft &&
                fx < f(x + result.tol) &&
                fx < f(x - result.tol) &&
                Number.isFinite(fx)
              ) {
                minimaList.push([x, fx]);
              }
            }
          }

          return { newValues: { allMinima: minimaList } };
        }
      },
    };

    stateVariableDefinitions.numberMinima = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        allMinima: {
          dependencyType: 'stateVariable',
          variableName: 'allMinima',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: { numberMinima: dependencyValues.allMinima.length },
          checkForActualChange: { numberMinima: true },
        };
      },
    };

    stateVariableDefinitions.minima = {
      stateVariablesDeterminingDependencies: ['isInterpolatedFunction'],
      public: true,
      componentType: 'number',
      isArray: true,
      nDimensions: 2,
      entryPrefixes: [
        'minimum',
        'minimumLocations',
        'minimumLocation',
        'minimumValues',
        'minimumValue',
      ],
      returnWrappingComponents(prefix) {
        if (prefix === 'minimum' || prefix === undefined) {
          // minimum or entire array
          // These are points,
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        } else {
          // don't wrap minimumLocation(s) or minimumValues(s)
          return [];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (
          ['minimum', 'minimumLocation', 'minimumValue'].includes(
            arrayEntryPrefix,
          )
        ) {
          let pointInd = Number(varEnding) - 1;
          if (Number.isInteger(pointInd) && pointInd >= 0) {
            // if don't know array size, just guess that the entry is OK
            // It will get corrected once array size is known.
            // TODO: better to return empty array?
            if (!arraySize || pointInd < arraySize[0]) {
              if (arrayEntryPrefix === 'minimum') {
                return [pointInd + ',0', pointInd + ',1'];
              } else if (arrayEntryPrefix === 'minimumLocation') {
                return [pointInd + ',0'];
              } else {
                return [pointInd + ',1'];
              }
            } else {
              return [];
            }
          } else {
            return [];
          }
        } else if (arrayEntryPrefix === 'minimumLocations') {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,0"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',0');
        } else if (arrayEntryPrefix === 'minimumValues') {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,1"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',1');
        } else {
          return [];
        }
      },
      arrayVarNameFromArrayKey(arrayKey) {
        let [ind1, ind2] = arrayKey.split(',');

        if (ind2 === '0') {
          return 'minimumLocation' + (Number(ind1) + 1);
        } else {
          return 'minimumValue' + (Number(ind1) + 1);
        }
      },
      returnArraySizeDependencies: () => ({
        numberMinima: {
          dependencyType: 'stateVariable',
          variableName: 'numberMinima',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.numberMinima, 2];
      },
      returnArrayDependenciesByKey() {
        let globalDependencies = {
          allMinima: {
            dependencyType: 'stateVariable',
            variableName: 'allMinima',
          },
        };

        return { globalDependencies };
      },
      arrayDefinitionByKey({ globalDependencyValues }) {
        // console.log(`array definition by key of function minima`)
        // console.log(globalDependencyValues)

        let minima = {};

        for (
          let ptInd = 0;
          ptInd < globalDependencyValues.__array_size[0];
          ptInd++
        ) {
          for (let i = 0; i < 2; i++) {
            let arrayKey = `${ptInd},${i}`;

            minima[arrayKey] = globalDependencyValues.allMinima[ptInd][i];
          }
        }

        return { newValues: { minima } };
      },
    };

    stateVariableDefinitions.allMaxima = {
      stateVariablesDeterminingDependencies: ['isInterpolatedFunction'],
      returnDependencies({ stateValues }) {
        if (stateValues.isInterpolatedFunction) {
          return {
            xs: {
              dependencyType: 'stateVariable',
              variableName: 'xs',
            },
            coeffs: {
              dependencyType: 'stateVariable',
              variableName: 'coeffs',
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        } else {
          return {
            numericalf: {
              dependencyType: 'stateVariable',
              variableName: 'numericalf',
            },
            xscale: {
              dependencyType: 'stateVariable',
              variableName: 'xscale',
            },
            functionChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneFunction',
              variableNames: ['allMaxima'],
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        }
      },
      definition: function ({ dependencyValues }) {
        if (dependencyValues.isInterpolatedFunction) {
          let xs = dependencyValues.xs;
          let coeffs = dependencyValues.coeffs;
          let eps = numerics.eps;

          let maximaList = [];

          if (xs === null) {
            return { newValues: { allMaxima: maximaList } };
          }

          let maximumAtPreviousRight = false;

          // since extrapolate for x < xs[0], formula based on coeffs[0]
          // is valid for x < xs[1]
          let c = coeffs[0];
          let dx = xs[1] - xs[0];

          if (c[3] === 0) {
            // have quadratic.  Maximum only if c[2] < 0
            if (c[2] < 0) {
              let x = -c[1] / (2 * c[2]);
              if (x <= dx - eps) {
                maximaList.push([
                  x + xs[0],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              } else if (Math.abs(x - dx) < eps) {
                maximumAtPreviousRight = true;
              }
            }
          } else {
            // since c[3] != 0, have cubic

            let discrim = 4 * c[2] * c[2] - 12 * c[3] * c[1];
            if (discrim > 0) {
              let sqrtdiscrim = Math.sqrt(discrim);

              // critical point where choose -sqrtdiscrim is maximum
              let x = (-2 * c[2] - sqrtdiscrim) / (6 * c[3]);
              if (x <= dx - eps) {
                maximaList.push([
                  x + xs[0],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              } else if (Math.abs(x - dx) < eps) {
                maximumAtPreviousRight = true;
              }
            }
          }

          for (let i = 1; i < xs.length - 2; i++) {
            c = coeffs[i];
            dx = xs[i + 1] - xs[i];

            if (c[3] === 0) {
              // have quadratic.  Maximum only if c[2] < 0
              if (c[2] < 0) {
                let x = -c[1] / (2 * c[2]);
                if (Math.abs(x) < eps) {
                  if (maximumAtPreviousRight) {
                    maximaList.push([
                      x + xs[i],
                      ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                    ]);
                  }
                } else if (x >= eps && x <= dx - eps) {
                  maximaList.push([
                    x + xs[i],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
                maximumAtPreviousRight = Math.abs(x - dx) < eps;
              } else {
                maximumAtPreviousRight = false;
              }
            } else {
              // since c[3] != 0, have cubic

              let discrim = 4 * c[2] * c[2] - 12 * c[3] * c[1];
              if (discrim > 0) {
                let sqrtdiscrim = Math.sqrt(discrim);

                // critical point where choose -sqrtdiscrim is maximum
                let x = (-2 * c[2] - sqrtdiscrim) / (6 * c[3]);
                if (Math.abs(x) < eps) {
                  if (maximumAtPreviousRight) {
                    maximaList.push([
                      x + xs[i],
                      ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                    ]);
                  }
                } else if (x >= eps && x <= dx - eps) {
                  maximaList.push([
                    x + xs[i],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
                maximumAtPreviousRight = Math.abs(x - dx) < eps;
              } else {
                maximumAtPreviousRight = false;
              }
            }
          }

          // since extrapolate for x > xs[n-1], formula based on coeffs[n-2]
          // is valid for x > xs[n-2]
          c = coeffs[xs.length - 2];
          if (c[3] === 0) {
            // have quadratic.  Maximum only if c[2] < 0
            if (c[2] < 0) {
              let x = -c[1] / (2 * c[2]);
              if (Math.abs(x) < eps) {
                if (maximumAtPreviousRight) {
                  maximaList.push([
                    x + xs[xs.length - 2],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
              } else if (x >= eps) {
                maximaList.push([
                  x + xs[xs.length - 2],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              }
            }
          } else {
            // since c[3] != 0, have cubic

            let discrim = 4 * c[2] * c[2] - 12 * c[3] * c[1];
            if (discrim > 0) {
              let sqrtdiscrim = Math.sqrt(discrim);

              // critical point where choose -sqrtdiscrim is maximum
              let x = (-2 * c[2] - sqrtdiscrim) / (6 * c[3]);
              if (x >= eps) {
                maximaList.push([
                  x + xs[xs.length - 2],
                  ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                ]);
              } else if (Math.abs(x) < eps) {
                if (maximumAtPreviousRight) {
                  maximaList.push([
                    x + xs[xs.length - 2],
                    ((c[3] * x + c[2]) * x + c[1]) * x + c[0],
                  ]);
                }
              }
            }
          }

          return { newValues: { allMaxima: maximaList } };
        } else {
          // check for presence of functionChild
          // as derived classes may have changed the dependencies
          // to eliminate functionChildDependency
          if (
            dependencyValues.functionChild &&
            dependencyValues.functionChild.length === 1
          ) {
            return {
              newValues: {
                allMaxima:
                  dependencyValues.functionChild[0].stateValues.allMaxima,
              },
            };
          }

          // no function child

          let f = (x) => -dependencyValues.numericalf(x);

          // for now, look for maxima in interval -100*xscale to 100*xscale
          // dividing interval into 1000 subintervals
          let minx = -100 * dependencyValues.xscale;
          let maxx = 100 * dependencyValues.xscale;
          let nIntervals = 1000;
          let dx = (maxx - minx) / nIntervals;

          let maximaList = [];
          let maximumAtPreviousRight = false;
          let fright = f(minx);
          for (let i = 0; i < nIntervals; i++) {
            let xleft = minx + i * dx;
            let xright = minx + (i + 1) * dx;
            let fleft = fright;
            fright = f(xright);

            if (Number.isNaN(fleft) || Number.isNaN(fright)) {
              continue;
            }

            let result = numerics.fminbr(f, [xleft, xright]);
            if (result.success !== true) {
              continue;
            }
            let x = result.x;
            let fx = result.fx;

            if (fleft < fx) {
              if (maximumAtPreviousRight) {
                if (Number.isFinite(fleft)) {
                  maximaList.push([xleft, -fleft]);
                }
              }
              maximumAtPreviousRight = false;
            } else if (fright < fx) {
              maximumAtPreviousRight = true;
            } else {
              maximumAtPreviousRight = false;

              // make sure it actually looks like a strict maximum of f(x)
              if (
                fx < fright &&
                fx < fleft &&
                fx < f(x + result.tol) &&
                fx < f(x - result.tol) &&
                Number.isFinite(fx)
              ) {
                maximaList.push([x, -fx]);
              }
            }
          }

          return { newValues: { allMaxima: maximaList } };
        }
      },
    };

    stateVariableDefinitions.numberMaxima = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        allMaxima: {
          dependencyType: 'stateVariable',
          variableName: 'allMaxima',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: { numberMaxima: dependencyValues.allMaxima.length },
          checkForActualChange: { numberMaxima: true },
        };
      },
    };

    stateVariableDefinitions.maxima = {
      stateVariablesDeterminingDependencies: ['isInterpolatedFunction'],
      public: true,
      componentType: 'number',
      isArray: true,
      nDimensions: 2,
      entryPrefixes: [
        'maximum',
        'maximumLocations',
        'maximumLocation',
        'maximumValues',
        'maximumValue',
      ],
      returnWrappingComponents(prefix) {
        if (prefix === 'maximum' || prefix === undefined) {
          // maximum or entire array
          // These are points,
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        } else {
          // don't wrap maximumLocation(s) or maximumValues(s)
          return [];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (
          ['maximum', 'maximumLocation', 'maximumValue'].includes(
            arrayEntryPrefix,
          )
        ) {
          let pointInd = Number(varEnding) - 1;
          if (Number.isInteger(pointInd) && pointInd >= 0) {
            // if don't know array size, just guess that the entry is OK
            // It will get corrected once array size is known.
            // TODO: better to return empty array?
            if (!arraySize || pointInd < arraySize[0]) {
              if (arrayEntryPrefix === 'maximum') {
                return [pointInd + ',0', pointInd + ',1'];
              } else if (arrayEntryPrefix === 'maximumLocation') {
                return [pointInd + ',0'];
              } else {
                return [pointInd + ',1'];
              }
            } else {
              return [];
            }
          } else {
            return [];
          }
        } else if (arrayEntryPrefix === 'maximumLocations') {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,0"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',0');
        } else if (arrayEntryPrefix === 'maximumValues') {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,1"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',1');
        } else {
          return [];
        }
      },
      arrayVarNameFromArrayKey(arrayKey) {
        let [ind1, ind2] = arrayKey.split(',');

        if (ind2 === '0') {
          return 'maximumLocation' + (Number(ind1) + 1);
        } else {
          return 'maximumValue' + (Number(ind1) + 1);
        }
      },
      returnArraySizeDependencies: () => ({
        numberMaxima: {
          dependencyType: 'stateVariable',
          variableName: 'numberMaxima',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.numberMaxima, 2];
      },
      returnArrayDependenciesByKey() {
        let globalDependencies = {
          allMaxima: {
            dependencyType: 'stateVariable',
            variableName: 'allMaxima',
          },
        };

        return { globalDependencies };
      },
      arrayDefinitionByKey({ globalDependencyValues }) {
        // console.log(`array definition by key of function maxima`)
        // console.log(globalDependencyValues)

        let maxima = {};

        for (
          let ptInd = 0;
          ptInd < globalDependencyValues.__array_size[0];
          ptInd++
        ) {
          for (let i = 0; i < 2; i++) {
            let arrayKey = `${ptInd},${i}`;

            maxima[arrayKey] = globalDependencyValues.allMaxima[ptInd][i];
          }
        }

        return { newValues: { maxima } };
      },
    };

    stateVariableDefinitions.numberExtrema = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        numberMinima: {
          dependencyType: 'stateVariable',
          variableName: 'numberMinima',
        },
        numberMaxima: {
          dependencyType: 'stateVariable',
          variableName: 'numberMaxima',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            numberExtrema:
              dependencyValues.numberMinima + dependencyValues.numberMaxima,
          },
          checkForActualChange: { numberExtrema: true },
        };
      },
    };

    stateVariableDefinitions.allExtrema = {
      returnDependencies: () => ({
        allMinima: {
          dependencyType: 'stateVariable',
          variableName: 'allMinima',
        },
        allMaxima: {
          dependencyType: 'stateVariable',
          variableName: 'allMaxima',
        },
      }),
      definition({ dependencyValues }) {
        // console.log(`definition of allExtrema of function`)
        // console.log(dependencyValues)
        let allExtrema = [
          ...dependencyValues.allMinima,
          ...dependencyValues.allMaxima,
        ].sort((a, b) => a[0] - b[0]);

        return { newValues: { allExtrema } };
      },
    };

    stateVariableDefinitions.extrema = {
      public: true,
      componentType: 'number',
      isArray: true,
      nDimensions: 2,
      entryPrefixes: [
        'extremum',
        'extremumLocations',
        'extremumLocation',
        'extremumValues',
        'extremumValue',
      ],
      returnWrappingComponents(prefix) {
        if (prefix === 'extremum' || prefix === undefined) {
          // extremum or entire array
          // These are points,
          // wrap inner dimension by both <point> and <xs>
          // don't wrap outer dimension (for entire array)
          return [['point', { componentType: 'mathList', isAttribute: 'xs' }]];
        } else {
          // don't wrap extremumLocation(s) or extremumValues(s)
          return [];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (
          ['extremum', 'extremumLocation', 'extremumValue'].includes(
            arrayEntryPrefix,
          )
        ) {
          let pointInd = Number(varEnding) - 1;
          if (Number.isInteger(pointInd) && pointInd >= 0) {
            // if don't know array size, just guess that the entry is OK
            // It will get corrected once array size is known.
            // TODO: better to return empty array?
            if (!arraySize || pointInd < arraySize[0]) {
              if (arrayEntryPrefix === 'extremum') {
                return [pointInd + ',0', pointInd + ',1'];
              } else if (arrayEntryPrefix === 'extremumLocation') {
                return [pointInd + ',0'];
              } else {
                return [pointInd + ',1'];
              }
            } else {
              return [];
            }
          } else {
            return [];
          }
        } else if (arrayEntryPrefix === 'extremumLocations') {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,0"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',0');
        } else if (arrayEntryPrefix === 'extremumValues') {
          // can't guess at arrayKeys if don't have arraySize
          if (!arraySize || varEnding !== '') {
            return [];
          }
          // array of "i,1"", where i=0, ..., arraySize[0]-1
          return Array.from(Array(arraySize[0]), (_, i) => i + ',1');
        } else {
          return [];
        }
      },
      arrayVarNameFromArrayKey(arrayKey) {
        let [ind1, ind2] = arrayKey.split(',');

        if (ind2 === '0') {
          return 'extremumLocation' + (Number(ind1) + 1);
        } else {
          return 'extremumValue' + (Number(ind1) + 1);
        }
      },
      returnArraySizeDependencies: () => ({
        numberExtrema: {
          dependencyType: 'stateVariable',
          variableName: 'numberExtrema',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.numberExtrema, 2];
      },
      returnArrayDependenciesByKey() {
        let globalDependencies = {
          allExtrema: {
            dependencyType: 'stateVariable',
            variableName: 'allExtrema',
          },
        };

        return { globalDependencies };
      },
      arrayDefinitionByKey({ globalDependencyValues }) {
        // console.log(`array definition by key of function extrema`)
        // console.log(globalDependencyValues)

        let extrema = {};

        for (
          let ptInd = 0;
          ptInd < globalDependencyValues.__array_size[0];
          ptInd++
        ) {
          for (let i = 0; i < 2; i++) {
            let arrayKey = `${ptInd},${i}`;

            extrema[arrayKey] = globalDependencyValues.allExtrema[ptInd][i];
          }
        }

        return { newValues: { extrema } };
      },
    };

    // we make function child be a state variable
    // as we need a state variable to determine other dependencies
    // using stateVariablesDeterminingDependencies
    stateVariableDefinitions.functionChild = {
      returnDependencies: () => ({
        functionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneFunction',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.functionChild.length === 1) {
          return {
            newValues: { functionChild: dependencyValues.functionChild[0] },
          };
        } else {
          return { newValues: { functionChild: null } };
        }
      },
    };

    stateVariableDefinitions.returnNumericalDerivatives = {
      stateVariablesDeterminingDependencies: ['isInterpolatedFunction'],
      returnDependencies({ stateValues }) {
        if (stateValues.isInterpolatedFunction) {
          return {
            xs: {
              dependencyType: 'stateVariable',
              variableName: 'xs',
            },
            coeffs: {
              dependencyType: 'stateVariable',
              variableName: 'coeffs',
            },
            interpolationPoints: {
              dependencyType: 'stateVariable',
              variableName: 'interpolationPoints',
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        } else {
          return {
            functionChild: {
              dependencyType: 'child',
              childLogicName: 'atMostOneFunction',
              variableNames: ['returnNumericalDerivatives'],
            },
            isInterpolatedFunction: {
              dependencyType: 'stateVariable',
              variableName: 'isInterpolatedFunction',
            },
          };
        }
      },
      definition: function ({ dependencyValues }) {
        if (dependencyValues.isInterpolatedFunction) {
          return {
            newValues: {
              returnNumericalDerivatives:
                returnReturnDerivativesOfInterpolatedFunction(dependencyValues),
            },
          };
        } else {
          if (
            dependencyValues.functionChild.length === 1 &&
            dependencyValues.functionChild[0].stateValues
              .returnNumericalDerivatives
          ) {
            return {
              newValues: {
                returnNumericalDerivatives:
                  dependencyValues.functionChild[0].stateValues
                    .returnNumericalDerivatives,
              },
            };
          } else {
            return { newValues: { returnNumericalDerivatives: null } };
          }
        }
      },
    };

    return stateVariableDefinitions;
  }

  static adapters = [
    {
      stateVariable: 'numericalf',
      componentType: 'curve',
    },
    {
      stateVariable: 'formula',
      componentType: 'math',
    },
  ];
}

export function returnSymbolicFunctionFromFormula(dependencyValues) {
  let formula = dependencyValues.formula;
  let varString = dependencyValues.variable.tree;
  let simplify = dependencyValues.simplify;
  let expand = dependencyValues.expand;
  return (x) =>
    normalizeMathExpression({
      value: formula.substitute({ [varString]: x }),
      simplify,
      expand,
    });
}

export function returnNumericalFunctionFromFormula(dependencyValues) {
  let formula_f;
  try {
    formula_f = dependencyValues.formula.f();
  } catch (e) {
    formula_f = () => NaN;
  }
  let varString = dependencyValues.variable.tree;
  return function (x) {
    try {
      return formula_f({ [varString]: x });
    } catch (e) {
      return NaN;
    }
  };
}

function calculateInterpolationPoints({ dependencyValues, numerics }) {
  let pointsWithX = [];
  let pointsWithoutX = [];

  let allPoints = {
    maximum: dependencyValues.prescribedMaxima,
    minimum: dependencyValues.prescribedMinima,
    extremum: dependencyValues.prescribedExtrema,
    point: dependencyValues.prescribedPoints,
  };

  for (let type in allPoints) {
    for (let point of allPoints[type]) {
      let x = null,
        y = null,
        slope = null;
      if (point.x !== null) {
        x = point.x.evaluate_to_constant();
        if (!Number.isFinite(x)) {
          console.warn(`Ignoring non-numerical ${type}`);
          continue;
        }
      }
      if (point.y !== null) {
        y = point.y.evaluate_to_constant();
        if (!Number.isFinite(y)) {
          console.warn(`Ignoring non-numerical ${type}`);
          continue;
        }
      }
      if (point.slope !== null && point.slope !== undefined) {
        slope = point.slope.evaluate_to_constant();
        if (!Number.isFinite(slope)) {
          console.warn(`Ignoring non-numerical slope`);
          slope = null;
        }
      }
      if (x === null) {
        if (y === null) {
          console.warn(`Ignoring empty ${type}`);
          continue;
        }
        pointsWithoutX.push({
          type: type,
          y: y,
          slope: slope,
        });
      } else {
        pointsWithX.push({
          type: type,
          x: x,
          y: y,
          slope: slope,
        });
      }
    }
  }

  pointsWithX.sort((a, b) => a.x - b.x);
  pointsWithoutX.sort((a, b) => a.y - b.y);

  // don't allow multiple points with same x or very close x
  let xPrev = -Infinity;
  let eps = numerics.eps;
  for (let ind = 0; ind < pointsWithX.length; ind++) {
    let p = pointsWithX[ind];
    if (p.x <= xPrev + eps) {
      console.warn(
        `Two points with locations too close together.  Can't define function`,
      );
      return { newValues: { interpolationPoints: null } };
    }
    xPrev = p.x;
  }

  let xscale = dependencyValues.xscale;
  let yscale = dependencyValues.yscale;

  xPrev = undefined;
  let yPrev, typePrev;
  let interpolationPoints = [];

  let pNext = pointsWithX[0];
  for (let ind = 0; ind < pointsWithX.length; ind++) {
    let p = pNext;
    pNext = pointsWithX[ind + 1];
    let newPoint = addPointWithX({
      p,
      pNext,
      typePrev,
      xPrev,
      yPrev,
    });

    typePrev = newPoint.type;
    xPrev = newPoint.x;
    yPrev = newPoint.y;
  }

  // flag if next point will be first point added
  let firstPoint = false;
  if (pointsWithX.length === 0) {
    firstPoint = true;
  }

  // if points without X remain, keep adding with spacing of 2*xscale
  while (pointsWithoutX.length > 0) {
    // see if can find a point that can be added without any intermediates
    let findMatch;
    if (typePrev === undefined) {
      findMatch = getPointWithoutX({
        allowedTypes: ['maximum', 'minimum', 'extremum'],
        comparison: 'atLeast',
        value: -Infinity,
      });
    } else if (typePrev === 'maximum') {
      findMatch = getPointWithoutX({
        allowedTypes: ['minimum', 'extremum'],
        comparison: 'atMost',
        value: yPrev - yscale,
      });
    } else if (typePrev === 'minimum') {
      findMatch = getPointWithoutX({
        allowedTypes: ['maximum', 'extremum'],
        comparison: 'atLeast',
        value: yPrev + yscale,
      });
    } else if (typePrev === 'point') {
      findMatch = getPointWithoutX({
        allowedTypes: ['maximum', 'extremum'],
        comparison: 'atLeast',
        value: yPrev + yscale,
      });
      if (findMatch.success !== true) {
        findMatch = getPointWithoutX({
          allowedTypes: ['minimum', 'extremum'],
          comparison: 'atMost',
          value: yPrev - yscale,
        });
      }
    }

    let p;
    if (findMatch.success === true) {
      p = findMatch.point;
      pointsWithoutX.splice(findMatch.ind, 1);
      if (firstPoint) {
        p.x = 0;
        firstPoint = false;
      } else {
        p.x = xPrev + xscale;
      }
    } else {
      p = pointsWithoutX.pop();
      if (firstPoint) {
        p.x = 0;
        firstPoint = false;
      } else {
        // make scale larger, as know will need to add extra point
        p.x = xPrev + 2 * xscale;
      }
    }

    let newPoint = addPointWithX({
      p,
      typePrev,
      xPrev,
      yPrev,
    });

    typePrev = newPoint.type;
    xPrev = newPoint.x;
    yPrev = newPoint.y;
  }

  // used all prescribed point
  // now, add points at beginning and end to extrapolate

  // if not points prescribed, create a point through origin
  // which will make f be the constant function 0
  if (interpolationPoints.length === 0) {
    interpolationPoints.push({
      type: 'point',
      x: 0,
      y: 0,
      slope: 0,
    });
  }

  firstPoint = interpolationPoints[0];
  if (firstPoint.type === 'maximum') {
    // add point before maximum, xscale to left and yscale below
    // and set slope so ends with parabola
    let newPoint = {
      type: 'point',
      x: firstPoint.x - xscale,
      y: firstPoint.y - yscale,
      slope: (2 * yscale) / xscale,
    };
    interpolationPoints.splice(0, 0, newPoint);
  } else if (firstPoint.type === 'minimum') {
    // add point before minimum, xscale to left and yscale above
    // and set slope so ends with parabola
    let newPoint = {
      type: 'point',
      x: firstPoint.x - xscale,
      y: firstPoint.y + yscale,
      slope: (-2 * yscale) / xscale,
    };
    interpolationPoints.splice(0, 0, newPoint);
  } else if (firstPoint.type === 'point') {
    if (interpolationPoints.length === 1) {
      // if point is only point and slope isn't defined, set slope to zero
      if (firstPoint.slope === null) {
        firstPoint.slope = 0;
      }
    } else {
      let nextPoint = interpolationPoints[1];
      let secantslope =
        (nextPoint.y - firstPoint.y) / (nextPoint.x - firstPoint.x);
      if (nextPoint.type === 'maximum' || nextPoint.type === 'minimum') {
        if (firstPoint.slope === null) {
          // set slope so ends with parabola
          firstPoint.slope = 2 * secantslope;
        }
      } else {
        // two points in a row
        if (interpolationPoints.length === 2) {
          // only two points, make slope for a line if slope isn't determined
          if (firstPoint.slope === null) {
            firstPoint.slope = secantslope;
          }
        } else {
          // if slope of next point isn't defined
          // set next point slope according to monotonic formula
          if (nextPoint.slope === null) {
            nextPoint.slope = monotonicSlope({
              point: nextPoint,
              prevPoint: firstPoint,
              nextPoint: interpolationPoints[2],
            });
          }

          // if firstPoint slope is null
          // fit a quadratic from firstPoint to nextPoint
          // with slope matching that of nextPoint
          // Calculate resulting slope at firstPoint
          if (firstPoint.slope === null) {
            firstPoint.slope =
              (2 * (firstPoint.y - nextPoint.y)) /
                (firstPoint.x - nextPoint.x) -
              nextPoint.slope;
          }
        }

        // add another point in line with slope that extrapolates as a line
        let newPoint = {
          x: firstPoint.x - xscale,
          y: firstPoint.y - xscale * firstPoint.slope,
          slope: firstPoint.slope,
        };
        interpolationPoints.splice(0, 0, newPoint);
        // extapolateLinearBeginning = true;
      }
    }
  }

  let lastPoint = interpolationPoints[interpolationPoints.length - 1];
  if (lastPoint.type === 'maximum') {
    // add point after maximum, xscale to right and yscale below
    // and set slope so ends with parabola
    let newPoint = {
      type: 'point',
      x: lastPoint.x + xscale,
      y: lastPoint.y - yscale,
      slope: (-2 * yscale) / xscale,
    };
    interpolationPoints.push(newPoint);
  } else if (lastPoint.type === 'minimum') {
    // add point after minimum, xscale to right and yscale above
    // and set slope so ends with parabola
    let newPoint = {
      type: 'point',
      x: lastPoint.x + xscale,
      y: lastPoint.y + yscale,
      slope: (2 * yscale) / xscale,
    };
    interpolationPoints.push(newPoint);
  } else if (lastPoint.type === 'point') {
    if (interpolationPoints.length === 1) {
      // if point is only point
      // add a second point so that get a line
      let newPoint = {
        type: 'point',
        x: lastPoint.x + xscale,
        y: lastPoint.y + firstPoint.slope * xscale,
        slope: firstPoint.slope,
      };
      interpolationPoints.push(newPoint);
    } else {
      let prevPoint = interpolationPoints[interpolationPoints.length - 2];
      let secantslope =
        (prevPoint.y - lastPoint.y) / (prevPoint.x - lastPoint.x);
      if (prevPoint.type === 'maximum' || prevPoint.type === 'minimum') {
        // if slope not defined
        // set slope so ends with parabola
        if (lastPoint.slope === null) {
          lastPoint.slope = 2 * secantslope;
        }
      } else {
        // two points in a row
        if (interpolationPoints.length === 2) {
          // only two points, make a line if slope not defined
          if (lastPoint.slope === null) {
            lastPoint.slope = secantslope;
          }
        } else {
          // if previous point slope is null
          // set previous point slope according to monotonic formula
          if (prevPoint.slope === null) {
            prevPoint.slope = monotonicSlope({
              point: prevPoint,
              prevPoint: interpolationPoints[interpolationPoints.length - 3],
              nextPoint: lastPoint,
            });
          }
          // if lastPoint slope is null
          // fit a quadratic from prevPoint to lastPoint
          // with slope matching that of prevPoint
          // Calculate resulting slope at lastPoint
          if (lastPoint.slope === null) {
            lastPoint.slope =
              (2 * (prevPoint.y - lastPoint.y)) / (prevPoint.x - lastPoint.x) -
              prevPoint.slope;
          }
        }

        // add another point in line with slope that extrapolates as a line
        let newPoint = {
          x: lastPoint.x + xscale,
          y: lastPoint.y + xscale * lastPoint.slope,
          slope: lastPoint.slope,
        };
        interpolationPoints.push(newPoint);
      }
    }
  }

  // for any interpolation points whose slope are not given
  // use slope from monotonic cubic interpolation
  for (let ind = 1; ind < interpolationPoints.length - 1; ind++) {
    let point = interpolationPoints[ind];
    if (point.slope === null) {
      point.slope = monotonicSlope({
        point: point,
        prevPoint: interpolationPoints[ind - 1],
        nextPoint: interpolationPoints[ind + 1],
      });
    }
  }

  return { newValues: { interpolationPoints } };

  function monotonicSlope({ point, prevPoint, nextPoint }) {
    // monotonic cubic interpolation formula from
    // Steffens, Astron. Astrophys. 239:443 (1990)

    let dx1 = point.x - prevPoint.x;
    let dx2 = nextPoint.x - point.x;
    let dy1 = point.y - prevPoint.y;
    let dy2 = nextPoint.y - point.y;
    let s1 = dy1 / dx1;
    let s2 = dy2 / dx2;
    let p1 = (s1 * dx2 + s2 * dx1) / (dx1 + dx2);

    let slope =
      (Math.sign(s1) + Math.sign(s2)) *
      Math.min(Math.abs(s1), Math.abs(s2), 0.5 * Math.abs(p1));

    return slope;
  }

  function addPointWithX({ p, pNext, typePrev, xPrev, yPrev }) {
    let yNext;
    if (pNext !== undefined) {
      yNext = pNext.y;
    }
    if (p.type === 'maximum') {
      return addMaximum({
        x: p.x,
        y: p.y,
        typePrev,
        xPrev,
        yPrev,
        yNext,
        pNext,
      });
    } else if (p.type === 'minimum') {
      return addMinimum({
        x: p.x,
        y: p.y,
        typePrev,
        xPrev,
        yPrev,
        yNext,
        pNext,
      });
    } else if (p.type === 'extremum') {
      let typeNext; // used only if there isn't a point before

      if (typePrev === undefined) {
        // nothing followed by extremum
        if (pNext === undefined) {
          // if nothing on either side, treat as a maximum
          return addMaximum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        }
        // set typeNext so following logic can test if this is the first point
        typeNext = pNext.type;
      }

      if (typePrev === 'maximum' || typeNext === 'maximum') {
        // maximum followed by extremum (or preceeded by in case this is first point)
        if (p.y !== null && p.y > yPrev - yscale) {
          // treat extremum as maximum,
          // as would need two extra points if it were a minimum
          return addMaximum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        } else if (
          typeNext !== undefined &&
          p.y !== null &&
          p.y > pNext.y - yscale
        ) {
          // case where this is first point
          // treat extremum as maximum,
          // as would need two extra points if it were a minimum
          return addMaximum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        } else {
          // treat extremum as a minimum
          return addMinimum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        }
      } else if (typePrev === 'minimum' || typeNext === 'minimum') {
        // minimum followed by extremum (or preceeded by in case this is first point)
        if (p.y !== null && p.y < yPrev + yscale) {
          // treat extremum as minimum,
          // as would need two extra points if it were a maximum
          return addMinimum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        } else if (
          typeNext !== undefined &&
          p.y !== null &&
          p.y > pNext.y + yscale
        ) {
          // case where this is first point
          // treat extremum as minimum,
          // as would need two extra points if it were a maximum
          return addMinimum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        } else {
          return addMaximum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        }
      } else if (typePrev === 'point' || typeNext === 'point') {
        // point followed by extremum (or preceeded by in case this is first point)
        let treatAs = 'maximum';
        if (p.y === null && pNext !== undefined && pNext.type === maximum) {
          treatAs = 'minimum';
        } else if (p.y !== null && p.y <= yPrev - yscale) {
          treatAs = 'minimum';
        } else if (
          typeNext !== undefined &&
          p.y !== null &&
          p.y >= pNext.y - yscale
        ) {
          treatAs = 'minimum';
        }
        if (treatAs === 'minimum') {
          return addMinimum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        } else {
          return addMaximum({
            x: p.x,
            y: p.y,
            typePrev,
            xPrev,
            yPrev,
            yNext,
            pNext,
          });
        }
      }
    } else if (p.type === 'point') {
      return addPoint({
        x: p.x,
        y: p.y,
        slope: p.slope,
        typePrev,
        xPrev,
        yPrev,
        yNext,
        pNext,
      });
    }
  }

  function addMaximum({ x, y, typePrev, xPrev, yPrev, yNext, pNext }) {
    if (typePrev === undefined) {
      // nothing followed by maximum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = 0;
        } else if (pNext.type === 'maximum') {
          y = yNext;
        } else {
          y = yNext + yscale;
        }
      }
    } else if (typePrev === 'maximum') {
      // maximum followed by maximum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = yPrev;
        } else if (pNext.type === 'maximum') {
          y = Math.max(yPrev, yNext);
        } else {
          y = Math.max(yPrev, yNext + yscale);
        }
      }
      // need to put a minimum betwee'n the two max's
      // with y at least yscale below both
      let yMin = Math.min(yPrev, y) - yscale;
      let xNew = (x + xPrev) / 2;
      let yNew,
        typeNew,
        slopeNew = null;
      // see if can find a min or extremum that didn't have x specified
      let results = getPointWithoutX({
        allowedTypes: ['minimum', 'extremum'],
        comparison: 'atMost',
        value: yMin,
      });
      if (results.success === true) {
        typeNew = 'minimum'; // treat as minimum even if was extremum
        yNew = results.point.y;
        pointsWithoutX.splice(results.ind, 1);
        slopeNew = 0;
      } else {
        typeNew = 'point';
        yNew = yMin;
      }
      interpolationPoints.push({
        type: typeNew,
        x: xNew,
        y: yNew,
        slope: slopeNew,
      });
    } else if (typePrev === 'minimum') {
      // minimum followed by maximum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = yPrev + yscale;
        } else if (pNext.type === 'maximum') {
          y = Math.max(yPrev + yscale, yNext);
        } else {
          y = Math.max(yPrev, yNext) + yscale;
        }
      } else {
        // have maximum with y defined
        if (y < yPrev + yscale) {
          // minimum followed by a maximum that is lower
          // (or at least not much higher) than the minimum
          // to make both points have neighbors that are sufficiently different
          // add two points between them
          // - the first with height >= yPrev + yscale (to make the minimum obvious)
          // - the second with height <= y - yscale (to make the maximum obvious)
          let xs = [(2 * xPrev + x) / 3, (xPrev + 2 * x) / 3];
          let findValues = [yPrev + yscale, y - yscale];
          let findComparisons = ['atLeast', 'atMost'];
          let findTypes = [
            ['maximum', 'extremum'],
            ['minimum', 'extremum'],
          ];
          for (let newPointNum = 0; newPointNum < 2; newPointNum++) {
            let xNew = xs[newPointNum];
            let yNew,
              typeNew,
              slopeNew = null;
            // attempt to find an unused point that meets criteria
            let results = getPointWithoutX({
              allowedTypes: findTypes[newPointNum],
              comparison: findComparisons[newPointNum],
              value: findValues[newPointNum],
            });
            if (results.success === true) {
              typeNew = findTypes[newPointNum][0]; // treat as min/max even if was extremum
              yNew = results.point.y;
              pointsWithoutX.splice(results.ind, 1);
              slopeNew = 0;
            } else {
              typeNew = 'point';
              yNew = findValues[newPointNum];
              slopeNew = null;
            }
            interpolationPoints.push({
              type: typeNew,
              x: xNew,
              y: yNew,
              slope: slopeNew,
            });
          }
        }
      }
    } else if (typePrev === 'point') {
      // point followed by maximum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = yPrev + yscale;
        } else if (pNext.type === 'maximum') {
          y = Math.max(yPrev + yscale, yNext);
        } else {
          y = Math.max(yPrev, yNext) + yscale;
        }
      } else {
        // have maximum with y defined
        if (y < yPrev + yscale) {
          // need to add a point to the left at least as low as y-yscale
          let xNew = (x + xPrev) / 2;
          let yNew,
            typeNew,
            slopeNew = null;
          // see if can find a min or extremum that didn't have x specified
          let results = getPointWithoutX({
            allowedTypes: ['minimum', 'extremum'],
            comparison: 'atMost',
            value: y - yscale,
          });
          if (results.success === true) {
            typeNew = 'minimum'; // treat as minimum even if was extremum
            yNew = results.point.y;
            pointsWithoutX.splice(results.ind, 1);
            slopeNew = 0;
          } else {
            typeNew = 'point';
            yNew = y - yscale;
          }
          interpolationPoints.push({
            type: typeNew,
            x: xNew,
            y: yNew,
            slope: slopeNew,
          });
        }
      }
    }

    let newMaximum = {
      type: 'maximum',
      x: x,
      y: y,
      slope: 0,
    };
    interpolationPoints.push(newMaximum);
    return newMaximum;
  }

  function addMinimum({ x, y, typePrev, xPrev, yPrev, yNext, pNext }) {
    if (typePrev === undefined) {
      // nothing followed by minimum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = 0;
        } else if (pNext.type === 'minimum') {
          y = yNext;
        } else {
          y = yNext - yscale;
        }
      }
    } else if (typePrev === 'maximum') {
      // maximum followed by minimum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = yPrev - yscale;
        } else if (pNext.type === 'minimum') {
          y = Math.min(yPrev - yscale, yNext);
        } else {
          y = Math.min(yPrev, yNext) - yscale;
        }
      } else {
        // have minimum with y defined
        if (y > yPrev - yscale) {
          // maximum followed by a minimum that is higher
          // (or at least not much lower) than the maximum
          // to make both points have neighbors that are sufficiently different
          // add two points between them
          // - the first with height <= yPrev - yscale (to make the maximum obvious)
          // - the second with height >= y + yscale (to make the minimum obvious)
          let xs = [(2 * xPrev + x) / 3, (xPrev + 2 * x) / 3];
          let findValues = [yPrev - yscale, y + yscale];
          let findComparisons = ['atMost', 'atLeast'];
          let findTypes = [
            ['minimum', 'extremum'],
            ['maximum', 'extremum'],
          ];
          for (let newPointNum = 0; newPointNum < 2; newPointNum++) {
            let xNew = xs[newPointNum];
            let yNew,
              typeNew,
              slopeNew = null;
            // attempt to find an unused point that meets criteria
            let results = getPointWithoutX({
              allowedTypes: findTypes[newPointNum],
              comparison: findComparisons[newPointNum],
              value: findValues[newPointNum],
            });
            if (results.success === true) {
              typeNew = findTypes[newPointNum][0]; // treat as min/max even if was extremum
              yNew = results.point.y;
              pointsWithoutX.splice(results.ind, 1);
              slopeNew = 0;
            } else {
              typeNew = 'point';
              yNew = findValues[newPointNum];
              slopeNew = null;
            }
            interpolationPoints.push({
              type: typeNew,
              x: xNew,
              y: yNew,
              slope: slopeNew,
            });
          }
        }
      }
    } else if (typePrev === 'minimum') {
      // minimum followed by minimum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = yPrev;
        } else if (pNext.type === 'minimum') {
          y = Math.min(yPrev, yNext);
        } else {
          y = Math.min(yPrev, yNext - yscale);
        }
      }
      // need to put a maximum between the two min's
      // with y at least yscale above both
      let yMax = Math.max(yPrev, y) + yscale;
      let xNew = (x + xPrev) / 2;
      let yNew,
        typeNew,
        slopeNew = null;
      // see if can find a min or extremum that didn't have x specified
      let results = getPointWithoutX({
        allowedTypes: ['maximum', 'extremum'],
        comparison: 'atLeast',
        value: yMax,
      });
      if (results.success === true) {
        typeNew = 'maximum'; // treat as maximum even if was extremum
        yNew = results.point.y;
        pointsWithoutX.splice(results.ind, 1);
        slopeNew = 0;
      } else {
        typeNew = 'point';
        yNew = yMax;
      }
      interpolationPoints.push({
        type: typeNew,
        x: xNew,
        y: yNew,
        slope: slopeNew,
      });
    } else if (typePrev === 'point') {
      // point followed by minimum
      if (y === null) {
        // check if there is a point to the right
        if (yNext === undefined) {
          y = yPrev - yscale;
        } else if (pNext.type === 'minimum') {
          y = Math.min(yPrev - yscale, yNext);
        } else {
          y = Math.min(yPrev, yNext) - yscale;
        }
      } else {
        // have minimum with y defined
        if (y > yPrev - yscale) {
          // need to add a point to the left at least as high as y+yscale
          let xNew = (x + xPrev) / 2;
          let yNew,
            typeNew,
            slopeNew = null;
          // see if can find a max or extremum that didn't have x specified
          let results = getPointWithoutX({
            allowedTypes: ['maximum', 'extremum'],
            comparison: 'atLeast',
            value: y + yscale,
          });
          if (results.success === true) {
            typeNew = 'maximum'; // treat as maximum even if was extremum
            yNew = results.point.y;
            pointsWithoutX.splice(results.ind, 1);
            slopeNew = 0;
          } else {
            typeNew = 'point';
            yNew = y + yscale;
          }
          interpolationPoints.push({
            type: typeNew,
            x: xNew,
            y: yNew,
            slope: slopeNew,
          });
        }
      }
    }

    let newMinimum = {
      type: 'minimum',
      x: x,
      y: y,
      slope: 0,
    };
    interpolationPoints.push(newMinimum);
    return newMinimum;
  }

  function addPoint({ x, y, slope, typePrev, xPrev, yPrev, yNext, pNext }) {
    if (typePrev === 'maximum') {
      // maximum followed by point

      if (y > yPrev - yscale) {
        // point is too high to make previous maximum sufficiently different
        // Either
        // - find a minimum or extremum with height below min(y,yPrev)-yscale, or
        // - add a point with height yPrev-yscale

        let yMin = Math.min(yPrev, y) - yscale;
        let xNew = (x + xPrev) / 2;
        let yNew,
          typeNew,
          slopeNew = null;
        // see if can find a min or extremum that didn't have x specified
        let results = getPointWithoutX({
          allowedTypes: ['minimum', 'extremum'],
          comparison: 'atMost',
          value: yMin,
        });
        if (results.success === true) {
          typeNew = 'minimum'; // treat as minimum even if was extremum
          yNew = results.point.y;
          pointsWithoutX.splice(results.ind, 1);
          slopeNew = 0;
        } else {
          typeNew = 'point';
          yNew = yPrev - yscale;
        }
        interpolationPoints.push({
          type: typeNew,
          x: xNew,
          y: yNew,
          slope: slopeNew,
        });
      }
    } else if (typePrev === 'minimum') {
      // minimum followed by point
      if (y < yPrev + yscale) {
        // point is too low to make previous minimum sufficiently different
        // Either
        // - find a maximum or extremum with height above min(y,yPrev)+yscale, or
        // - add a point with height yPrev+yscale

        let yMax = Math.max(yPrev, y) + yscale;
        let xNew = (x + xPrev) / 2;
        let yNew,
          typeNew,
          slopeNew = null;
        // see if can find a max or extremum that didn't have x specified
        let results = getPointWithoutX({
          allowedTypes: ['maximum', 'extremum'],
          comparison: 'atLeast',
          value: yMax,
        });
        if (results.success === true) {
          typeNew = 'maximum'; // treat as maximum even if was extremum
          yNew = results.point.y;
          pointsWithoutX.splice(results.ind, 1);
          slopeNew = 0;
        } else {
          typeNew = 'point';
          yNew = yPrev + yscale;
        }
        interpolationPoints.push({
          type: typeNew,
          x: xNew,
          y: yNew,
          slope: slopeNew,
        });
      }
    }

    let newPoint = {
      type: 'point',
      x: x,
      y: y,
      slope: slope,
    };
    interpolationPoints.push(newPoint);
    return newPoint;
  }

  function getPointWithoutX({ allowedTypes, comparison, value }) {
    // try to find a function in pointsWithoutX of allowed type
    // whose y value fits the criterion specified by comparison and value
    // comparison must be either "atMost" or "atLeast"

    // since pointsWithoutMax are sort in increasing y value
    // search in reverse order if comparison is atMost
    // that way, find the point that is closest to the criterion
    let inds = [];
    if (comparison === 'atMost') {
      inds = Object.keys(pointsWithoutX).reverse();
    } else if (comparison === 'atLeast') {
      inds = Object.keys(pointsWithoutX);
    } else {
      return { success: false };
    }

    // prefer first allowed types, so search them in order
    for (let type of allowedTypes) {
      for (let ind of inds) {
        let p = pointsWithoutX[ind];

        if (p.type !== type) {
          continue;
        }

        if (comparison === 'atMost') {
          if (p.y <= value) {
            return {
              success: true,
              ind: ind,
              point: p,
            };
          }
        } else {
          if (p.y >= value) {
            return {
              success: true,
              ind: ind,
              point: p,
            };
          }
        }
      }
    }
    return { success: false };
  }
}

function computeSplineParamCoeffs({ dependencyValues }) {
  // Compute coefficients for a cubic polynomial
  //   p(s) = c0 + c1*s + c2*s^2 + c3*s^3
  // such that
  //   p(0) = x1, p(s2) = x2
  // and
  //   p'(0) = t1, p'(s2) = t2
  let initCubicPoly = function (x1, x2, t1, t2, s2) {
    return [
      x1,
      t1,
      ((-3 * x1) / s2 + (3 * x2) / s2 - 2 * t1 - t2) / s2,
      ((2 * x1) / s2 - (2 * x2) / s2 + t1 + t2) / (s2 * s2),
    ];
  };

  let interpolationPoints = dependencyValues.interpolationPoints;

  if (interpolationPoints === null) {
    return {
      newValues: {
        xs: null,
        coeffs: null,
      },
    };
  }

  let coeffs = [];
  let xs = [];

  let p0;
  let p1 = interpolationPoints[0];
  xs.push(p1.x);
  for (let ind = 1; ind < interpolationPoints.length; ind++) {
    p0 = p1;
    p1 = interpolationPoints[ind];
    let c = initCubicPoly(p0.y, p1.y, p0.slope, p1.slope, p1.x - p0.x);

    // if nearly have quadratic or linear, except for roundoff error,
    // make exactly quadratic or linear
    if (
      Math.abs(c[3]) <
      1e-14 * Math.max(Math.abs(c[0]), Math.abs(c[1]), Math.abs(c[2]))
    ) {
      c[3] = 0;
      if (Math.abs(c[2]) < 1e-14 * Math.max(Math.abs(c[0]), Math.abs(c[1]))) {
        c[2] = 0;
      }
    }
    coeffs.push(c);

    xs.push(p1.x);
  }

  return {
    newValues: {
      xs,
      coeffs,
    },
  };
}

function returnInterpolatedFunction(dependencyValues) {
  let xs = dependencyValues.xs;
  let coeffs = dependencyValues.coeffs;
  let interpolationPointYs = [];
  if (dependencyValues.interpolationPoints) {
    interpolationPointYs = dependencyValues.interpolationPoints.map((x) => x.y);
  }

  if (xs === null) {
    return (x) => NaN;
  }

  let x0 = xs[0],
    xL = xs[xs.length - 1];

  return function (x) {
    if (isNaN(x)) {
      return NaN;
    }

    if (x <= x0) {
      // Extrapolate
      x -= x0;
      let c = coeffs[0];
      return ((c[3] * x + c[2]) * x + c[1]) * x + c[0];
    }

    if (x >= xL) {
      let i = xs.length - 2;
      // Extrapolate
      x -= xs[i];
      let c = coeffs[i];
      return ((c[3] * x + c[2]) * x + c[1]) * x + c[0];
    }

    // Search for the interval x is in,
    // returning the corresponding y if x is one of the original xs
    var low = 0,
      mid,
      high = xs.length - 1;
    while (low <= high) {
      mid = Math.floor(0.5 * (low + high));
      let xHere = xs[mid];
      if (xHere < x) {
        low = mid + 1;
      } else if (xHere > x) {
        high = mid - 1;
      } else {
        return interpolationPointYs[mid];
      }
    }
    let i = Math.max(0, high);

    // Interpolate
    x -= xs[i];
    let c = coeffs[i];
    return ((c[3] * x + c[2]) * x + c[1]) * x + c[0];
  };
}

function returnReturnDerivativesOfInterpolatedFunction(dependencyValues) {
  let xs = dependencyValues.xs;
  let coeffs = dependencyValues.coeffs;

  let x0 = xs[0],
    xL = xs[xs.length - 1];

  return function (order = 1) {
    if (order > 3) {
      return (x) => 0;
    }

    if (order < 1 || !Number.isInteger(order) || xs == null) {
      return (x) => NaN;
    }

    return function (x) {
      if (isNaN(x)) {
        return NaN;
      }

      if (x <= x0) {
        // Extrapolate
        x -= x0;
        let c = coeffs[0];
        if (order === 1) {
          return (3 * c[3] * x + 2 * c[2]) * x + c[1];
        } else if (order === 2) {
          return 6 * c[3] * x + 2 * c[2];
        } else {
          return 6 * c[3];
        }
      }

      if (x >= xL) {
        let i = xs.length - 2;
        // Extrapolate
        x -= xs[i];
        let c = coeffs[i];
        if (order === 1) {
          return (3 * c[3] * x + 2 * c[2]) * x + c[1];
        } else if (order === 2) {
          return 6 * c[3] * x + 2 * c[2];
        } else {
          return 6 * c[3];
        }
      }

      // Search for the interval x is in,
      // returning the corresponding y if x is one of the original xs
      var low = 0,
        mid,
        high = xs.length - 1;
      while (low <= high) {
        mid = Math.floor(0.5 * (low + high));
        let xHere = xs[mid];
        if (xHere < x) {
          low = mid + 1;
        } else if (xHere > x) {
          high = mid - 1;
        } else {
          // at a grid point
          if (order === 1) {
            return coeffs[mid][1];
          } else if (order === 2) {
            return 2 * coeffs[mid][2];
          } else {
            return 6 * coeffs[mid][3];
          }
        }
      }
      let i = Math.max(0, high);

      // Interpolate
      x -= xs[i];
      let c = coeffs[i];
      if (order === 1) {
        return (3 * c[3] * x + 2 * c[2]) * x + c[1];
      } else if (order === 2) {
        return 6 * c[3] * x + 2 * c[2];
      } else {
        return 6 * c[3];
      }
    };
  };
}
