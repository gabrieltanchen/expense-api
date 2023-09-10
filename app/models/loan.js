const Sequelize = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Loan', {
    amount_cents: {
      allowNull: false,
      type: Sequelize.INTEGER,
    },
    archived_at: {
      allowNull: true,
      type: Sequelize.DATE,
    },
    balance_cents: {
      allowNull: false,
      type: Sequelize.INTEGER,
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    deleted_at: {
      allowNull: true,
      type: Sequelize.DATE,
    },
    household_uuid: {
      allowNull: false,
      type: Sequelize.UUID,
    },
    name: {
      allowNull: false,
      type: Sequelize.STRING,
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    uuid: {
      allowNull: false,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      type: Sequelize.UUID,
    },
  }, {
    paranoid: true,
    tableName: 'loans',
    timestamps: true,
  });
};
