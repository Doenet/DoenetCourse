import Text from './Text';
import nlp from 'compromise';
import compromise_numbers from 'compromise-numbers';

import { renameStateVariable } from '../utils/stateVariables';

nlp.extend(compromise_numbers);

export default class Pluralize extends Text {
  static componentType = 'pluralize';
  static rendererType = 'text';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.pluralForm = {
      createComponentOfType: 'text',
      createStateVariable: 'pluralForm',
      defaultValue: null,
      public: true,
    };
    attributes.basedOnNumber = {
      createComponentOfType: 'number',
      createStateVariable: 'basedOnNumber',
      defaultValue: null,
      public: true,
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    // rename unnormalizedValue to unnormalizedValuePreOperator
    renameStateVariable({
      stateVariableDefinitions,
      oldName: 'value',
      newName: 'valuePrePluralize',
    });

    stateVariableDefinitions.value = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        valuePrePluralize: {
          dependencyType: 'stateVariable',
          variableName: 'valuePrePluralize',
        },
        pluralForm: {
          dependencyType: 'stateVariable',
          variableName: 'pluralForm',
        },
        basedOnNumber: {
          dependencyType: 'stateVariable',
          variableName: 'basedOnNumber',
        },
      }),
      definition: function ({ dependencyValues }) {
        let text = nlp(dependencyValues.valuePrePluralize);

        let allwords = text.values().toNumber().all().terms().json();

        if (allwords.length === 0) {
          return { newValues: { value: dependencyValues.valuePrePluralize } };
        }

        let makePlural;
        if (dependencyValues.basedOnNumber !== null) {
          makePlural = numberDesignatesPlural(dependencyValues.basedOnNumber);
        }

        if (allwords.length === 1) {
          // if have just one word, assume it is the noun to pluralize

          // if didn't have basedOnNumber, make it plural
          if (makePlural === undefined) {
            makePlural = true;
          }

          if (!makePlural) {
            return { newValues: { value: dependencyValues.valuePrePluralize } };
          }

          // if have pluralForm, the one word should be turned into the pluralForm
          if (dependencyValues.pluralForm !== null) {
            return {
              newValues: {
                value: dependencyValues.pluralForm,
              },
            };
          } else {
            // attempt to pluralize via nlp
            return {
              newValues: {
                value: text.nouns().toPlural().all().out('text'),
              },
            };
          }
        }

        // have more than one word
        // if don't have basedOnNumber, look for numbers before nouns to determine if plurals
        if (makePlural === undefined) {
          // find indices in allwords of nouns and values
          let nounIndices = [];
          let valueIndices = [];

          let nouns = text.nouns().json();

          for (let [ind, word] of allwords.entries()) {
            let nextNoun = nouns[nounIndices.length];

            if (word.terms[0].tags.includes('Value')) {
              valueIndices.push(ind);
            }
            if (nextNoun !== undefined && nextNoun.text === word.text) {
              nounIndices.push(ind);
            }
          }

          // specify make plural by each noun.
          // use the value immediately preceeding
          makePlural = [];

          let numbers = text.values().numbers().json();

          let lastValueInd = -1;
          for (let ind of nounIndices) {
            while (Number(valueIndices[lastValueInd + 1]) < Number(ind)) {
              lastValueInd++;
            }

            if (
              numbers[lastValueInd] &&
              numberDesignatesPlural(Number(numbers[lastValueInd].normal))
            ) {
              makePlural.push(true);
            } else {
              makePlural.push(false);
            }
          }
        }

        if (makePlural === false) {
          return { newValues: { value: dependencyValues.valuePrePluralize } };
        }

        // not sure why have to create new text for this to work
        let text2 = nlp(dependencyValues.valuePrePluralize);

        if (dependencyValues.pluralForm !== null) {
          // replace all nouns with plural form
          for (let [ind, nounObj] of text.nouns().data().entries()) {
            if (makePlural === true || makePlural[ind] === true) {
              text2.replace(nounObj.text, dependencyValues.pluralForm);
            }
          }
        } else {
          let numNouns = text.nouns().json().length;
          for (let ind = 0; ind < numNouns; ind++) {
            if (makePlural === true || makePlural[ind] === true) {
              text2.nouns(ind).toPlural().all();
            }
          }
        }
        return {
          newValues: {
            value: text2.out('text'),
          },
        };
      },
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { text: dependencyValues.value },
      }),
    };

    return stateVariableDefinitions;
  }
}

function numberDesignatesPlural(num) {
  return num !== 1;
}
