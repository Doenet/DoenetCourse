import BaseComponent from './abstract/BaseComponent';

export default class CellBlock extends BaseComponent {
  static componentType = 'cellBlock';
  static rendererType = 'container';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.rowNum = { default: null };
    attributes.colNum = { default: null };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let zeroOrMoreCells = childLogic.newLeaf({
      name: 'zeroOrMoreCells',
      componentType: 'cell',
      comparison: 'atLeast',
      number: 0,
    });

    let zeroOrMoreRows = childLogic.newLeaf({
      name: 'zeroOrMoreRows',
      componentType: 'row',
      comparison: 'atLeast',
      number: 0,
    });

    let zeroOrMoreColumns = childLogic.newLeaf({
      name: 'zeroOrMoreColumns',
      componentType: 'column',
      comparison: 'atLeast',
      number: 0,
    });

    let zeroOrMoreCellblocks = childLogic.newLeaf({
      name: 'zeroOrMoreCellblocks',
      componentType: 'cellblock',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'cellsRowsColumnsBlocks',
      operator: 'and',
      propositions: [
        zeroOrMoreCells,
        zeroOrMoreRows,
        zeroOrMoreColumns,
        zeroOrMoreCellblocks,
      ],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.prescribedCellsRowsColumnsBlocks = {
      returnDependencies: () => ({
        cellRelatedChildren: {
          dependencyType: 'child',
          childLogicName: 'cellsRowsColumnsBlocks',
          variableNames: [
            'rowNum',
            'colNum',
            'prescribedCellsWithColNum',
            'prescribedCellsWithRowNum',
            'prescribedCellsRowsColumnsBlocks',
          ],
          variablesOptional: true,
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            prescribedCellsRowsColumnsBlocks:
              dependencyValues.cellRelatedChildren,
          },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
