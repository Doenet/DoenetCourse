import React, { useState } from 'react';
import Tool from '../_framework/Tool';
import DoenetViewer from '../../Viewer/DoenetViewer.jsx';
import { useRecoilCallback } from 'recoil';
import { 
  itemHistoryAtom
} from '../../_sharedRecoil/content'


export default function Content(props) {
  let urlParamsObj = Object.fromEntries(new URLSearchParams(props.route.location.search));
  let [contentId,setContentId] = useState(urlParamsObj?.contentId);
  
  //just has contentId if it's a parameter.  
  //If doenetId then find latest release's contentId
  const doenetId = urlParamsObj?.doenetId;
  let [status,setStatus] = useState("Init");
  const findContentId = useRecoilCallback(({snapshot,set})=> async (doenetId)=>{
    const versionHistory = await snapshot.getPromise((itemHistoryAtom(doenetId)));

    let contentId = null;
    for (let named of versionHistory.named){
      if (named.isReleased === '1'){
        contentId = named.contentId;
        break;
      }
    }
    if (contentId){
      setContentId(contentId)
      setStatus("Found released version")
    }else{
      setStatus("No released versions")
    }
  })

  let viewer = null;

  if (status === "Init" && doenetId && !contentId){
    findContentId(doenetId)
    return null;
  }else if(!contentId && !doenetId){
    viewer = <p>Need a contentId or doenetId to display content...!</p>
  }else if(status === "No released versions"){
    viewer = <p>Sorry! The author hasn't released any content to view at this link.</p>
  }else{
    const attemptNumber = 1;
    const showCorrectness = true;
    const readOnly = false;
    const solutionDisplayMode = "button";
    const showFeedback = true;
    const showHints = true;
    const requestedVariant = {index:1}; 
    viewer = <DoenetViewer
    key='doenetviewer'
    contentId={contentId}
    flags={{
      showCorrectness,
      readOnly,
      solutionDisplayMode,
      showFeedback,
      showHints,
    }}
    attemptNumber={attemptNumber}
    requestedVariant={requestedVariant}
  /> 
  }

  

  return (
    
    <Tool>
      <headerPanel title="Content">

      </headerPanel>
       <mainPanel>
         {viewer}
       </mainPanel>
    </Tool>

  );
}