class Booking {
    constructor(scheduleId, date,userId, bookingId) {
      this.scheduleId = scheduleId;
      this.bookingId = bookingId;
      this.date = date;
      this.userId = userId;
    }
  }
  
  module.exports = Booking;
  