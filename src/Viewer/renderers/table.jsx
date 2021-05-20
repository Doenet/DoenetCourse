import React from 'react';
import DoenetRenderer from './DoenetRenderer';

export default class Table extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    let table = [];

    for (let [
      rowNum,
      rowData,
    ] of this.doenetSvData.renderedChildNumberByRowCol.entries()) {
      let row = rowData.map((childInd, colInd) => (
        <td key={'col' + colInd}>{this.children[childInd]}</td>
      ));
      table.push(<tr key={'row' + rowNum}>{row}</tr>);
    }

    return (
      <>
        <a name={this.componentName} />
        <table id={this.componentName}>
          <tbody>{table}</tbody>
        </table>
      </>
    );
  }
}
