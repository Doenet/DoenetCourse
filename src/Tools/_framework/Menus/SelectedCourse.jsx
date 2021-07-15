import React,{useState} from 'react';
import { useRecoilValue,useSetRecoilState,useRecoilStateLoadable } from 'recoil';
import {fetchDrivesSelector,fetchDriveUsers} from '../../../_reactComponents/Drive/NewDrive';
import { 
  faChalkboard,
  faCode,
  faFolder,
  faUserCircle
 } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { drivecardSelectedNodesAtom } from '../ToolHandlers/CourseToolHandler'
import Button from '../../../_reactComponents/PanelHeaderComponents/Button';
import DoenetDriveCardMenu from "../../../_reactComponents/Drive/DoenetDriveCardMenu";
import { driveColors, driveImages } from '../../../_reactComponents/Drive/util';
import ButtonGroup from '../../../_reactComponents/PanelHeaderComponents/ButtonGroup';

export default function SelectedCourse(props){

  const selection = useRecoilValue(drivecardSelectedNodesAtom);
  const setDrivesInfo = useSetRecoilState(fetchDrivesSelector);
  const setDrivecardSelection = useSetRecoilState(drivecardSelectedNodesAtom);
  if(selection.length === 1 && selection[0]?.role[0] === "Owner" ){

    return <>

    <DriveInfoPanel 
          key={`DriveInfoPanel${selection[0].driveId}`}
          label={selection[0].label} 
          color={selection[0].color}
          image={selection[0].image}
          driveId={selection[0].driveId} 
          />
      </>
  }else if(selection[0]?.role[0] === "Student"){
    let dIcon = <FontAwesomeIcon icon={faChalkboard}/>

    return (
      <>
        <h2>{dIcon} {selection[0].label}</h2>
      </>
    );
  }else if(selection.length > 1 && selection[0].role[0] === "Owner" ){
    return (
      <>
        <h2> {selection.length} Courses Selected</h2>
        <Button width="menu" value="Make Copy(Soon)" onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          console.log(">> made copy of courses")
        }}/><br />
          <Button width="menu" value="Delete Course" alert onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
    // alert("Delete Drive")
   let selectionArr = [];
    for(let x=0;x< selection.length;x++){
      selectionArr.push(selection[x].driveId);
    }
      
      setDrivesInfo({
        color:'abc',
        label:'abcd',
        image:'ancds',
        newDriveId:selectionArr,
        type:"delete drive"
      })
      setDrivecardSelection([]);
    // }
    
  }}/>
      </>
    );
  }else{
    return '';
  }
 
}

