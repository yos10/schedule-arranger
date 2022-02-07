const User = require("./user");
const Schedule = require('./schedule');
const Comment = require('./comment');
const Candidate = require('./candidate');
const Availability = require('./availability');

// User.sync().then(() => {
//   Schedule.belongsTo(User, { foreignKey: 'createdBy' });
//   Schedule.sync();
//   Comment.belongsTo(User, { foreignKey: 'userId' });
//   Comment.sync();
//   Availability.belongsTo(User, {foreignKey: 'userId'});
//   Candidate.sync().then(() => {
//     Availability.belongsTo(Candidate, { foreignKey: 'candidateId' });
//     Availability.sync();
//   });
// });

// User.hasMany(Schedule);
Schedule.belongsTo(User, {
  foreignKey: 'createdBy'
});

// User.hasMany(Comment);
Comment.belongsTo(User, {
  foreignKey: 'userId'
});

// User.hasMany(Availability);
Availability.belongsTo(User, {
  foreignKey: 'userId'
});

// Candidate.hasMany(Availability);
Availability.belongsTo(Candidate, {
  foreignKey: 'candidateId'
});

module.exports = {
  User,
  Schedule,
  Comment,
  Candidate,
  Availability
};
