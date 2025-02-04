class Schedule {
    constructor(id, time, endTime, pickupLocations, dropoffLocations, transportType) {
      this.id = id;
      this.time = time;
      this.endTime = endTime;
      this.pickupLocations = pickupLocations;
      this.dropoffLocations = dropoffLocations;
      this.transportType = transportType;
    }
  }
  
  module.exports = Schedule;
  