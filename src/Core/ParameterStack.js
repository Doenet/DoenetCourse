export default class ParameterStack {
  constructor(initialParameters) {
    this.stack = [{}];
    if (initialParameters !== undefined) {
      Object.assign(this.parameters, initialParameters);
    }
  }

  get parameters() {
    return this.stack[this.stack.length - 1];
  }

  push(additionalParameters, mergePrevious = true) {
    let newParameters = {};
    if (mergePrevious) {
      Object.assign(newParameters, this.parameters);
      if (additionalParameters !== undefined) {
        Object.assign(newParameters, additionalParameters);
      }
    } else {
      newParameters = additionalParameters;
    }
    this.stack.push(newParameters);
  }

  pop() {
    let lastParams = this.stack.pop();

    // don't fail if pop off too much
    // just create an empty object
    if (this.stack.length === 0) {
      this.stack = [{}];
    }
    return lastParams;
  }
}
