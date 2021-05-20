import React from 'react';
import Tool from '../Tool';

export default function Image({ contentId, branchId }) {
  return (
    <Tool>
      <headerPanel></headerPanel>

      <mainPanel>
        This is the image on branch: {branchId} with content: {contentId}
      </mainPanel>

      <supportPanel></supportPanel>

      <menuPanel title={'actions'}></menuPanel>
    </Tool>
  );
}
