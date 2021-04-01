const mongoose = require("mongoose");
const CinemaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true,
  },
  url: {
      type: String,
      required: true
  },
  location: {
      type: mongoose.Schema.Types.Mixed
  },
  films: {
      type: [String],
      default: []
  }
});

module.exports = mongoose.model("cinema", CinemaSchema);
