import React from 'react';
import styled from 'styled-components';

const DriveCardContainer = styled.div`
  position: relative;
  background-size: cover;
  background-position: center center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-size: 10px;
  line-height: 12px;
  border-radius: 5px;
  display: flex; /*added*/
  flex-direction: column; /*added*/
  justify-content: space-between;
  background-image: url(${(props) => props.url});
  background-color: ${(props) => `#${props.color}`};
  border: 2px solid #040f1a;
`;

const Image = styled.div`
  height: 100%;
  //width: 100%;
  color: red;
  background-image: url(${(props) => props.url});
  background-color: ${(props) => `#${props.color}`};
  background-size: cover;
  background-position: center;
`;
const Info = styled.div`
  border-radius: 0px 0px 5px 5px;
  // position: absolute;
  border-top: 2px solid #040f1a;
  height: 65px;
  width: inherit;
  background: #f6f8ff;
`;

const LabelContainer = styled.p`
  text-transform: capitalize;
  margin: 7px;
  //width: 100%;
  color: #040f1a;
  font-family: helvetica;
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const DriveCard = (props) => {
  // console.log(">>> Drive Card", props)
  let imageURL = `/media/drive_pictures/${props.image}`;

  return (
    <DriveCardContainer data-cy="driveCard" url={imageURL} color={props.color}>
      <Image url={imageURL} color={props.color} />
      <Info
        style={{
          backgroundColor: props.isSelected ? 'rgb(184, 210, 234)' : '',
        }}
      >
        <LabelContainer>
          <b data-cy="driveCardLabel">{props.label}</b>
        </LabelContainer>
      </Info>
    </DriveCardContainer>
  );
};

export default DriveCard;
