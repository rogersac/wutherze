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
  var AUTO_REFRESH_INTERVAL = 120000;
  var LOADING_MESSAGE = "Loading radar frames...";
  var DARK_TINT_OPACITY = 0.4;
  var KIOSK_HINT_STORAGE_KEY = "weather-radar-hide-kiosk-hint";
  var KIOSK_HINT_AUTO_HIDE_DELAY = 15000;

  var map = null;
  var baseTintLayer = null;
  var currentLayer = null;
  var pendingLayer = null;
  var locationMarker = null;
  var locationAccuracyCircle = null;
  var frames = [];
  var currentFrameIndex = -1;
  var animationTimer = null;
  var autoRefreshTimer = null;
  var controlsTimer = null;
  var controlsVisible = true;
  var isLoadingRadar = false;
  var lastRadarRefreshAt = 0;
  var timestampEl = document.getElementById("timestamp");
  var statusEl = document.getElementById("status");
  var controlsEl = document.getElementById("controls");
  var playPauseButton = document.getElementById("playPauseButton");
  var prevButton = document.getElementById("prevButton");
  var nextButton = document.getElementById("nextButton");
  var refreshButton = document.getElementById("refreshButton");
  var locateButton = document.getElementById("locateButton");
  var themeButton = document.getElementById("themeButton");
  var kioskHintEl = document.getElementById("kioskHint");
  var kioskHintCloseButton = document.getElementById("kioskHintCloseButton");
  var kioskHintTimer = null;
  var currentTheme = "dark";

  function initMap() {
    var basePane = null;
    var tintPane = null;
    var radarPane = null;
    var locationPane = null;

    map = L.map("map", {
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true
    });

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    basePane = map.createPane("basePane");
    basePane.style.zIndex = 200;

    tintPane = map.createPane("tintPane");
    tintPane.style.zIndex = 300;
    tintPane.style.pointerEvents = "none";

    radarPane = map.createPane("radarPane");
    radarPane.style.zIndex = 500;

    locationPane = map.createPane("locationPane");
    locationPane.style.zIndex = 700;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      pane: "basePane",
      maxZoom: 18
    }).addTo(map);

    baseTintLayer = L.rectangle([[-85, -180], [85, 180]], {
      stroke: false,
      fill: true,
      fillColor: "#07111a",
      fillOpacity: 0,
      interactive: false,
      pane: "tintPane"
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
      loadRadarFrames(true, true);
      noteActivity();
    };

    locateButton.onclick = function () {
      locateUser(true);
      noteActivity();
    };

    themeButton.onclick = function () {
      toggleTheme();
      noteActivity();
    };

    kioskHintCloseButton.onclick = function () {
      dismissKioskHint(true);
      noteActivity();
    };

    document.addEventListener("click", noteActivity, false);
    document.addEventListener("touchstart", noteActivity, false);
    document.addEventListener("mousemove", noteActivity, false);
  }

  function shouldShowKioskHint() {
    try {
      if (window.localStorage && window.localStorage.getItem(KIOSK_HINT_STORAGE_KEY) === "1") {
        return false;
      }
    } catch (error) {
      /* Ignore storage failures. */
    }

    return true;
  }

  function dismissKioskHint(rememberChoice) {
    if (kioskHintTimer) {
      window.clearTimeout(kioskHintTimer);
      kioskHintTimer = null;
    }

    kioskHintEl.className = "kiosk-hint is-hidden";

    if (rememberChoice) {
      try {
        if (window.localStorage) {
          window.localStorage.setItem(KIOSK_HINT_STORAGE_KEY, "1");
        }
      } catch (error) {
        /* Ignore storage failures. */
      }
    }
  }

  function showKioskHint() {
    if (!shouldShowKioskHint()) {
      return;
    }

    kioskHintEl.className = "kiosk-hint";

    kioskHintTimer = window.setTimeout(function () {
      dismissKioskHint(false);
    }, KIOSK_HINT_AUTO_HIDE_DELAY);
  }

  function applyTheme(themeName) {
    currentTheme = themeName === "light" ? "light" : "dark";
    document.body.className = "theme-" + currentTheme;

    if (themeButton) {
      if (currentTheme === "dark") {
        themeButton.textContent = "Light Mode";
      } else {
        themeButton.textContent = "Dark Mode";
      }
    }

    if (baseTintLayer) {
      baseTintLayer.setStyle({
        fillOpacity: currentTheme === "dark" ? DARK_TINT_OPACITY : 0
      });
    }
  }

  function toggleTheme() {
    if (currentTheme === "dark") {
      applyTheme("light");
    } else {
      applyTheme("dark");
    }
  }

  function updateLocationIndicator(latitude, longitude, accuracyMeters) {
    var latLng = [latitude, longitude];
    var radius = accuracyMeters || 500;

    if (!locationMarker) {
      locationMarker = L.circleMarker(latLng, {
        pane: "locationPane",
        radius: 7,
        weight: 3,
        color: "#ffffff",
        fillColor: "#2f9bff",
        fillOpacity: 0.95
      }).addTo(map);
    } else {
      locationMarker.setLatLng(latLng);
    }

    if (!locationAccuracyCircle) {
      locationAccuracyCircle = L.circle(latLng, {
        pane: "locationPane",
        stroke: true,
        weight: 1,
        color: "#7fc3ff",
        opacity: 0.75,
        fillColor: "#4aa8ff",
        fillOpacity: 0.12,
        radius: radius
      }).addTo(map);
    } else {
      locationAccuracyCircle.setLatLng(latLng);
      locationAccuracyCircle.setRadius(radius);
    }
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

  function loadRadarFrames(isManualRefresh, showLoadingMessage) {
    if (isLoadingRadar) {
      return;
    }

    isLoadingRadar = true;

    if (showLoadingMessage) {
      showStatus(LOADING_MESSAGE, false, false);
    }

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

        isLoadingRadar = false;
        lastRadarRefreshAt = new Date().getTime();

        if (!nextFrames.length) {
          showStatus("RainViewer did not return any radar frames.", true, true);
          return;
        }

        frames = nextFrames;
        currentFrameIndex = frames.length - 1;
        setFrame(currentFrameIndex);

        if (isManualRefresh) {
          showStatus("Radar refreshed.", false, false);
        } else if (showLoadingMessage && statusEl.textContent === LOADING_MESSAGE) {
          hideStatus();
        }
      },
      function () {
        isLoadingRadar = false;
        showStatus(
          "Unable to load RainViewer radar metadata. Check the network connection and try Refresh.",
          true,
          true
        );
      }
    );
  }

  function refreshRadarIfDue(forceRefresh, showLoadingMessage) {
    var now = new Date().getTime();

    if (!forceRefresh && lastRadarRefreshAt && now - lastRadarRefreshAt < AUTO_REFRESH_INTERVAL) {
      return;
    }

    loadRadarFrames(false, showLoadingMessage);
  }

  function initLifecycleRefresh() {
    function refreshOnResume() {
      refreshRadarIfDue(true, false);
    }

    window.addEventListener("focus", refreshOnResume, false);
    window.addEventListener("pageshow", refreshOnResume, false);
    window.addEventListener("online", refreshOnResume, false);

    document.addEventListener(
      "visibilitychange",
      function () {
        if (document.visibilityState === "visible") {
          refreshOnResume();
        }
      },
      false
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
      pane: "radarPane",
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
        var accuracy = position.coords.accuracy || 500;

        updateLocationIndicator(latitude, longitude, accuracy);
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
    applyTheme(currentTheme);
    initLifecycleRefresh();
    showControls();
    showKioskHint();
    loadRadarFrames(false, true);
    autoRefreshTimer = window.setInterval(function () {
      refreshRadarIfDue(true, false);
    }, AUTO_REFRESH_INTERVAL);
    locateUser(false);
  }

  startApp();
}());
