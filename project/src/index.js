function canvas_start() {
  // Shared Lib
  var CANVAS_ID = "application-canvas";

  // Needed as we will have edge cases for particular versions of iOS
  // returns null if not iOS
  var getIosVersion = function () {
    if (/iP(hone|od|ad)/.test(navigator.platform)) {
      var v = navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
      var version = [
        parseInt(v[1], 10),
        parseInt(v[2], 10),
        parseInt(v[3] || 0, 10),
      ];
      return version;
    }

    return null;
  };

  var lastWindowHeight = window.innerHeight;
  var lastWindowWidth = window.innerWidth;
  var windowSizeChangeIntervalHandler = null;

  var pcBootstrap = {
    reflowHandler: null,
    iosVersion: getIosVersion(),

    createCanvas: function () {
      var canvas = document.createElement("canvas");
      canvas.setAttribute("id", CANVAS_ID);
      canvas.setAttribute("tabindex", 0);

      // Disable I-bar cursor on click+drag
      canvas.onselectstart = function () {
        return false;
      };

      // Disable long-touch select on iOS devices
      canvas.style["-webkit-user-select"] = "none";

      document.body.appendChild(canvas);

      return canvas;
    },

    resizeCanvas: function (app, canvas) {
      canvas.style.width = "";
      canvas.style.height = "";
      app.resizeCanvas(canvas.width, canvas.height);

      var fillMode = app._fillMode;

      if (fillMode == pc.FILLMODE_NONE || fillMode == pc.FILLMODE_KEEP_ASPECT) {
        if (
          (fillMode == pc.FILLMODE_NONE &&
            canvas.clientHeight < window.innerHeight) ||
          canvas.clientWidth / canvas.clientHeight >=
            window.innerWidth / window.innerHeight
        ) {
          canvas.style.marginTop =
            Math.floor((window.innerHeight - canvas.clientHeight) / 2) + "px";
        } else {
          canvas.style.marginTop = "";
        }
      }

      lastWindowHeight = window.innerHeight;
      lastWindowWidth = window.innerWidth;

      // Work around when in landscape to work on iOS 12 otherwise
      // the content is under the URL bar at the top
      if (this.iosVersion && this.iosVersion[0] <= 12) {
        window.scrollTo(0, 0);
      }
    },

    reflow: function (app, canvas) {
      this.resizeCanvas(app, canvas);

      // Poll for size changes as the window inner height can change after the resize event for iOS
      // Have one tab only, and rotate from portrait -> landscape -> portrait
      if (windowSizeChangeIntervalHandler === null) {
        windowSizeChangeIntervalHandler = setInterval(
          function () {
            if (
              lastWindowHeight !== window.innerHeight ||
              lastWindowWidth !== window.innerWidth
            ) {
              this.resizeCanvas(app, canvas);
            }
          }.bind(this),
          100,
        );

        // Don't want to do this all the time so stop polling after some short time
        setTimeout(function () {
          if (!!windowSizeChangeIntervalHandler) {
            clearInterval(windowSizeChangeIntervalHandler);
            windowSizeChangeIntervalHandler = null;
          }
        }, 2000);
      }
    },
  };

  // Expose the reflow to users so that they can override the existing
  // reflow logic if need be
  window.pcBootstrap = pcBootstrap;
}

