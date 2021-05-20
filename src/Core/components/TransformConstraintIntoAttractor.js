import ConstraintComponent from './abstract/ConstraintComponent';
import { findFiniteNumericalValue } from '../utils/math';
import { applyConstraintFromComponentConstraints } from '../utils/constraints';

export default class TransformConstraintIntoAttractor extends ConstraintComponent {
  static componentType = 'transformConstraintIntoAttractor';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.threshold = {
      createComponentOfType: 'number',
      createStateVariable: 'threshold',
      defaultValue: 0.5,
      public: true,
    };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'exactlyOneConstraint',
      componentType: '_constraint',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.applyConstraint = {
      returnDependencies: () => ({
        constraintChild: {
          dependencyType: 'child',
          childLogicName: 'exactlyOneConstraint',
          variableNames: ['applyConstraint', 'applyComponentConstraint'],
          variablesOptional: true,
        },
        independentComponentConstraints: {
          dependencyType: 'stateVariable',
          variableName: 'independentComponentConstraints',
        },
        threshold: {
          dependencyType: 'stateVariable',
          variableName: 'threshold',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          applyConstraint: function (variables) {
            let constraintResult;

            let constraintChild = dependencyValues.constraintChild[0];
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

            let distance2 = 0;

            for (let varname in constraintResult.variables) {
              // since, for now, have a distance function only for numerical values,
              // skip if don't have numerical values
              let originalVar = findFiniteNumericalValue(variables[varname]);
              let constrainedVar = findFiniteNumericalValue(
                constraintResult.variables[varname],
              );

              if (
                !Number.isFinite(originalVar) ||
                !Number.isFinite(constrainedVar)
              ) {
                return {};
              }

              distance2 += Math.pow(originalVar - constrainedVar, 2);
            }

            if (
              distance2 >
              dependencyValues.threshold * dependencyValues.threshold
            ) {
              return {};
            }

            return constraintResult;
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}
