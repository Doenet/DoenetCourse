import InlineComponent from './abstract/InlineComponent';

export default class panel extends InlineComponent {
  static componentType = 'panel';
  static rendererType = 'container';
  static renderChildren = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.columns = {
      createComponentOfType: 'text',
      createStateVariable: 'columns',
      defaultValue: null,
      public: true,
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'anything',
      componentType: '_base',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.breakpoints = {
      returnDependencies: () => ({
        children: {
          dependencyType: 'child',
          childLogicName: 'anything',
          variableNames: ['width'],
        },
        columns: {
          dependencyType: 'stateVariable',
          variableName: 'columns',
        },
      }),
      definition: function ({ dependencyValues }) {
        let breakpoints = [];

        //find the breakpoints for changing the number of columns
        let itemWidths = dependencyValues.children.map(
          (x) => x.stateValues.width,
        );

        if (dependencyValues.columns !== null) {
          let possibleColumnNumbers;
          if (dependencyValues.columns.indexOf(',') !== -1) {
            possibleColumnNumbers = dependencyValues.columns
              .split(',')
              .map(Number);
          } else if (dependencyValues.columns.indexOf('-') !== -1) {
            let [start, end] = dependencyValues.columns.split('-');
            possibleColumnNumbers = [];
            for (let ind = Number(start); ind <= end; ind++) {
              possibleColumnNumbers.push(ind);
            }
          } else {
            possibleColumnNumbers = [Number(dependencyValues.columns)];
          }

          let maxWidths = {};
          let totalOfMaxWidths = {};

          for (let numberOfColumns of possibleColumnNumbers) {
            //find maxWidths of this number of numberOfColumns
            let maxWidthsForThisColumn = [];
            let totalWidthsForThisCoumn = 0;
            for (let columnNum = 0; columnNum < numberOfColumns; columnNum++) {
              let maxWidth = -1;
              for (
                let ind = columnNum;
                ind < itemWidths.length;
                ind = ind + numberOfColumns
              ) {
                if (itemWidths[ind] > maxWidth) {
                  maxWidth = itemWidths[ind];
                }
              }
              maxWidthsForThisColumn.push(maxWidth);
              totalWidthsForThisCoumn =
                totalWidthsForThisCoumn + Number(maxWidth);
            }
            maxWidths[numberOfColumns] = maxWidthsForThisColumn;
            totalOfMaxWidths[numberOfColumns] = totalWidthsForThisCoumn;
          }

          let lastColumnNumber = -1;
          for (let number of possibleColumnNumbers) {
            //find lowest next breakpoints
            let minBreakPoint = Number.POSITIVE_INFINITY;
            let minColumnNumber = -1;
            for (let columnNumber of possibleColumnNumbers) {
              if (
                totalOfMaxWidths[columnNumber] <= minBreakPoint &&
                columnNumber > lastColumnNumber
              ) {
                minBreakPoint = totalOfMaxWidths[columnNumber];
                minColumnNumber = columnNumber;
              }
            }
            //save min in breakpoints if found a match
            if (minBreakPoint < Number.POSITIVE_INFINITY) {
              breakpoints.push({
                breakpoint: minBreakPoint,
                possibleColumnNumbers: minColumnNumber,
                arrayOfWidths: maxWidths[minColumnNumber],
              });
              lastColumnNumber = minColumnNumber;
            }
          }
        }

        return { newValues: { breakpoints } };
      },
    };

    return stateVariableDefinitions;
  }
}
