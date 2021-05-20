import { nanoid } from 'nanoid';
import React, { Component } from 'react';

export default class DoenetRenderer extends Component {
  constructor(props) {
    super(props);
    this.addChildren = this.addChildren.bind(this);
    this.removeChildren = this.removeChildren.bind(this);
    this.swapChildren = this.swapChildren.bind(this);
    this.update = this.update.bind(this);

    this.childrenToCreate = props.componentInstructions.children;
    this.componentName = props.componentInstructions.componentName;

    this.actions = props.componentInstructions.actions;

    // This keeps the proxy in place so that state variables
    // aren't calculated unless asked for
    // Also means it will always have the new values when they are changed
    // so we don't have to pass them in on update
    this.doenetSvData = props.componentInstructions.stateValues;

    props.rendererUpdateMethods[this.componentName] = {
      update: this.update,
      addChildren: this.addChildren,
      removeChildren: this.removeChildren,
      swapChildren: this.swapChildren,
    };

    if (this.constructor.initializeChildrenOnConstruction) {
      this.initializeChildren();
    }
  }

  static initializeChildrenOnConstruction = true;

  update() {
    this.forceUpdate();
  }

  addChildren(instruction) {
    let childInstructions = this.childrenToCreate[instruction.indexForParent];
    let child = this.createChildFromInstructions(childInstructions);
    this.children.splice(instruction.indexForParent, 0, child);
    this.children = [...this.children]; // needed for React to recognize it's different

    this.forceUpdate();
  }

  removeChildren(instruction) {
    this.children.splice(
      instruction.firstIndexInParent,
      instruction.numberChildrenDeleted,
    );
    this.children = [...this.children]; // needed for React to recognize it's different
    for (let componentName of instruction.deletedComponentNames) {
      delete this.props.rendererUpdateMethods[componentName];
    }
    this.forceUpdate();
  }

  swapChildren(instruction) {
    [this.children[instruction.index1], this.children[instruction.index2]] = [
      this.children[instruction.index2],
      this.children[instruction.index1],
    ];
    this.children = [...this.children]; // needed for React to recognize it's different
    this.forceUpdate();
  }

  initializeChildren() {
    this.children = [];
    for (let childInstructions of this.childrenToCreate) {
      let child = this.createChildFromInstructions(childInstructions);
      this.children.push(child);
    }

    return this.children;
  }

  createChildFromInstructions(childInstructions) {
    // add nanoid to key so that will have unique key if recreate
    // renderer for a component with the same name as an old one
    // TODO: is this the best way to do it?
    let propsForChild = {
      key: childInstructions.componentName + nanoid(10),
      componentInstructions: childInstructions,
      rendererClasses: this.props.rendererClasses,
      rendererUpdateMethods: this.props.rendererUpdateMethods,
      flags: this.props.flags,
    };
    if (this.doenetPropsForChildren) {
      Object.assign(propsForChild, this.doenetPropsForChildren);
    }
    let child = React.createElement(
      this.props.rendererClasses[childInstructions.rendererType],
      propsForChild,
    );
    return child;
  }
}
