const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
  },
  films: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("user", UserSchema);
