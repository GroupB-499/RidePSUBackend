class Schedule {
    constructor(scheduleId, time, pickupLocations, dropoffLocations, transportType) {
      this.scheduleId = scheduleId;
      this.time = time;
      this.pickupLocations = pickupLocations;
      this.dropoffLocations = dropoffLocations;
      this.transportType = transportType;
    }
  }
  
  module.exports = Schedule;
  