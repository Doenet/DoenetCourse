import React, { useState } from 'react';
import Tool from '../_framework/Tool';
import DoenetViewer from '../../Viewer/DoenetViewer.jsx';
import { useRecoilCallback } from 'recoil';
import { itemHistoryAtom } from '../../_sharedRecoil/content';

export default function Content(props) {
  let urlParamsObj = Object.fromEntries(
    new URLSearchParams(props.route.location.search),
  );
  let [contentId, setContentId] = useState(urlParamsObj?.contentId);
  const branchId = urlParamsObj?.branchId;
  let [status, setStatus] = useState('Init');
  const findContentId = useRecoilCallback(
    ({ snapshot, set }) =>
      async (branchId) => {
        const versionHistory = await snapshot.getPromise(
          itemHistoryAtom(branchId),
        );
        let contentId = null;
        for (let named of versionHistory.named) {
          if (named.isReleased === '1') {
            contentId = named.contentId;
            break;
          }
        }
        if (contentId) {
          setContentId(contentId);
          setStatus('Found released version');
        } else {
          setStatus('No released versions');
        }
      },
  );
  // const contentId = urlParamsObj?.contentId;
  let mainPanel = null;

  if (status === 'Init' && branchId && !contentId) {
    findContentId(branchId);
    return null;
  } else if (!contentId && !branchId) {
    mainPanel = <p>Need a contentId or branchId to display content...!</p>;
  } else if (status === 'No released versions') {
    mainPanel = (
      <p>Sorry! The author hasn't released any content to view at this link.</p>
    );
  } else {
    const attemptNumber = 1;
    const showCorrectness = true;
    const readOnly = false;
    const solutionDisplayMode = 'button';
    const showFeedback = true;
    const showHints = true;
    const ignoreDatabase = true;
    const requestedVariant = { index: 1 };
    mainPanel = (
      <DoenetViewer
        key="doenetviewer"
        contentId={contentId}
        flags={{
          showCorrectness,
          readOnly,
          solutionDisplayMode,
          showFeedback,
          showHints,
        }}
        attemptNumber={attemptNumber}
        ignoreDatabase={ignoreDatabase}
        requestedVariant={requestedVariant}
      />
    );
  }

  return (
    <Tool>
      <headerPanel title="Content"></headerPanel>
      <mainPanel>{mainPanel}</mainPanel>
    </Tool>
  );
}
