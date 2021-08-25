const mongoose = require('mongoose');

const patientDocsSchema = new mongoose.Schema({
    
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
  
  prescriptions: {
    type: Array,
    default: []
  },
  
  allergies: {
    type: Array,
    default: []
  },
  
  labReports: {
    type: Array,
    default: []
  },
  
  dischargeSummaries: {
    type: Array,
    default: []
  }

  
});

const patientDocs = mongoose.model('patientDocs', patientDocsSchema);

module.exports = patientDocs;
