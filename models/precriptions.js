const mongoose = require('mongoose');

const prescriptionsSchema = new mongoose.Schema({
    
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
  
  medications: {
    type: Array,
    default: []
  },
  
  clinicalOrder: {
    type: Array,
    default: []
  },
  
  dietOrder: {
    type: Array,
    default: []
  }

});

const prescriptions = mongoose.model('prescriptions', prescriptionsSchema);

module.exports = prescriptions;