const DriveInfoPanel = function(props){
  const [driveLabel,setDriveLabel] = useState(props.label);
  const [panelDriveLabel,setPanelDriveLabel] = useState(props.label);
  const setDrivesInfo = useSetRecoilState(fetchDrivesSelector);
  const driveId = props.driveId;
  const [driveUsers,setDriveUsers] = useRecoilStateLoadable(fetchDriveUsers(driveId));
  const [selectedUserId,setSelectedUserId] = useState("");
  const setDrivecardSelection = useSetRecoilState(drivecardSelectedNodesAtom);

  if (driveUsers.state === "loading"){ return null;}
    if (driveUsers.state === "hasError"){ 
      console.error(driveUsers.contents)
      return null;}

  let isOwner = false;
  if (driveUsers?.contents?.usersRole === "Owner"){
    isOwner = true;
  }
  let dIcon = <FontAwesomeIcon icon={faChalkboard}/>

  let admins = [];
  let owners = [];
  let buttons = [];

  let addOwners = null;

  

  addOwners = <NewUser  driveId={driveId} type="Add Owner" setDriveUsers={setDriveUsers}/>
  
  let addAdmins = null;

    addAdmins = <NewUser  driveId={driveId} type="Add Admin" setDriveUsers={setDriveUsers}/>
 



  
  let selectedOwner = '';
  let selectedAdmin = '';

  // for (let owner of driveUsers?.contents?.owners){
  //   let isSelected = false;

  //   if (owner.userId === selectedUserId){
  //     isSelected = true;
  //     selectedOwner = owner;

  //   }
  //   owners.push(<User 
  //     key={`User${owner.userId}`} 
  //     isSelected={isSelected}
  //     onClick={setSelectedUserId}
  //     userId={owner.userId} 
  //     driveId={driveId} 
  //     email={owner.email} 
  //     isUser={owner.isUser} 
  //     screenName={owner.screenName}
  //     setDriveUsers={setDriveUsers}
  //     userRole="owner"
  //     isOwner={isOwner}
  //     numOwners={driveUsers.contents.owners.length}
  //     />)
  // }
  // for (let admin of driveUsers.contents.admins){
  //   let isSelected = false;

  //   if (admin.userId === selectedUserId){
  //     isSelected = true;
  //     selectedAdmin = admin;

  //   }
  //   admins.push(<User 
  //     key={`User${admin.userId}`} 
  //     isSelected={isSelected}
  //     onClick={setSelectedUserId}
  //     userId={admin.userId} 
  //     driveId={driveId} 
  //     email={admin.email} 
  //     isUser={admin.isUser} 
  //     screenName={admin.screenName}
  //     setDriveUsers={setDriveUsers}
  //     userRole="admin"
  //     isOwner={isOwner}
  //     />)

  // }

    if (isOwner && selectedAdmin){
      
      buttons.push(
        <div key={`promote${selectedAdmin.userId}`}>
          <Button width="menu"
        data-doenet-removebutton={selectedAdmin.userId}
        value="Promote to Owner" onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
        setDriveUsers({
            driveId:driveId,
            type:"To Owner",
            userId:selectedAdmin.userId,
            userRole:"admin"
          })
        }
        } /></div>
        )
        buttons.push(
          <div key={`remove${selectedAdmin.userId}`}>
            <Button width="menu"
            data-doenet-removeButton={selectedAdmin.userId}
          value="Remove" 
          onClick={(e)=>{
            e.preventDefault();
            e.stopPropagation();
            setDriveUsers({
              driveId:driveId,
              type:"Remove User",
              userId:selectedAdmin.userId,
              userRole:"admin"
            })
          }
          }/>
         <br />
          </div>
          )
    }
    if (isOwner && selectedOwner){
      if (!(selectedOwner && driveUsers.contents.owners.length< 2)){
        //Only show demote if two or more owners
      buttons.push(
        <div key={`demote${selectedOwner.userId}`}>
          <Button width="menu"
        data-doenet-removebutton={selectedOwner.userId}
        value="Demote to Admin" onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          setDriveUsers({
            driveId:driveId,
            type:"To Admin",
            userId:selectedOwner.userId,
            userRole:"owner"
          })
        }
        }/></div>
        )
        buttons.push(
          <div key={`remove${selectedOwner.userId}`}>
            <Button width="menu"
            data-doenet-removeButton={selectedOwner.userId}
          value="Remove" 
          onClick={(e)=>{
            e.preventDefault();
            e.stopPropagation();
            setDriveUsers({
              driveId:driveId,
              type:"Remove User",
              userId:selectedOwner.userId,
              userRole:"owner"
            })
          }
          }/>
          </div>
          
          )
      }
    }
    
   

  let deleteCourseButton = null;
  if (isOwner){
    deleteCourseButton = <>
    <Button  width="menu" value="Delete Course" alert onClick={()=>{
    // alert("Delete Drive")
    setDrivesInfo({
      color:props.color,
      label:driveLabel,
      image:props.image,
      newDriveId:[props.driveId],
      type:"delete drive"
    })
    setDrivecardSelection([]);
  }} />
    </>
  }
  const selectedOwnerFn = (userId) =>{
    for (let owner of driveUsers?.contents?.owners){
  
      if (owner.userId === userId){
        selectedOwner = owner;
  
      }
    }
  }
  const selectedAdminFn = (userId) =>{
    for (let admin of driveUsers?.contents?.admins){
  
      if (admin.userId === userId){
        selectedAdmin = admin;
  
      }
    }
  }
  let star = <FontAwesomeIcon icon={faUserCircle}/>;

  const UserOption = (props) =>(
    <>
  <option value={props.userId}>{props.screenName} {props.email}</option>

  </>
    ) ;
