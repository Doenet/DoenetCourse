import ConstraintComponent from './abstract/ConstraintComponent';
import { findFiniteNumericalValue } from '../utils/math';

export default class AttractToGrid extends ConstraintComponent {
  static componentType = 'attractToGrid';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.dx = {
      createComponentOfType: 'number',
      createStateVariable: 'dx',
      defaultValue: 1,
      public: true,
    };
    attributes.dy = {
      createComponentOfType: 'number',
      createStateVariable: 'dy',
      defaultValue: 1,
      public: true,
    };
    attributes.dz = {
      createComponentOfType: 'number',
      createStateVariable: 'dz',
      defaultValue: 1,
      public: true,
    };
    attributes.xoffset = {
      createComponentOfType: 'number',
      createStateVariable: 'xoffset',
      defaultValue: 0,
      public: true,
    };
    attributes.yoffset = {
      createComponentOfType: 'number',
      createStateVariable: 'yoffset',
      defaultValue: 0,
      public: true,
    };
    attributes.zoffset = {
      createComponentOfType: 'number',
      createStateVariable: 'zoffset',
      defaultValue: 0,
      public: true,
    };
    attributes.xthreshold = {
      createComponentOfType: 'number',
      createStateVariable: 'xthreshold',
      defaultValue: 0.2,
      public: true,
    };
    attributes.ythreshold = {
      createComponentOfType: 'number',
      createStateVariable: 'ythreshold',
      defaultValue: 0.2,
      public: true,
    };
    attributes.zthreshold = {
      createComponentOfType: 'number',
      createStateVariable: 'zthreshold',
      defaultValue: 0.2,
      public: true,
    };
    attributes.includeGridlines = {
      createComponentOfType: 'boolean',
      createStateVariable: 'includeGridlines',
      defaultValue: false,
      public: true,
    };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atMostOneString',
      componentType: 'string',
      comparison: 'atMost',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.independentComponentConstraints = {
      returnDependencies: () => ({
        includeGridlines: {
          dependencyType: 'stateVariable',
          variableName: 'includeGridlines',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          independentComponentConstraints: dependencyValues.includeGridlines,
        },
      }),
    };

    // Since state variable independentComponentConstraints maybe true,
    // expect function applyComponentConstraint to be called with
    // a single component value as the object, for example,  {x1: 13}