function pc_init() {
  var canvas, devices, app;

  var createInputDevices = function (canvas) {
    var devices = {
      elementInput: new pc.ElementInput(canvas, {
        useMouse: INPUT_SETTINGS.useMouse,
        useTouch: INPUT_SETTINGS.useTouch,
      }),
      keyboard: INPUT_SETTINGS.useKeyboard ? new pc.Keyboard(window) : null,
      mouse: INPUT_SETTINGS.useMouse ? new pc.Mouse(canvas) : null,
      gamepads: INPUT_SETTINGS.useGamepads ? new pc.GamePads() : null,
      touch:
        INPUT_SETTINGS.useTouch && pc.platform.touch
          ? new pc.TouchDevice(canvas)
          : null,
    };

    return devices;
  };

  var configureCss = function (fillMode, width, height) {
    // Configure resolution and resize event
    if (canvas.classList) {
      canvas.classList.add("fill-mode-" + fillMode);
    }

    // css media query for aspect ratio changes
    var css =
      "@media screen and (min-aspect-ratio: " + width + "/" + height + ") {";
    css += "    #application-canvas.fill-mode-KEEP_ASPECT {";
    css += "        width: auto;";
    css += "        height: 100%;";
    css += "        margin: 0 auto;";
    css += "    }";
    css += "}";

    // append css to style
    if (document.head.querySelector) {
      document.head.querySelector("style").innerHTML += css;
    }
  };

  var displayError = function (html) {
    var div = document.createElement("div");

    div.innerHTML = [
      '<table style="background-color: #8CE; width: 100%; height: 100%;">',
      "  <tr>",
      '      <td align="center">',
      '          <div style="display: table-cell; vertical-align: middle;">',
      '              <div style="">' + html + "</div>",
      "          </div>",
      "      </td>",
      "  </tr>",
      "</table>",
    ].join("\n");

    document.body.appendChild(div);
  };

  canvas = pcBootstrap.createCanvas();
  devices = createInputDevices(canvas);

  try {
    app = new pc.Application(canvas, {
      elementInput: devices.elementInput,
      keyboard: devices.keyboard,
      mouse: devices.mouse,
      gamepads: devices.gamepads,
      touch: devices.touch,
      graphicsDeviceOptions: window.CONTEXT_OPTIONS,
      assetPrefix: window.ASSET_PREFIX || "",
      scriptPrefix: window.SCRIPT_PREFIX || "",
      scriptsOrder: window.SCRIPTS || [],
    });
  } catch (e) {
    if (e instanceof pc.UnsupportedBrowserError) {
      displayError(
        "This page requires a browser that supports WebGL.<br/>" +
          '<a href="http://get.webgl.org">Click here to find out more.</a>',
      );
    } else if (e instanceof pc.ContextCreationError) {
      displayError(
        "It doesn't appear your computer can support WebGL.<br/>" +
          '<a href="http://get.webgl.org/troubleshooting/">Click here for more information.</a>',
      );
    } else {
      displayError("Could not initialize application. Error: " + e);
    }

    return;
  }

  var configure = function () {
    app.configure(CONFIG_FILENAME, function (err) {
      if (err) {
        console.error(err);
      }

      configureCss(app._fillMode, app._width, app._height);

      const ltcMat1 = [];
      const ltcMat2 = [];

      if (
        ltcMat1.length &&
        ltcMat2.length &&
        app.setAreaLightLuts.length === 2
      ) {
        app.setAreaLightLuts(ltcMat1, ltcMat2);
      }

      // do the first reflow after a timeout because of
      // iOS showing a squished iframe sometimes
      setTimeout(function () {
        pcBootstrap.reflow(app, canvas);
        pcBootstrap.reflowHandler = function () {
          pcBootstrap.reflow(app, canvas);
        };

        window.addEventListener("resize", pcBootstrap.reflowHandler, false);
        window.addEventListener(
          "orientationchange",
          pcBootstrap.reflowHandler,
          false,
        );

        app.preload(function (err) {
          if (err) {
            console.error(err);
          }

          app.scenes.loadScene(SCENE_PATH, function (err, scene) {
            if (err) {
              console.error(err);
            }

            app.start();
          });
        });
      });
    });
  };

  if (PRELOAD_MODULES.length > 0) {
    loadModules(PRELOAD_MODULES, ASSET_PREFIX, configure);
  } else {
    configure();
  }
}

function fx_init() {
  console.log(fxhash);
  console.log(fxrand());

  const sp = new URLSearchParams(window.location.search);
  console.log(sp);

  // this is how to define parameters
  $fx.params([
    {
      id: "number_id",
      name: "A number/float64",
      type: "number",
      //default: Math.PI,
      options: {
        min: 1,
        max: 10,
        step: 0.00000000000001,
      },
    },
    {
      id: "bigint_id",
      name: "A bigint",
      type: "bigint",
      //default: BigInt(Number.MAX_SAFE_INTEGER * 2),
      options: {
        min: Number.MIN_SAFE_INTEGER * 4,
        max: Number.MAX_SAFE_INTEGER * 4,
        step: 1,
      },
    },
    {
      id: "select_id",
      name: "A selection",
      type: "select",
      //default: "pear",
      options: {
        options: ["apple", "orange", "pear"],
      },
    },
    {
      id: "color_id",
      name: "A color",
      type: "color",
      //default: "ff0000",
    },
    {
      id: "boolean_id",
      name: "A boolean",
      type: "boolean",
      //default: true,
    },
    {
      id: "string_id",
      name: "A string",
      type: "string",
      //default: "hello",
      options: {
        minLength: 1,
        maxLength: 64,
      },
    },
  ]);

  // this is how features can be defined
  $fx.features({
    "A random feature": Math.floor($fx.rand() * 10),
    "A random boolean": $fx.rand() > 0.5,
    "A random string": ["A", "B", "C", "D"].at(Math.floor($fx.rand() * 4)),
    "Feature from params, its a number": $fx.getParam("number_id"),
  });

  // log the parameters, for debugging purposes, artists won't have to do that
  console.log("Current param values:");
  // Raw deserialize param values
  console.log($fx.getRawParams());
  // Added addtional transformation to the parameter for easier usage
  // e.g. color.hex.rgba, color.obj.rgba.r, color.arr.rgb[0]
  console.log($fx.getParams());

  // how to read a single raw parameter
  console.log("Single raw value:");
  console.log($fx.getRawParam("color_id"));
  // how to read a single transformed parameter
  console.log("Single transformed value:");
  console.log($fx.getParam("color_id"));

  // update the document based on the parameters
  document.body.style.background = $fx.getParam("color_id").hex.rgba;
  //   document.body.innerHTML = `
  // <p>
  // url: ${window.location.href}
  // </p>
  // <p>
  // hash: ${$fx.hash}
  // </p>
  // <p>
  // params:
  // </p>
  // <pre>
  // ${$fx.stringifyParams($fx.getRawParams())}
  // </pre>
  // <pre style="color: white;">
  // ${$fx.stringifyParams($fx.getRawParams())}
  // </pre>
  // `;
}

canvas_start();
pc_init();
fx_init();
