import Table from './Table';

export default class Spreadsheet extends Table {
  constructor(args) {
    super(args);

    this.onChange = this.onChange.bind(this);
  }

  static componentType = 'spreadsheet';

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['cells'];
  }

  onChange(changes, source) {
    if (source !== 'loadData') {
      let componentChanges = {};
      for (let change of changes) {
        let [row, col, prev, value] = change;

        // since spreadsheet renderer actually changed cell value
        // revert to previous value
        this.state.cells[row][col] = prev;
        componentChanges[[row, col]] = value;
      }

      this.coreFunctions.requestUpdate({
        updateType: 'updateValue',
        updateInstructions: [
          {
            componentName: this.componentName,
            variableUpdates: {
              cells: {
                isArray: true,
                changes: { arrayComponents: componentChanges },
              },
            },
          },
        ],
      });
    }
  }

  initializeRenderer({}) {
    if (this.renderer !== undefined) {
      this.updateRenderer();
      return;
    }

    const actions = {
      onChange: this.onChange,
    };

    this.renderer = new this.availableRenderers.spreadsheet({
      key: this.componentName,
      actions: actions,
      cells: this.state.cells,
      width: this.state.width,
      height: this.state.height,
    });
  }

  updateRenderer() {
    this.renderer.updateSpreadsheet({
      cells: this.state.cells,
      width: this.state.width,
      height: this.state.height,
    });
  }
}
