import BlockComponent from './abstract/BlockComponent';
import me from 'math-expressions';

export default class IntervalInput extends BlockComponent {
  static componentType = 'intervalinput';

  //creates attributes
  //Automatically creates childlogic leaf comparison:'atMost' number:1
  //creates state variables with a value from the matching child or default if not found
  //updates the value of the state variable if the child changes
  //makes the state variable public state variable with componentType:childNameHere
  //flagged isAttribute = true
  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.xmin = {
      createComponentOfType: 'number',
      createStateVariable: 'xmin',
      defaultValue: -10,
      public: true,
      forRenderer: true,
    };
    attributes.xmax = {
      createComponentOfType: 'number',
      createStateVariable: 'xmax',
      defaultValue: 10,
      public: true,
      forRenderer: true,
    };
    attributes.width = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'width',
      defaultValue: 800,
      public: true,
      forRenderer: true,
    };
    attributes.height = {
      createComponentOfType: '_componentSize',
      createStateVariable: 'height',
      defaultValue: 300,
      public: true,
      forRenderer: true,
    };
    attributes.xlabel = {
      createComponentOfType: 'text',
      createStateVariable: 'xlabel',
      defaultValue: '',
      public: true,
      forRenderer: true,
    };
    //interval type buttons includeIntervalBasedControls
    //point type buttons includePointBasedControls
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroIntervals = childLogic.newLeaf({
      name: 'atLeastZeroIntervals',
      componentType: 'interval',
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroPoints = childLogic.newLeaf({
      name: 'atLeastZeroPoints',
      componentType: 'point',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'intervalsAndPoints',
      operator: 'and',
      propositions: [atLeastZeroIntervals, atLeastZeroPoints],
      requireConsecutive: true,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.points = {
      public: true,
      componentType: 'point',
      // forRenderer: true,
      isArray: true,
      entryPrefixes: ['point'],

      returnDependencies: () => ({
        pointChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroPoints',
          variableNames: ['x'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.pointChildren.length === 0) {
          return {
            newValues: {
              points: [],
            },
          };
        }
        let points = [];
        for (let point of dependencyValues.pointChildren) {
          points.push(point.stateValues.x);
        }
        return { newValues: { points } };
      },
      inverseDefinition: function ({
        desiredStateVariableValues,
        dependencyValues,
      }) {
        return { success: false };

        // let numChildren = dependencyValues.stringTextChildren.length;
        // if (numChildren > 1) {
        //   return { success: false };
        // }
        // if (numChildren === 1) {
        //   return {
        //     success: true,
        //     instructions: [{
        //       setDependency: "stringTextChildren",
        //       desiredValue: desiredStateVariableValues.value,
        //       childIndex: 0,
        //       variableIndex: 0,
        //     }]
        //   };
        // }
        // // no children, so value is essential and give it the desired value
        // return {
        //   success: true,
        //   instructions: [{
        //     setStateVariable: "value",
        //     value: desiredStateVariableValues.value
        //   }]
        // };
      },
    };

    stateVariableDefinitions.numericalPoints = {
      isArray: true,
      entryPrefixes: ['numericalPoint'],
      forRenderer: true,
      returnDependencies: () => ({
        points: {
          dependencyType: 'stateVariable',
          variableName: 'points',
        },
      }),
      definition: function ({ dependencyValues }) {
        let numericalPoints = [];
        for (let point of dependencyValues.points) {
          let val = point.evaluate_to_constant();
          if (!Number.isFinite(val)) {
            val = NaN;
          }
          numericalPoints.push(val);
        }
        return { newValues: { numericalPoints } };
      },
    };

    stateVariableDefinitions.intervals = {
      public: true,
      componentType: 'interval',
      // forRenderer: true,
      isArray: true,
      entryPrefixes: ['interval'],

      returnDependencies: () => ({
        intervalChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroIntervals',
          variableNames: ['value'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.intervalChildren.length === 0) {
          return {
            newValues: {
              intervals: [],
            },
          };
        }
        // tree: Array(3)
        // 0: "interval"
        // 1: (3) ["tuple", 1, 2]
        // 2: (3) ["tuple", true, true]

        // [{start:3,end:4,startClosed:true,endClosed:false}]

        //TODO: Use math expressions instead in the future
        let intervals = [];
        for (let interval of dependencyValues.intervalChildren) {
          let intervalTree = interval.stateValues.value.tree;
          if (intervalTree[0] !== 'interval') {
            intervals.push({ start: NaN, end: NaN });
          } else {
            let intervalObj = {
              start: me.fromAst(intervalTree[1][1]),
              end: me.fromAst(intervalTree[1][2]),
              startClosed: intervalTree[2][1],
              endClosed: intervalTree[2][2],
            };
            intervals.push(intervalObj);
          }
        }
        return { newValues: { intervals } };
      },
    };

    stateVariableDefinitions.numericalIntervals = {
      isArray: true,
      entryPrefixes: ['numericalIntervals'],
      forRenderer: true,
      returnDependencies: () => ({
        intervals: {
          dependencyType: 'stateVariable',
          variableName: 'intervals',
        },
      }),
      definition: function ({ dependencyValues }) {
        let numericalIntervals = [];
        for (let interval of dependencyValues.intervals) {
          let start = interval.start.evaluate_to_constant();
          if (
            !Number.isFinite(start) &&
            start !== Infinity &&
            start !== -Infinity
          ) {
            start = NaN;
          }
          let end = interval.end.evaluate_to_constant();
          if (!Number.isFinite(end) && end !== Infinity && end !== -Infinity) {
            end = NaN;
          }

          // 0: {start: 1, end: 2, startClosed: true, endClosed: true}
          // 1: {start: 3, end: 4, startClosed: false, endClosed: false}

          numericalIntervals.push({
            start,
            end,
            startClosed: interval.startClosed,
            endClosed: interval.endClosed,
          });
        }
        return { newValues: { numericalIntervals } };
      },
    };

    return stateVariableDefinitions;
  }
}
