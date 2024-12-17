import Sequelize from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Income', {
    amount_cents: {
      allowNull: false,
      type: Sequelize.INTEGER,
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    date: {
      allowNull: false,
      type: Sequelize.DATEONLY,
    },
    deleted_at: {
      allowNull: true,
      type: Sequelize.DATE,
    },
    description: {
      allowNull: false,
      type: Sequelize.STRING,
    },
    employer_uuid: {
      allowNull: true,
      type: Sequelize.UUID,
    },
    household_member_uuid: {
      allowNull: false,
      type: Sequelize.UUID,
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
    tableName: 'incomes',
    timestamps: true,
  });
};
