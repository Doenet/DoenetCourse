import BaseComponent from './abstract/BaseComponent';
import { convertValueToMathExpression } from '../utils/math';
import { applyConstraintFromComponentConstraints } from '../utils/constraints';

export default class Constraints extends BaseComponent {
  static componentType = 'constraints';
  static rendererType = undefined;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroConstraints',
      componentType: '_constraint',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.independentComponentConstraints = {
      returnDependencies: () => ({
        constraintChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroConstraints',
          variableNames: ['independentComponentConstraints'],
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          independentComponentConstraints:
            dependencyValues.constraintChildren.every(
              (x) => x.stateValues.independentComponentConstraints,
            ),
        },
      }),
    };

    stateVariableDefinitions.arrayEntryPrefixForConstraints = {
      returnDependencies: () => ({
        arrayEntryPrefixForConstraints: {
          dependencyType: 'parentStateVariable',
          variableName: 'arrayEntryPrefixForConstraints',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          arrayEntryPrefixForConstraints:
            dependencyValues.arrayEntryPrefixForConstraints,
        },
      }),
    };

    stateVariableDefinitions.arrayVariableForConstraints = {
      returnDependencies: () => ({
        arrayVariableForConstraints: {
          dependencyType: 'parentStateVariable',
          variableName: 'arrayVariableForConstraints',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          arrayVariableForConstraints:
            dependencyValues.arrayVariableForConstraints,
        },
      }),
    };

    stateVariableDefinitions.nDimensions = {
      returnDependencies: () => ({
        nDimensions: {
          dependencyType: 'parentStateVariable',
          variableName: 'nDimensionsForConstraints',
        },
      }),
      definition({ dependencyValues }) {
        return { newValues: { nDimensions: dependencyValues.nDimensions } };
      },
    };

    stateVariableDefinitions.constraintResults = {
      additionalStateVariablesDefined: [
        {
          variableName: 'constraintUsedByComponent',
          isArray: true,
          entryPrefixes: ['constraintUsedByComponent'],
        },
      ],
      isArray: true,
      entryPrefixes: ['constraintResult'],
      stateVariablesDeterminingDependencies: [
        'independentComponentConstraints',
        'arrayEntryPrefixForConstraints',
        'arrayVariableForConstraints',
      ],
      returnArraySizeDependencies: () => ({
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        // console.log(`return array dependencies of constraintResults`)
        // console.log(JSON.parse(JSON.stringify(arrayKeys)))
        // console.log(JSON.parse(JSON.stringify(stateValues)))

        let globalDependencies = {
          constraintChildren: {
            dependencyType: 'child',
            childLogicName: 'atLeastZeroConstraints',
            variableNames: ['applyConstraint', 'applyComponentConstraint'],
            variablesOptional: true,
          },
          independentComponentConstraints: {
            dependencyType: 'stateVariable',
            variableName: 'independentComponentConstraints',
          },
        };

        let arrayEntryPrefix = stateValues.arrayEntryPrefixForConstraints;

        let dependenciesByKey = {};
        if (stateValues.independentComponentConstraints) {
          for (let arrayKey of arrayKeys) {
            dependenciesByKey[arrayKey] = {
              x: {
                dependencyType: 'parentStateVariable',
                variableName: arrayEntryPrefix + (Number(arrayKey) + 1),
              },
            };
          }
        } else {
          // convert variableName to "__null" on null
          // as variableName must be defined
          // (an invalid variable name is OK)
          let variableName = stateValues.arrayVariableForConstraints
            ? stateValues.arrayVariableForConstraints
            : '__null';
          globalDependencies.xs = {
            dependencyType: 'parentStateVariable',
            variableName,
          };
        }

        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        // console.log("array constraintResult definition")
        // console.log(globalDependencyValues);
        // console.log(dependencyValuesByKey);
        // console.log(arrayKeys)

        if (globalDependencyValues.independentComponentConstraints) {
          let constraintResults = {};
          let constraintUsedByComponent = {};
          for (let arrayKey of arrayKeys) {
            let varEnding = Number(arrayKey) + 1;
            let variables = {
              ['x' + varEnding]: dependencyValuesByKey[arrayKey].x,
            };
            let constraintUsed = false;

            for (let constraintChild of globalDependencyValues.constraintChildren) {
              let result =
                constraintChild.stateValues.applyComponentConstraint(variables);

              if (result.constrained) {
                variables['x' + varEnding] = result.variables['x' + varEnding];
                constraintUsed = true;
              }
            }

            constraintResults[arrayKey] = variables['x' + varEnding];
            constraintUsedByComponent[arrayKey] = constraintUsed;
          }

          return {
            newValues: {
              constraintResults,
              constraintUsedByComponent,
            },
          };
        } else {
          // apply constraint to whole array (even if just one array key requested)
          let variables = {};
          let constraintUsed = false;

          for (let arrayKey in globalDependencyValues.xs) {
            variables[`x${Number(arrayKey) + 1}`] =
              globalDependencyValues.xs[arrayKey];
          }

          for (let constraintChild of globalDependencyValues.constraintChildren) {
            let constraintResult;
            if (constraintChild.stateValues.applyConstraint) {
              constraintResult =
                constraintChild.stateValues.applyConstraint(variables);
            } else {
              constraintResult = applyConstraintFromComponentConstraints({
                variables,
                applyComponentConstraint:
                  constraintChild.stateValues.applyComponentConstraint,
              });
            }

            if (constraintResult.constrained) {
              Object.assign(variables, constraintResult.variables);
              constraintUsed = true;
            }
          }

          let constraintResults = {};
          let constraintUsedByComponent = {};

          for (let arrayKey in globalDependencyValues.xs) {
            constraintResults[arrayKey] = variables[`x${Number(arrayKey) + 1}`];
            constraintUsedByComponent[arrayKey] = constraintUsed;
          }

          return {
            newValues: { constraintResults, constraintUsedByComponent },
          };
        }
      },

      inverseArrayDefinitionByKey: function ({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        stateValues,
        workspace,
      }) {
        // console.log('inverse definition of constraints')
        // console.log(desiredStateVariableValues);
        // console.log(globalDependencyValues)
        // console.log(stateValues)

        // Note: the idea is that we want the constrain applied even in the reverse direction
        // so that downstream variables will see the effect of the constraint

        // To accomplish this, we send the unconstrained value in desiredStateVariableValues.constrainResult
        // and will send the constraint result to the xs (or xs arrayKey) dependency

        if (globalDependencyValues.independentComponentConstraints) {
          // we applied constraint to each component separately

          let instructions = [];

          for (let arrayKey in desiredStateVariableValues.constraintResults) {
            let varEnding = Number(arrayKey) + 1;

            let variables = {
              ['x' + varEnding]: convertValueToMathExpression(
                desiredStateVariableValues.constraintResults[arrayKey],
              ),
            };

            for (let constraintChild of globalDependencyValues.constraintChildren) {
              let result =
                constraintChild.stateValues.applyComponentConstraint(variables);

              if (result.constrained) {
                variables['x' + varEnding] = result.variables['x' + varEnding];
              }
            }

            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].x,
              desiredValue: variables['x' + varEnding],
            });
          }

          return {
            success: true,
            instructions,
          };
        } else {
          // we applied constraint to whole array
          let variables = {};

          // desiredStateVariableValues.constraintResult could just a
          // subset of keys (if arrayKeys specified)
          // but we should apply constraint function to all values
          // We start with previous values of constraintResults
          // and then modify any that are in desiredStateVariableValues.constraintResults

          // accumulate different desired results from multiple passes
          if (!workspace.desiredConstraintResults) {
            workspace.desiredConstraintResults = {};
          }
          Object.assign(
            workspace.desiredConstraintResults,
            desiredStateVariableValues.constraintResults,
          );

          for (let arrayKey in stateValues.constraintResults) {
            let varEnding = Number(arrayKey) + 1;
            if (arrayKey in workspace.desiredConstraintResults) {
              variables['x' + varEnding] = convertValueToMathExpression(
                workspace.desiredConstraintResults[arrayKey],
              );
            } else {
              variables['x' + varEnding] = convertValueToMathExpression(
                stateValues.constraintResults[arrayKey],
              );
            }
          }

          for (let constraintChild of globalDependencyValues.constraintChildren) {
            let constraintResult;
            if (constraintChild.stateValues.applyConstraint) {
              constraintResult =
                constraintChild.stateValues.applyConstraint(variables);
            } else {
              constraintResult = applyConstraintFromComponentConstraints({
                variables,
                applyComponentConstraint:
                  constraintChild.stateValues.applyComponentConstraint,
              });
            }

            if (constraintResult.constrained) {
              Object.assign(variables, constraintResult.variables);
            }
          }

          let constraintResults = {};
          for (let arrayKey in workspace.desiredConstraintResults) {
            constraintResults[arrayKey] = variables[`x${Number(arrayKey) + 1}`];
          }

          return {
            success: true,
            instructions: [
              {
                setDependency: 'xs',
                desiredValue: constraintResults,
              },
            ],
          };
        }
      },
    };

    stateVariableDefinitions.constraintUsed = {
      public: true,
      componentType: 'boolean',
      returnDependencies: () => ({
        constraintUsedByComponent: {
          dependencyType: 'stateVariable',
          variableName: 'constraintUsedByComponent',
        },
      }),
      definition: function ({ dependencyValues }) {
        let constraintUsed = Object.values(
          dependencyValues.constraintUsedByComponent,
        ).some((x) => x);

        return { newValues: { constraintUsed } };
      },
    };

    return stateVariableDefinitions;
  }
}
