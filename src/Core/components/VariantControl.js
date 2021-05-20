import BaseComponent from './abstract/BaseComponent';

export default class VariantControl extends BaseComponent {
  static componentType = 'variantControl';
  static rendererType = undefined;

  static createsVariants = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.nVariants = {
      createComponentOfType: 'number',
      createStateVariable: 'nVariants',
      defaultValue: 100,
      public: true,
    };
    attributes.uniqueVariants = {
      createComponentOfType: 'boolean',
      createStateVariable: 'uniqueVariants',
      defaultValue: false,
      public: true,
    };

    // base component has variants as a attribute
    // but want to treat variants separately here
    attributes.variants = {
      createComponentOfType: 'variants',
    };

    attributes.seeds = {
      createComponentOfType: 'seeds',
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nVariantsSpecified = {
      returnDependencies: ({ sharedParameters }) => ({
        uniqueVariants: {
          dependencyType: 'stateVariable',
          variableName: 'uniqueVariants',
        },
        numberOfVariantsFromSharedParameters: {
          dependencyType: 'value',
          value: sharedParameters.numberOfVariantsFromSharedParameters,
        },
        nVariants: {
          dependencyType: 'stateVariable',
          variableName: 'nVariants',
        },
      }),
      definition: function ({ dependencyValues }) {
        let nVariantsSpecified = dependencyValues.nVariants;

        if (nVariantsSpecified < 1) {
          nVariantsSpecified = 1;
        }

        // if have unique variants, then shared parameters
        // should be an override for the number of variants
        if (dependencyValues.uniqueVariants) {
          if (
            dependencyValues.numberOfVariantsFromSharedParameters !== undefined
          ) {
            nVariantsSpecified =
              dependencyValues.numberOfVariantsFromSharedParameters;
          } else {
            console.log('Restricting to unique variants was not successful');
          }
        }

        return { newValues: { nVariantsSpecified } };
      },
    };

    stateVariableDefinitions.nSeeds = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        seedsAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'seeds',
          variableNames: ['nSeeds'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.seedsAttr !== null) {
          return {
            newValues: {
              nSeeds: dependencyValues.seedsAttr.stateValues.nSeeds,
            },
          };
        } else {
          return { newValues: { nSeeds: 0 } };
        }
      },
    };

    stateVariableDefinitions.seeds = {
      public: true,
      componentType: 'seed',
      isArray: true,
      entryPrefixes: ['seed'],
      returnArraySizeDependencies: () => ({
        nSeeds: {
          dependencyType: 'stateVariable',
          variableName: 'nSeeds',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nSeeds];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            seedsAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'seeds',
              variableNames: ['seed' + (Number(arrayKey) + 1)],
            },
          };
        }
        return { dependenciesByKey };
      },
      arrayDefinitionByKey: function ({ dependencyValuesByKey, arrayKeys }) {
        let seeds = {};
        for (let arrayKey of arrayKeys) {
          if (dependencyValuesByKey[arrayKey].seedsAttr !== null) {
            seeds[arrayKey] =
              dependencyValuesByKey[arrayKey].seedsAttr.stateValues[
                'seed' + (Number(arrayKey) + 1)
              ];
          }
        }
        return { newValues: { seeds } };
      },
    };

    stateVariableDefinitions.originalVariants = {
      returnDependencies: () => ({
        variantsAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'variants',
          variableNames: ['variants'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let originalVariants = [];
        if (dependencyValues.variantsAttr !== null) {
          originalVariants = dependencyValues.variantsAttr.stateValues.variants;
        }
        return { newValues: { originalVariants } };
      },
    };

    stateVariableDefinitions.variants = {
      public: true,
      componentType: 'variant',
      isArray: true,
      entryPrefixes: ['variant'],
      returnArraySizeDependencies: () => ({
        nVariantsSpecified: {
          dependencyType: 'stateVariable',
          variableName: 'nVariantsSpecified',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nVariantsSpecified];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          originalVariants: {
            dependencyType: 'stateVariable',
            variableName: 'originalVariants',
          },
          nVariantsSpecified: {
            dependencyType: 'stateVariable',
            variableName: 'nVariantsSpecified',
          },
        };
        return { globalDependencies };
      },
      arrayDefinitionByKey: function ({ globalDependencyValues, arrayKeys }) {
        // if fewer variants specified than nVariantsSpecified, find additional variants
        // try variants, n, n+1, ...., nVariantsSpecified, (converted to letters)
        // except skipping variants that are already in original variants
        let variants = [...globalDependencyValues.originalVariants];
        let variantNumber = variants.length;
        let variantValue = variantNumber - 1;
        let variantString;
        while (variantNumber < globalDependencyValues.nVariantsSpecified) {
          variantNumber++;
          variantValue++;
          variantString = numberToLowercaseLetters(variantValue);
          while (
            globalDependencyValues.originalVariants.includes(variantString)
          ) {
            variantValue++;
            variantString = numberToLowercaseLetters(variantValue);
          }
          variants.push(variantString);
        }

        return { newValues: { variants } };
      },
    };

    stateVariableDefinitions.selectedVariantNumber = {
      public: true,
      componentType: 'number',
      immutable: true,
      returnDependencies: ({ sharedParameters }) => ({
        // essentialSelectedVariantNumber: {
        //   dependencyType: "potentialEssentialVariable",
        //   variableName: "selectedVariantNumber",
        // },
        variantsObject: {
          dependencyType: 'variants',
        },
        originalVariants: {
          dependencyType: 'stateVariable',
          variableName: 'originalVariants',
        },
        variants: {
          dependencyType: 'stateVariable',
          variableName: 'variants',
        },
        nVariantsSpecified: {
          dependencyType: 'stateVariable',
          variableName: 'nVariantsSpecified',
        },
        hashStringToInteger: {
          dependencyType: 'value',
          value: sharedParameters.hashStringToInteger,
        },
        selectRng: {
          dependencyType: 'value',
          value: sharedParameters.selectRng,
          doNotProxy: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        // determine how variant will be selected.
        // Use the first of these options that is available
        // 1. if selectedVariantNumber is an essential state variable
        //    then use that variantNumber
        // 2. if variants.desiredVariantNumber is defined and is a valid index,
        //    then use that for variantNumber
        // 3. if variants.desiredVariant is defined and is a valid variant
        //    then use the variantNumber corresponding to that value
        // 4. else, random generate variantNumber

        // if (dependencyValues.essentialSelectedVariantNumber !== null) {
        //   return {
        //     makeEssential: ["selectedVariantNumber"],
        //     newValues: {
        //       selectedVariantNumber: dependencyValues.essentialSelectedVariantNumber
        //     }
        //   }
        // }

        // no essential state variable, so try to find desiredVariant
        if (dependencyValues.variantsObject !== undefined) {
          if (
            dependencyValues.variantsObject.desiredVariantNumber !== undefined
          ) {
            let desiredVariantNumber = Number(
              dependencyValues.variantsObject.desiredVariantNumber,
            );
            if (!Number.isInteger(desiredVariantNumber)) {
              throw Error(
                'Variant number ' +
                  dependencyValues.variantsObject.desiredVariantNumber +
                  ' must be an integer',
              );
            } else {
              let selectedVariantNumber =
                desiredVariantNumber % dependencyValues.nVariantsSpecified;
              if (selectedVariantNumber < 0) {
                selectedVariantNumber += dependencyValues.nVariantsSpecified;
              }
              return {
                makeEssential: { selectedVariantNumber: true },
                newValues: { selectedVariantNumber },
              };
            }
          }
          if (dependencyValues.variantsObject.desiredVariant !== undefined) {
            if (
              typeof dependencyValues.variantsObject.desiredVariant === 'string'
            ) {
              // want case insensitive test, so convert to lower case
              // treat originalVariants separately so don't have to lower case
              // remaining variants, which are alread lowercase
              let originalLowerCaseVariants =
                dependencyValues.originalVariants.map((x) => x.toLowerCase());
              let lowerCaseVariants = [
                ...originalLowerCaseVariants,
                ...dependencyValues.variants.slice(
                  originalLowerCaseVariants.length,
                ),
              ];
              let desiredNumber = lowerCaseVariants.indexOf(
                dependencyValues.variantsObject.desiredVariant.toLowerCase(),
              );
              if (desiredNumber !== -1) {
                return {
                  makeEssential: { selectedVariantNumber: true },
                  newValues: { selectedVariantNumber: desiredNumber },
                };
              }
            }
            console.log(
              'Variant ' +
                dependencyValues.variantsObject.desiredVariant +
                ' is not valid, convert to variant index',
            );
            let selectedVariantNumber = Math.abs(
              dependencyValues.hashStringToInteger(
                JSON.stringify(dependencyValues.variantsObject.desiredVariant),
              ) % dependencyValues.nVariantsSpecified,
            );
            return {
              makeEssential: { selectedVariantNumber: true },
              newValues: { selectedVariantNumber },
            };
          }
        }

        // randomly pick variant number using random number generator
        // from shared parameters

        // random number in [0, 1)
        let rand = dependencyValues.selectRng();
        // random integer from 0 to nVariants-1
        let selectedVariantNumber = Math.floor(
          rand * dependencyValues.nVariantsSpecified,
        );

        return {
          makeEssential: { selectedVariantNumber: true },
          newValues: { selectedVariantNumber },
        };
      },
    };

    stateVariableDefinitions.selectedVariant = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        variants: {
          dependencyType: 'stateVariable',
          variableName: 'variants',
        },
        selectedVariantNumber: {
          dependencyType: 'stateVariable',
          variableName: 'selectedVariantNumber',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            selectedVariant:
              dependencyValues.variants[dependencyValues.selectedVariantNumber],
          },
        };
      },
    };

    stateVariableDefinitions.selectedSeed = {
      returnDependencies: () => ({
        selectedVariantNumber: {
          dependencyType: 'stateVariable',
          variableName: 'selectedVariantNumber',
        },
        seeds: {
          dependencyType: 'stateVariable',
          variableName: 'seeds',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (
          dependencyValues.selectedVariantNumber < dependencyValues.seeds.length
        ) {
          return {
            newValues: {
              selectedSeed:
                dependencyValues.seeds[dependencyValues.selectedVariantNumber],
            },
          };
        }

        // if fewer seeds than selectedVariantNumber, find additional seeds
        // try seeds, n+1, n+2, ...., selectedVariantNumber
        // except skipping seeds that are already in original seeds
        let seedNumber = dependencyValues.seeds.length - 1;
        let seedValue = seedNumber + 1;
        let seedString;
        while (seedNumber < dependencyValues.selectedVariantNumber) {
          seedNumber++;
          seedValue++;
          seedString = seedValue.toString();
          while (dependencyValues.seeds.includes(seedString)) {
            seedValue++;
            seedString = seedValue.toString();
          }
        }
        return { newValues: { selectedSeed: seedString } };
      },
    };

    stateVariableDefinitions.convertedSeed = {
      returnDependencies: ({ sharedParameters }) => ({
        selectedSeed: {
          dependencyType: 'stateVariable',
          variableName: 'selectedSeed',
        },
        hashStringToInteger: {
          dependencyType: 'value',
          value: sharedParameters.hashStringToInteger,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          convertedSeed: dependencyValues.hashStringToInteger(
            dependencyValues.selectedSeed,
          ),
        },
      }),
    };

    stateVariableDefinitions.selectRng = {
      returnDependencies: ({ sharedParameters }) => ({
        convertedSeed: {
          dependencyType: 'stateVariable',
          variableName: 'convertedSeed',
        },
        rngClass: {
          dependencyType: 'value',
          value: sharedParameters.rngClass,
          doNotProxy: true,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          selectRng: new dependencyValues.rngClass(
            dependencyValues.convertedSeed,
          ),
        },
      }),
    };

    return stateVariableDefinitions;
  }
}

function numberToLowercaseLetters(number) {
  let letters = '';
  while (true) {
    let nextNum = number % 26;
    letters = String.fromCharCode(97 + nextNum) + letters;
    if (number < 26) {
      break;
    }
    number = Math.floor(number / 26) - 1;
  }
  return letters;
}
