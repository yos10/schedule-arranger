const { sequelize } = require('./models/sequelize-loader');
const { User, Schedule, Comment, Candidate, Availability } = require('./models');

(async () => {
  await sequelize.sync({force: true});
})();
