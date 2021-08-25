const router = require("express").Router();
const { body } = require("express-validator");
const multer = require("multer");
const { makeid } = require('./utils/functions');

//Configuration for Multer disk
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];

    cb(null, `files/${file.fieldname}-${Date.now()}.${ext}`);
  },
});

// Multer Filter
const multerFilter = (req, file, cb) => {
  if (file.mimetype.split("/")[1] === "pdf") {
    cb(null, true);
  } else {
    cb(new Error("Please upload only PDF Documents."), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const {
    homePage,
    register,
    registerPage,
    login,
    loginPage,
    patientRegisterPage
} = require("./controllers/userController");

// Load User model
const User = require('./models/User');
const UserAssessments = require('./models/assessments');
const UserDocs = require('./models/patientDocs');
const UserPrescriptions = require('./models/precriptions')

const ifNotLoggedin = (req, res, next) => {
    if(!req.session.userID){
        return res.redirect('/login');
    }
    next();
}

const ifLoggedin = (req,res,next) => {
    if(req.session.userID){
        return res.redirect('/');
    }
    next();
}

router.get('/', ifNotLoggedin, homePage);

router.get("/login", ifLoggedin, loginPage);
router.post("/login",
ifLoggedin,
    [
        body("_email", "Invalid email address")
            .notEmpty()
            .escape()
            .trim()
            .isEmail(),
        body("_password", "The Password must be of minimum 4 characters length")
            .notEmpty()
            .trim()
            .isLength({ min: 4 }),
    ],
    login
);

router.get("/signup", ifLoggedin, registerPage);
router.post(
    "/signup",
    ifLoggedin,
    [
        body("_name", "The name must be of minimum 3 characters length")
            .notEmpty()
            .escape()
            .trim()
            .isLength({ min: 3 }),
        body("_email", "Invalid email address")
            .notEmpty()
            .escape()
            .trim()
            .isEmail(),
        body("_password", "The Password must be of minimum 4 characters length")
            .notEmpty()
            .trim()
            .isLength({ min: 4 }),
    ],
    register
);

router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        next(err);
    });
    res.redirect('/login');
});

router.get('/patient/register', ifNotLoggedin, patientRegisterPage);

router.post('/patient/register', ifNotLoggedin, (req, res) => {
    const { patient_name, patient_email, patient_contact, patient_country, patient_countryCode, patient_uhid } = req.body;
    let errors = [];
  
    if (!patient_name || !patient_email || !patient_contact || !patient_country || !patient_countryCode || !patient_uhid) {
      errors.push({ msg: 'Please enter all fields' });
    }
  
    if (errors.length > 0) {
      res.render('patient-register', {
        errors,
        patient_name,
        patient_email,
        patient_contact,
        patient_country
      });
    } else {
      const name = patient_name, email = patient_email, Contact = patient_contact, country = patient_country, countryCode = patient_countryCode, uhid = patient_uhid;
      User.findOne({ uhid: uhid }).then(user => {
        if (user) {
          errors.push({ msg: 'That patient already exists!' });
          res.render('patient-register', {
            errors,
            name,
            email,
            country
          });
        } else { 
  
          const newUser = new User({
            uhid,
            name,
            email,
            Contact,
            country,
            countryCode
          });
          const newUserAssessments = new UserAssessments({
            uhid,
            name,
            email,
          });
  
          const newUserDocs = new UserDocs({
            uhid,
            name,
            email
          });
  
          const newUserPrescriptions = new UserPrescriptions({
            uhid,
            name,
            email
          });
  
  
          newUser
          .save()
          .then(async user => {
  
            
            
            res.redirect('/');
  
            await newUserAssessments.save().catch(e => console.log(e));
            await newUserPrescriptions.save().catch(e => console.log(e));
            await newUserDocs.save().catch(e => console.log(e));
  
  
          })
          .catch(err => console.log(err));
  
        } //=======================
      });
    }
  });


router.post('/patient/lookup', ifNotLoggedin, async(req, res) => {


  const patientID = await parseInt(req.body.patient_uhid);
  await User.findOne({ uhid: patientID }).then(async user => {
    if(!user) {
      return res.redirect('/');
    }

  res.redirect(`/patient/lookup/${patientID}`)

  });
});

