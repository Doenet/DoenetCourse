import Input from './abstract/Input';

export default class Textinput extends Input {
  constructor(args) {
    super(args);

    this.actions = {
      updateImmediateValue: this.updateImmediateValue.bind(
        new Proxy(this, this.readOnlyProxyHandler),
      ),
      updateValue: this.updateValue.bind(
        new Proxy(this, this.readOnlyProxyHandler),
      ),
    };

    //Complex because the stateValues isn't defined until later
    Object.defineProperty(this.actions, 'submitAnswer', {
      get: function () {
        if (this.stateValues.answerAncestor !== null) {
          if (
            this.stateValues.answerAncestor.stateValues
              .submitAllAnswersAtAncestor !== null
          ) {
            return () =>
              this.coreFunctions.requestAction({
                componentName:
                  this.stateValues.answerAncestor.stateValues
                    .submitAllAnswersAtAncestor,
                actionName: 'submitAllAnswers',
              });
          } else {
            return () =>
              this.coreFunctions.requestAction({
                componentName: this.stateValues.answerAncestor.componentName,
                actionName: 'submitAnswer',
              });
          }
        } else {
          return () => null;
        }
      }.bind(this),
    });
  }
  static componentType = 'textInput';

  static variableForPlainMacro = 'value';

  static get stateVariablesShadowedForReference() {
    return ['value'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.prefill = {
      createComponentOfType: 'text',
      createStateVariable: 'prefill',
      defaultValue: '',
      public: true,
    };
    attributes.size = {
      createComponentOfType: 'number',
      createStateVariable: 'size',
      defaultValue: 10,
      forRenderer: true,
      public: true,
    };
    attributes.bindValueTo = {
      createComponentOfType: 'text',
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.value = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        bindValueTo: {
          dependencyType: 'attributeComponent',
          attributeName: 'bindValueTo',
          variableNames: ['value'],
        },
        prefill: {
          dependencyType: 'stateVariable',
          variableName: 'prefill',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (!dependencyValues.bindValueTo) {
          return {
            useEssentialOrDefaultValue: {
              value: {
                variablesToCheck: 'value',
                defaultValue: dependencyValues.prefill,
              },
            },
          };
        }
        return {
          newValues: { value: dependencyValues.bindValueTo.stateValues.value },
        };
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
      }) {
        if (dependencyValues.bindValueTo) {
          return {
            success: true,
            instructions: [
              {
                setDependency: 'bindValueTo',
                desiredValue: desiredStateVariableValues.value,
                variableIndex: 0,
              },
            ],
          };
        }
        // no children, so value is essential and give it the desired value
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'value',
              value: desiredStateVariableValues.value,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.immediateValue = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition: function ({ dependencyValues, changes }) {
        // console.log(`definition of immediateValue`)
        // console.log(dependencyValues)
        // console.log(changes);

        if (changes.value) {
          // only update to value when it changes
          // (otherwise, let its essential value change)
          return {
            newValues: { immediateValue: dependencyValues.value },
            makeEssential: { immediateValue: true },
          };
        } else {
          return {
            useEssentialOrDefaultValue: {
              immediateValue: {
                variablesToCheck: 'immediateValue',
                defaultValue: dependencyValues.value,
              },
            },
          };
        }
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        initialChange,
        shadowedVariable,
      }) {
        // value is essential; give it the desired value
        let instructions = [
          {
            setStateVariable: 'immediateValue',
            value: desiredStateVariableValues.immediateValue,
          },
        ];

        // if from outside sources, also set value
        if (!(initialChange || shadowedVariable)) {
          instructions.push({
            setDependency: 'value',
            desiredValue: desiredStateVariableValues.immediateValue,
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition: function ({ dependencyValues }) {
        return { newValues: { text: dependencyValues.value } };
      },
    };

    stateVariableDefinitions.componentType = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { componentType: 'text' } }),
    };

    return stateVariableDefinitions;
  }

  updateImmediateValue({ text }) {
    if (!this.stateValues.disabled) {
      this.coreFunctions.requestUpdate({
        updateInstructions: [
          {
            updateType: 'updateValue',
            componentName: this.componentName,
            stateVariable: 'immediateValue',
            value: text,
          },
        ],
      });
    }
  }

  updateValue() {
    if (!this.stateValues.disabled) {
      let updateInstructions = [
        {
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'value',
          value: this.stateValues.immediateValue,
        },
        // in case value ended up being a different value than requested
        // we set immediate value to whatever was the result
        // (hence the need to execute update first)
        // Also, this makes sure immediateValue is saved to the database,
        // since in updateImmediateValue, immediateValue is note saved to database
        {
          updateType: 'executeUpdate',
        },
        {
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'immediateValue',
          valueOfStateVariable: 'value',
        },
      ];

      let event = {
        verb: 'answered',
        object: {
          componentName: this.componentName,
          componentType: this.componentType,
        },
        result: {
          response: this.stateValues.immediateValue,
          responseText: this.stateValues.immediateValue,
        },
      };

      if (this.stateValues.answerAncestor) {
        event.context = {
          answerAncestor: this.stateValues.answerAncestor.componentName,
        };
      }

      this.coreFunctions.requestUpdate({
        updateInstructions,
        event,
      });
    }
  }
}
