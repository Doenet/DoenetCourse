import React, { useContext } from 'react';
import styled from 'styled-components';
import { useToolControlHelper, useStackId, ProfileContext } from '../ToolRoot';
import UserProfile from '../temp/UserProfile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const Wrapper = styled.div`
  grid-area: headerPanel;
  height: 60px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  padding: 4px;
  background-color: hsl(0, 0%, 99%);
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 4px;
  width: 100%;
`;

const ExitOverlayButton = styled.button`
  width: 45px;
  height: 45px;
  font-size: 16px;
  color: #ffffff;
  background-color: #1a5a99;
  border: 1px solid #ffffff;
  border-radius: 50%;
  /* border-style: none; */
  cursor: pointer;
`;

export default function HeaderPanel({ title, children }) {
  const { close } = useToolControlHelper();
  const stackId = useStackId();

  const profile = useContext(ProfileContext);
  // console.log(">>>Header profile",profile)

  let userProfile = <p>Loading</p>; //TODO: update this to blank circle svg
  if (Object.keys(profile).length > 0) {
    userProfile = (
      <UserProfile
        profile={profile}
        // cookies={jwt}
        // isSignedIn={isSignedIn}
        showProfileOnly={true}
        // TODO: this needs review
        // headerRoleFromLayout={props.headerRoleFromLayout}
        // headerChangesFromLayout={props.headerChangesFromLayout}
        // guestUser={props.guestUser}
        // onChange={showCollapseMenu}
      />
    );
  }

  return (
    <Wrapper>
      <ControlsContainer>
        <p>{title}</p>
        {children}
      </ControlsContainer>
      {!(stackId > 0 ?? false) ? (
        <>{userProfile}</>
      ) : (
        <ExitOverlayButton onClick={close}>
          <FontAwesomeIcon icon={faTimes} />
        </ExitOverlayButton>
      )}
    </Wrapper>
  );
}