router.get('/patient/lookup/:id', ifNotLoggedin, async(req, res) =>{

  const patientID = parseInt(req.params.id);
  await User.findOne({ uhid: patientID }).then(async user => {
    if(!user) {
      return res.redirect('/');
    }


//===================================================================================
//                                          Patient Documents
//===================================================================================

    let allPrescriptions = [];
    let allAllergies = [];
    let allLabReports = [];
    let allDischargeSummaries = [];

    await UserDocs.findOne({ uhid: patientID }, async(err, data) => {

      if(err) throw err;
      
      //Prescriptions

      if(data.prescriptions && data.prescriptions.length > 0) {
      if(data.prescriptions.length > 1) {
        const userPrescriptions2 = await data.prescriptions.sort(function(x, y){ return y.timestamp - x.timestamp });
      
      for(i=0; i<8; i++) {
        if(userPrescriptions2[i] === undefined || userPrescriptions2[i] === null) return;
        allPrescriptions.push(userPrescriptions2[i]);
      }
      } else if(data.prescriptions.length === 1){
        const userPrescriptions2 = await data.prescriptions[0]
        allPrescriptions.push(userPrescriptions2);
      }
      }

      //Allergies

      if(data.allergies && data.allergies.length > 0) {
        if(data.allergies.length > 1) {
          const userAllergies2 = await data.allergies.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userAllergies2[i] === undefined || userAllergies2[i] === null) return;
          allAllergies.push(userAllergies2[i]);
        }
        } else if(data.allergies.length === 1){
          const userAllergies2 = await data.allergies[0]
          allAllergies.push(userAllergies2);
        }
        }

      //Lab Reports

      if(data.labReports && data.labReports.length > 0) {
        if(data.labReports.length > 1) {
          const userLabReports2 = await data.labReports.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userLabReports2[i] === undefined || userLabReports2[i] === null) return;
          allLabReports.push(userLabReports2[i]);
        }
        } else if(data.labReports.length === 1){
          const userLabReports2 = await data.labReports[0]
          allLabReports.push(userLabReports2);
        }
        }

      //Discharge Summaries

      if(data.dischargeSummaries && data.dischargeSummaries.length > 0) {
        if(data.dischargeSummaries.length > 1) {
          const userDiscahrgeSummaries = await data.dischargeSummaries.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userDiscahrgeSummaries[i] === undefined || userDiscahrgeSummaries[i] === null) return;
          allDischargeSummaries.push(userDiscahrgeSummaries[i]);
        }
        } else if(data.dischargeSummaries.length === 1){
          const userDiscahrgeSummaries = await data.dischargeSummaries[0]
          allDischargeSummaries.push(userDiscahrgeSummaries);
        }
        }

    });




//===================================================================================
//                                          Patient Assessments
//===================================================================================


    let allVitals= [];
    let allChiefComplaints = [];
    let allDiagnosis = [];
    let allPainAssessments = [];

    await UserAssessments.findOne({ uhid: patientID }, async(err, data) => {

      if(err) throw err;
      
      //Vitals

      if(data.vitals && data.vitals.length > 0) {
      if(data.vitals.length > 1) {
        const userVitals2 = await data.vitals.sort(function(x, y){ return y.timestamp - x.timestamp });
      
      for(i=0; i<8; i++) {
        if(userVitals2[i] === undefined || userVitals2[i] === null) return;
        allVitals.push(userVitals2[i]);
      }
      } else if(data.vitals.length === 1){
        const userVitals2 = await data.vitals[0]
        allVitals.push(userVitals2);
      }
      }

      //Chief Complaints

      if(data.chiefComplaints && data.chiefComplaints.length > 0) {
        if(data.chiefComplaints.length > 1) {
          const userChiefComplaints2 = await data.chiefComplaints.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userChiefComplaints2[i] === undefined || userChiefComplaints2[i] === null) return;
          allChiefComplaints.push(userChiefComplaints2[i]);
        }
        } else if(data.chiefComplaints.length === 1){
          const userChiefComplaints2 = await data.chiefComplaints[0]
          allChiefComplaints.push(userChiefComplaints2);
        }
        }

      //Diagnosis

      if(data.diagnosis && data.diagnosis.length > 0) {
        if(data.diagnosis.length > 1) {
          const userDiagnosis2 = await data.diagnosis.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userDiagnosis2[i] === undefined || userDiagnosis2[i] === null) return;
          allDiagnosis.push(userDiagnosis2[i]);
        }
        } else if(data.diagnosis.length === 1){
          const userDiagnosis2 = await data.diagnosis[0]
          allDiagnosis.push(userDiagnosis2);
        }
        }

      //Pain Assessments

      if(data.painAssessments && data.painAssessments.length > 0) {
        if(data.painAssessments.length > 1) {
          const userPainAssessments = await data.painAssessments.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userPainAssessments[i] === undefined || userPainAssessments[i] === null) return;
          allPainAssessments.push(userPainAssessments[i]);
        }
        } else if(data.painAssessments.length === 1){
          const userPainAssessments = await data.painAssessments[0]
          allPainAssessments.push(userPainAssessments);
        }
        }

    });




