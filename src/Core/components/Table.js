import BaseComponent from './abstract/BaseComponent';
import me from 'math-expressions';
import { normalizeIndex } from '../utils/table';
import { textToAst } from '../utils/math';

export default class Table extends BaseComponent {
  static componentType = 'table';
  static rendererType = 'table';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.width = { default: '400px' };
    attributes.minNumRows = { default: 1 };
    attributes.minNumColumns = { default: 1 };

    attributes.height = {
      forRenderer: true,
      dependentStateVariables: [
        {
          dependencyName: 'numRows',
          variableName: 'numRows',
        },
      ],
      definitionForPropertyValue({ dependencyValues, propertyChild }) {
        if (propertyChild.length === 0) {
          // TODO: is this what we want for default height?
          // Do we want to cap default at a maximum?
          let height;
          if (
            Number.isFinite(dependencyValues.numRows) &&
            dependencyValues.numRows >= 0
          ) {
            height = 50 + dependencyValues.numRows * 20;
          } else {
            height = 130; // value if numRows = 4
          }
          return { newValues: { height } };
        }

        return { newValues: { height: propertyChild[0].stateValues.value } };
      },
    };

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
      componentType: 'cellBlock',
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

    stateVariableDefinitions.cellNameToRowCol = {
      additionalStateVariablesDefined: ['cellNamesByRowCol'],
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
      definition({ dependencyValues, componentInfoObjects }) {
        let result = determineCellMapping({
          cellRelatedChildren: dependencyValues.cellRelatedChildren,
          componentInfoObjects,
        });

        return {
          newValues: {
            cellNameToRowCol: result.cellNameToRowCol,
            cellNamesByRowCol: result.cellNamesByRowCol,
          },
        };
      },
    };

