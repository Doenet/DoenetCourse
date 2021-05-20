import MathComponent from './Math';

export default class Coords extends MathComponent {
  static componentType = 'coords';
  static rendererType = 'math';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.createVectors = {
      createComponentOfType: 'boolean',
      createStateVariable: 'createVectors',
      defaultValue: true,
      public: true,
    };
    return attributes;
  }

  // TODO: do we want to give warnings or errors if value is not in form of a vector?

  // updateState(args={}) {
  //   super.updateState(args);

  //   // to be a valid coords, operator can only be a arithmetic, apply, or tuple
  //   let tree = this.state.value.tree;
  //   if(tree === "\uFF3F") {
  //     console.log("Invalid value of a coords");
  //   }
  //   if(typeof tree !== "number" && typeof tree !== "string") {
  //     if(!Array.isArray(tree)) {
  //       console.log("Invalid value of a coords");
  //     }
  //     let operator = tree[0];
  //     if(!["+","-","*","/","_","^","prime","apply"].includes(operator)) {
  //       if(["tuple", "vector"].includes(operator)) {
  //         for(let ind=1; ind<tree.length; ind++) {
  //           let subtree = tree[ind];
  //           if(typeof subtree !== "number" && typeof subtree !== "string") {
  //             if(!Array.isArray(tree)) {
  //               console.log("Invalid value of a coords");
  //             }
  //             if(!["+","-","*","/","_","^","prime","apply"].includes(subtree[0])) {
  //               console.log("Invalid value of a coords");
  //             }
  //           }
  //         }
  //       }else {
  //        console.log("Invalid value of a coords");
  //       }
  //     }

  //   }
  // }
}