//===================================================================================
//                                          Patient Prescriptions
//===================================================================================



    let allMedications = [];
    let allClinicalOrders = [];
    let allDietOrders = [];


    await UserPrescriptions.findOne({ uhid: patientID }, async(err, data) => {

      if(err) throw err;
      
      //Medications

      if(data.medications && data.medications.length > 0) {
      if(data.medications.length > 1) {
        const userMedications2 = await data.medications.sort(function(x, y){ return y.timestamp - x.timestamp });
      
      for(i=0; i<8; i++) {
        if(userMedications2[i] === undefined || userMedications2[i] === null) return;
        allMedications.push(userMedications2[i]);
      }
      } else if(data.medications.length === 1){
        const userMedications2 = await data.medications[0]
        allMedications.push(userMedications2);
      }
      }

      //Clinical Orders

      if(data.clinicalOrder && data.clinicalOrder.length > 0) {
        if(data.clinicalOrder.length > 1) {
          const userClinicalOrder2 = await data.clinicalOrder.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userClinicalOrder2[i] === undefined || userClinicalOrder2[i] === null) return;
          allClinicalOrders.push(userClinicalOrder2[i]);
        }
        } else if(data.clinicalOrder.length === 1){
          const userClinicalOrder2 = await data.clinicalOrder[0]
          allClinicalOrders.push(userClinicalOrder2);
        }
        }

      //Diet Order

      if(data.dietOrder && data.dietOrder.length > 0) {
        if(data.dietOrder.length > 1) {
          const userDietOrder2 = await data.dietOrder.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i<8; i++) {
          if(userDietOrder2[i] === undefined || userDietOrder2[i] === null) return;
          allDietOrders.push(userDietOrder2[i]);
        }
        } else if(data.dietOrder.length === 1){
          const userDietOrder2 = await data.dietOrder[0]
          allDietOrders.push(userDietOrder2);
        }
        }


    });





    res.render('patientProfile', {
      patient: user,
      allVitals,
      allChiefComplaints,
      allDiagnosis,
      allPainAssessments,
      allMedications,
      allClinicalOrders,
      allDietOrders,
      allPrescriptions,
      allAllergies,
      allLabReports,
      allDischargeSummaries
    });

  })


})


//===================================================================================
//                                          Patient Vitals
//===================================================================================

router.get('/patient/:id/vitals', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allVitals = [];
    await UserAssessments.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.vitals && data.vitals.length > 0) {
        if(data.vitals.length > 1) {
          const userVitals2 = await data.vitals.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.vitals.length + 1; i++) {
          if(userVitals2[i] === undefined || userVitals2[i] === null) return;
          allVitals.push(userVitals2[i]);
        }
        } else if(data.vitals.length === 1){
          const userVitals2 = await data.vitals[0]
          allVitals.push(userVitals2);
        }
        }
  
    });

    res.render('vitals', {
      patient: user,
      allVitals
    });

  }

});

router.get('/patient/:id/vitals/new', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/vitalsUpload', {
    patient: user
  });
});