    // use the convention of x1, x2, and x3 for variable names
    // so that components can call constraints generically for n-dimensions
    // use x,y,z for properties so that authors can use the more familar tag names
    stateVariableDefinitions.applyComponentConstraint = {
      returnDependencies: () => ({
        dx: {
          dependencyType: 'stateVariable',
          variableName: 'dx',
        },
        dy: {
          dependencyType: 'stateVariable',
          variableName: 'dy',
        },
        dz: {
          dependencyType: 'stateVariable',
          variableName: 'dz',
        },
        xoffset: {
          dependencyType: 'stateVariable',
          variableName: 'xoffset',
        },
        yoffset: {
          dependencyType: 'stateVariable',
          variableName: 'yoffset',
        },
        zoffset: {
          dependencyType: 'stateVariable',
          variableName: 'zoffset',
        },
        xthreshold: {
          dependencyType: 'stateVariable',
          variableName: 'xthreshold',
        },
        ythreshold: {
          dependencyType: 'stateVariable',
          variableName: 'ythreshold',
        },
        zthreshold: {
          dependencyType: 'stateVariable',
          variableName: 'zthreshold',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          applyComponentConstraint: function (variables) {
            // if given the value of x1, apply to constraint to x1
            // and ignore any other arguments (which shouldn't be given)
            if ('x1' in variables) {
              let x1 = findFiniteNumericalValue(variables.x1);
              // if found a non-numerical value, return no constraint
              if (!Number.isFinite(x1)) {
                return {};
              }

              let dx = dependencyValues.dx;
              let xoffset = dependencyValues.xoffset;
              let x1grid =
                Math.round((variables.x1 - xoffset) / dx) * dx + xoffset;

              if (
                Number.isFinite(x1grid) &&
                Math.abs(variables.x1 - x1grid) < dependencyValues.xthreshold
              ) {
                return {
                  constrained: true,
                  variables: { x1: x1grid },
                };
              } else {
                return {};
              }
            }

            // if given the value of x2, apply to constraint to x2
            // and ignore any other arguments (which shouldn't be given)
            if ('x2' in variables) {
              let x2 = findFiniteNumericalValue(variables.x2);
              // if found a non-numerical value, return no constraint
              if (!Number.isFinite(x2)) {
                return {};
              }

              let dy = dependencyValues.dy;
              let yoffset = dependencyValues.yoffset;
              let x2grid =
                Math.round((variables.x2 - yoffset) / dy) * dy + yoffset;
              if (
                Number.isFinite(x2grid) &&
                Math.abs(variables.x2 - x2grid) < dependencyValues.ythreshold
              ) {
                return {
                  constrained: true,
                  variables: { x2: x2grid },
                };
              } else {
                return {};
              }
            }

            // if given the value of x3, apply to constraint to x3
            // and ignore any other arguments (which shouldn't be given)
            if ('x3' in variables) {
              let x3 = findFiniteNumericalValue(variables.x3);
              // if found a non-numerical value, return no constraint
              if (!Number.isFinite(x3)) {
                return {};
              }

              let dz = dependencyValues.dz;
              let zoffset = dependencyValues.zoffset;
              let x3grid =
                Math.round((variables.x3 - zoffset) / dz) * dz + zoffset;
              if (
                Number.isFinite(x3grid) &&
                Math.abs(variables.x3 - x3grid) < dependencyValues.zthreshold
              ) {
                return {
                  constrained: true,
                  variables: { x3: x3grid },
                };
              } else {
                return {};
              }
            }

            // if didn't get x1, x2, or x3 as argument, don't constrain anything
            return {};
          },
        },
      }),
    };

    stateVariableDefinitions.applyConstraint = {
      returnDependencies: () => ({
        dx: {
          dependencyType: 'stateVariable',
          variableName: 'dx',
        },
        dy: {
          dependencyType: 'stateVariable',
          variableName: 'dy',
        },
        dz: {
          dependencyType: 'stateVariable',
          variableName: 'dz',
        },
        xoffset: {
          dependencyType: 'stateVariable',
          variableName: 'xoffset',
        },
        yoffset: {
          dependencyType: 'stateVariable',
          variableName: 'yoffset',
        },
        zoffset: {
          dependencyType: 'stateVariable',
          variableName: 'zoffset',
        },
        xthreshold: {
          dependencyType: 'stateVariable',
          variableName: 'xthreshold',
        },
        ythreshold: {
          dependencyType: 'stateVariable',
          variableName: 'ythreshold',
        },
        zthreshold: {
          dependencyType: 'stateVariable',
          variableName: 'zthreshold',
        },
        includeGridlines: {
          dependencyType: 'stateVariable',
          variableName: 'includeGridlines',
        },
        applyComponentConstraint: {
          dependencyType: 'stateVariable',
          variableName: 'applyComponentConstraint',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          applyConstraint: function (variables) {
            let newVariables = {};
            let constrained = false;

            for (let varName in variables) {
              let result = dependencyValues.applyComponentConstraint({
                [varName]: variables[varName],
              });
              if (result.constrained) {
                constrained = true;
                newVariables[varName] = result.variables[varName];
              }
            }

            if (!constrained) {
              return {};
            }

            if (!dependencyValues.includeGridlines) {
              // if didn't specify to include gridlines
              // then don't constrain unless all variables were constrained
              if (variables.x1 !== undefined && newVariables.x1 === undefined) {
                return {};
              }
              if (variables.x2 !== undefined && newVariables.x2 === undefined) {
                return {};
              }
              if (variables.x3 !== undefined && newVariables.x3 === undefined) {
                return {};
              }
            }

            return {
              constrained,
              variables: newVariables,
            };
          },
        },
      }),
    };

    return stateVariableDefinitions;
  }
}
