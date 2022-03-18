const Sequelize = require('sequelize');
const _ = require('lodash');

const { BudgetError } = require('../../middleware/error-handler');

module.exports = async({
  amount,
  auditApiCallUuid,
  budgetCtrl,
  month,
  notes,
  subcategoryUuid,
  year,
}) => {
  const controllers = budgetCtrl.parent;
  const models = budgetCtrl.models;
  if (!subcategoryUuid) {
    throw new BudgetError('Category is required');
  } else if (isNaN(parseInt(year, 10))) {
    throw new BudgetError('Year is required');
  } else if (parseInt(year, 10) < 2000
      || parseInt(year, 10) > 2050) {
    throw new BudgetError('Invalid year');
  } else if (isNaN(parseInt(month, 10))) {
    throw new BudgetError('Month is required');
  } else if (parseInt(month, 10) < 0
      || parseInt(month, 10) > 11) {
    throw new BudgetError('Invalid month');
  } else if (isNaN(parseInt(amount, 10))) {
    throw new BudgetError('Invalid budget');
  } else if (!_.isString(notes)) {
    throw new BudgetError('Invalid notes');
  }

  const apiCall = await models.Audit.ApiCall.findOne({
    attributes: ['user_uuid', 'uuid'],
    where: {
      uuid: auditApiCallUuid,
    },
  });
  if (!apiCall || !apiCall.get('user_uuid')) {
    throw new BudgetError('Missing audit API call');
  }

  const user = await models.User.findOne({
    attributes: ['household_uuid', 'uuid'],
    where: {
      uuid: apiCall.get('user_uuid'),
    },
  });
  if (!user) {
    throw new BudgetError('Audit user does not exist');
  }

  // Validate subcategory belongs to household.
  const subcategory = await models.Subcategory.findOne({
    attributes: ['uuid'],
    include: [{
      attributes: ['uuid'],
      model: models.Category,
      required: true,
      where: {
        household_uuid: user.get('household_uuid'),
      },
    }],
    where: {
      uuid: subcategoryUuid,
    },
  });
  if (!subcategory) {
    throw new BudgetError('Category not found');
  }

  const duplicateBudget = await models.Budget.findOne({
    attributes: ['uuid'],
    where: {
      month: parseInt(month, 10),
      subcategory_uuid: subcategory.get('uuid'),
      year: parseInt(year, 10),
    },
  });
  if (duplicateBudget) {
    throw new BudgetError('Duplicate budget');
  }

  const newBudget = models.Budget.build({
    amount_cents: amount,
    month: parseInt(month, 10),
    notes,
    subcategory_uuid: subcategory.get('uuid'),
    year: parseInt(year, 10),
  });

  await models.sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  }, async(transaction) => {
    await newBudget.save({
      transaction,
    });
    await controllers.AuditCtrl.trackChanges({
      auditApiCallUuid,
      newList: [newBudget],
      transaction,
    });
  });

  return newBudget.get('uuid');
};
