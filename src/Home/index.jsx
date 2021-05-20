import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

import DoenetHomePage from './DoenetHomePage';
import ToolRoot from '../Tools/_framework/ToolRoot';

ReactDOM.render(
  <RecoilRoot>
    <Router>
      <Switch>
        <Route
          path="/"
          render={(routeprops) => (
            <ToolRoot
              route={{ ...routeprops }}
              tool={<DoenetHomePage key={'BaseTool'} />}
            />
          )}
        />
      </Switch>
    </Router>
  </RecoilRoot>,
  document.getElementById('root'),
);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/concepts/hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
