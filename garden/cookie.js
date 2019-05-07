const SERVER_IP = `<Provider_Endpoint>`;
const socket = require(`socket.io-client`)(SERVER_IP);
const ip = require(`quick-local-ip`);
const rpio = require(`rpio`);

// ////////////////////////////////////

// Cookie Pin
const COOKIE_PIN = 11;

// Opening Cookie Pin
rpio.open(COOKIE_PIN, rpio.OUTPUT, rpio.LOW);

// On Connection with the Cloud Service
socket.on(`connect`, function connect() {
  socket.emit(DEVICE_INTERFACE.COMMANDS.REGISTER, {
    key: DEVICE_INTERFACE.STATES.IP,
    value: ip.getLocalIP4(),
    deviceType: DEVICE_INTERFACE.DEVICES.GARDEN
  });
});

// Cookie Control
socket.on(DEVICE_INTERFACE.DEVICES.COOKIE, function jar(data) {
  console.log(`Cookie Data`, data);
  if (data[0].command == `action.devices.commands.LockUnlock`) {
    if (typeof data[0].challenge === `undefined`) {
      console.log(`No ack`);
    } else if (data[0].challenge.pin !== PIN) {
      console.log(`Wrong password`);
    } else if (data[0].challenge.pin === PIN) {
      console.log(`Open here`);
      setTimeout(function pinChange() {
        rpio.write(COOKIE_PIN, rpio.LOW); // on: rpio.HIGH   off: rpio.LOW
      }, 3000);
      rpio.write(COOKIE_PIN, rpio.HIGH); // on: rpio.HIGH   off: rpio.LOW
    }
  }
});
