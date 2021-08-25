const mongoose = require('mongoose');

const assessmentsSchema = new mongoose.Schema({
    
  uhid: {
    type: Number,
    required: true
  },
  
  name: {
    type: String
  },
  
  email: {
    type: String
  },
  
  vitals: {
    type: Array,
    default: []
  },
  
  chiefComplaints: {
    type: Array,
    default: []
  },
  
  diagnosis: {
    type: Array,
    default: []
  },
  
  painAssessments: {
    type: Array,
    default: []
  }
  
});

const assessments = mongoose.model('assessments', assessmentsSchema);

module.exports = assessments;
