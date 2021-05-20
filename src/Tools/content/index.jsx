/**
 * External dependencies
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

/**
 * Internal dependencies
 */
import Content from './Content';
import { DropTargetsProvider } from '../../_reactComponents/DropTarget';
import { BreadcrumbProvider } from '../../_reactComponents/Breadcrumb';
import ToolRoot from '../_framework/ToolRoot';

ReactDOM.render(
  <DropTargetsProvider>
    <BreadcrumbProvider>
      <RecoilRoot>
        <Router>
          <Switch>
            <Route
              path="/"
              render={(routeprops) => (
                <ToolRoot
                  tool={<Content key={'BaseTool'} route={{ ...routeprops }} />}
                />
              )}
            />
          </Switch>
        </Router>
      </RecoilRoot>
    </BreadcrumbProvider>
  </DropTargetsProvider>,
  document.getElementById('root'),
);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/concepts/hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
