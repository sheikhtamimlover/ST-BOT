// FCA Package Configuration
// Users can add more FCA packages here by adding a new key-value pair

const fcaList = {
    stfca: "stfca",                      // Default FCA package
    dongdev: "@dongdev/fca-unofficial"   //if you added new any option then use comman , 
};

// Set the default package name here
const defaultFca = "stfca";

module.exports = { fcaList, defaultFca };
