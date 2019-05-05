const SERVER_IP = `<PROVIDER_ENDPOINT>`;
const socket = require(`socket.io-client`)(SERVER_IP);
const ip = require(`quick-local-ip`);
const SerialPort = require(`serialport`);
const rpio = require(`rpio`);

// ////////////////////////////////////

// PINS
const HERBS_1_PIN = 11;
const HERBS_2_PIN = 18;
const HERBS_3_PIN = 16;
const LED_PIN = 12;
const HUM_PIN = 13;

// Sprinkler
const WATERING_TIMEOUT = 5000;

// LED
let LED_STATE = false;
let lightsaver = 50;
let newBrightnessRaw = 0;
let newBrightnessScaled = 0;
let oldBrightnessScaled = 0;

// Arduino Controls
const arduinoport = new SerialPort(`/dev/ttyACM0`, {
  baudRate: 115200
});

arduinoport.on(`open`, () => {
  console.log(`serial port open`);
});

// Setting PWM and Output Pins
rpio.open(LED_PIN, rpio.PWM);
rpio.open(HUM_PIN, rpio.OUTPUT, rpio.LOW);
rpio.open(HERBS_1_PIN, rpio.OUTPUT, rpio.LOW);
rpio.open(HERBS_2_PIN, rpio.OUTPUT, rpio.LOW);
rpio.open(HERBS_3_PIN, rpio.OUTPUT, rpio.LOW);

// Setting PWM Values for Brightness
rpio.pwmSetClockDivider(8); /* Set PWM refresh rate to 300kHz */
rpio.pwmSetRange(LED_PIN, 1024); /* Set pwm range */

const stream = fs.createWriteStream(`log.txt`, { flags: `a` });

// On Connection with the Cloud Service
socket.on(`connect`, function connect() {
  socket.emit(DEVICE_INTERFACE.COMMANDS.REGISTER, {
    key: DEVICE_INTERFACE.STATES.IP,
    value: ip.getLocalIP4(),
    deviceType: DEVICE_INTERFACE.DEVICES.GARDEN
  });
});

