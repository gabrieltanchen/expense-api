export default (app) => {
  const controllers = app.get('controllers');
  const models = app.get('models');

  /**
   * @api {patch} /expenses/:uuid
   * @apiName ExpenseItemPatch
   * @apiGroup Expense
   *
   * @apiSuccess (200) {object} data
   * @apiSuccess (200) {object} data.attributes
   * @apiSuccess (200) {integer} data.attributes.amount
   * @apiSuccess (200) {string} data.attributes[created-at]
   * @apiSuccess (200) {string} data.attributes.date
   * @apiSuccess (200) {string} data.attributes.description
   * @apiSuccess (200) {integer} data.attributes[reimbursed-amount]
   * @apiSuccess (200) {string} data.id
   * @apiSuccess (200) {object} data.relationships
   * @apiSuccess (200) {object} data.relationships[household-member]
   * @apiSuccess (200) {object} data.relationships[household-member].data
   * @apiSuccess (200) {string} data.relationships[household-member].data.id
   * @apiSuccess (200) {object} data.relationships.subcategory
   * @apiSuccess (200) {object} data.relationships.subcategory.data
   * @apiSuccess (200) {string} data.relationships.subcategory.data.id
   * @apiSuccess (200) {object} data.relationships.vendor
   * @apiSuccess (200) {object} data.relationships.vendor.data
   * @apiSuccess (200) {string} data.relationships.vendor.data.id
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
      let fundUuid = null;
      if (req.body.data.relationships
          && req.body.data.relationships.fund
          && req.body.data.relationships.fund.data
          && req.body.data.relationships.fund.data.id) {
        fundUuid = req.body.data.relationships.fund.data.id;
      }
      await controllers.ExpenseCtrl.updateExpense({
        amount: req.body.data.attributes.amount,
        auditApiCallUuid: req.auditApiCallUuid,
        date: req.body.data.attributes.date,
        description: req.body.data.attributes.description,
        expenseUuid: req.params.uuid,
        fundUuid,
        householdMemberUuid: req.body.data.relationships['household-member'].data.id,
        reimbursedAmount: req.body.data.attributes['reimbursed-amount'],
        subcategoryUuid: req.body.data.relationships.subcategory.data.id,
        vendorUuid: req.body.data.relationships.vendor.data.id,
      });

      const expense = await models.Expense.findOne({
        attributes: [
          'amount_cents',
          'created_at',
          'date',
          'description',
          'reimbursed_cents',
          'uuid',
        ],
        include: [{
          attributes: ['name', 'uuid'],
          model: models.Fund,
          required: false,
        }, {
          attributes: ['name', 'uuid'],
          model: models.HouseholdMember,
          required: true,
        }, {
          attributes: ['name', 'uuid'],
          model: models.Subcategory,
          required: true,
        }, {
          attributes: ['name', 'uuid'],
          model: models.Vendor,
          required: true,
        }],
        where: {
          uuid: req.params.uuid,
        },
      });

      const relationships = {
        'household-member': {
          'data': {
            'id': expense.HouseholdMember.get('uuid'),
            'type': 'household-members',
          },
        },
        'subcategory': {
          'data': {
            'id': expense.Subcategory.get('uuid'),
            'type': 'subcategories',
          },
        },
        'vendor': {
          'data': {
            'id': expense.Vendor.get('uuid'),
            'type': 'vendors',
          },
        },
      };
      if (expense.Fund) {
        relationships.fund = {
          'data': {
            'id': expense.Fund.get('uuid'),
            'type': 'funds',
          },
        };
      }
      return res.status(200).json({
        'data': {
          'attributes': {
            'amount': expense.get('amount_cents'),
            'created-at': expense.get('created_at'),
            'date': expense.get('date'),
            'description': expense.get('description'),
            'reimbursed-amount': expense.get('reimbursed_cents'),
          },
          'id': expense.get('uuid'),
          'relationships': relationships,
          'type': 'expenses',
        },
      });
    } catch (err) {
      return next(err);
    }
  };
};