let ownersList = (
  driveUsers?.contents?.owners.length > 0 ? 
<select multiple onChange={(e)=>{selectedOwnerFn(e.target.value)}}>
     {driveUsers?.contents?.owners.map((item,i) => {
       return (
        <UserOption userId={item.userId} screenName={item.screenName} email={item.email}/>
       )
     })}
    </select>: ''
)
let ownerPerms = (
  <>
  <Button width="menu"
        data-doenet-removebutton={selectedOwner.userId}
        value="Demote to Admin" onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          setDriveUsers({
            driveId:driveId,
            type:"To Admin",
            userId:selectedOwner.userId,
            userRole:"owner"
          })
        }
        }/><br />
         <Button width="menu"
            data-doenet-removeButton={selectedOwner.userId}
          value="Remove" 
          onClick={(e)=>{
            e.preventDefault();
            e.stopPropagation();
            setDriveUsers({
              driveId:driveId,
              type:"Remove User",
              userId:selectedOwner.userId,
              userRole:"owner"
            })
          }
          }/>
          </>

)
let adminsList =(
  driveUsers?.contents?.admins.length > 0 ? <select multiple onChange={(e)=>{selectedAdminFn(e.target.value)}}>
     {driveUsers?.contents?.admins.map((item,i) => {
       return (
         <option value={item.userId}>{item.email}</option>
       )
     })}
    </select> : ''
)
let adminPerms =(
  <>
  <Button width="menu"
      data-doenet-removebutton={selectedAdmin.userId}
      value="Promote to Owner" onClick={(e)=>{
        e.preventDefault();
        e.stopPropagation();
      setDriveUsers({
          driveId:driveId,
          type:"To Owner",
          userId:selectedAdmin.userId,
          userRole:"admin"
        })
      }
      } /><br />
       <Button width="menu"
          data-doenet-removeButton={selectedAdmin.userId}
        value="Remove" 
        onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          setDriveUsers({
            driveId:driveId,
            type:"Remove User",
            userId:selectedAdmin.userId,
            userRole:"admin"
          })
        }
        }/>
        </>
)
  return (
    <>
      <h2 data-cy="infoPanelItemLabel">
        {dIcon} {panelDriveLabel}
      </h2>
      <label>
        Name :{' '}
        <input
          type="text"
          value={driveLabel}
          onChange={(e) => setDriveLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.keyCode === 13) {
              setPanelDriveLabel(driveLabel);
              setDrivesInfo({
                color: props.color,
                label: driveLabel,
                image: props.image,
                newDriveId: props.driveId,
                type: 'update drive label',
              });
            }
          }}
          onBlur={() => {
            setPanelDriveLabel(driveLabel);
            setDrivesInfo({
              color: props.color,
              label: driveLabel,
              image: props.image,
              newDriveId: props.driveId,
              type: 'update drive label',
            });
          }}
        />
      </label>
      <br />
      <br />
      <label>
        Image :
        <DoenetDriveCardMenu
          key={`colorMenu${props.driveId}`}
          colors={driveColors}
          initialValue={props.color}
          callback={(color) => {
            setDrivesInfo({
              color,
              label: driveLabel,
              image: props.image,
              newDriveId: props.driveId,
              type: 'update drive color',
            });
          }}
        />
      </label>

      <br />
      {addOwners}
      {ownersList}
      <br />
      {ownerPerms}
      <br />
      {addAdmins}
      <br />
      {adminsList}
      {adminPerms}
      <br />

      {deleteCourseButton}
    </>
  );
}

