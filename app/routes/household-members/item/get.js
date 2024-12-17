import { HouseholdError } from '../../../middleware/error-handler/index.js';

export default (app) => {
  const models = app.get('models');

  /**
   * @api {get} /household-members/:uuid
   * @apiName HouseholdMemberItemGet
   * @apiGroup HouseholdMember
   *
   * @apiSuccess (200) {object} data
   * @apiSuccess (200) {object} data.attributes
   * @apiSuccess (200) {string} data.attributes[created-at]
   * @apiSuccess (200) {string} data.attributes.name
   * @apiSuccess (200) {string} data.id
   * @apiSuccess (200) {string} data.type
   *
   * @apiErrorExample {json} Error-Response:
   *    HTTP/1.1 401 Unprocessable Entity
   *    {
   *      "errors": [{
   *        "detail": "Unauthorized",
   *      }],
   *    }
   */
  return async(req, res, next) => {
    try {
      const user = await models.User.findOne({
        attributes: ['household_uuid', 'uuid'],
        where: {
          uuid: req.userUuid,
        },
      });
      if (!user) {
        throw new Error('Unauthorized');
      }

      const householdMember = await models.HouseholdMember.findOne({
        attributes: ['created_at', 'name', 'uuid'],
        where: {
          household_uuid: user.get('household_uuid'),
          uuid: req.params.uuid,
        },
      });
      if (!householdMember) {
        throw new HouseholdError('Not found');
      }

      const expenseCount = await models.Expense.count({
        where: {
          household_member_uuid: householdMember.get('uuid'),
        },
      });
      const sumAmountCents = await models.Expense.sum('amount_cents', {
        where: {
          household_member_uuid: householdMember.get('uuid'),
        },
      });
      const sumReimbursedCents = await models.Expense.sum('reimbursed_cents', {
        where: {
          household_member_uuid: householdMember.get('uuid'),
        },
      });
      const sumIncomeCents = await models.Income.sum('amount_cents', {
        where: {
          household_member_uuid: householdMember.get('uuid'),
        },
      });

      return res.status(200).json({
        'data': {
          'attributes': {
            'created-at': householdMember.get('created_at'),
            'expense-count': expenseCount,
            'name': householdMember.get('name'),
            'sum-amount': sumAmountCents || 0,
            'sum-income': sumIncomeCents || 0,
            'sum-reimbursed': sumReimbursedCents || 0,
          },
          'id': householdMember.get('uuid'),
          'type': 'household-members',
        },
      });
    } catch (err) {
      return next(err);
    }
  };
};
