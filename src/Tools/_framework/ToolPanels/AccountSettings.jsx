import React, { useState } from "react";
import {
    useRecoilCallback,
    useRecoilValueLoadable,
  } from "recoil";
import styled from "styled-components";
import { profileAtom } from '../NewToolRoot';
import { a } from '@react-spring/web'
import InfiniteSlider from '../temp/InfiniteSlider'
import "../doenet.css";
import Textinput from "../Textinput";
import Switch from "../Switch";
// import GlobalFont from '../../_utils/GlobalFont';
import axios from "axios";

let SectionHeader = styled.h2`
  margin-top: 2em;
  margin-bottom: 2em;
`

const Content = styled.div`
  width: 100%;
  height: 100%;
`

const Image = styled(a.div)`
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center center;
`


const PROFILE_PICTURES = ['bird', 'cat', 'dog', 'emu', 'fox', 'horse', 'penguin', 'quokka', 'squirrel', 'swan', 'tiger', 'turtle', 'anonymous'];
// const picture_items = PROFILE_PICTURES.map(picture => {
//   let path = `/media/profile_pictures/${picture}.jpg`
//   let url = `url("${path}")`
//   return {css: url}
// })



const boolToString = (bool) => {
  if(bool){
    return "1"
  }else{
    return "0"
  }
}

const translateArray = (arr, k) => arr.concat(arr).slice(k, k+arr.length)

export default function DoenetProfile(props) {

    const setProfile = useRecoilCallback(({set}) => (newProfile) => {
        const data = { ...newProfile }
        localStorage.setItem('Profile', JSON.stringify(data));
        set(profileAtom,  data)
        axios.post('/api/saveProfile.php', data)
         // .then((resp)=>{console.log(">>>save profile resp.data",resp.data)})
      }
    )
    const loadProfile = useRecoilValueLoadable(profileAtom);
    let profile = loadProfile.contents;

    const [initPhoto, setInitPhoto] = useState(profile.profilePicture)


    // let [editMode, setEditMode] = useState(false);
    // let [pic, setPic] = useState(0);

    if (profile.state === "loading"){ return null;}
    if (profile.state === "hasError"){ 
      console.error(profile)
      return null;}

    //console.log(">>> translate arr ", translateArray([1, 2, 3, 4, 5], 1))

    const translatednames = translateArray(PROFILE_PICTURES, PROFILE_PICTURES.indexOf(initPhoto))

    // if(initPhoto){
    //   translatednames = translateArray(PROFILE_PICTURES, PROFILE_PICTURES.indexOf(initPhoto))
    // }

    const translateditems = translatednames.map(picture => `/media/profile_pictures_copy/${picture}.jpg`)

    if (profile.signedIn === '0') {
      return (
              <div
                style={{
                  ...props.style,
                  border: '1px solid grey',
                  borderRadius: '20px',
                  margin: 'auto',
                  marginTop: '10%',
                  padding: '10px',
                  width: '50%',
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    alignItems: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <h2>You are not signed in</h2>
                  <h2>Account Settings currently requires sign in for use</h2>
                  <button style={{ background: '#1a5a99', borderRadius: '5px' }}>
                    <a
                      href="/signin"
                      style={{ color: 'white', textDecoration: 'none' }}
                    >
                      Sign in with this link
                    </a>
                  </button>
                </div>
              </div>
      );
    }

    return (
        
              <div style = {{...props.style, margin: "auto", width: "70%"}}>
                <div style = {{margin: "auto", width: "fit-content", marginTop: "20px"}}>
                  <div style = {{width: "150px", height: "150px", margin: "auto"}}>
                
                  <InfiniteSlider fileNames = {translateditems} showButtons={true} showCounter={false} callBack = {(i) => {
                    //console.log(translatednames[i])
                    let data = {...profile}
                    if(data.profilePicture !== translatednames[i]){
                      data.profilePicture = translatednames[i]
                      setProfile(data)
                    }
                    //setPic(translatednames[i])
                  }}>
                    {({ css }, i) => {
                      // console.log(">>> pic index ", i);
                      
                      // setPicIndex(i)
                      return (
                        <Content>
                          <Image style={{ backgroundImage: css, borderRadius: '50%' }} />
                        </Content>
                      )
                    }}
                  </InfiniteSlider>
                  </div>
                  <Textinput
                      style={{ width: '300px' }}
                      id="screen name"
                      label="Screen Name"
                      value = {profile.screenName}
                      onChange = {e => {}}
                      onBlur = {e => {
                        let data = {...profile}
                        data.screenName = e.target.value
                        setProfile(data)
                      }}
                      onKeyDown = {e => {
                        if(e.key === 'Enter'){
                          let data = {...profile}
                          data.screenName = e.target.value
                          setProfile(data)
                        }
                      }}
                  ></Textinput>
                  <Textinput
                    style={{ width: '300px' }}
                    id="firstName"
                    label="First Name"
                    value = {profile.firstName}
                    onChange = {e => {}}
                    onBlur={e => {
                      let data = {...profile}
                      data.firstName = e.target.value
                      setProfile(data)
                    }}
                    onKeyDown = {e => {
                      if(e.key === 'Enter'){
                        let data = {...profile}
                        data.firstName = e.target.value
                        setProfile(data)
                      }
                    }}
                  >
                    {/* {profile.firstName} */}
                  </Textinput>
                  <Textinput
                    style={{ width: '300px' }}
                    id="lastName"
                    label="Last Name"
                    value = {profile.lastName}
                    onChange = {e => {}}
                    onBlur={e => {
                      let data = {...profile}
                      data.lastName = e.target.value
                      setProfile(data)
                    }}
                    onKeyDown = {e => {
                      if(e.key === 'Enter'){
                        let data = {...profile}
                        data.lastName = e.target.value
                        setProfile(data)
                      }
                    }}
                  >
                    {/* {profile.lastName} */}
                  </Textinput>
                </div>

                <p>Email Address: {profile.email}</p>

                <Switch
                  id="trackingConsent"
                  onChange={e => {
                    let data = {...profile}
                    data.trackingConsent = boolToString(e.target.checked)
                    setProfile(data)
                  }}
                  checked={profile.trackingConsent}
                >
                </Switch>
                <p>I consent to the use of tracking technologies.</p>

                <p>
                  "I consent to the tracking of my progress and my activity on
                  educational websites which participate in Doenet; my data will be
                  used to provide my instructor with my grades on course assignments,
                  and anonymous data may be provided to content authors to improve the
                  educational effectiveness."
                  <br />
                  <br />
                  <em>
                    Revoking your consent may impact your ability to recieve credit
                    for coursework.
                  </em>
                </p>

                <SectionHeader>Your Roles</SectionHeader>
                <Switch
                  id="student"
                  onChange={e => {
                    let data = {...profile}
                    data.roleStudent= boolToString(e.target.checked)
                    setProfile(data)
                  }} // updates immediately
                  checked={profile.roleStudent}
                >
                </Switch>
                <p>Student</p>
                <Switch
                  id="instructor"
                  onChange={e => {
                    let data = {...profile}
                    data.roleInstructor= boolToString(e.target.checked)
                    setProfile(data)
                  }} // updates immediately
                  checked={profile.roleInstructor}
                >
                </Switch>
                <p>Instructor</p>
                <Switch
                  id="course_designer"
                  onChange={e => {
                    let data = {...profile}
                    data.roleCourseDesigner= boolToString(e.target.checked)
                    setProfile(data)
                  }}
                  checked={profile.roleCourseDesigner}
                >
                </Switch>
                <p>Course Designer</p>
              </div>
    )
}