router.post('/patient/:id/vitals/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userVitals = await UserAssessments.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userVitals.vitals.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserAssessments.findOneAndUpdate({uhid: patientID},
      {$addToSet: {vitals: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/vitals`); });
  
  
      }


});

router.get('/patient/:id/vitals/view/:vitalID', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;
  const reportID = req.params.vitalID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserAssessments.findOne({ uhid: patientID });
    const report = [];
    reportData.vitals.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/vitalReport', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }


});


//===================================================================================
//                                          Patient Chief Complaints
//===================================================================================

router.get('/patient/:id/chief-complaints', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allChiefComplaints = [];
    await UserAssessments.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.chiefComplaints && data.chiefComplaints.length > 0) {
        if(data.chiefComplaints.length > 1) {
          const userChiefComplaints2 = await data.chiefComplaints.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.chiefComplaints.length + 1; i++) {
          if(userChiefComplaints2[i] === undefined || userChiefComplaints2[i] === null) return;
          allChiefComplaints.push(userChiefComplaints2[i]);
        }
        } else if(data.chiefComplaints.length === 1){
          const userChiefComplaints2 = await data.chiefComplaints[0]
          allChiefComplaints.push(userChiefComplaints2);
        }
        }
  
    });

    res.render('chiefComplaints', {
      patient: user,
      allChiefComplaints
    });

  }
});

router.get('/patient/:id/chief-complaints/new', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/chiefComUpload', {
    patient: user
  });

});

router.post('/patient/:id/chief-complaints/new', ifNotLoggedin, upload.single("report_file"), async(req, res) => {
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userChiefComplaints = await UserAssessments.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userChiefComplaints.chiefComplaints.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserAssessments.findOneAndUpdate({uhid: patientID},
      {$addToSet: {chiefComplaints: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/chief-complaints`); });
  
  
      }
});

router.get('/patient/:id/chief-complaints/view/:ccID', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;
  const reportID = req.params.ccID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserAssessments.findOne({ uhid: patientID });
    const report = [];
    reportData.chiefComplaints.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/chiefComplaints', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }
});

//===================================================================================
//                                          Patient Diagnosis
//===================================================================================

router.get('/patient/:id/diagnosis', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allDiagnosis = [];
    await UserAssessments.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.diagnosis && data.diagnosis.length > 0) {
        if(data.diagnosis.length > 1) {
          const userDiagnosis2 = await data.diagnosis.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.diagnosis.length + 1; i++) {
          if(userDiagnosis2[i] === undefined || userDiagnosis2[i] === null) return;
          allDiagnosis.push(userDiagnosis2[i]);
        }
        } else if(data.diagnosis.length === 1){
          const userDiagnosis2 = await data.diagnosis[0]
          allDiagnosis.push(userDiagnosis2);
        }
        }
  
    });

    res.render('diagnosis', {
      patient: user,
      allDiagnosis
    });

  }
});

router.get('/patient/:id/diagnosis/new', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/diagnosisUpload', {
    patient: user
  });

});

router.post('/patient/:id/diagnosis/new', ifNotLoggedin, upload.single("report_file"), async(req, res) => {

  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userDiagnosis = await UserAssessments.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userDiagnosis.diagnosis.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserAssessments.findOneAndUpdate({uhid: patientID},
      {$addToSet: {diagnosis: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/diagnosis`); });
  
  
      }

});

router.get('/patient/:id/diagnosis/view/:diagnosisID', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;
  const reportID = req.params.diagnosisID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserAssessments.findOne({ uhid: patientID });
    const report = [];
    reportData.diagnosis.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/diagnosis', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }
});

//===================================================================================
//                                          Patient Pain Assessments
//===================================================================================

router.get('/patient/:id/pain-assessments', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allPainAssessments = [];
    await UserAssessments.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.painAssessments && data.painAssessments.length > 0) {
        if(data.painAssessments.length > 1) {
          const userPainAssessments2 = await data.painAssessments.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.painAssessments.length + 1; i++) {
          if(userPainAssessments2[i] === undefined || userPainAssessments2[i] === null) return;
          allPainAssessments.push(userPainAssessments2[i]);
        }
        } else if(data.painAssessments.length === 1){
          const userPainAssessments2 = await data.painAssessments[0]
          allPainAssessments.push(userPainAssessments2);
        }
        }
  
    });

    res.render('painAssessments', {
      patient: user,
      allPainAssessments
    });

  }
});

router.get('/patient/:id/pain-assessments/new', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/painAssessments', {
    patient: user
  });


});

router.post('/patient/:id/pain-assessments/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {
 
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userPainAssessments = await UserAssessments.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userPainAssessments.painAssessments.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserAssessments.findOneAndUpdate({uhid: patientID},
      {$addToSet: {painAssessments: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/pain-assessments`); });
  
  
      }


});

