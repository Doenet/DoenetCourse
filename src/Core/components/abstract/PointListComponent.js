import BaseComponent from './BaseComponent';
import { breakEmbeddedStringsIntoParensPieces } from '../commonsugar/breakstrings';

export default class PointListComponent extends BaseComponent {
  static componentType = '_pointListComponent';
  static rendererType = 'container';
  static renderChildren = true;

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let createPointList = function ({ matchedChildren }) {
      let results = breakEmbeddedStringsIntoParensPieces({
        componentList: matchedChildren,
      });

      if (results.success !== true) {
        return { success: false };
      }

      return {
        success: true,
        newChildren: results.pieces.map(function (piece) {
          if (piece.length > 1 || piece[0].componentType === 'string') {
            return {
              componentType: 'point',
              children: piece,
            };
          } else {
            return piece[0];
          }
        }),
      };
    };

    sugarInstructions.push({
      // childrenRegex: /s+(.*s)?/,
      replacementFunction: createPointList,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroPoints',
      componentType: 'point',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nPoints = {
      returnDependencies: () => ({
        pointChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroPoints',
          skipComponentNames: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { nPoints: dependencyValues.pointChildren.length },
          checkForActualChange: { nPoints: true },
        };
      },
    };

    stateVariableDefinitions.nDimensions = {
      returnDependencies: () => ({
        pointChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroPoints',
          variableNames: ['nDimensions'],
          skipPlaceholders: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        let nDimensions;

        if (dependencyValues.pointChildren.length === 0) {
          nDimensions = 2;
        } else {
          nDimensions = 1;
          for (let point of dependencyValues.pointChildren) {
            if (Number.isFinite(point.stateValues.nDimensions)) {
              nDimensions = Math.max(
                nDimensions,
                point.stateValues.nDimensions,
              );
            }
          }
        }
        return {
          newValues: { nDimensions },
          checkForActualChange: { nDimensions: true },
        };
      },
    };

    stateVariableDefinitions.points = {
      isArray: true,
      nDimensions: 2,
      entryPrefixes: ['pointX', 'point'],
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'pointX') {
          // pointX1_2 is the 2nd component of the first point
          let indices = varEnding.split('_').map((x) => Number(x) - 1);
          if (
            indices.length === 2 &&
            indices.every((x, i) => Number.isInteger(x) && x >= 0)
          ) {
            if (arraySize) {
              if (indices.every((x, i) => x < arraySize[i])) {
                return [String(indices)];
              } else {
                return [];
              }
            } else {
              // if don't know array size, just guess that the entry is OK
              // It will get corrected once array size is known.
              // TODO: better to return empty array?
              return [String(indices)];
            }
          } else {
            return [];
          }
        } else {
          // point3 is all components of the third point
          if (!arraySize) {
            return [];
          }
          let pointInd = Number(varEnding) - 1;
          if (
            Number.isInteger(pointInd) &&
            pointInd >= 0 &&
            pointInd < arraySize[0]
          ) {
            // array of "pointInd,i", where i=0, ..., arraySize[1]-1
            return Array.from(
              Array(arraySize[1]),
              (_, i) => pointInd + ',' + i,
            );
          } else {
            return [];
          }
        }
      },
      returnArraySizeDependencies: () => ({
        nPoints: {
          dependencyType: 'stateVariable',
          variableName: 'nPoints',
        },
        nDimensions: {
          dependencyType: 'stateVariable',
          variableName: 'nDimensions',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nPoints, dependencyValues.nDimensions];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let [pointInd, dim] = arrayKey.split(',');
          dependenciesByKey[arrayKey] = {
            pointChild: {
              dependencyType: 'child',
              childLogicName: 'atLeastZeroPoints',
              variableNames: ['x' + (Number(dim) + 1)],
              childIndices: [pointInd],
            },
          };
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        // console.log('array definition of points for pointlist')
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))
        // console.log(arrayKeys);

        let points = {};

        for (let arrayKey of arrayKeys) {
          let dim = arrayKey.split(',')[1];

          let pointChild = dependencyValuesByKey[arrayKey].pointChild[0];
          if (pointChild) {
            points[arrayKey] = pointChild.stateValues['x' + (Number(dim) + 1)];
          }
        }

        // console.log("result")
        // console.log(JSON.parse(JSON.stringify(points)));

        return { newValues: { points } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        dependencyNamesByKey,
      }) {
        // console.log('array inverse definition of points of pointlist')
        // console.log(desiredStateVariableValues)
        // console.log(arrayKeys);

        let instructions = [];
        for (let arrayKey in desiredStateVariableValues.points) {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].pointChild,
            desiredValue: desiredStateVariableValues.points[arrayKey],
            childIndex: 0,
            variableIndex: 0,
          });
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
