import ConstraintComponent from './abstract/ConstraintComponent';
import { findFiniteNumericalValue } from '../utils/math';
import { applyConstraintFromComponentConstraints } from '../utils/constraints';

export default class ConstraintUnion extends ConstraintComponent {
  static componentType = 'constraintUnion';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastOneConstraint',
      componentType: '_constraint',
      comparison: 'atLeast',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.applyConstraint = {
      returnDependencies: () => ({
        constraintChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneConstraint',
          variableNames: ['applyConstraint', 'applyComponentConstraint'],
          variablesOptional: true,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          applyConstraint: function (variables) {
            let constraintResult;

            if (dependencyValues.constraintChildren.length === 1) {
              let constraintChild = dependencyValues.constraintChildren[0];
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
              return constraintResult;
            }

            let closestDistance2 = Infinity;
            let closestResult = {};

            let closestInd;

            for (let [
              ind,
              constraintChild,
            ] of dependencyValues.constraintChildren.entries()) {
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

              if (!constraintResult.constrained) {
                continue;
              }

              let distance2 = 0;

              for (let varname in constraintResult.variables) {
                // since, for now, have a distance function only for numerical values,
                // skip any constraints where don't have numerical values
                let originalVar = findFiniteNumericalValue(variables[varname]);
                let constrainedVar = findFiniteNumericalValue(
                  constraintResult.variables[varname],
                );

                if (
                  !Number.isFinite(originalVar) ||
                  !Number.isFinite(constrainedVar)
                ) {
                  distance2 = Infinity;
                  break;
                }

                distance2 += Math.pow(originalVar - constrainedVar, 2);
              }

              if (distance2 < closestDistance2) {
                closestResult = constraintResult;
                closestInd = ind + 1;
                closestDistance2 = distance2;
              }
            }

            if (closestInd === undefined) {
              return {};
            }

            // prepend closestInd to constraintIndices;
            if (closestResult.constraintIndices === undefined) {
              closestResult.constraintIndices = [closestInd];
            } else {
              closestResult.constraintIndices = [
                closestInd,
                ...closestResult.constraintIndices,
              ];
            }
            return closestResult;
          },
        },
      }),
    };
    return stateVariableDefinitions;
  }
}