router.get('/patient/:id/pain-assessments/view/:paID', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const reportID = req.params.paID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserAssessments.findOne({ uhid: patientID });
    const report = [];
    reportData.painAssessments.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/painAssessments', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});

//===================================================================================
//                                          Patient Medications
//===================================================================================

router.get('/patient/:id/medications', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allMedications = [];
    await UserPrescriptions.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.medications && data.medications.length > 0) {
        if(data.medications.length > 1) {
          const userMedications2 = await data.medications.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.medications.length + 1; i++) {
          if(userMedications2[i] === undefined || userMedications2[i] === null) return;
          allMedications.push(userMedications2[i]);
        }
        } else if(data.medications.length === 1){
          const userMedications2 = await data.medications[0]
          allMedications.push(userMedications2);
        }
        }
  
    });

    res.render('medications', {
      patient: user,
      allMedications
    });

  }
});

router.get('/patient/:id/medications/new', ifNotLoggedin, async(req, res) => {

  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/medicationsUpload', {
    patient: user
  });

});

router.post('/patient/:id/medications/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {

  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userMedications = await UserPrescriptions.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userMedications.medications.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserPrescriptions.findOneAndUpdate({uhid: patientID},
      {$addToSet: {medications: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/medications`); });
  
  
      }

});

router.get('/patient/:id/medications/view/:medicationsID', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const reportID = req.params.medicationsID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserPrescriptions.findOne({ uhid: patientID });
    const report = [];
    reportData.medications.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/medications', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});

//===================================================================================
//                                          Patient Clinical Orders
//===================================================================================

router.get('/patient/:id/clinical-orders', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allClinicalOrders = [];
    await UserPrescriptions.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.clinicalOrder && data.clinicalOrder.length > 0) {
        if(data.clinicalOrder.length > 1) {
          const userClinicalOrder2 = await data.clinicalOrder.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.clinicalOrder.length + 1; i++) {
          if(userClinicalOrder2[i] === undefined || userClinicalOrder2[i] === null) return;
          allClinicalOrders.push(userClinicalOrder2[i]);
        }
        } else if(data.clinicalOrder.length === 1){
          const userClinicalOrder2 = await data.clinicalOrder[0]
          allClinicalOrders.push(userClinicalOrder2);
        }
        }
  
    });

    res.render('clinicalOrders', {
      patient: user,
      allClinicalOrders
    });

  }
});

router.get('/patient/:id/clinical-orders/new', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/clinicalOrdersUpload', {
    patient: user
  });

});

router.post('/patient/:id/clinical-orders/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {

  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userClinicalOrder = await UserPrescriptions.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userClinicalOrder.clinicalOrder.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserPrescriptions.findOneAndUpdate({uhid: patientID},
      {$addToSet: {clinicalOrder: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/clinical-orders`); });
  
  
      }

});

router.get('/patient/:id/clinical-orders/view/:clinicalOrderID', ifNotLoggedin, async(req, res) => {

  const patientID = req.params.id;
  const reportID = req.params.clinicalOrderID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserPrescriptions.findOne({ uhid: patientID });
    const report = [];
    reportData.clinicalOrder.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/clinicalOrder', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});

//===================================================================================
//                                          Patient Diet Orders
//===================================================================================

router.get('/patient/:id/diet-orders', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allDietOrders = [];
    await UserPrescriptions.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.dietOrder && data.dietOrder.length > 0) {
        if(data.dietOrder.length > 1) {
          const userDietOrder2 = await data.dietOrder.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.dietOrder.length + 1; i++) {
          if(userDietOrder2[i] === undefined || userDietOrder2[i] === null) return;
          allDietOrders.push(userDietOrder2[i]);
        }
        } else if(data.dietOrder.length === 1){
          const userDietOrder2 = await data.dietOrder[0]
          allDietOrders.push(userDietOrder2);
        }
        }
  
    });

    res.render('dietOrders', {
      patient: user,
      allDietOrders
    });

  }
});

