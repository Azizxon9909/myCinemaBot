const mongoose = require("mongoose");
const FilmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true,
  },
  year: {
    type: String,
  },
  rate: {
    type: Number,
  },
  length: {
    type: String,
  },
  country: {
    type: String,
  },
  link: {
    type: String,
  },
  picture: {
    type: String,
  },
  cinemas: {
    type: [String],
    default: []
  },
});

module.exports = mongoose.model("film", FilmSchema);
