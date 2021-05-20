import BlockComponent from './abstract/BlockComponent';
import me from 'math-expressions';

export class SideBySide extends BlockComponent {
  static componentType = 'sideBySide';
  static renderChildren = true;

  static get stateVariablesShadowedForReference() {
    return ['widths', 'margins', 'valigns'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.width = {
      createComponentOfType: '_componentSize',
    };
    attributes.widths = {
      createComponentOfType: '_componentSizeList',
    };

    attributes.margins = {
      createComponentOfType: '_componentSizeList',
    };

    attributes.valign = {
      createComponentOfType: 'text',
    };
    attributes.valigns = {
      createComponentOfType: 'textList',
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastOneBlock',
      componentType: '_block',
      comparison: 'atLeast',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nPanels = {
      forRenderer: true,
      returnDependencies: () => ({
        blockChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneBlock',
          skipComponentNames: true,
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: { nPanels: dependencyValues.blockChildren.length },
          checkForActualChange: { nPanels: true },
        };
      },
    };

    // have separate state variable for essential widths so that
    // if have a parent sbsgroup, can determine which widths have been changed
    // and so should override the parent sbsGroup width
    stateVariableDefinitions.essentialWidths = {
      isArray: true,
      entryPrefixes: ['essentialWidth'],
      defaultEntryValue: undefined,
      returnArraySizeDependencies: () => ({
        nPanels: {
          dependencyType: 'stateVariable',
          variableName: 'nPanels',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nPanels];
      },
      returnArrayDependenciesByKey: () => ({}),
      arrayDefinitionByKey({ arrayKeys }) {
        let essentialWidths = {};
        for (let arrayKey of arrayKeys) {
          essentialWidths[arrayKey] = {};
        }

        return { useEssentialOrDefaultValue: { essentialWidths } };
      },
      inverseArrayDefinitionByKey({ desiredStateVariableValues }) {
        let value = {};
        for (let arrayKey in desiredStateVariableValues.essentialWidths) {
          value[arrayKey] =
            desiredStateVariableValues.essentialWidths[arrayKey];
        }

        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'essentialWidths',
              value,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.allWidthsSpecified = {
      additionalStateVariablesDefined: [
        {
          variableName: 'widthsAbsolute',
          // public: true,
          // componentType: "boolean",
          // forRenderer: true,
        },
      ],
      returnDependencies() {
        return {
          nPanels: {
            dependencyType: 'stateVariable',
            variableName: 'nPanels',
          },
          widthAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'width',
            variableNames: ['componentSize'],
          },
          widthsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'widths',
            variableNames: ['nComponents', 'componentSizes'],
          },
          parentWidths: {
            dependencyType: 'parentStateVariable',
            parentComponentType: 'sbsGroup',
            variableName: `specifiedWidths`,
          },
          parentWidthsAbsolute: {
            dependencyType: 'parentStateVariable',
            parentComponentType: 'sbsGroup',
            variableName: `widthsAbsolute`,
          },
          essentialWidth: {
            dependencyType: 'stateVariable',
            variableName: `essentialWidths`,
          },
        };
      },
      definition({ dependencyValues }) {
        let allWidthsSpecified = [];
        let widthsAbsolute;

        let nWidthsSpecifiedFromAttrs;
        let usingSingleWidth = false;

        if (dependencyValues.widthsAttr !== null) {
          nWidthsSpecifiedFromAttrs =
            dependencyValues.widthsAttr.stateValues.nComponents;
        } else if (dependencyValues.widthAttr !== null) {
          nWidthsSpecifiedFromAttrs = dependencyValues.nPanels;
          usingSingleWidth = true;
        } else {
          nWidthsSpecifiedFromAttrs = 0;
        }

        for (let ind = 0; ind < dependencyValues.nPanels; ind++) {
          let thisAbsolute;

          if (ind < nWidthsSpecifiedFromAttrs) {
            if (usingSingleWidth) {
              if (dependencyValues.widthAttr.stateValues.componentSize) {
                allWidthsSpecified[ind] =
                  dependencyValues.widthAttr.stateValues.componentSize.size;
                thisAbsolute = Boolean(
                  dependencyValues.widthAttr.stateValues.componentSize
                    .isAbsolute,
                );
              } else {
                allWidthsSpecified[ind] = undefined;
              }
            } else {
              if (dependencyValues.widthsAttr.stateValues.componentSizes[ind]) {
                allWidthsSpecified[ind] =
                  dependencyValues.widthsAttr.stateValues.componentSizes[
                    ind
                  ].size;
                thisAbsolute = Boolean(
                  dependencyValues.widthsAttr.stateValues.componentSizes[ind]
                    .isAbsolute,
                );
              } else {
                allWidthsSpecified[ind] = undefined;
              }
            }
          } else {
            if (dependencyValues.parentWidths) {
              if (dependencyValues.essentialWidth[ind] === undefined) {
                allWidthsSpecified[ind] = dependencyValues.parentWidths[ind];
              } else {
                allWidthsSpecified[ind] = dependencyValues.essentialWidth[ind];
              }
              thisAbsolute = dependencyValues.parentWidthsAbsolute;
            } else {
              allWidthsSpecified[ind] = dependencyValues.essentialWidth[ind];
            }
          }

          if (widthsAbsolute === undefined) {
            widthsAbsolute = thisAbsolute;
          } else if (
            thisAbsolute !== undefined &&
            widthsAbsolute !== thisAbsolute
          ) {
            throw Error(
              `SideBySide is not implemented for absolute measurements`,
            );
            throw Error(
              `Cannot mix absolute and relative widths for sideBySide`,
            );
          }
        }

        // treat any non-numeric widths as being unspecified
        allWidthsSpecified = allWidthsSpecified.map((x) =>
          Number.isFinite(x) ? x : undefined,
        );

        return { newValues: { allWidthsSpecified, widthsAbsolute } };
      },
    };

    stateVariableDefinitions.essentialMargins = {
      isArray: true,
      entryPrefixes: ['essentialMargin'],
      defaultEntryValue: undefined,
      returnArraySizeDependencies: () => ({}),
      returnArraySize() {
        return [2];
      },
      returnArrayDependenciesByKey: () => ({}),
      arrayDefinitionByKey({ arrayKeys }) {
        let essentialMargins = {};
        for (let arrayKey of arrayKeys) {
          essentialMargins[arrayKey] = {};
        }

        return { useEssentialOrDefaultValue: { essentialMargins } };
      },
      inverseArrayDefinitionByKey({ desiredStateVariableValues }) {
        let value = {};
        for (let arrayKey in desiredStateVariableValues.essentialMargins) {
          value[arrayKey] =
            desiredStateVariableValues.essentialMargins[arrayKey];
        }

        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'essentialMargins',
              value,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.allMarginsSpecified = {
      additionalStateVariablesDefined: [
        {
          variableName: 'marginsAbsolute',
          // public: true,
          // componentType: "boolean",
          // forRenderer: true,
        },
      ],
      returnDependencies() {
        return {
          nPanels: {
            dependencyType: 'stateVariable',
            variableName: 'nPanels',
          },
          marginsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'margins',
            variableNames: ['nComponents', 'componentSizes'],
          },
          parentMargins: {
            dependencyType: 'parentStateVariable',
            parentComponentType: 'sbsGroup',
            variableName: `specifiedMargins`,
          },
          parentMarginsAbsolute: {
            dependencyType: 'parentStateVariable',
            parentComponentType: 'sbsGroup',
            variableName: `marginsAbsolute`,
          },
          essentialMargins: {
            dependencyType: 'stateVariable',
            variableName: `essentialMargins`,
          },
        };
      },
      definition({ dependencyValues }) {
        let allMarginsSpecified = [];
        let marginsAbsolute;

        if (dependencyValues.marginsAttr === null) {
          if (dependencyValues.parentMargins) {
            marginsAbsolute = dependencyValues.parentMarginsAbsolute;
            for (let ind = 0; ind < 2; ind++) {
              if (dependencyValues.essentialMargins[ind] === undefined) {
                allMarginsSpecified[ind] = dependencyValues.parentMargins[ind];
              } else {
                allMarginsSpecified[ind] =
                  dependencyValues.essentialMargins[ind];
              }
            }
          } else {
            for (let ind = 0; ind < 2; ind++) {
              allMarginsSpecified[ind] = dependencyValues.essentialMargins[ind];
            }
          }
        } else if (dependencyValues.marginsAttr.stateValues.nComponents === 0) {
          for (let ind = 0; ind < 2; ind++) {
            allMarginsSpecified[ind] = dependencyValues.essentialMargins[ind];
          }
        } else if (dependencyValues.marginsAttr.stateValues.nComponents === 1) {
          let margin;
          if (dependencyValues.marginsAttr.stateValues.componentSizes[0]) {
            margin =
              dependencyValues.marginsAttr.stateValues.componentSizes[0].size;
            if (!Number.isFinite(margin)) {
              margin = undefined;
            }
            marginsAbsolute = Boolean(
              dependencyValues.marginsAttr.stateValues.componentSizes[0]
                .isAbsolute,
            );
          }
          allMarginsSpecified = [margin, margin];
        } else {
          if (dependencyValues.marginsAttr.stateValues.componentSizes[0]) {
            // two (or more) components of marginsAttr
            marginsAbsolute = Boolean(
              dependencyValues.marginsAttr.stateValues.componentSizes[0]
                .isAbsolute,
            );
          } else {
            marginsAbsolute = false;
          }
          let secondMarginAbsolute;
          if (dependencyValues.marginsAttr.stateValues.componentSizes[1]) {
            secondMarginAbsolute = Boolean(
              dependencyValues.marginsAttr.stateValues.componentSizes[1]
                .isAbsolute,
            );
          } else {
            secondMarginAbsolute = false;
          }

          if (secondMarginAbsolute !== marginsAbsolute) {
            throw Error(
              `SideBySide is not implemented for absolute measurements`,
            );
            throw Error(
              `Cannot mix absolute and relative margins for sideBySide`,
            );
          }
          allMarginsSpecified =
            dependencyValues.marginsAttr.stateValues.componentSizes
              .slice(0, 2)
              .map((x) => (x && Number.isFinite(x.size) ? x.size : undefined));
        }

        return { newValues: { allMarginsSpecified, marginsAbsolute } };
      },
    };

    stateVariableDefinitions.absoluteMeasurements = {
      public: true,
      componentType: 'boolean',
      forRenderer: true,
      returnDependencies: () => ({
        widthsAbsolute: {
          dependencyType: 'stateVariable',
          variableName: 'widthsAbsolute',
        },
        marginsAbsolute: {
          dependencyType: 'stateVariable',
          variableName: 'marginsAbsolute',
        },
      }),
      definition({ dependencyValues }) {
        let absoluteMeasurements;
        if (dependencyValues.widthsAbsolute === undefined) {
          if (dependencyValues.marginsAbsolute === undefined) {
            absoluteMeasurements = false;
          } else {
            absoluteMeasurements = dependencyValues.marginsAbsolute;
          }
        } else {
          if (dependencyValues.marginsAbsolute === undefined) {
            absoluteMeasurements = dependencyValues.widthsAbsolute;
          } else {
            if (
              dependencyValues.widthsAbsolute !==
              dependencyValues.marginsAbsolute
            ) {
              throw Error(
                `SideBySide is not implemented for absolute measurements`,
              );
              throw Error(
                `Cannot mix absolute and relative widths and margins for sideBySide`,
              );
            }
            absoluteMeasurements = dependencyValues.widthsAbsolute;
          }
        }

        if (absoluteMeasurements === true) {
          throw Error(
            `SideBySide is not implemented for absolute measurements`,
          );
        }

        return { newValues: { absoluteMeasurements } };
      },
    };

    stateVariableDefinitions.allWidths = {
      additionalStateVariablesDefined: [
        'allMargins',
        {
          variableName: 'gapWidth',
          public: true,
          componentType: 'number',
          forRenderer: true,
        },
      ],
      returnDependencies: () => ({
        nPanels: {
          dependencyType: 'stateVariable',
          variableName: 'nPanels',
        },
        allWidthsSpecified: {
          dependencyType: 'stateVariable',
          variableName: 'allWidthsSpecified',
        },
        allMarginsSpecified: {
          dependencyType: 'stateVariable',
          variableName: 'allMarginsSpecified',
        },
        absoluteMeasurements: {
          dependencyType: 'stateVariable',
          variableName: 'absoluteMeasurements',
        },
      }),
      definition({ dependencyValues }) {
        let gapWidth = 0;
        let allWidths = [...dependencyValues.allWidthsSpecified];
        let allMargins = [...dependencyValues.allMarginsSpecified];

        let totalWidthSpecified = 0;
        let nWidthsUndefined = 0;

        for (let ind = 0; ind < dependencyValues.nPanels; ind++) {
          let width = allWidths[ind];
          if (width === undefined) {
            nWidthsUndefined++;
          } else {
            totalWidthSpecified += width;
          }
        }

        let totalMarginSpecified = 0;
        let nMarginsUndefined = 0;

        for (let ind = 0; ind < 2; ind++) {
          let margin = allMargins[ind];
          if (margin === undefined) {
            nMarginsUndefined++;
          } else {
            totalMarginSpecified += margin;
          }
        }
        totalMarginSpecified *= dependencyValues.nPanels;

        if (!dependencyValues.absoluteMeasurements) {
          if (totalWidthSpecified + totalMarginSpecified >= 100) {
            // we are already over 100%
            // anything undefined becomes width 0
            // everything else is normalized to add up to 100

            let normalization =
              100 / (totalWidthSpecified + totalMarginSpecified);
            for (let ind = 0; ind < dependencyValues.nPanels; ind++) {
              if (allWidths[ind] === undefined) {
                allWidths[ind] = 0;
              } else {
                allWidths[ind] *= normalization;
              }
            }
            for (let ind = 0; ind < 2; ind++) {
              let margin = allMargins[ind];
              if (margin === undefined) {
                allMargins[ind] = 0;
              } else {
                allMargins[ind] *= normalization;
              }
            }
          } else {
            // since we are under 100%, we try the following to get to 100%
            // 1. if there are any undefined widths,
            //    define them to be the same value that makes the total 100%
            //    and make any undefined margins be zero
            // 2. else, if there are any undefined margins,
            //    define them to be the same value that makes the total 100%
            // 3. else if there two or panels, set gapWidth to make the total 100%
            // 4. else if there is one panel, expand the right margin
            // 5. do nothing (child logic isn't satisfied)

            if (nWidthsUndefined > 0) {
              let newWidth =
                (100 - (totalWidthSpecified + totalMarginSpecified)) /
                nWidthsUndefined;
              for (let ind = 0; ind < dependencyValues.nPanels; ind++) {
                if (allWidths[ind] === undefined) {
                  allWidths[ind] = newWidth;
                }
              }

              for (let ind = 0; ind < 2; ind++) {
                let margin = allMargins[ind];
                if (margin === undefined) {
                  allMargins[ind] = 0;
                }
              }
            } else if (nMarginsUndefined > 0) {
              let newMargin =
                (100 - (totalWidthSpecified + totalMarginSpecified)) /
                (nMarginsUndefined * dependencyValues.nPanels);
              for (let ind = 0; ind < 2; ind++) {
                if (allMargins[ind] === undefined) {
                  allMargins[ind] = newMargin;
                }
              }
            } else if (dependencyValues.nPanels > 1) {
              gapWidth =
                (100 - (totalWidthSpecified + totalMarginSpecified)) /
                (dependencyValues.nPanels - 1);
            } else if (dependencyValues.nPanels === 1) {
              allMargins[1] = 100 - (allMargins[0] + allWidths[0]);
            } else {
              console.warn(
                'Invalid sideBySide, as it must have at least one block child',
              );
            }
          }
        } else {
          // we won't reach here, as we throw an error about not implementing
          // absolute measurements before get this far
        }

        return { newValues: { allWidths, allMargins, gapWidth } };
      },
    };

    stateVariableDefinitions.widths = {
      public: true,
      isArray: true,
      componentType: 'number',
      entryPrefixes: ['width'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({
        nPanels: {
          dependencyType: 'stateVariable',
          variableName: 'nPanels',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nPanels];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        // Note: only the allWidths dependency is used to calculate widths
        // The other dependencies are used in the inverse direction
        // to facilitate single keys being changed at a time
        let globalDependencies = {
          allWidths: {
            dependencyType: 'stateVariable',
            variableName: `allWidths`,
          },
          widthsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'widths',
            variableNames: [`nComponents`],
          },
          widthAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'width',
            variableNames: ['componentSize'],
          },
          absoluteMeasurements: {
            dependencyType: 'stateVariable',
            variableName: 'absoluteMeasurements',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            widthsAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'widths',
              variableNames: [`componentSize${varEnding}`],
            },
            essentialWidth: {
              dependencyType: 'stateVariable',
              variableName: `essentialWidth${varEnding}`,
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({ globalDependencyValues, arrayKeys }) {
        let widths = {};
        for (let arrayKey of arrayKeys) {
          widths[arrayKey] = globalDependencyValues.allWidths[arrayKey];
        }

        return { newValues: { widths } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        dependencyValuesByKey,
        globalDependencyValues,
        arraySize,
      }) {
        let nWidthsSpecifiedFromAttrs;
        let usingSingleWidth = false;

        if (globalDependencyValues.widthsAttr !== null) {
          nWidthsSpecifiedFromAttrs =
            globalDependencyValues.widthsAttr.stateValues.nComponents;
        } else if (globalDependencyValues.widthAttr !== null) {
          nWidthsSpecifiedFromAttrs = arraySize[0];
          usingSingleWidth = true;
        } else {
          nWidthsSpecifiedFromAttrs = 0;
        }

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.widths) {
          let arrayIndex = Number(arrayKey);

          if (arrayIndex < nWidthsSpecifiedFromAttrs) {
            if (usingSingleWidth) {
              // last one wins
              instructions.push({
                setDependency: 'widthAttr',
                desiredValue: {
                  size: desiredStateVariableValues.widths[arrayKey],
                  isAbsolute: globalDependencyValues.absoluteMeasurements,
                },
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].widthsAttr,
                desiredValue: {
                  size: desiredStateVariableValues.widths[arrayKey],
                  isAbsolute: globalDependencyValues.absoluteMeasurements,
                },
                variableIndex: 0,
              });
            }
          } else {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].essentialWidth,
              desiredValue: desiredStateVariableValues.widths[arrayKey],
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.margins = {
      public: true,
      isArray: true,
      componentType: 'number',
      entryPrefixes: ['margin'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({}),
      returnArraySize() {
        return [2];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        // Note: only the allMargins dependency is used to calculate widths
        // The other dependencies are used in the inverse direction
        // to facilitate single keys being changed at a time
        let globalDependencies = {
          allMargins: {
            dependencyType: 'stateVariable',
            variableName: `allMargins`,
          },
          marginsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'margins',
            variableNames: ['componentSize1', 'componentSize2', 'nComponents'],
          },
          absoluteMeasurements: {
            dependencyType: 'stateVariable',
            variableName: 'absoluteMeasurements',
          },
        };

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            essentialMargin: {
              dependencyType: 'stateVariable',
              variableName: `essentialMargin${varEnding}`,
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({ globalDependencyValues, arrayKeys }) {
        let margins = {};
        for (let arrayKey of arrayKeys) {
          margins[arrayKey] = globalDependencyValues.allMargins[arrayKey];
        }

        return { newValues: { margins } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyNamesByKey,
      }) {
        let instructions = [];

        if (globalDependencyValues.marginsAttr === null) {
          for (let arrayKey in desiredStateVariableValues.margins) {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].essentialMargin,
              desiredValue: desiredStateVariableValues.margins[arrayKey],
            });
          }
        } else if (
          !(
            globalDependencyValues.marginsAttr.stateValues.componentSize1 &&
            Number.isFinite(
              globalDependencyValues.marginsAttr.stateValues.componentSize1
                .size,
            )
          )
        ) {
          if ('0' in desiredStateVariableValues.margins) {
            instructions.push({
              setDependency: 'marginsAttr',
              desiredValue: {
                size: desiredStateVariableValues.margins[0],
                isAbsolute: globalDependencyValues.absoluteMeasurements,
              },
              variableIndex: 0,
            });
          } else {
            // if didn't specify the first margin, then set the first margin
            // to be equal to the second
            // (since if we didn't overwrite the non-numeric first margin,
            // the margins would still be undefined)
            instructions.push({
              setDependency: 'marginsAttr',
              desiredValue: {
                size: desiredStateVariableValues.margins[1],
                isAbsolute: globalDependencyValues.absoluteMeasurements,
              },
              variableIndex: 0,
            });
          }

          if ('1' in desiredStateVariableValues.margins) {
            if (
              globalDependencyValues.marginsAttr.stateValues.nComponents > 1
            ) {
              instructions.push({
                setDependency: 'marginsAttr',
                desiredValue: {
                  size: desiredStateVariableValues.margins[1],
                  isAbsolute: globalDependencyValues.absoluteMeasurements,
                },
                variableIndex: 1,
              });
            }
            // if didn't have a second margin specified,
            // then we are forced to be symmetric
          }
        } else {
          let symmetricMargins =
            globalDependencyValues.marginsAttr.stateValues.nComponents === 1;

          for (let arrayKey in desiredStateVariableValues.margins) {
            if (symmetricMargins) {
              // last one wins
              instructions.push({
                setDependency: 'marginsAttr',
                desiredValue: {
                  size: desiredStateVariableValues.margins[arrayKey],
                  isAbsolute: globalDependencyValues.absoluteMeasurements,
                },
                variableIndex: 0,
              });
            } else {
              let varEnding = Number(arrayKey) + 1;
              instructions.push({
                setDependency: 'marginsAttr',
                desiredValue: {
                  size: desiredStateVariableValues.margins[arrayKey],
                  isAbsolute: globalDependencyValues.absoluteMeasurements,
                },
                variableIndex: arrayKey,
              });
            }
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.essentialValigns = {
      isArray: true,
      entryPrefixes: ['essentialValign'],
      defaultEntryValue: undefined,
      returnArraySizeDependencies: () => ({
        nPanels: {
          dependencyType: 'stateVariable',
          variableName: 'nPanels',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nPanels];
      },
      returnArrayDependenciesByKey: () => ({}),
      arrayDefinitionByKey({ arrayKeys }) {
        let essentialValigns = {};
        for (let arrayKey of arrayKeys) {
          essentialValigns[arrayKey] = {};
        }

        return { useEssentialOrDefaultValue: { essentialValigns } };
      },
      inverseArrayDefinitionByKey({ desiredStateVariableValues }) {
        let value = {};
        for (let arrayKey in desiredStateVariableValues.essentialValigns) {
          value[arrayKey] =
            desiredStateVariableValues.essentialValigns[arrayKey];
        }

        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'essentialValigns',
              value,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.valigns = {
      public: true,
      isArray: true,
      componentType: 'text',
      entryPrefixes: ['valign'],
      forRenderer: true,
      returnArraySizeDependencies: () => ({
        nPanels: {
          dependencyType: 'stateVariable',
          variableName: 'nPanels',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nPanels];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          valignAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'valign',
            variableNames: ['value'],
          },
          valignsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'valigns',
            variableNames: ['nComponents'],
          },
        };
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            valignsAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'valigns',
              variableNames: [`text${varEnding}`],
            },
            parentValign: {
              dependencyType: 'parentStateVariable',
              parentComponentType: 'sbsGroup',
              variableName: `valign${varEnding}`,
            },
            parentValignAbsolute: {
              dependencyType: 'parentStateVariable',
              parentComponentType: 'sbsGroup',
              variableName: `valignAbsolute${varEnding}`,
            },
            essentialValign: {
              dependencyType: 'stateVariable',
              variableName: `essentialValign${varEnding}`,
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
        arraySize,
      }) {
        let valigns = {};

        let nValignsSpecifiedFromAttrs;
        let usingSingleValign = false;

        if (globalDependencyValues.valignsAttr !== null) {
          nValignsSpecifiedFromAttrs =
            globalDependencyValues.valignsAttr.stateValues.nComponents;
        } else if (globalDependencyValues.valignAttr !== null) {
          nValignsSpecifiedFromAttrs = arraySize[0];
          usingSingleValign = true;
        } else {
          nValignsSpecifiedFromAttrs = 0;
        }

        for (let arrayKey of arrayKeys) {
          let arrayIndex = Number(arrayKey);

          if (arrayIndex < nValignsSpecifiedFromAttrs) {
            if (usingSingleValign) {
              valigns[arrayKey] =
                globalDependencyValues.valignAttr.stateValues.value.toLowerCase();
            } else {
              let varEnding = arrayIndex + 1;
              valigns[arrayKey] =
                dependencyValuesByKey[arrayKey].valignsAttr.stateValues[
                  `text${varEnding}`
                ].toLowerCase();
            }
            if (!['top', 'middle', 'bottom'].includes(valigns[arrayKey])) {
              valigns[arrayKey] = 'top';
            }
          } else {
            if (dependencyValuesByKey[arrayKey].parentValign) {
              if (
                dependencyValuesByKey[arrayKey].essentialValign === undefined
              ) {
                valigns[arrayKey] =
                  dependencyValuesByKey[arrayKey].parentValign;
              } else {
                valigns[arrayKey] =
                  dependencyValuesByKey[arrayKey].essentialValign;
              }
            } else {
              if (
                dependencyValuesByKey[arrayKey].essentialValign === undefined
              ) {
                valigns[arrayKey] = 'top';
              } else {
                valigns[arrayKey] =
                  dependencyValuesByKey[arrayKey].essentialValign;
              }
            }
          }
        }

        return { newValues: { valigns } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        globalDependencyValues,
        arraySize,
      }) {
        let nValignsSpecifiedFromAttrs;
        let usingSingleValign = false;

        if (globalDependencyValues.valignsAttr !== null) {
          nValignsSpecifiedFromAttrs =
            globalDependencyValues.valignsAttr.stateValues.nComponents;
        } else if (globalDependencyValues.valignAttr !== null) {
          nValignsSpecifiedFromAttrs = arraySize[0];
          usingSingleValign = true;
        } else {
          nValignsSpecifiedFromAttrs = 0;
        }

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.valigns) {
          let desiredValue =
            desiredStateVariableValues.valigns[arrayKey].toLowerCase();
          if (!['top', 'middle', 'bottom'].includes(desiredValue)) {
            continue;
          }

          let arrayIndex = Number(arrayKey);

          if (arrayIndex < nValignsSpecifiedFromAttrs) {
            if (usingSingleValign) {
              // last one wins
              instructions.push({
                setDependency: 'valignAttr',
                desiredValue,
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].valignsAttr,
                desiredValue,
                variableIndex: 0,
              });
            }
          } else {
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].essentialValign,
              desiredValue,
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    return stateVariableDefinitions;
  }
}

export class SbsGroup extends BlockComponent {
  static componentType = 'sbsGroup';
  static rendererType = 'container';
  static renderChildren = true;

  static get stateVariablesShadowedForReference() {
    return ['widths', 'margins', 'valigns'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.width = {
      createComponentOfType: '_componentSize',
    };
    attributes.widths = {
      createComponentOfType: '_componentSizeList',
    };

    attributes.margins = {
      createComponentOfType: '_componentSizeList',
    };

    attributes.valign = {
      createComponentOfType: 'text',
    };
    attributes.valigns = {
      createComponentOfType: 'textList',
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroSideBySides',
      componentType: 'sideBySide',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.maxNPanelsPerRow = {
      // forRenderer: true,
      returnDependencies: () => ({
        sideBySideChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroSideBySides',
          variableNames: ['nPanels'],
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            maxNPanelsPerRow: me.math.max(
              dependencyValues.sideBySideChildren.map(
                (x) => x.stateValues.nPanels,
              ),
            ),
          },
          checkForActualChange: { maxNPanelsPerRow: true },
        };
      },
    };

    stateVariableDefinitions.specifiedWidths = {
      additionalStateVariablesDefined: [
        {
          variableName: 'widthsAbsoluteArray',
          isArray: true,
          defaultEntryValue: false,
        },
      ],
      isArray: true,
      entryPrefixes: ['specifiedWidth'],
      defaultEntryValue: undefined,
      returnArraySizeDependencies: () => ({
        maxNPanelsPerRow: {
          dependencyType: 'stateVariable',
          variableName: 'maxNPanelsPerRow',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.maxNPanelsPerRow];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          widthAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'width',
            variableNames: ['componentSize'],
          },
          widthsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'widths',
            variableNames: ['nComponents'],
          },
        };
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            widthsAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'widths',
              variableNames: [`componentSize${varEnding}`],
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
        arraySize,
      }) {
        let specifiedWidths = {};
        let widthsAbsoluteArray = {};
        let essentialWidths = {};

        let nWidthsSpecifiedFromAttrs;
        let usingSingleWidth = false;

        if (globalDependencyValues.widthsAttr !== null) {
          nWidthsSpecifiedFromAttrs =
            globalDependencyValues.widthsAttr.stateValues.nComponents;
        } else if (globalDependencyValues.widthAttr !== null) {
          nWidthsSpecifiedFromAttrs = arraySize[0];
          usingSingleWidth = true;
        } else {
          nWidthsSpecifiedFromAttrs = 0;
        }

        for (let arrayKey of arrayKeys) {
          let arrayIndex = Number(arrayKey);

          if (arrayIndex < nWidthsSpecifiedFromAttrs) {
            if (usingSingleWidth) {
              if (globalDependencyValues.widthAttr.stateValues.componentSize) {
                specifiedWidths[arrayKey] =
                  globalDependencyValues.widthAttr.stateValues.componentSize.size;
                widthsAbsoluteArray[arrayKey] =
                  globalDependencyValues.widthAttr.stateValues.componentSize.isAbsolute;
              }
            } else {
              let varEnding = arrayIndex + 1;
              let widthComponentSize =
                dependencyValuesByKey[arrayKey].widthsAttr.stateValues[
                  `componentSize${varEnding}`
                ];

              if (widthComponentSize) {
                specifiedWidths[arrayKey] = widthComponentSize.size;
                widthsAbsoluteArray[arrayKey] = widthComponentSize.isAbsolute;
              }
            }
          } else {
            essentialWidths[arrayKey] = {};
            widthsAbsoluteArray[arrayKey] = undefined;
          }
        }

        let result = { newValues: { widthsAbsoluteArray } };

        if (Object.keys(specifiedWidths).length > 0) {
          result.newValues.specifiedWidths = specifiedWidths;
        }
        if (Object.keys(essentialWidths).length > 0) {
          result.useEssentialOrDefaultValue = {
            specifiedWidths: essentialWidths,
          };
        }

        return result;
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        globalDependencyValues,
        stateValues,
        arraySize,
      }) {
        let nWidthsSpecified;
        let usingSingleWidth = false;

        if (globalDependencyValues.widthsAttr !== null) {
          nWidthsSpecified =
            globalDependencyValues.widthsAttr.stateValues.nComponents;
        } else if (globalDependencyValues.widthAttr !== null) {
          nWidthsSpecified = arraySize[0];
          usingSingleWidth = true;
        } else {
          nWidthsSpecified = 0;
        }

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.specifiedWidths) {
          let arrayIndex = Number(arrayKey);

          if (arrayIndex < nWidthsSpecified) {
            if (usingSingleWidth) {
              // last one wins
              instructions.push({
                setDependency: 'widthAttr',
                desiredValue: {
                  size: desiredStateVariableValues.specifiedWidths[arrayKey],
                  isAbsolute: stateValues.widthsAbsolute,
                },
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].widthsAttr,
                desiredValue: {
                  size: desiredStateVariableValues.specifiedWidths[arrayKey],
                  isAbsolute: stateValues.widthsAbsolute,
                },
                variableIndex: 0,
              });
            }
          } else {
            instructions.push({
              setStateVariable: 'specifiedWidths',
              value: {
                [arrayKey]:
                  desiredStateVariableValues.specifiedWidths[arrayKey],
              },
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.widthsAbsolute = {
      // public: true,
      // componentType: "boolean",
      // forRenderer: true,
      returnDependencies: () => ({
        widthsAbsoluteArray: {
          dependencyType: 'stateVariable',
          variableName: 'widthsAbsoluteArray',
        },
      }),
      definition({ dependencyValues }) {
        let widthsAbsolute;

        for (let ind in dependencyValues.widthsAbsoluteArray) {
          let thisAbsolute = dependencyValues.widthsAbsoluteArray[ind];
          if (thisAbsolute !== undefined) {
            thisAbsolute = Boolean(thisAbsolute);
            if (widthsAbsolute === undefined) {
              widthsAbsolute = thisAbsolute;
            } else if (widthsAbsolute !== thisAbsolute) {
              throw Error(
                `SbsGroup is not implemented for absolute measurements`,
              );
              throw Error(
                `Cannot mix absolute and relative widths for sbsGroup`,
              );
            }
          }
        }

        return { newValues: { widthsAbsolute } };
      },
    };

    stateVariableDefinitions.specifiedMargins = {
      additionalStateVariablesDefined: [
        {
          variableName: 'marginsAbsoluteArray',
          isArray: true,
          entryPrefixes: ['marginAbsolute'],
          defaultEntryValue: false,
        },
      ],
      isArray: true,
      entryPrefixes: ['specifiedMargin'],
      defaultEntryValue: undefined,
      returnArraySizeDependencies: () => ({}),
      returnArraySize() {
        return [2];
      },
      returnArrayDependenciesByKey() {
        let globalDependencies = {
          marginsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'margins',
            variableNames: ['componentSize1', 'componentSize2', 'nComponents'],
          },
        };
        return { globalDependencies };
      },
      arrayDefinitionByKey({ globalDependencyValues, arrayKeys }) {
        let specifiedMargins = {};
        let marginsAbsoluteArray = {};
        let essentialMargins = {};

        if (
          globalDependencyValues.marginsAttr === null ||
          globalDependencyValues.marginsAttr.stateValues.nComponents === 0
        ) {
          for (let arrayKey of arrayKeys) {
            essentialMargins[arrayKey] = {};
            marginsAbsoluteArray[arrayKey] = undefined;
          }
        } else if (
          globalDependencyValues.marginsAttr.stateValues.nComponents === 1
        ) {
          let margin, absolute;
          if (globalDependencyValues.marginsAttr.stateValues.componentSize1) {
            margin =
              globalDependencyValues.marginsAttr.stateValues.componentSize1
                .size;
            if (!Number.isFinite(margin)) {
              margin = undefined;
            }
            absolute = Boolean(
              globalDependencyValues.marginsAttr.stateValues.componentSize1
                .isAbsolute,
            );
          }
          for (let arrayKey of arrayKeys) {
            specifiedMargins[arrayKey] = margin;
            marginsAbsoluteArray[arrayKey] = absolute;
          }
        } else {
          // two (or more) components of marginsAttr
          for (let arrayKey of arrayKeys) {
            if (
              globalDependencyValues.marginsAttr.stateValues[
                `componentSize${Number(arrayKey) + 1}`
              ]
            ) {
              let margin =
                globalDependencyValues.marginsAttr.stateValues[
                  `componentSize${Number(arrayKey) + 1}`
                ].size;
              if (!Number.isFinite(margin)) {
                margin = undefined;
              }
              let absolute = Boolean(
                globalDependencyValues.marginsAttr.stateValues[
                  `componentSize${Number(arrayKey) + 1}`
                ].isAbsolute,
              );

              specifiedMargins[arrayKey] = margin;
              marginsAbsoluteArray[arrayKey] = absolute;
            }
          }
        }

        let result = { newValues: { marginsAbsoluteArray } };

        if (Object.keys(specifiedMargins).length > 0) {
          result.newValues.specifiedMargins = specifiedMargins;
        }
        if (Object.keys(essentialMargins).length > 0) {
          result.useEssentialOrDefaultValue = {
            specifiedMargins: essentialMargins,
          };
        }

        return result;
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        stateValues,
      }) {
        let instructions = [];

        if (globalDependencyValues.marginsAttr === null) {
          for (let arrayKey in desiredStateVariableValues.specifiedMargins) {
            instructions.push({
              setStateVariable: 'specifiedMargins',
              value: {
                [arrayKey]:
                  desiredStateVariableValues.specifiedMargins[arrayKey],
              },
            });
          }
        } else if (
          !(
            globalDependencyValues.marginsAttr.stateValues.componentSize1 &&
            Number.isFinite(
              globalDependencyValues.marginsAttr.stateValues.componentSize1
                .size,
            )
          )
        ) {
          if ('0' in desiredStateVariableValues.specifiedMargins) {
            instructions.push({
              setDependency: 'marginsAttr',
              desiredValue: {
                size: desiredStateVariableValues.specifiedMargins[0],
                isAbsolute: stateValues.marginsAbsolute,
              },
              variableIndex: 0,
            });
          } else {
            // if didn't specify the first margin, then set the first margin
            // to be equal to the second
            // (since if we didn't overwrite the non-numeric first margin,
            // the margins would still be undefined)
            instructions.push({
              setDependency: 'marginsAttr',
              desiredValue: {
                size: desiredStateVariableValues.specifiedMargins[1],
                isAbsolute: stateValues.marginsAbsolute,
              },
              variableIndex: 0,
            });
          }

          if ('1' in desiredStateVariableValues.specifiedMargins) {
            if (
              globalDependencyValues.marginsAttr.stateValues.nComponents > 1
            ) {
              instructions.push({
                setDependency: 'marginsAttr',
                desiredValue: {
                  size: desiredStateVariableValues.specifiedMargins[1],
                  isAbsolute: stateValues.marginsAbsolute,
                },
                variableIndex: 1,
              });
            }
            // if didn't have a second margin specified,
            // then we are forced to be symmetric
          }
        } else {
          let symmetricMargins =
            globalDependencyValues.marginsAttr.stateValues.nComponents === 1;

          for (let arrayKey in desiredStateVariableValues.specifiedMargins) {
            if (symmetricMargins) {
              // last one wins
              instructions.push({
                setDependency: 'marginsAttr',
                desiredValue: {
                  size: desiredStateVariableValues.specifiedMargins[arrayKey],
                  isAbsolute: stateValues.marginsAbsolute,
                },
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency: 'marginsAttr',
                desiredValue: {
                  size: desiredStateVariableValues.specifiedMargins[arrayKey],
                  isAbsolute: stateValues.marginsAbsolute,
                },
                variableIndex: arrayKey,
              });
            }
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.marginsAbsolute = {
      // public: true,
      // componentType: "boolean",
      // forRenderer: true,
      returnDependencies: () => ({
        marginsAbsoluteArray: {
          dependencyType: 'stateVariable',
          variableName: 'marginsAbsoluteArray',
        },
      }),
      definition({ dependencyValues }) {
        let marginsAbsolute;

        for (let ind in dependencyValues.marginsAbsoluteArray) {
          let thisAbsolute = dependencyValues.marginsAbsoluteArray[ind];
          if (thisAbsolute !== undefined) {
            thisAbsolute = Boolean(thisAbsolute);
            if (marginsAbsolute === undefined) {
              marginsAbsolute = thisAbsolute;
            } else if (marginsAbsolute !== thisAbsolute) {
              throw Error(
                `SbsGroup is not implemented for absolute measurements`,
              );
              throw Error(
                `Cannot mix absolute and relative margins for sbsGroup`,
              );
            }
          }
        }

        return { newValues: { marginsAbsolute } };
      },
    };

    stateVariableDefinitions.absoluteMeasurements = {
      public: true,
      componentType: 'boolean',
      // forRenderer: true,
      returnDependencies: () => ({
        widthsAbsolute: {
          dependencyType: 'stateVariable',
          variableName: 'widthsAbsolute',
        },
        marginsAbsolute: {
          dependencyType: 'stateVariable',
          variableName: 'marginsAbsolute',
        },
      }),
      definition({ dependencyValues }) {
        let absoluteMeasurements;
        if (dependencyValues.widthsAbsolute === undefined) {
          if (dependencyValues.marginsAbsolute === undefined) {
            absoluteMeasurements = false;
          } else {
            absoluteMeasurements = dependencyValues.marginsAbsolute;
          }
        } else {
          if (dependencyValues.marginsAbsolute === undefined) {
            absoluteMeasurements = dependencyValues.widthsAbsolute;
          } else {
            if (
              dependencyValues.widthsAbsolute !==
              dependencyValues.marginsAbsolute
            ) {
              throw Error(
                `SbsGroup is not implemented for absolute measurements`,
              );
              throw Error(
                `Cannot mix absolute and relative widths and margins for sbsGroup`,
              );
            }
            absoluteMeasurements = dependencyValues.widthsAbsolute;
          }
        }

        if (absoluteMeasurements === true) {
          throw Error(`SbsGroup is not implemented for absolute measurements`);
        }

        return { newValues: { absoluteMeasurements } };
      },
    };

    stateVariableDefinitions.allWidths = {
      additionalStateVariablesDefined: [
        'allMargins',
        {
          variableName: 'gapWidth',
          public: true,
          componentType: 'number',
          // forRenderer: true
        },
      ],
      returnDependencies: () => ({
        maxNPanelsPerRow: {
          dependencyType: 'stateVariable',
          variableName: 'maxNPanelsPerRow',
        },
        specifiedWidths: {
          dependencyType: 'stateVariable',
          variableName: 'specifiedWidths',
        },
        specifiedMargins: {
          dependencyType: 'stateVariable',
          variableName: 'specifiedMargins',
        },
        absoluteMeasurements: {
          dependencyType: 'stateVariable',
          variableName: 'absoluteMeasurements',
        },
      }),
      definition({ dependencyValues }) {
        let gapWidth = 0;
        let allWidths = [...dependencyValues.specifiedWidths];
        let allMargins = [...dependencyValues.specifiedMargins];

        let totalWidthSpecified = 0;
        let nWidthsUndefined = 0;

        for (let ind = 0; ind < dependencyValues.maxNPanelsPerRow; ind++) {
          let width = allWidths[ind];
          if (width === undefined) {
            nWidthsUndefined++;
          } else {
            totalWidthSpecified += width;
          }
        }

        let totalMarginSpecified = 0;
        let nMarginsUndefined = 0;

        for (let ind = 0; ind < 2; ind++) {
          let margin = allMargins[ind];
          if (margin === undefined) {
            nMarginsUndefined++;
          } else {
            totalMarginSpecified += margin;
          }
        }
        totalMarginSpecified *= dependencyValues.maxNPanelsPerRow;

        if (!dependencyValues.absoluteMeasurements) {
          if (totalWidthSpecified + totalMarginSpecified >= 100) {
            // we are already over 100%
            // anything undefined becomes width 0
            // everything else is normalized to add up to 100

            let normalization =
              100 / (totalWidthSpecified + totalMarginSpecified);
            for (let ind = 0; ind < dependencyValues.maxNPanelsPerRow; ind++) {
              if (allWidths[ind] === undefined) {
                allWidths[ind] = 0;
              } else {
                allWidths[ind] *= normalization;
              }
            }
            for (let ind = 0; ind < 2; ind++) {
              let margin = allMargins[ind];
              if (margin === undefined) {
                allMargins[ind] = 0;
              } else {
                allMargins[ind] *= normalization;
              }
            }
          } else {
            // since we are under 100%, we try the following to get to 100%
            // 1. if there are any undefined widths,
            //    define them to be the same value that makes the total 100%
            //    and make any undefined margins be zero
            // 2. else, if there are any undefined margins,
            //    define them to be the same value that makes the total 100%
            // 3. else if there two or panels, set gapWidth to make the total 100%
            // 4. else if there is one panel, expand the right margin
            // 5. do nothing (child logic isn't satisfied)

            if (nWidthsUndefined > 0) {
              let newWidth =
                (100 - (totalWidthSpecified + totalMarginSpecified)) /
                nWidthsUndefined;
              for (
                let ind = 0;
                ind < dependencyValues.maxNPanelsPerRow;
                ind++
              ) {
                if (allWidths[ind] === undefined) {
                  allWidths[ind] = newWidth;
                }
              }

              for (let ind = 0; ind < 2; ind++) {
                let margin = allMargins[ind];
                if (margin === undefined) {
                  allMargins[ind] = 0;
                }
              }
            } else if (nMarginsUndefined > 0) {
              let newMargin =
                (100 - (totalWidthSpecified + totalMarginSpecified)) /
                (nMarginsUndefined * dependencyValues.maxNPanelsPerRow);
              for (let ind = 0; ind < 2; ind++) {
                if (allMargins[ind] === undefined) {
                  allMargins[ind] = newMargin;
                }
              }
            } else if (dependencyValues.maxNPanelsPerRow > 1) {
              gapWidth =
                (100 - (totalWidthSpecified + totalMarginSpecified)) /
                (dependencyValues.maxNPanelsPerRow - 1);
            } else if (dependencyValues.maxNPanelsPerRow === 1) {
              allMargins[1] = 100 - (allMargins[0] + allWidths[0]);
            } else {
              console.warn(
                'Invalid sideBySide, as it must have at least one block child',
              );
            }
          }
        } else {
          // we won't reach here, as we throw an error about not implementing
          // absolute measurements before get this far
        }

        return { newValues: { allWidths, allMargins, gapWidth } };
      },
    };

    stateVariableDefinitions.widths = {
      public: true,
      isArray: true,
      componentType: 'number',
      entryPrefixes: ['width'],
      // forRenderer: true,
      returnArraySizeDependencies: () => ({
        maxNPanelsPerRow: {
          dependencyType: 'stateVariable',
          variableName: 'maxNPanelsPerRow',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.maxNPanelsPerRow];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          allWidths: {
            dependencyType: 'stateVariable',
            variableName: `allWidths`,
          },
        };

        // Note: the specifiedWidth dependency is used only in the inverse direction
        // to facilitate single keys being changed at a time
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            specifiedWidth: {
              dependencyType: 'stateVariable',
              variableName: `specifiedWidth${varEnding}`,
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({ globalDependencyValues, arrayKeys }) {
        let widths = {};
        for (let arrayKey of arrayKeys) {
          widths[arrayKey] = globalDependencyValues.allWidths[arrayKey];
        }

        return { newValues: { widths } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
      }) {
        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.widths) {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].specifiedWidth,
            desiredValue: desiredStateVariableValues.widths[arrayKey],
            variableIndex: 0,
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.margins = {
      public: true,
      isArray: true,
      componentType: 'number',
      entryPrefixes: ['margin'],
      // forRenderer: true,
      returnArraySizeDependencies: () => ({}),
      returnArraySize() {
        return [2];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          allMargins: {
            dependencyType: 'stateVariable',
            variableName: `allMargins`,
          },
        };

        // Note: the specifiedMargin dependency is used only in the inverse direction
        // to facilitate single keys being changed at a time
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            specifiedMargin: {
              dependencyType: 'stateVariable',
              variableName: `specifiedMargin${varEnding}`,
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({ globalDependencyValues, arrayKeys }) {
        let margins = {};
        for (let arrayKey of arrayKeys) {
          margins[arrayKey] = globalDependencyValues.allMargins[arrayKey];
        }

        return { newValues: { margins } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
      }) {
        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.margins) {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].specifiedMargin,
            desiredValue: desiredStateVariableValues.margins[arrayKey],
            variableIndex: 0,
          });
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.valigns = {
      public: true,
      isArray: true,
      componentType: 'text',
      entryPrefixes: ['valign'],
      defaultEntryValue: 'top',
      // forRenderer: true,
      returnArraySizeDependencies: () => ({
        maxNPanelsPerRow: {
          dependencyType: 'stateVariable',
          variableName: 'maxNPanelsPerRow',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.maxNPanelsPerRow];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          valignAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'valign',
            variableNames: ['value'],
          },
          valignsAttr: {
            dependencyType: 'attributeComponent',
            attributeName: 'valigns',
            variableNames: ['nComponents'],
          },
        };
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            valignsAttr: {
              dependencyType: 'attributeComponent',
              attributeName: 'valigns',
              variableNames: [`text${varEnding}`],
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
        arraySize,
      }) {
        let valigns = {};
        let essentialValigns = {};

        let nValignsSpecified;
        let usingSingleValign = false;

        if (globalDependencyValues.valignsAttr !== null) {
          nValignsSpecified =
            globalDependencyValues.valignsAttr.stateValues.nComponents;
        } else if (globalDependencyValues.valignAttr !== null) {
          nValignsSpecified = arraySize[0];
          usingSingleValign = true;
        } else {
          nValignsSpecified = 0;
        }

        for (let arrayKey of arrayKeys) {
          let arrayIndex = Number(arrayKey);

          if (arrayIndex < nValignsSpecified) {
            if (usingSingleValign) {
              valigns[arrayKey] =
                globalDependencyValues.valignAttr.stateValues.value.toLowerCase();
            } else {
              let varEnding = arrayIndex + 1;
              valigns[arrayKey] =
                dependencyValuesByKey[arrayKey].valignsAttr.stateValues[
                  `text${varEnding}`
                ].toLowerCase();
            }
            if (!['top', 'middle', 'bottom'].includes(valigns[arrayKey])) {
              valigns[arrayKey] = 'top';
            }
          } else {
            essentialValigns[arrayKey] = {};
          }
        }

        let result = {};

        if (Object.keys(valigns).length > 0) {
          result.newValues = { valigns };
        }
        if (Object.keys(essentialValigns).length > 0) {
          result.useEssentialOrDefaultValue = {
            valigns: essentialValigns,
          };
        }

        return result;
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
        globalDependencyValues,
        arraySize,
      }) {
        let nValignsSpecified;
        let usingSingleValign = false;

        if (globalDependencyValues.valignsAttr !== null) {
          nValignsSpecified =
            globalDependencyValues.valignsAttr.stateValues.nComponents;
        } else if (globalDependencyValues.valignAttr !== null) {
          nValignsSpecified = arraySize[0];
          usingSingleValign = true;
        } else {
          nValignsSpecified = 0;
        }

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.valigns) {
          let desiredValue =
            desiredStateVariableValues.valigns[arrayKey].toLowerCase();
          if (!['top', 'middle', 'bottom'].includes(desiredValue)) {
            continue;
          }

          let arrayIndex = Number(arrayKey);

          if (arrayIndex < nValignsSpecified) {
            if (usingSingleValign) {
              // last one wins
              instructions.push({
                setDependency: 'valignAttr',
                desiredValue,
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].valignsAttr,
                desiredValue,
                variableIndex: 0,
              });
            }
          } else {
            instructions.push({
              setStateVariable: 'valigns',
              value: { [arrayKey]: desiredValue },
            });
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    return stateVariableDefinitions;
  }
}

export class Stack extends BlockComponent {
  static componentType = 'stack';
  static rendererType = 'container';
  static renderChildren = true;

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastOneBlock',
      componentType: '_block',
      comparison: 'atLeast',
      number: 1,
      setAsBase: true,
    });

    return childLogic;
  }
}
