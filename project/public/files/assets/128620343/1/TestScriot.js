var TestScriot = pc.createScript("testScriot");

// initialize code called once per entity
TestScriot.prototype.initialize = function () {
  console.log("fxhash handler");

  var params;
  if (typeof $fx !== "undefined") {
    params = $fx.getParams();
  } else {
    params = {
      number_id: 9.50591985898082,
      bigint_id: "-17626670265300034",
      select_id: "orange",
      color_id: {
        hex: {
          rgb: "#877bc0",
          rgba: "#877bc08b",
        },
        obj: {
          rgb: {
            r: 135,
            g: 123,
            b: 192,
          },
          rgba: {
            r: 135,
            g: 123,
            b: 192,
            a: 139,
          },
        },
        arr: {
          rgb: [135, 123, 192],
          rgba: [135, 123, 192, 139],
        },
      },
      boolean_id: true,
      string_id: "b4933biohn4rtgq7o4pfn1",
    };
  }

  /**
   * example params
   * {"number_id":9.50591985898082,"bigint_id":"-17626670265300034","select_id":"orange","color_id":{"hex":{"rgb":"#877bc0","rgba":"#877bc08b"},"obj":{"rgb":{"r":135,"g":123,"b":192},"rgba":{"r":135,"g":123,"b":192,"a":139}},"arr":{"rgb":[135,123,192],"rgba":[135,123,192,139]}},"boolean_id":true,"string_id":"b4933biohn4rtgq7o4pfn1"}
   */

  var mat = this.entity.render.material;
  mat.diffuse.set(
    params.color_id.arr.rgba[0] / 255,
    params.color_id.arr.rgba[1] / 255,
    params.color_id.arr.rgba[2] / 255,
    params.color_id.arr.rgba[3] / 255,
  );
  mat.update();
  console.log(mat);
  console.log(params);
};

// update code called every frame
TestScriot.prototype.update = function (dt) {};

// swap method called for script hot-reloading
// inherit your script state here
// TestScriot.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/