function User(props){
  let onClick = props.onClick;
  if (!onClick){onClick = ()=>{}}
  let emailAddress = null;
  let emailStyle = {}
  let buttons = [];
  let star = null;
  let screenName = props.screenName;
  if (screenName === "" || screenName === null){ screenName = "Unknown" }
  if (props.isUser){
    star = <FontAwesomeIcon icon={faUserCircle}/>;
  }
    emailAddress = <span style={emailStyle}>{props.email}</span>;
  let containerStyle = {}
  //   if (props.isSelected){
  //     if (props.isOwner || props.userRole == "admin"){
  //       if (!(props.userRole === 'owner' && props.numOwners < 2)){
  //         //Only show remove if two or more owners
  //         buttons.push(
  //           <div key={`remove${props.userId}`}>
  //             <Button width="menu"
  //             data-doenet-removeButton={props.userId}
  //           value="Remove" 
  //           onClick={(e)=>{
  //             e.preventDefault();
  //             e.stopPropagation();
  //             onClick("")
  //             props.setDriveUsers({
  //               driveId:props.driveId,
  //               type:"Remove User",
  //               userId:props.userId,
  //               userRole:props.userRole
  //             })
            
            
  //           }
  //           }/>
           
  //           </div>
  //           )
  //       }
        
  //     }
  //     if (props.isOwner && props.userRole == "admin"){
        
  //       buttons.push(
  //         <div key={`promote${props.userId}`}>
  //           <Button width="menu"
  //         data-doenet-removebutton={props.userId}
  //         value="Promote to Owner" onClick={(e)=>{
  //           e.preventDefault();
  //           e.stopPropagation();
  //           onClick("")
  //         props.setDriveUsers({
  //             driveId:props.driveId,
  //             type:"To Owner",
  //             userId:props.userId,
  //             userRole:props.userRole
  //           })
  //         }
  //         } /></div>
  //         )
  //     }
  //     if (props.isOwner && props.userRole == "owner"){
  //       if (!(props.userRole === 'owner' && props.numOwners < 2)){
  //         //Only show demote if two or more owners
  //       buttons.push(
  //         <div key={`demote${props.userId}`}>
  //           <Button 
  //         data-doenet-removebutton={props.userId}
  //         value="Demote to Admin" onClick={(e)=>{
  //           e.preventDefault();
  //           e.stopPropagation();
  //           onClick("")
  //           props.setDriveUsers({
  //             driveId:props.driveId,
  //             type:"To Admin",
  //             userId:props.userId,
  //             userRole:props.userRole
  //           })
  //         }
  //         }/></div>
  //         )
  //       }
  //     }
      
     
  // }
  if(props.isSelected){
    containerStyle = {backgroundColor:"#B8D2EA"}
    emailStyle = {border:"solid 1px black"}
  }
  
  return <>
    <div 
    tabIndex={0}
    className="noselect nooutline" 
    onClick={()=>onClick(props.userId)}
    onBlur={(e)=>{
      if (e.relatedTarget?.dataset?.doenetRemovebutton !== props.userId){
      // setTimeout(()=>onClick(""),500);
      onClick("")
      }
    }}
    >
      <div style={containerStyle} >
      <div>{star}{screenName}</div>
      <div>{emailAddress}</div>
      </div>
      {buttons}
    </div>
    </>
}

function NewUser(props){
  const [email,setEmail] = useState("")


  function addUser(){
    if (validateEmail(email)){
      props.setDriveUsers({
          driveId:props.driveId,
          type:props.type,
          email,
          callback
        })
        setEmail('');
    }else{
      //Toast invalid email
      console.log(`Not Added: Invalid email ${email}`)
    }

    //TODO: when set async available replace this.
    function callback(resp){

      if (resp.success){
        props.setDriveUsers({
          driveId:props.driveId,
          type:`${props.type} step 2`,
          email,
          screenName:resp.screenName,
          userId:resp.userId
        })
      }else{
        console.log(">>>Toast ",resp.message)
      }
      
    }
    
  }

  return <><div>
    <label>User&#39;s Email Address<br />
    <input type="text" value={email} 
    onChange={(e)=>{setEmail(e.target.value)}}
    onKeyDown={(e)=>{if (e.keyCode === 13){ 
      addUser();
    }}}
    onBlur={()=>{
      addUser();
    }}
    /></label>
  </div>
   <Button value={`${props.type}`} onClick={()=>addUser()}/>
    
    </>

}

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}