// On Sprinkler Data
socket.on(DEVICE_INTERFACE.DEVICES.SPRINKLER, function sprinkler(data) {
  console.log(`Sprinkler Data`, data);
  if (data[0].command === `action.devices.commands.StartStop`) {
    console.log(`Start Stop`);

    // VALVE CONTROL

    if (data[0].params.zone === `basil`) {
      setTimeout(function pinChange() {
        rpio.write(HERBS_1_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      }, WATERING_TIMEOUT);
      rpio.write(HERBS_1_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    }

    if (data[0].params.zone === `mint`) {
      setTimeout(function pinChange() {
        rpio.write(HERBS_2_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      }, WATERING_TIMEOUT);
      rpio.write(HERBS_2_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    }

    if (data[0].params.zone === `parsley`) {
      setTimeout(function pinChange() {
        rpio.write(HERBS_3_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      }, WATERING_TIMEOUT);
      rpio.write(HERBS_3_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    }

    if (data[0].params.zone === `left side`) {
      setTimeout(function pinChange() {
        rpio.write(HERBS_1_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
        rpio.write(HERBS_3_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      }, WATERING_TIMEOUT);
      rpio.write(HERBS_1_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
      rpio.write(HERBS_3_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    }

    if (data[0].params.zone === `right side`) {
      setTimeout(function pinChange() {
        rpio.write(HERBS_3_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
        rpio.write(HERBS_2_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      }, WATERING_TIMEOUT);
      rpio.write(HERBS_3_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
      rpio.write(HERBS_2_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    }
  }
});

// On Garden Data
socket.on(DEVICE_INTERFACE.DEVICES.GARDEN, function garden(data) {
  console.log(`Garden Data`, data);
  const action = data[0].command;
  const { params } = data[0];

  // Rotation
  if (action === `action.devices.commands.RotateAbsolute`) {
    console.log(`Rotation`);
    if (Object.prototype.hasOwnProperty.call(params, `rotationDegrees`)) {
      sendCommand((params.rotationDegrees * 16) / 360);
    }
    if (Object.prototype.hasOwnProperty.call(params, `rotationPercent`)) {
      sendCommand((params.rotationPercent * 16) / 100);
    }
  }
  // Humidity
  else if (action === `action.devices.commands.SetHumidity`) {
    console.log(`Humidity`, params);
    const humidityTimeout = params.humidity;
    setTimeout(function pinChange() {
      rpio.write(HUM_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
    }, humidityTimeout * 100);
    rpio.write(HUM_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
  }
  // On Off
  else if (action === `action.devices.commands.OnOff`) {
    console.log(`On Off`);

    LED_STATE = params.on;

    if (params.on) {
      lighting(lightsaver);
    }

    if (!params.on) {
      rpio.pwmSetData(LED_PIN, 0);
    }
  }
  // Brightness
  else if (action === `action.devices.commands.BrightnessAbsolute`) {
    console.log(`Brightness`);
    lighting(data[0].params.brightness);
  }
  // Dispense
  else if (action === `action.devices.commands.Dispense`) {
    console.log(`Dispense`);

    let waterTime;
    const { unit } = data[0].params;
    if (unit === `CUPS`) {
      if (1000 * data[0].params.amount > 10000) {
        waterTime = 10000;
      } else {
        waterTime = 1000 * data[0].params.amount;
      }
    } else if (unit === `MILLILITERS`) {
      if (10 * data[0].params.amount > 10000) {
        waterTime = 10000;
      } else {
        waterTime = 10 * data[0].params.amount;
      }
    } else if (unit === `LITERS`) {
      if (1000 * data[0].params.amount > 10000) {
        waterTime = 10000;
      } else {
        waterTime = 1000 * data[0].params.amount;
      }
    } else if (unit === `GALLONS`) {
      if (3000 * data[0].params.amount > 10000) {
        waterTime = 10000;
      } else {
        waterTime = 3000 * data[0].params.amount;
      }
    }
    setTimeout(function pinChange() {
      console.log(`end water`);
      rpio.write(HERBS_1_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      rpio.write(HERBS_2_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      rpio.write(HERBS_3_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
    }, waterTime);
    console.log(`start water for ${waterTime}`);
    rpio.write(HERBS_1_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    rpio.write(HERBS_2_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    rpio.write(HERBS_3_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
  }
});

// Function to control lighting
function lighting(lightValue) {
  if (lightValue !== 0) {
    lightsaver = lightValue;
  }

  // Lighting

  if (LED_STATE) {
    newBrightnessRaw = lightValue; // value between 1-100
    newBrightnessScaled = (newBrightnessRaw / 100) * 1024; // scaled value between 10.24 and 1024

    if (newBrightnessScaled === oldBrightnessScaled) {
      rpio.pwmSetData(LED_PIN, newBrightnessScaled);
    }

    if (newBrightnessScaled > oldBrightnessScaled) {
      for (let i = oldBrightnessScaled; i < newBrightnessScaled; i++) {
        rpio.pwmSetData(LED_PIN, newBrightnessScaled);
      }
    }
    if (newBrightnessScaled < oldBrightnessScaled) {
      for (let i = oldBrightnessScaled; i > newBrightnessScaled; i--) {
        rpio.pwmSetData(LED_PIN, newBrightnessScaled);
      }
    }
    oldBrightnessScaled = newBrightnessScaled;
  }
}

// Function to rotate steppers
function sendCommand(degrees) {
  console.log(`Degrees`, degrees);
  console.log(`G0 X${degrees} Y${degrees} Z${degrees}\r`);

  arduinoport.write(`G0X${degrees}Y${degrees}Z${degrees}\r`, error => {
    if (error) {
      return console.log(`Error on write:`, error.message);
    }
    return console.log(`message written`);
  });
}