router.get('/patient/:id/diet-orders/new', ifNotLoggedin, async(req, res) => {

  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/dietOrdersUpload', {
    patient: user
  });


});

router.post('/patient/:id/diet-orders/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userDietOrder = await UserPrescriptions.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userDietOrder.dietOrder.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserPrescriptions.findOneAndUpdate({uhid: patientID},
      {$addToSet: {dietOrder: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/diet-orders`); });
  
  
      }


});

router.get('/patient/:id/diet-orders/view/:dietOrderID', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const reportID = req.params.dietOrderID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserPrescriptions.findOne({ uhid: patientID });
    const report = [];
    reportData.dietOrder.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/dietOrder', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});

//===================================================================================
//                                          Patient Prescriptions
//===================================================================================

router.get('/patient/:id/prescriptions', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allPrescriptions = [];
    await UserDocs.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.prescriptions && data.prescriptions.length > 0) {
        if(data.prescriptions.length > 1) {
          const userPrescriptions2 = await data.prescriptions.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.prescriptions.length + 1; i++) {
          if(userPrescriptions2[i] === undefined || userPrescriptions2[i] === null) return;
          allPrescriptions.push(userPrescriptions2[i]);
        }
        } else if(data.prescriptions.length === 1){
          const userPrescriptions2 = await data.prescriptions[0]
          allPrescriptions.push(userPrescriptions2);
        }
        }
  
    });

    res.render('prescriptions', {
      patient: user,
      allPrescriptions
    });

  }
});

router.get('/patient/:id/prescriptions/new', ifNotLoggedin, async(req, res) => {

  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/prescriptionsUpload', {
    patient: user
  });


});

router.post('/patient/:id/prescriptions/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userPrescriptions = await UserDocs.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userPrescriptions.prescriptions.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserDocs.findOneAndUpdate({uhid: patientID},
      {$addToSet: {prescriptions: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/prescriptions`); });
  
  
      }

});

router.get('/patient/:id/prescriptions/view/:prescriptionsID', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const reportID = req.params.prescriptionsID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserDocs.findOne({ uhid: patientID });
    const report = [];
    reportData.prescriptions.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/prescriptions', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});

//===================================================================================
//                                          Patient Allergy Reports
//===================================================================================

router.get('/patient/:id/allergy-reports', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allAllergies = [];
    await UserDocs.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.allergies && data.allergies.length > 0) {
        if(data.allergies.length > 1) {
          const userAllergies2 = await data.allergies.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.allergies.length + 1; i++) {
          if(userAllergies2[i] === undefined || userAllergies2[i] === null) return;
          allAllergies.push(userAllergies2[i]);
        }
        } else if(data.allergies.length === 1){
          const userAllergies2 = await data.allergies[0]
          allAllergies.push(userAllergies2);
        }
        }
  
    });

    res.render('allergies', {
      patient: user,
      allAllergies
    });

  }
});

router.get('/patient/:id/allergy-reports/new', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/allergyUpload', {
    patient: user
  });


});

router.post('/patient/:id/allergy-reports/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {
    
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userAlleryReports = await UserDocs.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userAlleryReports.allergies.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserDocs.findOneAndUpdate({uhid: patientID},
      {$addToSet: {allergies: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/allergy-reports`); });
  
  
      }

});

router.get('/patient/:id/allergy-reports/view/:allergyReportID', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const reportID = req.params.allergyReportID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserDocs.findOne({ uhid: patientID });
    const report = [];
    reportData.allergies.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/allergies', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});

//===================================================================================
//                                          Patient Lab Reports
//===================================================================================

router.get('/patient/:id/lab-reports', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allLabReports = [];
    await UserDocs.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.labReports && data.labReports.length > 0) {
        if(data.labReports.length > 1) {
          const userAllergies2 = await data.labReports.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.labReports.length + 1; i++) {
          if(userAllergies2[i] === undefined || userAllergies2[i] === null) return;
          allLabReports.push(userAllergies2[i]);
        }
        } else if(data.labReports.length === 1){
          const userAllergies2 = await data.labReports[0]
          allLabReports.push(userAllergies2);
        }
        }
  
    });

    res.render('labReports', {
      patient: user,
      allLabReports
    });

  }
});

router.get('/patient/:id/lab-reports/new', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/labReportUpload', {
    patient: user
  });

});

router.post('/patient/:id/lab-reports/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userLabReports = await UserDocs.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userLabReports.labReports.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserDocs.findOneAndUpdate({uhid: patientID},
      {$addToSet: {labReports: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/lab-reports`); });
  
  
      }

});

