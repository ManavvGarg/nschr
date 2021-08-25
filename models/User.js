const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  
  uhid: {
    type: Number,
    required: true
  },
  
  name: {
    type: String,
    required: true
  },
  
  email: {
    type: String,
    required: true
  },
  
  Contact: {
    type: Number,
    required: true
  },
  
  country: {
    type: String,
    required: true
  },
  
  countryCode: {
    type: String,
    required: true
  },
  
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