    stateVariableDefinitions.numRows = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        minNumRows: {
          dependencyType: 'stateVariable',
          variableName: 'minNumRows',
        },
        cellNamesByRowCol: {
          dependencyType: 'stateVariable',
          variableName: 'cellNamesByRowCol',
        },
      }),
      definition({ dependencyValues }) {
        let numRows = dependencyValues.minNumRows;
        if (!Number.isFinite(numRows)) {
          numRows = 4;
        }
        numRows = Math.max(numRows, dependencyValues.cellNamesByRowCol.length);
        return { newValues: { numRows } };
      },
    };

    stateVariableDefinitions.numColumns = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        minNumColumns: {
          dependencyType: 'stateVariable',
          variableName: 'minNumColumns',
        },
        cellNamesByRowCol: {
          dependencyType: 'stateVariable',
          variableName: 'cellNamesByRowCol',
        },
      }),
      definition({ dependencyValues }) {
        let numColumns = dependencyValues.minNumColumns;
        if (!Number.isFinite(numColumns)) {
          numColumns = 4;
        }
        for (let row of dependencyValues.cellNamesByRowCol) {
          if (row) {
            numColumns = Math.max(numColumns, row.length);
          }
        }
        return { newValues: { numColumns } };
      },
    };

    stateVariableDefinitions.cells = {
      public: true,
      componentType: 'cell',
      isArray: true,
      entryPrefixes: ['cell', 'row', 'column', 'range'],
      nDimensions: 2,
      // stateVariablesDeterminingDependencies: ["numRows", "numColumns"],
      returnArraySizeDependencies: () => ({
        numRows: {
          dependencyType: 'stateVariable',
          variableName: 'numRows',
        },
        numColumns: {
          dependencyType: 'stateVariable',
          variableName: 'numColumns',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.numRows, dependencyValues.numColumns];
      },
      returnEntryDimensions: (prefix) => (prefix === 'range' ? 2 : 1),
      containsComponentNamesToCopy: true,
      targetAttributesToIgnoreOnCopy: ['rowNum', 'colNum'],
      returnWrappingComponents(prefix) {
        if (prefix === 'cell') {
          return [];
        } else if (prefix === 'row') {
          return [['row']];
        } else if (prefix === ' col') {
          return [['column']];
        } else {
          // range or entire array
          return [['row'], ['cellBlock']];
        }
      },
      getArrayKeysFromVarName({ arrayEntryPrefix, varEnding, arraySize }) {
        if (arrayEntryPrefix === 'cell') {
          // accept two formats: cellB1 or cell(1,2)
          // (accept letters in second format: (A, 2), (1, B), or (A,B))

          let rowNum, colNum;

          let letterNumStyle = /^([a-zA-Z]+)([1-9]\d*)$/;
          let result = varEnding.match(letterNumStyle);
          if (result) {
            colNum = result[1];
            rowNum = result[2];
          } else {
            let tupleStyle = /^\(([a-zA-Z]+|\d+),([a-zA-Z]+|\d+)\)$/;
            result = varEnding.match(tupleStyle);
            if (result) {
              rowNum = result[1];
              colNum = result[2];
            } else {
              return []; // invalid
            }
          }

          let rowIndex = normalizeIndex(rowNum);
          let colIndex = normalizeIndex(colNum);

          if (
            !(
              rowIndex >= 0 &&
              rowIndex < arraySize[0] &&
              colIndex >= 0 &&
              colIndex < arraySize[1]
            )
          ) {
            // invalid index or index of out range
            return [];
          }

          return [String(rowIndex) + ',' + String(colIndex)];
        } else if (arrayEntryPrefix === 'row') {
          // row2 or rowB

          let rowIndex = normalizeIndex(varEnding);
          if (!(rowIndex >= 0 && rowIndex < arraySize[0])) {
            // invalid index or index of out range
            return [];
          }

          let arrayKeys = [];
          let arrayKeyBegin = String(rowIndex) + ',';
          for (let i = 0; i < arraySize[1]; i++) {
            arrayKeys.push(arrayKeyBegin + i);
          }

          return arrayKeys;
        } else if (arrayEntryPrefix === 'column') {
          // column2 or columnB

          let colIndex = normalizeIndex(varEnding);
          if (!(colIndex >= 0 && colIndex < arraySize[1])) {
            // invalid index or index of out range
            return [];
          }

          let arrayKeys = [];
          let arrayKeyEnd = ',' + String(colIndex);
          for (let i = 0; i < arraySize[1]; i++) {
            arrayKeys.push(i + arrayKeyEnd);
          }

          return arrayKeys;
        } else {
          // range
          // accept two formats: rangeB1D5 or range((1,2),(5,4))

          let fromRow, fromCol, toRow, toCol;

          let letterNumStyle = /^([a-zA-Z]+)([1-9]\d*)([a-zA-Z]+)([1-9]\d*)$/;
          let result = varEnding.match(letterNumStyle);
          if (result) {
            fromCol = normalizeIndex(result[1]);
            fromRow = normalizeIndex(result[2]);
            toCol = normalizeIndex(result[3]);
            toRow = normalizeIndex(result[4]);
          } else {
            let tupleStyle =
              /^\(\(([a-zA-Z]+|\d+),([a-zA-Z]+|\d+)\),\(([a-zA-Z]+|\d+),([a-zA-Z]+|\d+)\)\)$/;
            result = varEnding.match(tupleStyle);
            if (result) {
              fromRow = normalizeIndex(result[1]);
              fromCol = normalizeIndex(result[2]);
              toRow = normalizeIndex(result[3]);
              toCol = normalizeIndex(result[4]);
            } else {
              return []; //invalid
            }
          }

          if (!(fromRow >= 0 && toRow >= 0 && fromCol >= 0 && toCol >= 0)) {
            // invalid range
            return [];
          }

          let row1 = Math.min(Math.min(fromRow, toRow), arraySize[0] - 1);
          let row2 = Math.min(Math.max(fromRow, toRow), arraySize[0] - 1);
          let col1 = Math.min(Math.min(fromCol, toCol), arraySize[1] - 1);
          let col2 = Math.min(Math.max(fromCol, toCol), arraySize[1] - 1);

          let arrayKeys = [];

          for (let rowIndex = row1; rowIndex <= row2; rowIndex++) {
            let rowKeys = [];
            let arrayKeyBegin = String(rowIndex) + ',';
            for (let colIndex = col1; colIndex <= col2; colIndex++) {
              rowKeys.push(arrayKeyBegin + colIndex);
            }
            arrayKeys.push(rowKeys);
          }

          return arrayKeys;
        }
      },
      arrayVarNameFromArrayKey(arrayKey) {
        return (
          'cell(' +
          arrayKey
            .split(',')
            .map((x) => Number(x) + 1)
            .join(',') +
          ')'
        );
      },
      returnArrayDependenciesByKey() {
        let globalDependencies = {
          cellNamesByRowCol: {
            dependencyType: 'stateVariable',
            variableName: 'cellNamesByRowCol',
          },
        };
        return { globalDependencies };
      },
      arrayDefinitionByKey({ globalDependencyValues, arrayKeys }) {
        let cells = {};
        let cnbrc = globalDependencyValues.cellNamesByRowCol;

        for (let arrayKey of arrayKeys) {
          let [rowInd, colInd] = arrayKey.split(',');
          if (cnbrc[rowInd] && cnbrc[rowInd][colInd]) {
            cells[arrayKey] = cnbrc[rowInd][colInd];
          } else {
            cells[arrayKey] = null;
          }
        }
        return { newValues: { cells } };
      },
    };

    stateVariableDefinitions.childrenToRender = {
      additionalStateVariablesDefined: [
        {
          variableName: 'renderedChildNumberByRowCol',
          forRenderer: true,
        },
      ],
      returnDependencies: () => ({
        cellNamesByRowCol: {
          dependencyType: 'stateVariable',
          variableName: 'cellNamesByRowCol',
        },
        numRows: {
          dependencyType: 'stateVariable',
          variableName: 'numRows',
        },
        numColumns: {
          dependencyType: 'stateVariable',
          variableName: 'numColumns',
        },
      }),
      definition: function ({ dependencyValues }) {
        let childrenToRender = [];
        let renderedChildNumberByRowCol = [];
        let numChildrenFound = 0;
        for (let rowInd = 0; rowInd < dependencyValues.numRows; rowInd++) {
          let cellRow = dependencyValues.cellNamesByRowCol[rowInd];
          let childNumberRow = [];
          if (cellRow) {
            for (let cellName of cellRow) {
              if (cellName) {
                childrenToRender.push(cellName);
                childNumberRow.push(numChildrenFound);
                numChildrenFound += 1;
              } else {
                childNumberRow.push(null);
              }
            }
            childNumberRow.push(
              ...Array(dependencyValues.numColumns - cellRow.length).fill(null),
            );
          } else {
            childNumberRow = Array(dependencyValues.numColumns).fill(null);
          }
          renderedChildNumberByRowCol.push(childNumberRow);
        }
        return { newValues: { childrenToRender, renderedChildNumberByRowCol } };
      },
    };

    return stateVariableDefinitions;
  }

  addCell({ cell, rowNum, colNum }) {
    //Add the rows we need
    if (!Array.isArray(this.state.cells[rowNum])) {
      this.state.cells[rowNum] = [];
    }
    if (!Array.isArray(this.state.cellComponents[rowNum])) {
      this.state.cellComponents[rowNum] = [];
    }

    if (rowNum < 0) {
      throw Error('RowNum position has to be 1 or greater');
    }
    if (colNum < 0) {
      throw Error('ColNum position has to be 1 or greater');
    }
    // if (rowNum > Number(this.state.numRows)){
    //   throw Error(`RowNum position of ${cell.componentName} is ${rowNum} which is larger than the number of rows ${this.state.numRows}`);
    // }
    // if (colNum > Number(this.state.numColumns)){
    //   throw Error(`ColNum position of ${cell.componentName} is ${colNum} which is larger than the number of columns ${this.state.numColumns}`);
    // }

    if (cell.unresolvedState.text) {
      if (this.unresolvedState.cells == undefined) {
        this.unresolvedState.cells = {
          isArray: true,
          arrayComponents: { [[rowNum, colNum]]: true },
        };
      } else {
        this.unresolvedState.cells.arrayComponents[[rowNum, colNum]] = true;
      }
    } else {
      this.state.cells[rowNum][colNum] = cell.state.text;
    }

    if (this.state.cellComponents[rowNum][colNum] === undefined) {
      this.state.cellComponents[rowNum][colNum] = cell;
    } else {
      throw Error(
        `Cell row ${rowNum + 1} column ${colNum + 1} is already defined above.`,
      );
    }
    this.state.cellNameToRowCol[cell.componentName] = {
      row: rowNum,
      col: colNum,
    };
    return { rowNum, colNum };
  }

  getCellPoints(obj, index) {
    if (this.unresolvedState.points) {
      return;
    }

    if (this.state.pointsFoundInCells !== undefined) {
      return this.state.pointsFoundInCells[index];
    }

    this.currentTracker.trackChanges.logPotentialChange({
      component: this,
      variable: 'points',
      oldValue: this.state.pointsFoundInCells,
    });

    this.state.pointsFoundInCells = [];
    this._state.pointsFoundInCells.indices = [];

    let nRows = this.state.numRows;
    let nCols = this.state.numColumns;

    for (let colInd = 0; colInd < nCols; colInd++) {
      for (let rowInd = 0; rowInd < nRows; rowInd++) {
        let cellText = this.state.cells[rowInd][colInd];
        if (!cellText) {
          continue;
        }
        let cellME;
        try {
          cellME = me.fromAst(textToAst.convert(cellText));
        } catch (e) {
          continue;
        }

        if (Array.isArray(cellME.tree) && cellME.tree[0] === 'tuple') {
          this.state.pointsFoundInCells.push(cellME);
          this._state.pointsFoundInCells.indices.push([rowInd, colInd]);
        }
      }
    }

    console.log('logging points change');

    return this.state.pointsFoundInCells[index];
  }
}

