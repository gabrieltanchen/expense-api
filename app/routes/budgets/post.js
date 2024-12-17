export default (app) => {
  const controllers = app.get('controllers');
  const models = app.get('models');

  /**
   * @api {post} /budgets
   * @apiName BudgetPost
   * @apiGroup Budget
   *
   * @apiParam {object} data
   * @apiParam {object} data.attributes
   * @apiParam {integer} data.attributes.amount
   * @apiParam {integer} data.attributes.month
   * @apiParam {string} data.attributes.notes
   * @apiParam {integer} data.attributes.year
   * @apiParam {object} data.relationships
   * @apiParam {object} data.relationships.subcategory
   * @apiParam {object} data.relationships.subcategory.data
   * @apiParam {string} data.relationships.subcategory.data.id
   *
   * @apiErrorExample {json} Error-Response:
   *    HTTP/1.1 422 Unprocessable Entity
   *    {
   *      "errors": [{
   *        "source": {
   *          "pointer": "/data/attributes/budget-cents",
   *        },
   *        "detail": "Budget is required.",
   *      }]
   *    }
   */
  return async(req, res, next) => {
    try {
      const budgetUuid = await controllers.BudgetCtrl.createBudget({
        amount: req.body.data.attributes.amount,
        auditApiCallUuid: req.auditApiCallUuid,
        month: req.body.data.attributes.month,
        notes: req.body.data.attributes.notes || '',
        subcategoryUuid: req.body.data.relationships.subcategory.data.id,
        year: req.body.data.attributes.year,
      });

      const budget = await models.Budget.findOne({
        attributes: [
          'amount_cents',
          'created_at',
          'month',
          'notes',
          'uuid',
          'year',
        ],
        include: [{
          attributes: ['name', 'uuid'],
          model: models.Subcategory,
          required: true,
        }],
        where: {
          uuid: budgetUuid,
        },
      });

      return res.status(201).json({
        'data': {
          'attributes': {
            'amount': budget.get('amount_cents'),
            'created-at': budget.get('created_at'),
            'month': budget.get('month'),
            'notes': budget.get('notes'),
            'year': budget.get('year'),
          },
          'id': budgetUuid,
          'relationships': {
            'subcategory': {
              'data': {
                'id': budget.Subcategory.get('uuid'),
                'type': 'subcategories',
              },
            },
          },
          'type': 'budgets',
        },
      });
    } catch (err) {
      return next(err);
    }
  };
};
