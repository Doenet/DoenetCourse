import React, { useState, useEffect } from 'react';
import logo from '../../Media/Doenet_Logo_Frontpage.png';
import Cookies from 'js-cookie';
import axios from 'axios';

export default function SignOut() {
  const [signOutAttempted, setSignOutAttempted] = useState(false);

  useEffect(() => {
    localStorage.clear(); //Clear out the profile

    axios
      .get('/api/signOut.php', { params: {} })
      .then((resp) => {
        // console.log(">>>signout resp",resp)
        setSignOutAttempted(true);
      })
      .catch((error) => {
        this.setState({ error: error });
      });
  }, []);

  const vanillaCookies = document.cookie.split(';');

  if (vanillaCookies.length === 1 && vanillaCookies[0] === '') {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '20',
          }}
        >
          <img
            style={{ width: '250px', height: '250px' }}
            src={logo}
            alt={
              'Chocolate glazed donut on a white cartoon cloud, sitting on a sky blue circle background'
            }
          />
          <div>
            <h2>You are Signed Out!</h2>
          </div>
        </div>
      </>
    );
  }

  if (signOutAttempted) {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '20',
          }}
        >
          <img
            style={{ width: '250px', height: '250px' }}
            src={logo}
            alt={
              'Chocolate glazed donut on a white cartoon cloud, sitting on a sky blue circle background'
            }
          />
          <div>
            <h2>FAILED SIGN OUT</h2>
            <p>Please manually remove your cookies.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '20',
        }}
      >
        <img
          style={{ width: '250px', height: '250px' }}
          src={logo}
          alt={
            'Chocolate glazed donut on a white cartoon cloud, sitting on a sky blue circle background'
          }
        />
        <div>
          <h2>Signing you out...</h2>
        </div>
      </div>
    </>
  );
}
