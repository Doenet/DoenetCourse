import CompositeComponent from './abstract/CompositeComponent';
import { LoremIpsum } from 'lorem-ipsum';
import { processAssignNames } from '../utils/serializedStateProcessing';

export default class Lorem extends CompositeComponent {
  static componentType = 'lorem';

  static assignNamesToReplacements = true;

  static stateVariableToEvaluateAfterReplacements = 'readyToExpandWhenResolved';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.minSentencesPerParagraph = {
      createComponentOfType: 'number',
      createStateVariable: 'minSentencesPerParagraph',
      defaultValue: 4,
      public: true,
    };

    attributes.maxSentencesPerParagraph = {
      createComponentOfType: 'number',
      createStateVariable: 'maxSentencesPerParagraph',
      defaultValue: 8,
      public: true,
    };

    attributes.minWordsPerSentence = {
      createComponentOfType: 'number',
      createStateVariable: 'minWordsPerSentence',
      defaultValue: 4,
      public: true,
    };

    attributes.maxWordsPerSentence = {
      createComponentOfType: 'number',
      createStateVariable: 'maxWordsPerSentence',
      defaultValue: 8,
      public: true,
    };

    attributes.generateWords = {
      createComponentOfType: 'number',
      createStateVariable: 'generateWords',
      defaultValue: null,
    };

    attributes.generateSentences = {
      createComponentOfType: 'number',
      createStateVariable: 'generateSentences',
      defaultValue: null,
    };

    attributes.generateParagraphs = {
      createComponentOfType: 'number',
      createStateVariable: 'generateParagraphs',
      defaultValue: null,
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        minSentencesPerParagraph: {
          dependencyType: 'stateVariable',
          variableName: 'minSentencesPerParagraph',
        },
        maxSentencesPerParagraph: {
          dependencyType: 'stateVariable',
          variableName: 'maxSentencesPerParagraph',
        },
        minWordsPerSentence: {
          dependencyType: 'stateVariable',
          variableName: 'minWordsPerSentence',
        },
        maxWordsPerSentence: {
          dependencyType: 'stateVariable',
          variableName: 'maxWordsPerSentence',
        },
        generateWords: {
          dependencyType: 'stateVariable',
          variableName: 'generateWords',
        },
        generateSentences: {
          dependencyType: 'stateVariable',
          variableName: 'generateSentences',
        },
        generateParagraphs: {
          dependencyType: 'stateVariable',
          variableName: 'generateParagraphs',
        },
      }),
      markStale: () => ({ updateReplacements: true }),
      definition() {
        return { newValues: { readyToExpandWhenResolved: true } };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({ component, componentInfoObjects }) {
    const lorem = new LoremIpsum({
      sentencesPerParagraph: {
        max: component.stateValues.maxSentencesPerParagraph,
        min: component.stateValues.minSentencesPerParagraph,
      },
      wordsPerSentence: {
        max: component.stateValues.maxWordsPerSentence,
        min: component.stateValues.minWordsPerSentence,
      },
      random: component.sharedParameters.selectRng,
    });

    let replacements = [];

    if (component.stateValues.generateParagraphs !== null) {
      let numParagraphs = component.stateValues.generateParagraphs;
      if (Number.isInteger(numParagraphs) && numParagraphs > 0) {
        let paragraphs = lorem.generateParagraphs(numParagraphs).split('\n');

        replacements = paragraphs.map((x) => ({
          componentType: 'p',
          children: [
            {
              componentType: 'string',
              state: { value: x },
            },
          ],
        }));
      }
    } else if (component.stateValues.generateSentences !== null) {
      let numSentences = component.stateValues.generateSentences;
      if (Number.isInteger(numSentences) && numSentences > 0) {
        let sentences = lorem.generateSentences(numSentences).split('. ');

        for (let sent of sentences.slice(0, sentences.length - 1)) {
          replacements.push({
            componentType: 'text',
            children: [
              {
                componentType: 'string',
                state: { value: sent + '.' },
              },
            ],
          });
          replacements.push({
            componentType: 'string',
            state: { value: ' ' },
          });
        }

        replacements.push({
          componentType: 'text',
          children: [
            {
              componentType: 'string',
              state: { value: sentences[sentences.length - 1] },
            },
          ],
        });
      }
    } else if (component.stateValues.generateWords !== null) {
      let numWords = component.stateValues.generateWords;

      if (Number.isInteger(numWords) && numWords > 0) {
        let words = lorem
          .generateWords(numWords)
          .split(' ')
          .map((w) => ({
            componentType: 'text',
            children: [
              {
                componentType: 'string',
                state: { value: w },
              },
            ],
          }));

        replacements.push(words[0]);

        for (let w of words.slice(1)) {
          replacements.push({
            componentType: 'string',
            state: { value: ' ' },
          });
          replacements.push(w);
        }
      }
    }

    let processResult = processAssignNames({
      assignNames: component.doenetAttributes.assignNames,
      serializedComponents: replacements,
      parentName: component.componentName,
      parentCreatesNewNamespace: component.attributes.newNamespace,
      componentInfoObjects,
    });

    return { replacements: processResult.serializedComponents };
  }

  static calculateReplacementChanges({ component, componentInfoObjects }) {
    let replacements = this.createSerializedReplacements({
      component,
      componentInfoObjects,
    });

    let replacementInstruction = {
      changeType: 'add',
      changeTopLevelReplacements: true,
      firstReplacementInd: 0,
      numberReplacementsToReplace: component.replacements.length,
      serializedReplacements: replacements.replacements,
    };

    return [replacementInstruction];
  }
}
