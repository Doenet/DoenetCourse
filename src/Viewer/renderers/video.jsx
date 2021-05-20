// youtube player code based on Ximera youtube player
// https://github.com/XimeraProject/server
// https://github.com/XimeraProject/server/blob/master/public/javascripts/youtube.js

import React from 'react';
import DoenetRenderer from './DoenetRenderer';
import cssesc from 'cssesc';
import { sizeToCSS } from './utils/css';

export default class Video extends DoenetRenderer {
  constructor(props) {
    super(props);

    this.onPlayerReady = this.onPlayerReady.bind(this);
    this.onPlayerStateChange = this.onPlayerStateChange.bind(this);
    this.onPlaybackRateChange = this.onPlaybackRateChange.bind(this);
  }

  componentDidMount() {
    if (this.doenetSvData.youtube) {
      let cName = cssesc(this.componentName);

      this.player = new window.YT.Player(cName, {
        videoId: this.doenetSvData.youtube,
        width: sizeToCSS(this.doenetSvData.width),
        height: sizeToCSS(this.doenetSvData.height),
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: this.onPlayerReady,
          onStateChange: this.onPlayerStateChange,
          onPlaybackRateChange: this.onPlaybackRateChange,
        },
      });
    }
  }

  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    if (this.doenetSvData.youtube) {
      return (
        <>
          <a name={this.componentName} />
          <div className="video" id={this.componentName} />
        </>
      );
    } else if (this.doenetSvData.source) {
      let extension = this.doenetSvData.source
        .split('/')
        .pop()
        .split('.')
        .pop();
      let type;
      if (extension === 'ogg') {
        type = 'video/ogg';
      } else if (extension === 'webm') {
        type = 'video/webm';
      } else if (extension === 'mp4') {
        type = 'video/mp4';
      } else {
        console.warn(
          "Haven't implemented video for any extension other than .ogg, .webm, .mp4",
        );
      }
      if (type) {
        return (
          <React.Fragment>
            <a name={this.componentName} />
            <video
              className="video"
              id={this.componentName}
              style={{ objectFit: 'fill' }}
              controls={true}
              width={sizeToCSS(this.doenetSvData.width)}
              height={sizeToCSS(this.doenetSvData.height)}
            >
              <source src={this.doenetSvData.source} type={type} />
              Your browser does not support the &lt;video&gt; tag.
            </video>
          </React.Fragment>
        );
      } else {
        return null;
      }
    }

    console.warn('No video returned youtube or no valid sources specified');
    return null;
  }

  onPlayerReady() {
    let player = this.player;
    let renderer = this;

    player.setPlaybackQuality('hd720');

    // To correctly capture the "watched" events, we need to know the last time
    // of the player before the user skips to a new spot
    // Since the callbacks only give the time after a skip,
    // we poll the player for the current time every 200 ms
    // to record the last time before a skip

    window.setInterval(function () {
      let newTime = player.getCurrentTime();
      let timeInterval;

      // if previously skipped a time (because the jump was too large)
      // we need to calculate the interval from that skipped time
      if (renderer.skippedCurrentTime) {
        timeInterval = newTime - renderer.skippedCurrentTime;
      } else {
        timeInterval = newTime - renderer.currentTime;
      }

      // We are polling every 200 ms,
      // hence if a jump was larger than a second (or negative),
      // we guess that a portion of the video was skipped
      // so don't update the current time for one cycle
      // (which is typically long enough for the state change listener
      // to be able to grab the current time to determine
      // the end of the watched segment)
      if (
        !(renderer.currentTime >= 0) ||
        (timeInterval > 0 && timeInterval < 1)
      ) {
        renderer.currentTime = newTime;
        renderer.skippedCurrentTime = null;
      } else {
        // jump was negative or longer than a second
        renderer.skippedCurrentTime = newTime;
      }
    }, 200);
  }

  onPlayerStateChange(event) {
    var lastPlayerState = this.lastPlayerState;

    let renderer = this;
    let player = this.player;
    let duration = player.getDuration();

    // console.log(`on player state change: ${event.data}`)

    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        if (this.lastEventState !== event.data) {
          let newTime = player.getCurrentTime();

          if (this.lastEventState === window.YT.PlayerState.PAUSED) {
            let timeSincePaused = newTime - this.lastPausedTime;

            // if the time has gone backward or move ahead more than a half-second,
            // we consider that a portion of the video was skipped
            // (When video is paused and immediately restarted, the time
            // skips forward a small amount, but less than a half-second)

            if (timeSincePaused < 0 || timeSincePaused > 0.5) {
              // console.log(`recording video skipped ${this.lastPausedTime}, ${newTime}`)
              this.actions.recordVideoSkipped({
                beginTime: this.lastPausedTime,
                endTime: newTime,
                duration,
              });
            }
          }

          this.lastPlayedTime = newTime;
          let rate = player.getPlaybackRate();
          this.rates = [
            {
              startingPoint: newTime,
              rate,
            },
          ];

          this.currentTime = NaN;

          // console.log(`recording that video started at ${this.lastPlayedTime} at rate ${rate}`)
          this.actions.recordVideoStarted({
            beginTime: player.getCurrentTime(),
            duration,
            rate,
          });

          this.lastEventState = event.data;
        }
        break;

      case window.YT.PlayerState.PAUSED:
        var timer = setTimeout(function () {
          let currentTime = player.getCurrentTime();

          if (renderer.lastEventState === window.YT.PlayerState.PLAYING) {
            // console.log(`recording video watched ${renderer.lastPlayedTime}, ${currentTime}`);
            renderer.rates[renderer.rates.length - 1].endingPoint = currentTime;
            renderer.actions.recordVideoWatched({
              beginTime: renderer.lastPlayedTime,
              endTime: currentTime,
              duration,
              rates: renderer.rates,
            });
          }
          // console.log(`recording that video paused ${currentTime}`)
          renderer.actions.recordVideoPaused({
            endTime: currentTime,
            duration,
          });

          renderer.currentTime = NaN;
          renderer.lastEventState = event.data;
          renderer.lastPausedTime = currentTime;
        }, 250);

        this.timer = timer;

        break;

      case window.YT.PlayerState.BUFFERING:
        clearTimeout(this.timer);

        if (
          lastPlayerState !== window.YT.PlayerState.UNSTARTED &&
          Number.isFinite(this.currentTime)
        ) {
          let newTime = player.getCurrentTime();
          // console.log(`recording video watched ${this.lastPlayedTime}, ${this.currentTime}`);

          this.rates[this.rates.length - 1].endingPoint = this.currentTime;
          this.actions.recordVideoWatched({
            beginTime: this.lastPlayedTime,
            endTime: this.currentTime,
            duration,
            rates: this.rates,
          });

          // console.log(`recording video skipped ${this.currentTime}, ${newTime}`)
          this.actions.recordVideoSkipped({
            beginTime: this.currentTime,
            endTime: newTime,
            duration,
          });
          this.currentTime = NaN;

          // videoWatched(player, container, container.data('lastPlayedTime'), container.data('currentTime'));
          // videoSkipped(player, container, container.data('currentTime'), player.getCurrentTime());

          this.lastEventState = event.data;
        }
        break;

      case window.YT.PlayerState.ENDED:
        // BADBAD: We're treating ENDED as though it meant the user
        // completed the video, even thought it
        // doesn't necessarily mean the learner watched ALL the video

        // console.log(`recording video watched ${this.lastPlayedTime}, ${player.getCurrentTime()}`);
        this.rates[this.rates.length - 1].endingPoint = player.getCurrentTime();
        this.actions.recordVideoWatched({
          beginTime: this.lastPlayedTime,
          endTime: player.getCurrentTime(),
          duration,
          rates: this.rates,
        });

        // console.log(`recording video ended`)
        this.actions.recordVideoCompleted({
          duration,
        });
        this.currentTime = NaN;

        this.lastEventState = event.data;

        break;

      case window.YT.PlayerState.UNSTARTED:
        break;
    }

    this.lastPlayerState = event.data;
  }

  onPlaybackRateChange(event) {
    this.rates[this.rates.length - 1].endingPoint = this.currentTime;
    this.rates.push({
      startingPoint: this.currentTime,
      rate: event.data,
    });
  }
}