router.get('/patient/:id/lab-reports/view/:labReportID', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const reportID = req.params.labReportID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserDocs.findOne({ uhid: patientID });
    const report = [];
    reportData.labReports.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/labReport', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});

//===================================================================================
//                                          Patient Discharge Summaries
//===================================================================================

router.get('/patient/:id/discharge-summaries', ifNotLoggedin, async(req, res) => {
  const patientID = req.params.id;

  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {
    let allDischargeSummaries = [];
    await UserDocs.findOne({ uhid: patientID }).then(async data => {

      if(!data) {
        res.redirect(`/`)
      }
      
      
      if(data.dischargeSummaries && data.dischargeSummaries.length > 0) {
        if(data.dischargeSummaries.length > 1) {
          const userDiscahrgeSummaries2 = await data.dischargeSummaries.sort(function(x, y){ return y.timestamp - x.timestamp });
        
        for(i=0; i < data.dischargeSummaries.length + 1; i++) {
          if(userDiscahrgeSummaries2[i] === undefined || userDiscahrgeSummaries2[i] === null) return;
          allDischargeSummaries.push(userDiscahrgeSummaries2[i]);
        }
        } else if(data.dischargeSummaries.length === 1){
          const userDiscahrgeSummaries2 = await data.dischargeSummaries[0]
          allDischargeSummaries.push(userDiscahrgeSummaries2);
        }
        }
  
    });

    res.render('dischargeSummaries', {
      patient: user,
      allDischargeSummaries
    });

  }
});

router.get('/patient/:id/discharge-summaries/new', ifNotLoggedin, async(req, res) => {
 
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  res.render('UploadEJS/dischargeSummaryUpload', {
    patient: user
  });


});

router.post('/patient/:id/discharge-summaries/new', ifNotLoggedin, upload.single('report_file'), async(req, res) => {
  
  const patientID = req.params.id;
  const user = await User.findOne({ uhid: patientID }).catch(e => console.log(e));
  if(!user) {
    res.redirect('/');
  }

  else {

    const userDischargeSummaries = await UserDocs.findOne({ uhid: patientID });
    var reportID = await makeid(6);
    userDischargeSummaries.dischargeSummaries.forEach(async element => {
      while(element.id === reportID) {
        reportID = makeid(6);
      }
    });
  var todayTimeDay = new Date().getDate();
  var todayTimeMonth = new Date().getMonth();
  var todayTimeYear = new Date().getFullYear();

    const jsonObj = {
      id:reportID,
      name: req.file.filename,
      reportName: req.body.report_name,
      comments: req.body.report_comments,
      uploadedAt: `${todayTimeDay}/${todayTimeMonth}/${todayTimeYear}`,
      timestamp: Date.now()
    }

    await UserDocs.findOneAndUpdate({uhid: patientID},
      {$addToSet: {dischargeSummaries: jsonObj}}
      ).catch(e => {
          console.log(e);
      }).then(() => {          
           res.redirect(`/patient/${patientID}/discharge-summaries`); });
  
  
      }

});

router.get('/patient/:id/discharge-summaries/view/:dischargeSummaryID', ifNotLoggedin, async(req, res) => {
  
  const patientID = req.params.id;
  const reportID = req.params.dischargeSummaryID;
  const user = await User.findOne({ uhid: patientID });
  if(!user) { res.redirect('/') }
  else {
    const reportData = await UserDocs.findOne({ uhid: patientID });
    const report = [];
    reportData.dischargeSummaries.forEach(async element => {
      let id = element.id;
      if(id === reportID) {
        report.push(element)
      };
    });
    const urlPDF = `/public/${report[0].name}`

    res.render('docEJS/dischargeSummary', {
      patient: user,
      report: report[0],
      url: urlPDF
    })

  }

});



module.exports = router;