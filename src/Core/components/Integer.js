import NumberComponent from './Number';
import me from 'math-expressions';
import { textToAst } from '../utils/math';

export default class Integer extends NumberComponent {
  static componentType = 'integer';
  static rendererType = 'number';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.value.definition = function ({
      dependencyValues,
    }) {
      if (dependencyValues.numberChild.length === 0) {
        if (dependencyValues.stringChild.length === 0) {
          return {
            useEssentialOrDefaultValue: {
              value: { variablesToCheck: ['value'] },
            },
          };
        }
        let number = Number(dependencyValues.stringChild[0].stateValues.value);
        if (Number.isNaN(number)) {
          try {
            number = me
              .fromAst(
                textToAst.convert(
                  dependencyValues.stringChild[0].stateValues.value,
                ),
              )
              .evaluate_to_constant();
            if (number === null) {
              number = NaN;
            }
          } catch (e) {
            number = NaN;
          }
        }
        return { newValues: { value: Math.round(number) } };
      } else {
        return {
          newValues: {
            value: Math.round(
              dependencyValues.numberChild[0].stateValues.value,
            ),
          },
        };
      }
    };

    stateVariableDefinitions.value.inverseDefinition = function ({
      desiredStateVariableValues,
      dependencyValues,
      stateValues,
    }) {
      if (!stateValues.canBeModified) {
        return { success: false };
      }

      let desiredValue = desiredStateVariableValues.value;
      if (desiredValue instanceof me.class) {
        desiredValue = desiredValue.evaluate_to_constant();
      } else {
        desiredValue = Number(desiredValue);
      }
      desiredValue = Math.round(desiredValue);

      let instructions;

      if (dependencyValues.numberChild.length === 0) {
        if (dependencyValues.stringChild.length === 0) {
          instructions = [
            {
              setStateVariable: 'value',
              value: desiredValue,
            },
          ];
        } else {
          // TODO: would it be more efficient to defer setting value of string?
          instructions = [
            {
              setDependency: 'stringChild',
              desiredValue: desiredValue.toString(),
              childIndex: 0,
              variableIndex: 0,
            },
          ];
        }
      } else {
        instructions = [
          {
            setDependency: 'numberChild',
            desiredValue: desiredValue,
            childIndex: 0,
            variableIndex: 0,
          },
        ];
      }

      return {
        success: true,
        instructions,
      };
    };

    return stateVariableDefinitions;
  }
}
