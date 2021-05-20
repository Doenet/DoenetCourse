import Polygon from './Polygon';
import me from 'math-expressions';

export default class Triangle extends Polygon {
  static componentType = 'triangle';
  static rendererType = 'polygon';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.vertices.returnArraySizeDependencies = () => ({
      nDimensions: {
        dependencyType: 'stateVariable',
        variableName: 'nDimensions',
      },
    });
    stateVariableDefinitions.vertices.returnArraySize = function ({
      dependencyValues,
    }) {
      return [3, dependencyValues.nDimensions];
    };

    stateVariableDefinitions.vertices.arrayDefinitionByKey = function ({
      dependencyValuesByKey,
      arrayKeys,
    }) {
      // console.log('array definition of triangle vertices');
      // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))
      // console.log(arrayKeys);

      let vertices = {};
      let useEssential = {};

      for (let arrayKey of arrayKeys) {
        let [pointInd, dim] = arrayKey.split(',');
        let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

        let verticesAttr = dependencyValuesByKey[arrayKey].vertices;
        if (
          verticesAttr !== null &&
          verticesAttr.stateValues['pointX' + varEnding]
        ) {
          vertices[arrayKey] = verticesAttr.stateValues['pointX' + varEnding];
        } else {
          let defaultValue;

          if (pointInd === '0') {
            if (dim === '1') {
              defaultValue = me.fromAst(1);
            } else {
              defaultValue = me.fromAst(0);
            }
          } else if (pointInd === '1') {
            if (dim === '0') {
              defaultValue = me.fromAst(1);
            } else {
              defaultValue = me.fromAst(0);
            }
          } else {
            defaultValue = me.fromAst(0);
          }
          useEssential[arrayKey] = {
            variablesToCheck: ['vertexX' + varEnding],
            defaultValue,
          };
        }
      }

      // console.log({
      //   newValues: { vertices },
      //   useEssentialOrDefaultValue: { vertices: useEssential }

      // })

      return {
        newValues: { vertices },
        useEssentialOrDefaultValue: { vertices: useEssential },
      };
    };

    stateVariableDefinitions.vertices.inverseArrayDefinitionByKey = function ({
      desiredStateVariableValues,
      dependencyValuesByKey,
      dependencyNamesByKey,
      initialChange,
      stateValues,
    }) {
      // console.log(`inverseArrayDefinition of vertices of triangle`);
      // console.log(desiredStateVariableValues)
      // console.log(JSON.parse(JSON.stringify(stateValues)))
      // console.log(dependencyValuesByKey);

      // if not draggable, then disallow initial change
      if (initialChange && !stateValues.draggable) {
        return { success: false };
      }

      let instructions = [];
      for (let arrayKey in desiredStateVariableValues.vertices) {
        let [pointInd, dim] = arrayKey.split(',');
        let varEnding = Number(pointInd) + 1 + '_' + (Number(dim) + 1);

        if (
          dependencyValuesByKey[arrayKey].vertices !== null &&
          dependencyValuesByKey[arrayKey].vertices.stateValues[
            'pointX' + varEnding
          ]
        ) {
          instructions.push({
            setDependency: dependencyNamesByKey[arrayKey].vertices,
            desiredValue: desiredStateVariableValues.vertices[arrayKey],
            variableIndex: 0,
          });
        } else {
          instructions.push({
            setStateVariable: 'vertices',
            value: {
              [arrayKey]:
                desiredStateVariableValues.vertices[arrayKey].simplify(),
            },
          });
        }
      }

      return {
        success: true,
        instructions,
      };
    };
    // stateVariableDefinitions.vertices.inverseDefinition = function ({ desiredStateVariableValues, dependencyValues,
    //   stateValues, initialChange, arrayKeys, workspace,
    // }) {

    //   // console.log(`inverseDefinition of vertices of triangle`);
    //   // console.log(desiredStateVariableValues)
    //   // console.log(JSON.parse(JSON.stringify(stateValues)))
    //   // console.log(arrayKeys);
    //   // console.log(dependencyValues);

    //   // if not draggable, then disallow initial change
    //   if (initialChange && !stateValues.draggable) {
    //     return { success: false };
    //   }

    //   let arrayKey;
    //   if (arrayKeys) {
    //     arrayKey = Number(arrayKeys[0]);
    //   }

