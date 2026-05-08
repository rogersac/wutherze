(function () {
  var RAINVIEWER_API_URL = "https://api.rainviewer.com/public/weather-maps.json";
  var DEFAULT_CENTER = [36.1627, -86.7816];
  var DEFAULT_ZOOM = 7;
  var RADAR_OPACITY = 0.65;
  var RADAR_COLOR_SCHEME = 3;
  var RADAR_SMOOTHING = 1;
  var RADAR_SNOW = 1;
  var ANIMATION_DELAY = 900;
  var CONTROLS_HIDE_DELAY = 3000;
  var LOADING_MESSAGE = "Loading radar frames...";

  var map = null;
  var currentLayer = null;
  var pendingLayer = null;
  var frames = [];
  var currentFrameIndex = -1;
  var animationTimer = null;
  var controlsTimer = null;
  var controlsVisible = true;
  var timestampEl = document.getElementById("timestamp");
  var statusEl = document.getElementById("status");
  var controlsEl = document.getElementById("controls");
  var playPauseButton = document.getElementById("playPauseButton");
  var prevButton = document.getElementById("prevButton");
  var nextButton = document.getElementById("nextButton");
  var refreshButton = document.getElementById("refreshButton");
  var locateButton = document.getElementById("locateButton");

  function initMap() {
    map = L.map("map", {
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true
    });

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(map);
  }

  function initControls() {
    playPauseButton.onclick = function () {
      if (animationTimer) {
        stopAnimation();
      } else {
        startAnimation();
      }
      noteActivity();
    };

    prevButton.onclick = function () {
      stopAnimation();
      showPreviousFrame();
      noteActivity();
    };

    nextButton.onclick = function () {
      stopAnimation();
      showNextFrame();
      noteActivity();
    };

    refreshButton.onclick = function () {
      stopAnimation();
      loadRadarFrames(true);
      noteActivity();
    };

    locateButton.onclick = function () {
      locateUser(true);
      noteActivity();
    };

    document.addEventListener("click", noteActivity, false);
    document.addEventListener("touchstart", noteActivity, false);
    document.addEventListener("mousemove", noteActivity, false);
  }

  function noteActivity() {
    showControls();
  }

  function showControls() {
    if (!controlsVisible) {
      controlsEl.className = "controls";
      controlsVisible = true;
    }

    if (controlsTimer) {
      window.clearTimeout(controlsTimer);
    }

    controlsTimer = window.setTimeout(function () {
      controlsEl.className = "controls is-hidden";
      controlsVisible = false;
    }, CONTROLS_HIDE_DELAY);
  }

  function showStatus(message, isError, keepVisible) {
    statusEl.textContent = message;
    statusEl.className = isError ? "status is-error" : "status";

    if (!keepVisible) {
      window.setTimeout(function () {
        if (statusEl.textContent === message) {
          hideStatus();
        }
      }, 4000);
    }
  }

  function hideStatus() {
    statusEl.className = "status is-hidden";
  }

  function requestJson(url, onSuccess, onError) {
    var cacheBustedUrl = url + "?t=" + new Date().getTime();

    /* Use fetch when available, but keep an XHR fallback for older Safari builds. */
    if (window.fetch) {
      window
        .fetch(cacheBustedUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Metadata request failed.");
          }
          return response.json();
        })
        .then(onSuccess)
        .catch(function () {
          onError();
        });
      return;
    }

    var request = new XMLHttpRequest();
    request.open("GET", cacheBustedUrl, true);
    request.onreadystatechange = function () {
      if (request.readyState !== 4) {
        return;
      }

      if (request.status >= 200 && request.status < 300) {
        try {
          onSuccess(JSON.parse(request.responseText));
        } catch (error) {
          onError();
        }
      } else {
        onError();
      }
    };
    request.onerror = onError;
    request.send();
  }

  function loadRadarFrames(isManualRefresh) {
    showStatus(LOADING_MESSAGE, false, false);

    requestJson(
      RAINVIEWER_API_URL,
      function (data) {
        var host = data && data.host ? data.host : "";
        var pastFrames =
          data && data.radar && data.radar.past ? data.radar.past : [];
        var nextFrames = [];
        var i = 0;

        for (i = 0; i < pastFrames.length; i += 1) {
          if (pastFrames[i] && pastFrames[i].path && pastFrames[i].time) {
            nextFrames.push({
              host: host,
              path: pastFrames[i].path,
              time: pastFrames[i].time
            });
          }
        }

        if (!nextFrames.length) {
          showStatus("RainViewer did not return any radar frames.", true, true);
          return;
        }

        frames = nextFrames;
        currentFrameIndex = frames.length - 1;
        setFrame(currentFrameIndex);

        if (isManualRefresh) {
          showStatus("Radar refreshed.", false, false);
        } else if (statusEl.textContent === LOADING_MESSAGE) {
          hideStatus();
        }
      },
      function () {
        showStatus(
          "Unable to load RainViewer radar metadata. Check the network connection and try Refresh.",
          true,
          true
        );
      }
    );
  }

  function buildRadarTileUrl(frame) {
    return (
      frame.host +
      frame.path +
      "/256/{z}/{x}/{y}/" +
      RADAR_COLOR_SCHEME +
      "/" +
      RADAR_SMOOTHING +
      "_" +
      RADAR_SNOW +
      ".png"
    );
  }

  function formatFrameTime(unixTime) {
    var date = new Date(unixTime * 1000);
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var suffix = hours >= 12 ? "PM" : "AM";
    var displayHours = hours % 12;

    if (displayHours === 0) {
      displayHours = 12;
    }

    if (minutes < 10) {
      minutes = "0" + minutes;
    }

    return (
      "Radar: " +
      months[date.getMonth()] +
      " " +
      date.getDate() +
      ", " +
      displayHours +
      ":" +
      minutes +
      " " +
      suffix
    );
  }

  function setTimestamp(frame) {
    timestampEl.textContent = formatFrameTime(frame.time);
  }

  function setFrame(index) {
    var frame = null;

    if (!frames.length) {
      return;
    }

    if (index < 0) {
      index = frames.length - 1;
    }

    if (index >= frames.length) {
      index = 0;
    }

    currentFrameIndex = index;
    frame = frames[currentFrameIndex];
    setTimestamp(frame);
    swapRadarLayer(frame);
  }

  function swapRadarLayer(frame) {
    var incomingUrl = buildRadarTileUrl(frame);
    var incomingLayer = null;
    var finished = false;

    /* Keep only the current radar layer and one incoming layer in memory. */
    if (currentLayer && currentLayer._rainUrl === incomingUrl) {
      return;
    }

    clearPendingLayer();

    incomingLayer = L.tileLayer(incomingUrl, {
      tileSize: 256,
      opacity: 0,
      zIndex: 500,
      maxNativeZoom: 7,
      updateWhenIdle: true,
      keepBuffer: 1
    });

    incomingLayer._rainUrl = incomingUrl;
    pendingLayer = incomingLayer;

    function finalizeSwap() {
      if (finished) {
        return;
      }

      finished = true;

      if (pendingLayer !== incomingLayer) {
        return;
      }

      incomingLayer.setOpacity(RADAR_OPACITY);

      if (currentLayer && currentLayer !== incomingLayer) {
        map.removeLayer(currentLayer);
      }

      currentLayer = incomingLayer;
      pendingLayer = null;
    }

    incomingLayer.on("load", finalizeSwap);

    incomingLayer.on("tileerror", function () {
      showStatus("Some radar tiles failed to load.", true, false);
    });

    map.addLayer(incomingLayer);

    window.setTimeout(finalizeSwap, 2500);
  }

  function clearPendingLayer() {
    if (!pendingLayer) {
      return;
    }

    map.removeLayer(pendingLayer);
    pendingLayer = null;
  }

  function showPreviousFrame() {
    setFrame(currentFrameIndex - 1);
  }

  function showNextFrame() {
    setFrame(currentFrameIndex + 1);
  }

  function startAnimation() {
    if (animationTimer || frames.length < 2) {
      if (frames.length < 2) {
        showStatus("Need at least two radar frames to animate.", true, false);
      }
      return;
    }

    playPauseButton.innerHTML = "Pause";
    /* Swap frames by rotating tile layers instead of drawing to canvas. */
    animationTimer = window.setInterval(function () {
      showNextFrame();
    }, ANIMATION_DELAY);
  }

  function stopAnimation() {
    if (animationTimer) {
      window.clearInterval(animationTimer);
      animationTimer = null;
    }

    playPauseButton.innerHTML = "Play";
  }

  function locateUser(isManualRequest) {
    if (!navigator.geolocation) {
      showStatus(
        "Geolocation is not available. Showing Nashville, Tennessee instead.",
        true,
        false
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        map.setView([latitude, longitude], 8);

        if (isManualRequest) {
          showStatus("Location updated.", false, false);
        }
      },
      function () {
        showStatus(
          "Unable to get your location. Showing Nashville, Tennessee instead.",
          true,
          false
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  function startApp() {
    initMap();
    initControls();
    showControls();
    loadRadarFrames(false);
    locateUser(false);
  }

  startApp();
}());
