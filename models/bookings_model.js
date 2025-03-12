class Booking {
    constructor(scheduleId, date,userId, bookingId, delayTime) {
      this.scheduleId = scheduleId;
      this.bookingId = bookingId;
      this.delayTime = delayTime;
      this.date = date;
      this.userId = userId;
    }
  }
  
  module.exports = Booking;
  