function determineCellMapping({
  cellRelatedChildren,
  rowOffset = 0,
  colOffset = 0,
  cellNameToRowCol = {},
  cellNamesByRowCol = [],
  componentInfoObjects,
}) {
  var nextCellRowIndex = rowOffset; //CellBlock and Cells
  var nextCellColIndex = colOffset; //CellBlock and Cells
  var nextCellColIndexIfBothUndefined = colOffset; //CellBlock and Cells
  var nextRowComponentRowIndex = rowOffset;
  var nextColComponentColIndex = colOffset;
  var maxRowIndex = rowOffset;
  var maxColIndex = colOffset;
  for (let child of cellRelatedChildren) {
    if (
      componentInfoObjects.isInheritedComponentType({
        inheritedComponentType: child.componentType,
        baseComponentType: 'cell',
      })
    ) {
      let cell = child;
      let rowIndex = normalizeIndex(cell.stateValues.rowNum);
      let colIndex = normalizeIndex(cell.stateValues.colNum);

      if (rowIndex === undefined) {
        rowIndex = nextCellRowIndex;
        if (colIndex === undefined) {
          colIndex = nextCellColIndexIfBothUndefined;
        } else {
          colIndex = colIndex + colOffset;
        }
      } else {
        rowIndex = rowIndex + rowOffset;
        if (colIndex === undefined) {
          colIndex = nextCellColIndex;
        } else {
          colIndex = colIndex + colOffset;
        }
      }

      addCellToMapping({
        cell,
        rowIndex,
        colIndex,
        cellNameToRowCol,
        cellNamesByRowCol,
      });

      maxRowIndex = Math.max(rowIndex, maxRowIndex);
      maxColIndex = Math.max(colIndex, maxColIndex);
      nextCellRowIndex = rowIndex;
      nextCellColIndex = colIndex;
      nextCellColIndexIfBothUndefined = colIndex + 1;
    } else if (
      componentInfoObjects.isInheritedComponentType({
        inheritedComponentType: child.componentType,
        baseComponentType: 'row',
      })
    ) {
      let row = child;
      let rowIndex = normalizeIndex(row.stateValues.rowNum);
      if (rowIndex === undefined) {
        rowIndex = nextRowComponentRowIndex;
      } else {
        rowIndex = rowIndex + rowOffset;
      }
      let cellChildren = row.stateValues.prescribedCellsWithColNum;
      let nextColIndex = colOffset;
      for (let cell of cellChildren) {
        let colIndex = normalizeIndex(cell.stateValues.colNum);
        if (colIndex === undefined) {
          colIndex = nextColIndex;
        } else {
          colIndex = colIndex + colOffset;
        }
        addCellToMapping({
          cell,
          rowIndex,
          colIndex,
          cellNameToRowCol,
          cellNamesByRowCol,
        });
        nextColIndex = colIndex + 1;
        maxRowIndex = Math.max(rowIndex, maxRowIndex);
        maxColIndex = Math.max(colIndex, maxColIndex);
      }
      nextRowComponentRowIndex = rowIndex + 1;
      nextCellRowIndex = rowIndex + 1;
      nextCellColIndex = colOffset;
      nextCellColIndexIfBothUndefined = nextCellColIndex;
    } else if (
      componentInfoObjects.isInheritedComponentType({
        inheritedComponentType: child.componentType,
        baseComponentType: 'column',
      })
    ) {
      let col = child;
      let colIndex = normalizeIndex(col.stateValues.colNum);
      if (colIndex === undefined) {
        colIndex = nextColComponentColIndex;
      } else {
        colIndex = colIndex + colOffset;
      }
      let cellChildren = col.stateValues.prescribedCellsWithRowNum;
      let nextRowIndex = rowOffset;
      for (let cell of cellChildren) {
        let rowIndex = normalizeIndex(cell.stateValues.rowNum);
        if (rowIndex === undefined) {
          rowIndex = nextRowIndex;
        } else {
          rowIndex = rowIndex + rowOffset;
        }
        addCellToMapping({
          cell,
          rowIndex,
          colIndex,
          cellNameToRowCol,
          cellNamesByRowCol,
        });
        nextRowIndex = rowIndex + 1;
        maxRowIndex = Math.max(rowIndex, maxRowIndex);
        maxColIndex = Math.max(colIndex, maxColIndex);
      }
      nextColComponentColIndex = colIndex + 1;
      nextCellRowIndex = rowOffset;
      nextCellColIndex = colIndex + 1;
      nextCellColIndexIfBothUndefined = nextCellColIndex;
    } else if (
      componentInfoObjects.isInheritedComponentType({
        inheritedComponentType: child.componentType,
        baseComponentType: 'cellBlock',
      })
    ) {
      let cellBlock = child;
      let rowIndex = normalizeIndex(cellBlock.stateValues.rowNum);
      let colIndex = normalizeIndex(cellBlock.stateValues.colNum);

      if (rowIndex === undefined) {
        rowIndex = nextCellRowIndex;
        if (colIndex === undefined) {
          colIndex = nextCellColIndexIfBothUndefined;
        } else {
          colIndex = colIndex + colOffset;
        }
      } else {
        rowIndex = rowIndex + rowOffset;
        if (colIndex === undefined) {
          colIndex = nextCellColIndex;
        } else {
          colIndex = colIndex + colOffset;
        }
      }

      let results = determineCellMapping({
        cellRelatedChildren:
          cellBlock.stateValues.prescribedCellsRowsColumnsBlocks,
        rowOffset: rowIndex,
        colOffset: colIndex,
        cellNameToRowCol,
        cellNamesByRowCol,
        componentInfoObjects,
      });
      maxRowIndex = Math.max(results.maxRowIndex, maxRowIndex);
      maxColIndex = Math.max(results.maxColIndex, maxColIndex);
      nextCellRowIndex = rowIndex;
      nextCellColIndex = colIndex;
      nextCellColIndexIfBothUndefined = results.maxColIndex + 1;
    }
  }
  return { maxRowIndex, maxColIndex, cellNameToRowCol, cellNamesByRowCol };
}

function addCellToMapping({
  cell,
  rowIndex,
  colIndex,
  cellNameToRowCol,
  cellNamesByRowCol,
}) {
  cellNameToRowCol[cell.componentName] = [rowIndex, colIndex];
  if (cellNamesByRowCol[rowIndex] === undefined) {
    cellNamesByRowCol[rowIndex] = [];
  }
  if (cellNamesByRowCol[rowIndex][colIndex] !== undefined) {
    console.warn(
      `Cell is overwriting previous cell at rowNum=${rowIndex + 1}, colNum=${
        colIndex + 1
      }`,
    );
    let previousComponentName = cellNamesByRowCol[rowIndex][colIndex];
    cellNameToRowCol[previousComponentName] = null;
  }
  cellNamesByRowCol[rowIndex][colIndex] = cell.componentName;
}
