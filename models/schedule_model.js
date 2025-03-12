class Schedule {
    constructor(scheduleId, time, pickupLocations, dropoffLocations, transportType, driverId) {
      this.scheduleId = scheduleId;
      this.time = time;
      this.pickupLocations = pickupLocations;
      this.dropoffLocations = dropoffLocations;
      this.transportType = transportType;
      this.driverId = driverId;
    }
  }
  
  module.exports = Schedule;
  