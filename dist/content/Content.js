import React, {useState} from "../_snowpack/pkg/react.js";
import Tool from "../_framework/Tool.js";
import DoenetViewer from "../viewer/DoenetViewer.js";
import {useRecoilCallback} from "../_snowpack/pkg/recoil.js";
import {
  itemHistoryAtom
} from "../_sharedRecoil/content.js";
export default function Content(props) {
  let urlParamsObj = Object.fromEntries(new URLSearchParams(props.route.location.search));
  let [contentId, setContentId] = useState(urlParamsObj?.contentId);
  const doenetId = urlParamsObj?.doenetId;
  let [status, setStatus] = useState("Init");
  const findContentId = useRecoilCallback(({snapshot, set}) => async (doenetId2) => {
    const versionHistory = await snapshot.getPromise(itemHistoryAtom(doenetId2));
    let contentId2 = null;
    for (let named of versionHistory.named) {
      if (named.isReleased === "1") {
        contentId2 = named.contentId;
        break;
      }
    }
    if (contentId2) {
      setContentId(contentId2);
      setStatus("Found released version");
    } else {
      setStatus("No released versions");
    }
  });
  let viewer = null;
  if (status === "Init" && doenetId && !contentId) {
    findContentId(doenetId);
    return null;
  } else if (!contentId && !doenetId) {
    viewer = /* @__PURE__ */ React.createElement("p", null, "Need a contentId or doenetId to display content...!");
  } else if (status === "No released versions") {
    viewer = /* @__PURE__ */ React.createElement("p", null, "Sorry! The author hasn't released any content to view at this link.");
  } else {
    const attemptNumber = 1;
    const showCorrectness = true;
    const readOnly = false;
    const solutionDisplayMode = "button";
    const showFeedback = true;
    const showHints = true;
    const requestedVariant = {index: 1};
    viewer = /* @__PURE__ */ React.createElement(DoenetViewer, {
      key: "doenetviewer",
      contentId,
      flags: {
        showCorrectness,
        readOnly,
        solutionDisplayMode,
        showFeedback,
        showHints
      },
      attemptNumber,
      requestedVariant
    });
  }
  return /* @__PURE__ */ React.createElement(Tool, null, /* @__PURE__ */ React.createElement("headerPanel", {
    title: "Content"
  }), /* @__PURE__ */ React.createElement("mainPanel", null, viewer));
}