    //   if (!workspace.desiredVertices) {
    //     workspace.desiredVertices = {};
    //   }

    //   if (arrayKey === undefined) {
    //     // working with entire array

    //     let instructions = [];

    //     let nVerticesSpecified = 0;
    //     if (dependencyValues.verticesAttr.length === 1) {
    //       nVerticesSpecified = Math.min(3, dependencyValues.verticesAttr[0].stateValues.nPoints);

    //       let verticesForVerticesAttr;
    //       if (Array.isArray(desiredStateVariableValues)) {
    //         verticesForVerticesAttr = desiredStateVariableValues.vertices.slice(0, nVerticesSpecified)
    //       } else {
    //         verticesForVerticesAttr = {};
    //         for (let key in desiredStateVariableValues.vertices) {
    //           if (Number(key) < nVerticesSpecified) {
    //             verticesForVerticesAttr[key] = desiredStateVariableValues.vertices[key]
    //           }
    //         }
    //         if (Object.keys(verticesForVerticesAttr).length === 0) {
    //           verticesForVerticesAttr = undefined;
    //         }
    //       }

    //       if (verticesForVerticesAttr) {
    //         instructions.push({
    //           setDependency: "verticesAttr",
    //           desiredValue: verticesForVerticesAttr,
    //           childIndex: 0,
    //           variableIndex: 0
    //         })
    //       }
    //     }

    //     for (let ind = nVerticesSpecified; ind < 3; ind++) {
    //       if (desiredStateVariableValues.vertices[ind] !== undefined) {

    //         // Since we don't have a vertex child that will do the merge,
    //         // we must manually merge here.
    //         let desiredVertex = mergeVertex({
    //           workspaceVertices: workspace.desiredVertices[ind],
    //           currentVertexValue: stateValues.vertices[ind],
    //           desiredVertex: desiredStateVariableValues.vertices[ind],
    //         });

    //         workspace.desiredVertices[ind] = desiredVertex.tree;

    //         instructions.push({
    //           setStateVariable: "vertices",
    //           value: { [ind]: desiredVertex.simplify() },
    //         })
    //       }
    //     }

    //     return {
    //       success: true,
    //       instructions
    //     }
    //   } else {

    //     // just have one arrayKey
    //     if (arrayKey > 2) {
    //       return { success: false }
    //     }

    //     if (dependencyValues.verticesAttr.length === 1) {
    //       // so child variable of verticesAttr is an array entry (rather than array)
    //       let nVerticesSpecified = Math.min(3, dependencyValues.verticesAttr[0].stateValues.nPoints);
    //       if (arrayKey < nVerticesSpecified) {
    //         return {
    //           success: true,
    //           instructions: [{
    //             setDependency: "verticesAttr",
    //             desiredValue: desiredStateVariableValues.vertices[arrayKey],
    //             childIndex: 0,
    //             variableIndex: 0,
    //           }]
    //         }

    //       }
    //     }

    //     // Since we don't have a vertex child that will do the merge,
    //     // we must manually merge here.
    //     let desiredVertex = mergeVertex({
    //       workspaceVertices: workspace.desiredVertices[arrayKey],
    //       currentVertexValue: stateValues.vertices[arrayKey],
    //       desiredVertex: desiredStateVariableValues.vertices[arrayKey],
    //     });

    //     workspace.desiredVertices[arrayKey] = desiredVertex.tree;

    //     return {
    //       success: true,
    //       instructions: [{
    //         setStateVariable: "vertices",
    //         value: { [arrayKey]: desiredVertex.simplify() },
    //       }]
    //     }

    //   }

    // }

    stateVariableDefinitions.nVertices = {
      public: true,
      componentType: 'number',
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { nVertices: 3 } }),
    };

    return stateVariableDefinitions;
  }
}

function mergeVertex({ workspaceVertices, currentVertexValue, desiredVertex }) {
  // If have any empty values in desired value,
  // merge with current values, or value from workspace

  let vertexAst;
  if (workspaceVertices) {
    // if have desired expresson from workspace, use that instead of currentValue
    vertexAst = workspaceVertices.slice(0);
  } else {
    vertexAst = currentVertexValue.tree.slice(0);
  }
  for (let [ind, value] of desiredVertex.tree.entries()) {
    if (value !== undefined) {
      vertexAst[ind] = value;
    }
  }

  return me.fromAst(vertexAst);
}
