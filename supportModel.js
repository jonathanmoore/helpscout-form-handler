const mongoose = require('mongoose');

// Create schema
const Schema = mongoose.Schema;

// Setup support request schema
const supportSchema = new Schema({
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
  },
  storeUrl: {
    type: String,
  },
  storePassword: {
    type: String,
  },
  theme: {
    type: String,
  },
  subject: {
    type: String,
  },
  message: {
    type: String,
  },
  file: Schema.Types.Mixed,
  filePath: {
    type: String,
  },
  browser: Schema.Types.Mixed,
  location: Schema.Types.Mixed,
  helpScoutResponse: Schema.Types.Mixed,
});

// Extend Support as a mongoose model for saving the db
const Support = (module.exports = mongoose.model('support', supportSchema));

// Wrapper for finding and limiting DB calls
module.exports.get = function(callback, limit) {
  Support.find(callback).limit(limit);
};
