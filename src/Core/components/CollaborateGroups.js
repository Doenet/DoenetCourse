import BaseComponent from './abstract/BaseComponent';
import { breakStringsAndOthersIntoComponentsByStringCommas } from './commonsugar/breakstrings';

export default class CollaborateGroups extends BaseComponent {
  static componentType = 'collaborateGroups';
  static rendererType = undefined;

  static stateVariableForAttributeValue = 'collaborateGroups';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroPoints = childLogic.newLeaf({
      name: 'atLeastZeroPoints',
      componentType: 'point',
      comparison: 'atLeast',
      number: 0,
    });

    let breakIntoPointsByCommas =
      breakStringsAndOthersIntoComponentsByStringCommas((x) => ({
        componentType: 'point',
        children: [
          {
            componentType: 'coords',
            children: x,
          },
        ],
      }));

    let exactlyOneString = childLogic.newLeaf({
      name: 'exactlyOneString',
      componentType: 'string',
      number: 1,
      isSugar: true,
      logicToWaitOnSugar: ['atLeastZeroPoints'],
      replacementFunction: breakIntoPointsByCommas,
    });

    childLogic.newOperator({
      name: 'pointsXorSugar',
      operator: 'xor',
      propositions: [exactlyOneString, atLeastZeroPoints],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.collaborateGroups = {
      returnDependencies: () => ({
        pointChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroPoints',
          variableNames: ['xs', 'coords', 'nDimensions'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let groups = {};

        for (let point of dependencyValues.pointChildren) {
          if (point.stateValues.nDimensions !== 2) {
            console.warn(
              `invalid collaborate group: ${point.stateValues.coords.toString()}`,
            );
          } else {
            let numberOfGroups = point.stateValues.xs[0].evaluate_to_constant();
            let group = point.stateValues.xs[1].evaluate_to_constant();

            if (
              !(
                Number.isInteger(numberOfGroups) &&
                numberOfGroups > 0 &&
                Number.isInteger(group) &&
                group > 0
              )
            ) {
              console.warn(
                `invalid collaborate group: ${point.stateValues.coords.toString()}`,
              );
            } else {
              if (groups[numberOfGroups] === undefined) {
                groups[numberOfGroups] = [];
              }
              groups[numberOfGroups].push(group);
            }
          }
        }

        let matchGroup = function ({ groupNumber, numberOfGroups } = {}) {
          if (numberOfGroups > 1) {
            let collaborationAssignment = groups[numberOfGroups];
            if (collaborationAssignment === undefined) {
              return false;
            } else {
              return collaborationAssignment.includes(groupNumber);
            }
          } else {
            return true;
          }
        };

        return {
          newValues: {
            collaborateGroups: {
              groups,
              matchGroup,
            },
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
